import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { canonicalJsonBytes, sha256Hex } from "./contractCGateShadowAdapter.mjs";
import { buildSyntheticFixture } from "./fixtureFactory.mjs";

const authorityRoot = process.env.CONTRACT_C_AUTHORITY_ROOT;
if (!authorityRoot) throw new Error("CONTRACT_C_AUTHORITY_ROOT is required");

const fixtureDoc = JSON.parse(readFileSync(new URL("./fixture-spec.json", import.meta.url), "utf8"));
const authority = fixtureDoc.authority_fixture;
const validator = join(authorityRoot, "validators/contract_c.py");
const contractBIndex = join(authorityRoot, "fixtures/contract-c/1.0.0/contract-b-index.json");
const authorityFixture = join(authorityRoot, authority.path);
const tmp = mkdtempSync(join(tmpdir(), "contract-c-gate-shadow-"));

function runValidator(path, expectedSha256 = null) {
  const args = [validator, path, "--contract-b-index", contractBIndex];
  if (expectedSha256) args.push("--expected-sha256", expectedSha256);
  return spawnSync("python3", args, { encoding: "utf8" });
}

try {
  const rawAuthority = readFileSync(authorityFixture);
  assert.equal(sha256Hex(rawAuthority), authority.canonical_sha256, "authoritative fixture hash drifted");
  const authorityRun = runValidator(authorityFixture, authority.canonical_sha256);
  assert.equal(authorityRun.status, 0, `authoritative fixture validator failed:\n${authorityRun.stderr}`);

  const rows = [];
  for (const record of fixtureDoc.fixtures) {
    const raw = canonicalJsonBytes(buildSyntheticFixture(record.id));
    assert.equal(sha256Hex(raw), record.canonical_sha256, `${record.id}: frozen fixture hash drifted`);
    const path = join(tmp, `${record.id}.json`);
    writeFileSync(path, raw);
    const run = runValidator(path);
    const observedConformance = run.status === 0;
    assert.equal(
      observedConformance,
      record.expected_contract_c_conformance,
      `${record.id}: cross-repository conformance disagreement\nstdout=${run.stdout}\nstderr=${run.stderr}`,
    );
    rows.push({
      id: record.id,
      expectedConformance: record.expected_contract_c_conformance,
      observedConformance,
      canonicalSha256: record.canonical_sha256,
    });
  }

  console.log(JSON.stringify({
    authority: {
      repository: authority.repository,
      sha: authority.sha,
      path: authority.path,
      canonicalSha256: authority.canonical_sha256,
      validated: true,
    },
    syntheticFixtures: rows,
    disagreements: 0,
  }, null, 2));
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
