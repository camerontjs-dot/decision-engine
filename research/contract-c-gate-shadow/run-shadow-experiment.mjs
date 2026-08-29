import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { CONTRACT_C_AUTHORITY, evaluateContractCShadow } from "./contractCGateShadowAdapter.mjs";
import { buildSyntheticFixture } from "./fixtureFactory.mjs";

const barsDoc = JSON.parse(readFileSync(new URL("./bars.json", import.meta.url), "utf8"));
const fixtureDoc = JSON.parse(readFileSync(new URL("./fixture-spec.json", import.meta.url), "utf8"));
const strictBar = barsDoc.bars.find((bar) => bar.id === "cal-contract-c-shadow-strict-v1");
const contradictionHoldBar = barsDoc.bars.find((bar) => bar.id === "cal-contract-c-shadow-contradiction-hold-v1");
const receipt = (valid) => ({
  valid,
  authority: { ...CONTRACT_C_AUTHORITY },
  errors: valid ? [] : ["authoritative Contract C validator rejected fixture"],
});

const rows = [];
let provenanceExample = null;
for (const record of fixtureDoc.fixtures) {
  const result = evaluateContractCShadow({
    contractC: buildSyntheticFixture(record.id),
    validationReceipt: receipt(record.expected_contract_c_conformance),
    propositionId: "clm-md",
    barSpec: strictBar,
  });
  assert.equal(result.finalDecision, record.expected_strict_bar_decision, `${record.id}: unexpected strict-bar decision`);
  rows.push({
    id: record.id,
    family: record.family,
    contractConformance: record.expected_contract_c_conformance,
    decision: result.finalDecision,
    blockingFailures: result.blockingFailures,
    blockingUnknowns: result.blockingUnknowns,
    contractCSha256: result.contractC.canonical_sha256,
    barSha256: result.gateBar.canonical_spec_sha256,
    adapterSha256: result.adapter.implementation_sha256,
    automaticApplicationPermitted: result.automaticApplicationPermitted,
  });
  if (record.id === "clear-positive") provenanceExample = result;
}

const contradicted = fixtureDoc.fixtures.find((entry) => entry.id === "contradicted");
const strictContradiction = evaluateContractCShadow({
  contractC: buildSyntheticFixture(contradicted.id),
  validationReceipt: receipt(true),
  propositionId: "clm-md",
  barSpec: strictBar,
});
const holdingContradiction = evaluateContractCShadow({
  contractC: buildSyntheticFixture(contradicted.id),
  validationReceipt: receipt(true),
  propositionId: "clm-md",
  barSpec: contradictionHoldBar,
});
assert.equal(strictContradiction.finalDecision, "reject");
assert.equal(holdingContradiction.finalDecision, "hold");
assert.equal(strictContradiction.contractC.canonical_sha256, holdingContradiction.contractC.canonical_sha256);

let authorityControl = null;
const authorityRoot = process.env.CONTRACT_C_AUTHORITY_ROOT;
if (authorityRoot) {
  const path = join(authorityRoot, fixtureDoc.authority_fixture.path);
  const contractC = JSON.parse(readFileSync(path, "utf8"));
  const result = evaluateContractCShadow({
    contractC,
    validationReceipt: receipt(true),
    propositionId: "clm-txt",
    barSpec: strictBar,
  });
  assert.equal(result.contractC.canonical_sha256, fixtureDoc.authority_fixture.canonical_sha256);
  assert.equal(result.finalDecision, "hold");
  assert.deepEqual(result.blockingFailures, []);
  authorityControl = {
    propositionId: "clm-txt",
    decision: result.finalDecision,
    blockingFailures: result.blockingFailures,
    blockingUnknowns: result.blockingUnknowns,
    reportedVerdict: result.criteriaEvaluated.find((entry) => entry.id === "reported-verdict")?.observed?.sourceState ?? null,
    contractCSha256: result.contractC.canonical_sha256,
  };
}

const decisionCounts = rows.reduce((acc, row) => {
  acc[row.decision] = (acc[row.decision] ?? 0) + 1;
  return acc;
}, {});

console.log(JSON.stringify({
  scope: "Research Infrastructure shadow adapter; no production integration or automatic mutation",
  decisionEngineBaseSha: "cd5a471703e6682b7e8281bc954a135996cac58e",
  contractAuthority: CONTRACT_C_AUTHORITY,
  fixtureCount: rows.length,
  decisionCounts,
  rows,
  policyMutation: {
    contractCSha256: strictContradiction.contractC.canonical_sha256,
    strictBar: { id: strictContradiction.gateBar.id, sha256: strictContradiction.gateBar.canonical_spec_sha256, decision: strictContradiction.finalDecision },
    contradictionHoldBar: { id: holdingContradiction.gateBar.id, sha256: holdingContradiction.gateBar.canonical_spec_sha256, decision: holdingContradiction.finalDecision },
  },
  authorityControl,
  provenanceExample,
}, null, 2));
