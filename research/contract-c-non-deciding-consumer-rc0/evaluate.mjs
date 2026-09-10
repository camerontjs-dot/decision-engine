import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  ShadowConsumerError,
  admitShadow,
  canonicalBytes,
  evaluateSupportedClaimPolicyCore,
  resultSetIdentity,
  unsafeEvidencePresenceEvaluator,
} from "./consumer.mjs";

const ROOT = resolve("research/contract-c-non-deciding-consumer-rc0");
const HANDOFF = resolve(ROOT, "handoff");
const OUT = resolve("build/contract-c-non-deciding-consumer-rc0");
const EXPECTED_SHA = "sha256:325962ebcdbf6af836bb6193a451524ccd40b4d10f2394ff9f703fbfce1ec1e3";
const EXPECTED_RESULT = "result-set:4483272c4f6fbd9cb2362be7e3174bbd00aff3cf761d6c374897f3478818c9f0";

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function materialize(value) {
  const clone = structuredClone(value);
  delete clone.result_set_id;
  clone.result_set_id = resultSetIdentity(clone);
  return canonicalBytes(clone);
}

function expectCode(code, fn) {
  try {
    fn();
  } catch (error) {
    assert.ok(error instanceof ShadowConsumerError, `expected ShadowConsumerError, got ${error}`);
    assert.equal(error.code, code);
    return true;
  }
  assert.fail(`expected ${code}`);
}

const raw = readFileSync(resolve(HANDOFF, "valid-shadow.json"));
const index = JSON.parse(readFileSync(resolve(HANDOFF, "contract-b-index.json"), "utf8"));
const base = JSON.parse(raw.toString("utf8"));

assert.equal(`sha256:${sha256(raw)}`, EXPECTED_SHA);
const admitted = admitShadow({ rawBytes: raw, expectedSha256: EXPECTED_SHA, contractBIndex: index });
assert.equal(admitted.result_set_id, EXPECTED_RESULT);
assert.equal(admitted.propositions.length, 1);
const proposition = admitted.propositions[0];
assert.equal(proposition.proposition_id, "temporal-p1");
assert.equal(proposition.completion, "not_checkable");
assert.equal(proposition.reported_verdict, "not_checkable");
assert.equal(proposition.terminal_branch, "unresolved_categorical_relation");
assert.equal(proposition.causal_form, "independent_sufficient_alternatives");
assert.equal(proposition.causal_contributions.length, 2);
assert.deepEqual(
  proposition.causal_contributions.map((item) => item.evidence_ref.passage_id).sort(),
  ["u-a", "u-b"],
);
assert.ok(proposition.causal_contributions.every((item) => item.channel === "non_deciding"));

const policyCore = evaluateSupportedClaimPolicyCore(admitted, "temporal-p1");
assert.deepEqual(policyCore, {
  state: "completed",
  disposition: "hold",
  reason: "contract_c_proposition_not_checkable",
});

const unsafe = unsafeEvidencePresenceEvaluator(admitted, "temporal-p1");
assert.equal(unsafe.disposition, "clear");
assert.notDeepEqual(unsafe, policyCore);
const unsafeMutantKilled = policyCore.disposition === "hold" && unsafe.disposition === "clear";

const wrongHashRejected = expectCode("whole_object_mismatch", () =>
  admitShadow({
    rawBytes: raw,
    expectedSha256: `sha256:${"0".repeat(64)}`,
    contractBIndex: index,
  }),
);

const wrongVersion = structuredClone(base);
wrongVersion.contract_c_version = "research-non-deciding-rc0-wrong";
const wrongVersionRejected = expectCode("version_mismatch", () =>
  admitShadow({
    rawBytes: materialize(wrongVersion),
    expectedSha256: EXPECTED_SHA,
    contractBIndex: index,
    enforceExpectedSha: false,
  }),
);

const unknownChannel = structuredClone(base);
unknownChannel.propositions[0].contributions[0].channel = "neutralish";
const unknownChannelRejected = expectCode("unknown_channel", () =>
  admitShadow({
    rawBytes: materialize(unknownChannel),
    expectedSha256: EXPECTED_SHA,
    contractBIndex: index,
    enforceExpectedSha: false,
  }),
);

const wrongEvidence = structuredClone(base);
wrongEvidence.propositions[0].contributions[0].evidence_ref.passage_id = "u-ghost";
const wrongEvidenceRejected = expectCode("contract_b_reference_mismatch", () =>
  admitShadow({
    rawBytes: materialize(wrongEvidence),
    expectedSha256: EXPECTED_SHA,
    contractBIndex: index,
    enforceExpectedSha: false,
  }),
);

const missingBasis = structuredClone(base);
missingBasis.propositions[0].conclusion.basis_members[0].id = `contribution:${"0".repeat(64)}`;
const missingBasisRejected = expectCode("unknown_basis_contribution", () =>
  admitShadow({
    rawBytes: materialize(missingBasis),
    expectedSha256: EXPECTED_SHA,
    contractBIndex: index,
    enforceExpectedSha: false,
  }),
);

const overlap = structuredClone(base);
overlap.propositions[0].conclusion.residual_contribution_ids = [
  overlap.propositions[0].contributions[0].contribution_id,
];
const overlapRejected = expectCode("causal_residual_overlap", () =>
  admitShadow({
    rawBytes: materialize(overlap),
    expectedSha256: EXPECTED_SHA,
    contractBIndex: index,
    enforceExpectedSha: false,
  }),
);

