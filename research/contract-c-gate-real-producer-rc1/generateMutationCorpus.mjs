import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { buildSyntheticFixture } from "../contract-c-gate-shadow/fixtureFactory.mjs";
import { canonicalJsonBytes, sha256Hex } from "./hardenedContractCGateAdapter.mjs";

const outDir = resolve(process.argv[2] ?? "artifacts/contract-c-gate-real-producer-rc1/mutations");
mkdirSync(outDir, { recursive: true });

function clone(value) {
  return structuredClone(value);
}

function withResultSetIdentity(value) {
  const body = clone(value);
  delete body.result_set_id;
  const digest = sha256Hex(canonicalJsonBytes(body));
  return { ...body, result_set_id: `result-set:${digest}` };
}

function write(name, object) {
  const bytes = canonicalJsonBytes(object);
  writeFileSync(resolve(outDir, `${name}.json`), bytes);
  return {
    name,
    sha256: sha256Hex(bytes),
    result_set_id: object.result_set_id ?? null,
    proposition_ids: Array.isArray(object.propositions)
      ? object.propositions.map((row) => row?.proposition?.proposition_id ?? null)
      : [],
  };
}

const clear = buildSyntheticFixture("clear-positive");
const mixed = buildSyntheticFixture("mixed-support-refutation");
const explicitAdverseAssessment = buildSyntheticFixture("explicit-adverse");
const malformedAssessment = buildSyntheticFixture("malformed-field");
const extraField = buildSyntheticFixture("extra-field");

const adverseInvalid = clone(clear);
adverseInvalid.propositions[0].conclusion.reported_verdict = "overstated";
adverseInvalid.propositions[0].conclusion.terminal_branch = "synthetic_overstated_invalid";
adverseInvalid.extension_probe = true;
const adverseInvalidWithId = withResultSetIdentity(adverseInvalid);

const wrongVersion = clone(clear);
wrongVersion.contract_c_version = "9.9.9";
const wrongVersionWithId = withResultSetIdentity(wrongVersion);

const badResultId = clone(clear);
badResultId.result_set_id = `result-set:${"0".repeat(64)}`;

const futureVerdict = clone(clear);
futureVerdict.propositions[0].conclusion.reported_verdict = "future_verdict_v2";
futureVerdict.propositions[0].conclusion.terminal_branch = "synthetic_future_verdict_v2";
const futureVerdictWithId = withResultSetIdentity(futureVerdict);

const explicitOverstated = clone(clear);
explicitOverstated.propositions[0].conclusion.reported_verdict = "overstated";
explicitOverstated.propositions[0].conclusion.terminal_branch = "synthetic_overstated";
const explicitOverstatedWithId = withResultSetIdentity(explicitOverstated);

const rows = [
  write("clear-positive", clear),
  write("mixed-support-refutation", mixed),
  write("explicit-adverse-assessment", explicitAdverseAssessment),
  write("schema-invalid-adverse", adverseInvalidWithId),
  write("wrong-contract-version", wrongVersionWithId),
  write("mismatched-result-set-id", badResultId),
  write("future-reported-verdict", futureVerdictWithId),
  write("malformed-assessment", malformedAssessment),
  write("extra-field", extraField),
  write("explicit-overstated", explicitOverstatedWithId),
];

writeFileSync(
  resolve(outDir, "MANIFEST.json"),
  Buffer.from(`${JSON.stringify({ generator: "rc1-preregistered-mutation-corpus", rows }, null, 2)}\n`, "utf8"),
);
