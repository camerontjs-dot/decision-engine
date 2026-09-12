import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  ResearchContractCError,
  canonicalBytes,
  consumeMinimalInBand,
  contributionId,
  resultSetId,
  summarizeNeutralAttribution,
  supportedClaimPolicyEquivalent,
  unsafeNeutralImpliesClear,
  wholeObjectSha256,
  withResultSetId,
} from "./consumer.mjs";
import {
  ContractCDecisionError,
  loadExactContractCForDecision,
} from "../../src/contractCIngress.js";

const ROOT = resolve("research/contract-c-minimal-in-band-conformance-rc1");
const HANDOFF = resolve(ROOT, "handoff");
const OUT = process.env.MINIMAL_IN_BAND_OUTPUT_DIR || resolve("build/contract-c-minimal-in-band-conformance-rc1");
const AUTHORITY_ROOT = process.env.APPARATUS_CONTRACT_C_DIR;
assert.ok(AUTHORITY_ROOT, "APPARATUS_CONTRACT_C_DIR is required");

const expectations = JSON.parse(readFileSync(resolve(ROOT, "EXPECTATIONS.json"), "utf8"));
const frozenBytes = readFileSync(resolve(HANDOFF, "valid-shadow.json"));
const frozen = JSON.parse(frozenBytes.toString("utf8"));
const contractBIndex = JSON.parse(readFileSync(resolve(HANDOFF, "contract-b-index.json"), "utf8"));
const frozenProfile = structuredClone(expectations.expected_profile);

function materialize(value) {
  const identified = withResultSetId(value);
  const bytes = canonicalBytes(identified);
  return {
    value: identified,
    bytes,
    profile: {
      contract_c_version: "research-non-deciding-rc0",
      policy_profile: "contract-c-non-deciding-shadow-rc0",
      whole_object_sha256: wholeObjectSha256(bytes),
      result_set_id: identified.result_set_id,
    },
  };
}

function consume(fixture) {
  return consumeMinimalInBand({
    bytes: fixture.bytes,
    expectedProfile: fixture.profile,
    contractBIndex,
  });
}

function expectResearchError(code, fn) {
  assert.throws(fn, (error) => error instanceof ResearchContractCError && error.code === code);
  return true;
}

function keysRecursive(value, out = new Set()) {
  if (Array.isArray(value)) {
    for (const item of value) keysRecursive(item, out);
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      out.add(key.toLowerCase());
      keysRecursive(child, out);
    }
  }
  return out;
}

function replaceContributionChannel(value, index, channel) {
  const copy = structuredClone(value);
  const prop = copy.propositions[0];
  const oldId = prop.contributions[index].contribution_id;
  prop.contributions[index].channel = channel;
  const newId = contributionId(channel, prop.contributions[index].evidence_ref);
  prop.contributions[index].contribution_id = newId;
  for (const member of prop.conclusion.basis_members) {
    if (member.namespace === "contribution" && member.id === oldId) member.id = newId;
  }
  prop.conclusion.residual_contribution_ids = prop.conclusion.residual_contribution_ids.map((id) =>
    id === oldId ? newId : id,
  );
  return copy;
}

const baseline = {
  value: frozen,
  bytes: frozenBytes,
  profile: frozenProfile,
};
assert.equal(wholeObjectSha256(frozenBytes), frozenProfile.whole_object_sha256);
assert.equal(frozen.result_set_id, frozenProfile.result_set_id);
assert.equal(resultSetId(frozen), frozen.result_set_id);

const consumed = consume(baseline);
const baseSummary = summarizeNeutralAttribution(consumed, "temporal-p1");
assert.deepEqual(baseSummary.causal.map((row) => row.channel), ["non_deciding", "non_deciding"]);
assert.deepEqual(baseSummary.causal.map((row) => row.passage_id).sort(), ["u-a", "u-b"]);
assert.deepEqual(baseSummary.residual, []);
assert.equal(baseSummary.causal_form, "independent_sufficient_alternatives");
assert.equal(baseSummary.reported_verdict, "not_checkable");

const policy = supportedClaimPolicyEquivalent(consumed, "temporal-p1");
assert.deepEqual(policy, {
  state: "completed",
  disposition: "hold",
  reason: "contract_c_proposition_not_checkable",
});
const unsafe = unsafeNeutralImpliesClear(consumed, "temporal-p1");
assert.equal(unsafe, "clear");
assert.notEqual(unsafe, policy.disposition, "unsafe neutral=>CLEAR mutant must be killed");

const forbiddenSidecarKeys = ["member_id", "state_id", "receipt_id", "sidecar"];
const baselineKeys = keysRecursive(frozen);
for (const key of forbiddenSidecarKeys) assert.equal(baselineKeys.has(key), false, key);
const forbiddenScalarKeys = ["score", "confidence", "probability", "winner", "rank"];
for (const key of forbiddenScalarKeys) assert.equal(baselineKeys.has(key), false, key);