const unclassified = structuredClone(base);
unclassified.propositions[0].conclusion.basis_members = [
  unclassified.propositions[0].conclusion.basis_members[0],
];
unclassified.propositions[0].conclusion.causal_form = "single_necessary";
unclassified.propositions[0].conclusion.residual_contribution_ids = [];
const unclassifiedRejected = expectCode("unclassified_contribution", () =>
  admitShadow({
    rawBytes: materialize(unclassified),
    expectedSha256: EXPECTED_SHA,
    contractBIndex: index,
    enforceExpectedSha: false,
  }),
);

const singleTwo = structuredClone(base);
singleTwo.propositions[0].conclusion.causal_form = "single_necessary";
const singleTwoRejected = expectCode("causal_cardinality", () =>
  admitShadow({
    rawBytes: materialize(singleTwo),
    expectedSha256: EXPECTED_SHA,
    contractBIndex: index,
    enforceExpectedSha: false,
  }),
);

const independentOne = structuredClone(base);
independentOne.propositions[0].conclusion.basis_members = [
  independentOne.propositions[0].conclusion.basis_members[0],
];
independentOne.propositions[0].conclusion.residual_contribution_ids = [
  independentOne.propositions[0].contributions[1].contribution_id,
];
const independentOneRejected = expectCode("causal_cardinality", () =>
  admitShadow({
    rawBytes: materialize(independentOne),
    expectedSha256: EXPECTED_SHA,
    contractBIndex: index,
    enforceExpectedSha: false,
  }),
);

const staleResultId = structuredClone(base);
staleResultId.result_set_id = `result-set:${"0".repeat(64)}`;
const staleResultIdRejected = expectCode("result_set_identity_mismatch", () =>
  admitShadow({
    rawBytes: canonicalBytes(staleResultId),
    expectedSha256: EXPECTED_SHA,
    contractBIndex: index,
    enforceExpectedSha: false,
  }),
);

const channelMutations = {};
for (const channel of ["support", "counterevidence"]) {
  const mutated = structuredClone(base);
  mutated.propositions[0].contributions[0].channel = channel;
  const mutatedAdmitted = admitShadow({
    rawBytes: materialize(mutated),
    expectedSha256: EXPECTED_SHA,
    contractBIndex: index,
    enforceExpectedSha: false,
  });
  const observed = mutatedAdmitted.propositions[0].causal_contributions.find(
    (item) => item.contribution_id === mutated.propositions[0].contributions[0].contribution_id,
  );
  assert.equal(observed.channel, channel);
  const outcome = evaluateSupportedClaimPolicyCore(mutatedAdmitted, "temporal-p1");
  assert.equal(outcome.disposition, "hold");
  channelMutations[channel] = {
    observed_channel: observed.channel,
    policy_disposition: outcome.disposition,
    policy_reason: outcome.reason,
  };
}

const checks = {
  exact_handoff_sha_verified: admitted.exact_sha256 === EXPECTED_SHA,
  exact_result_set_id_verified: admitted.result_set_id === EXPECTED_RESULT,
  exact_contract_b_binding_verified:
    admitted.contract_b.contract_version === index.contract_version &&
    admitted.contract_b.bundle_id === index.bundle_id &&
    admitted.contract_b.bundle_hash === index.bundle_hash,
  exact_proposition_binding_verified:
    proposition.text_sha256 === index.propositions["temporal-p1"],
  both_causal_passages_recovered:
    JSON.stringify(proposition.causal_contributions.map((x) => x.evidence_ref.passage_id).sort()) ===
    JSON.stringify(["u-a", "u-b"]),
  neutral_channels_preserved:
    proposition.causal_contributions.every((item) => item.channel === "non_deciding"),
  independent_sufficient_multiplicity_preserved:
    proposition.causal_form === "independent_sufficient_alternatives" &&
    proposition.causal_contributions.length === 2,
  maintained_policy_core_equivalent_hold:
    policyCore.disposition === "hold" && policyCore.reason === "contract_c_proposition_not_checkable",
  unsafe_neutral_evidence_clear_mutant_killed: unsafeMutantKilled,
  wrong_hash_rejected: wrongHashRejected,
  wrong_version_rejected: wrongVersionRejected,
  unknown_channel_rejected: unknownChannelRejected,
  wrong_evidence_ref_rejected: wrongEvidenceRejected,
  unknown_basis_rejected: missingBasisRejected,
  causal_residual_overlap_rejected: overlapRejected,
  unclassified_contribution_rejected: unclassifiedRejected,
  single_necessary_two_basis_rejected: singleTwoRejected,
  independent_alternatives_one_basis_rejected: independentOneRejected,
  stale_result_identity_rejected: staleResultIdRejected,
  support_channel_mutation_observed_not_normalized:
    channelMutations.support.observed_channel === "support",
  counterevidence_channel_mutation_observed_not_normalized:
    channelMutations.counterevidence.observed_channel === "counterevidence",
  channel_mutations_do_not_override_not_checkable_hold:
    Object.values(channelMutations).every((item) => item.policy_disposition === "hold"),
};

assert.ok(Object.values(checks).every(Boolean));
mkdirSync(OUT, { recursive: true });
const result = {
  stage: "independent_consumer_local_controls",
  exact_handoff_sha256: EXPECTED_SHA,
  exact_result_set_id: EXPECTED_RESULT,
  checks,
  observed: {
    causal_passages: proposition.causal_contributions.map((item) => item.evidence_ref.passage_id).sort(),
    causal_channels: proposition.causal_contributions.map((item) => item.channel),
    causal_form: proposition.causal_form,
    policy_core: policyCore,
    unsafe_mutant: unsafe,
    channel_mutations: channelMutations,
  },
};
writeFileSync(resolve(OUT, "CONSUMER_EVALUATION.json"), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result));