const jointValue = structuredClone(frozen);
jointValue.propositions[0].conclusion.causal_form = "jointly_sufficient";
const joint = materialize(jointValue);
const jointSummary = summarizeNeutralAttribution(consume(joint), "temporal-p1");
assert.deepEqual(jointSummary.causal, baseSummary.causal);
assert.equal(jointSummary.causal_form, "jointly_sufficient");
assert.notEqual(jointSummary.causal_form, baseSummary.causal_form);

const causalResidualValue = structuredClone(frozen);
const second = causalResidualValue.propositions[0].contributions[1].contribution_id;
causalResidualValue.propositions[0].conclusion.basis_members = [
  causalResidualValue.propositions[0].conclusion.basis_members[0],
];
causalResidualValue.propositions[0].conclusion.residual_contribution_ids = [second];
causalResidualValue.propositions[0].conclusion.causal_form = "single_necessary";
const causalResidual = materialize(causalResidualValue);
const causalResidualSummary = summarizeNeutralAttribution(consume(causalResidual), "temporal-p1");
assert.equal(causalResidualSummary.causal.length, 1);
assert.equal(causalResidualSummary.residual.length, 1);
assert.equal(causalResidualSummary.causal[0].channel, "non_deciding");
assert.equal(causalResidualSummary.residual[0].channel, "non_deciding");

const residualOnlyValue = structuredClone(frozen);
residualOnlyValue.propositions[0].conclusion.basis_members = [];
residualOnlyValue.propositions[0].conclusion.residual_contribution_ids = residualOnlyValue.propositions[0].contributions.map(
  (row) => row.contribution_id,
);
residualOnlyValue.propositions[0].conclusion.causal_form = "redundant_non_deciding";
const residualOnly = materialize(residualOnlyValue);
const residualOnlySummary = summarizeNeutralAttribution(consume(residualOnly), "temporal-p1");
assert.equal(residualOnlySummary.causal.length, 0);
assert.equal(residualOnlySummary.residual.length, 2);

expectResearchError("whole_object_mismatch", () =>
  consumeMinimalInBand({
    bytes: joint.bytes,
    expectedProfile: baseline.profile,
    contractBIndex,
  }),
);

expectResearchError("invalid_shape", () =>
  consumeMinimalInBand({ bytes: baseline.bytes, expectedProfile: undefined, contractBIndex }),
);

const wrongExpectedProfile = { ...baseline.profile, contract_c_version: "research-other-profile" };
expectResearchError("profile_mismatch", () =>
  consumeMinimalInBand({ bytes: baseline.bytes, expectedProfile: wrongExpectedProfile, contractBIndex }),
);

const selfSelectingValue = structuredClone(frozen);
selfSelectingValue.contract_c_version = "attacker-selected-version";
selfSelectingValue.producer.policy.canonical.profile = "attacker-selected-profile";
const selfSelecting = materialize(selfSelectingValue);
expectResearchError("profile_mismatch", () =>
  consumeMinimalInBand({
    bytes: selfSelecting.bytes,
    expectedProfile: { ...selfSelecting.profile, contract_c_version: baseline.profile.contract_c_version, policy_profile: baseline.profile.policy_profile },
    contractBIndex,
  }),
);

const wrongTopB = structuredClone(contractBIndex);
wrongTopB.bundle_id += "-substituted";
expectResearchError("contract_b_binding_mismatch", () =>
  consumeMinimalInBand({ bytes: baseline.bytes, expectedProfile: baseline.profile, contractBIndex: wrongTopB }),
);

const wrongEvidenceValue = structuredClone(frozen);
wrongEvidenceValue.propositions[0].contributions[0].evidence_ref.source_id = "src-substituted";
const wrongRef = wrongEvidenceValue.propositions[0].contributions[0].evidence_ref;
const oldContributionId = wrongEvidenceValue.propositions[0].contributions[0].contribution_id;
const newContributionId = contributionId("non_deciding", wrongRef);
wrongEvidenceValue.propositions[0].contributions[0].contribution_id = newContributionId;
wrongEvidenceValue.propositions[0].conclusion.basis_members[0].id = newContributionId;
const wrongEvidence = materialize(wrongEvidenceValue);
expectResearchError("evidence_binding_mismatch", () => consume(wrongEvidence));
assert.notEqual(oldContributionId, newContributionId);

const propositionSubValue = structuredClone(frozen);
propositionSubValue.propositions[0].proposition.proposition_id = "substituted-proposition";
const propositionSub = materialize(propositionSubValue);
expectResearchError("proposition_binding_mismatch", () => consume(propositionSub));

const missingBasisValue = structuredClone(frozen);
missingBasisValue.propositions[0].contributions.splice(1, 1);
const missingBasis = materialize(missingBasisValue);
expectResearchError("basis_reference_mismatch", () => consume(missingBasis));

const overlapValue = structuredClone(frozen);
overlapValue.propositions[0].conclusion.residual_contribution_ids = [
  overlapValue.propositions[0].conclusion.basis_members[0].id,
];
const overlap = materialize(overlapValue);
expectResearchError("causal_residual_overlap", () => consume(overlap));

const unclassifiedValue = structuredClone(frozen);
unclassifiedValue.propositions[0].conclusion.basis_members = [
  unclassifiedValue.propositions[0].conclusion.basis_members[0],
];
unclassifiedValue.propositions[0].conclusion.causal_form = "single_necessary";
const unclassified = materialize(unclassifiedValue);
expectResearchError("unclassified_contribution", () => consume(unclassified));

const invalidCardinalityValue = structuredClone(frozen);
invalidCardinalityValue.propositions[0].conclusion.causal_form = "single_necessary";
const invalidCardinality = materialize(invalidCardinalityValue);
expectResearchError("causal_cardinality_mismatch", () => consume(invalidCardinality));

const staleResultValue = structuredClone(frozen);
staleResultValue.propositions[0].conclusion.causal_form = "jointly_sufficient";
const staleResultBytes = canonicalBytes(staleResultValue);
expectResearchError("result_set_identity_mismatch", () =>
  consumeMinimalInBand({
    bytes: staleResultBytes,
    expectedProfile: {
      ...baseline.profile,
      whole_object_sha256: wholeObjectSha256(staleResultBytes),
    },
    contractBIndex,
  }),
);

const supportValue = replaceContributionChannel(frozen, 0, "support");
const support = materialize(supportValue);
const supportSummary = summarizeNeutralAttribution(consume(support), "temporal-p1");
assert.equal(supportSummary.causal[0].channel, "support");
assert.notDeepEqual(supportSummary.causal.map((row) => row.channel), baseSummary.causal.map((row) => row.channel));

const counterValue = replaceContributionChannel(frozen, 0, "counterevidence");
const counter = materialize(counterValue);
const counterSummary = summarizeNeutralAttribution(consume(counter), "temporal-p1");
assert.equal(counterSummary.causal[0].channel, "counterevidence");
assert.notDeepEqual(counterSummary.causal.map((row) => row.channel), baseSummary.causal.map((row) => row.channel));

const droppedValue = structuredClone(frozen);
droppedValue.propositions[0].contributions.splice(1, 1);
const dropped = materialize(droppedValue);
expectResearchError("basis_reference_mismatch", () => consume(dropped));

assert.throws(
  () =>
    loadExactContractCForDecision({
      contractCBytes: baseline.bytes,
      expectedContractCSha256: baseline.profile.whole_object_sha256,
      contractCAuthorityRoot: AUTHORITY_ROOT,
      expectedContractB: {
        contract_version: contractBIndex.contract_version,
        bundle_id: contractBIndex.bundle_id,
        bundle_hash: contractBIndex.bundle_hash,
      },
      pythonExecutable: process.env.PYTHON || "python3",
    }),
  (error) => error instanceof ContractCDecisionError && error.code === "contract_c_validation_failed",
  "maintained Contract C 1.0 ingress must reject the research successor",
);

mkdirSync(OUT, { recursive: true });
const result = {
  schema: "decision-current-main-minimal-in-band-conformance-rc1-result-v1",
  status: "PASS",
  disposition: "SUPPORTED_CURRENT_MAIN_MINIMAL_IN_BAND_CONFORMANCE",
  exact_frozen_input: {
    whole_object_sha256: baseline.profile.whole_object_sha256,
    result_set_id: baseline.profile.result_set_id,
    proposition_id: "temporal-p1",
  },
  observed: {
    causal_channels: baseSummary.causal.map((row) => row.channel),
    causal_passages: baseSummary.causal.map((row) => row.passage_id).sort(),
    residual_passages: baseSummary.residual.map((row) => row.passage_id).sort(),
    causal_form: baseSummary.causal_form,
    policy_equivalent: policy,
    unsafe_mutant_disposition: unsafe,
    unsafe_mutant_killed: unsafe !== policy.disposition,
    same_members_joint_form_distinct: jointSummary.causal_form !== baseSummary.causal_form,
    causal_residual_distinguished: causalResidualSummary.causal.length === 1 && causalResidualSummary.residual.length === 1,
    residual_only_recovered: residualOnlySummary.causal.length === 0 && residualOnlySummary.residual.length === 2,
    sidecar_specific_fields_required: false,
    scalar_or_confidence_winner_required: false,
    maintained_released_ingress_accepts_research_successor: false,
  },
  hostile_controls: {
    wrong_digest: "rejected",
    missing_external_profile: "rejected",
    wrong_external_profile: "rejected",
    object_self_selected_profile: "rejected_against_external_profile",
    wrong_contract_b_binding: "rejected",
    wrong_evidence_reference: "rejected",
    proposition_substitution: "rejected",
    missing_causal_basis_contribution: "rejected",
    causal_residual_overlap: "rejected",
    unclassified_retained_contribution: "rejected",
    causal_cardinality_mismatch: "rejected",
    stale_result_set_identity: "rejected",
    neutral_to_support: "detected_as_semantic_change",
    neutral_to_counterevidence: "detected_as_semantic_change",
    dropped_neutral_evidence: "rejected",
  },
  independence_scope: "supervisor_context_conformance_not_clean_room",
  context_free_reproduction_still_required: true,
};
writeFileSync(resolve(OUT, "RESULT.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify(result));
