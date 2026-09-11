import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  ContractCDecisionError,
  SUPPORTED_CLAIM_VERIFICATION_POLICY,
} from "../src/contractCDecision.js";
import { evaluateContractCDecision } from "../src/contractCDecisionRuntime.js";
import { canonicalizeContractDWithAuthority } from "../src/contractDCanonicalOutput.js";

const CONTRACT_C_ROOT = process.env.APPARATUS_CONTRACT_C_DIR;
const CONTRACT_D_ROOT = process.env.APPARATUS_CONTRACT_D_DIR;
const RC1_ROOT = process.env.CONTRACT_C_RC1_EVIDENCE_DIR;
const OUTPUT_DIR = process.env.DECISION_V1_QUALIFICATION_OUTPUT_DIR || "build/decision-v1-qualification";

assert.ok(CONTRACT_C_ROOT, "APPARATUS_CONTRACT_C_DIR is required");
assert.ok(CONTRACT_D_ROOT, "APPARATUS_CONTRACT_D_DIR is required");
assert.ok(RC1_ROOT, "CONTRACT_C_RC1_EVIDENCE_DIR is required");

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
  }
  return value;
}

function canonicalBytes(value) {
  return Buffer.from(JSON.stringify(sortValue(value)) + "\n", "utf8");
}

function materializeContractC(value) {
  const clone = structuredClone(value);
  delete clone.result_set_id;
  clone.result_set_id = `result-set:${sha256(canonicalBytes(clone))}`;
  const bytes = canonicalBytes(clone);
  return { value: clone, bytes, sha: `sha256:${sha256(bytes)}` };
}

function loadFrozen(name) {
  const bytes = readFileSync(resolve(RC1_ROOT, `${name}.json`));
  return {
    value: JSON.parse(bytes.toString("utf8")),
    bytes,
    sha: `sha256:${sha256(bytes)}`,
  };
}

function expectedContractB(value) {
  return structuredClone(value.input.contract_b);
}

function contextFor(value, propositionId = value.propositions[0].proposition.proposition_id) {
  const proposition = value.propositions.find(
    (item) => item.proposition.proposition_id === propositionId,
  );
  assert.ok(proposition, `missing proposition ${propositionId}`);
  return {
    policy: {
      id: SUPPORTED_CLAIM_VERIFICATION_POLICY.id,
      version: SUPPORTED_CLAIM_VERIFICATION_POLICY.version,
    },
    proposition_id: propositionId,
    target: {
      kind: "claim",
      id: propositionId,
      content_sha256: `sha256:${proposition.proposition.text_sha256}`,
    },
  };
}

function evaluate(fixture, decisionContext = contextFor(fixture.value), extra = {}) {
  return evaluateContractCDecision({
    contractCBytes: fixture.bytes,
    expectedContractCSha256: fixture.sha,
    contractCAuthorityRoot: CONTRACT_C_ROOT,
    expectedContractB: expectedContractB(fixture.value),
    decisionContext,
    pythonExecutable: process.env.PYTHON || "python3",
    ...extra,
  });
}

function expectError(code, fn) {
  assert.throws(fn, (error) => error instanceof ContractCDecisionError && error.code === code);
}

function canonicalDecisionBytes(decision) {
  return canonicalizeContractDWithAuthority({
    decision,
    contractDAuthorityRoot: CONTRACT_D_ROOT,
    pythonExecutable: process.env.PYTHON || "python3",
  });
}

const supported = loadFrozen("supported-tied-alternatives");
const notCheckable = loadFrozen("not-checkable-unclassified");
const mixedContributions = loadFrozen("overstated-joint-state");

// Supported exact authority reaches CLEAR and deterministic canonical Contract D.
const clear = evaluate(supported);
assert.deepEqual(clear.evaluation, { state: "completed", disposition: "clear" });
const clearBytesA = canonicalDecisionBytes(clear);
const clearBytesB = canonicalDecisionBytes(evaluate(supported));
assert.deepEqual(clearBytesA, clearBytesB);

// Contradicted is a valid Contract C epistemic label but is never upgraded to CLEAR.
const contradictedValue = structuredClone(supported.value);
contradictedValue.propositions[0].conclusion.reported_verdict = "contradicted";
const contradicted = materializeContractC(contradictedValue);
const contradictedDecision = evaluate(contradicted);
assert.deepEqual(contradictedDecision.evaluation, { state: "completed", disposition: "hold" });
assert.deepEqual(contradictedDecision.metadata.reason_codes, ["contract_c_reported_verdict_not_supported"]);
canonicalDecisionBytes(contradictedDecision);

// Not-checkable remains HOLD.
const notCheckableDecision = evaluate(notCheckable);
assert.deepEqual(notCheckableDecision.evaluation, { state: "completed", disposition: "hold" });
assert.deepEqual(notCheckableDecision.metadata.reason_codes, ["contract_c_proposition_not_checkable"]);
canonicalDecisionBytes(notCheckableDecision);

// A retained mixed support/counterevidence state remains HOLD. This is a Decision
// conformance control, not a claim that this fixture represents every CAL mixed branch.
const channels = new Set(mixedContributions.value.propositions[0].contributions.map((item) => item.channel));
assert.ok(channels.has("support"));
assert.ok(channels.has("counterevidence"));
const mixedDecision = evaluate(mixedContributions);
assert.deepEqual(mixedDecision.evaluation, { state: "completed", disposition: "hold" });
canonicalDecisionBytes(mixedDecision);

// Missing exact target is FAILED, not policy HOLD, and carries no effect.
const missingContext = contextFor(supported.value);
missingContext.proposition_id = "missing-v1-proposition";
missingContext.target = {
  kind: "claim",
  id: "missing-v1-proposition",
  content_sha256: `sha256:${"7".repeat(64)}`,
};
const failed = evaluate(supported, missingContext);
assert.deepEqual(failed.evaluation, { state: "failed" });
assert.equal(Object.hasOwn(failed, "effect"), false);
canonicalDecisionBytes(failed);

// Target substitution fails closed.
const wrongTarget = contextFor(supported.value);
wrongTarget.target.content_sha256 = `sha256:${"8".repeat(64)}`;
expectError("target_binding_mismatch", () => evaluate(supported, wrongTarget));

// Wrong expected Contract B fails before policy semantics.
const wrongExpectedB = expectedContractB(supported.value);
wrongExpectedB.bundle_hash = `sha256:${"9".repeat(64)}`;
expectError("contract_b_binding_mismatch", () =>
  evaluateContractCDecision({
    contractCBytes: supported.bytes,
    expectedContractCSha256: supported.sha,
    contractCAuthorityRoot: CONTRACT_C_ROOT,
    expectedContractB: wrongExpectedB,
    decisionContext: contextFor(supported.value),
    pythonExecutable: process.env.PYTHON || "python3",
  }),
);

// Stale/tampered whole-object identity fails closed.
expectError("contract_c_whole_object_mismatch", () =>
  evaluateContractCDecision({
    contractCBytes: supported.bytes,
    expectedContractCSha256: `sha256:${"0".repeat(64)}`,
    contractCAuthorityRoot: CONTRACT_C_ROOT,
    expectedContractB: expectedContractB(supported.value),
    decisionContext: contextFor(supported.value),
    pythonExecutable: process.env.PYTHON || "python3",
  }),
);

// Wrong declared Contract C profile cannot select another validator.
const wrongVersionValue = structuredClone(supported.value);
wrongVersionValue.contract_c_version = "research-non-deciding-rc0";
const wrongVersion = materializeContractC(wrongVersionValue);
expectError("contract_c_validation_failed", () => evaluate(wrongVersion));

// Unknown policy never falls through to a maintained evaluator.
const unknownPolicy = contextFor(supported.value);
unknownPolicy.policy.version = "9.9.9";
expectError("unsupported_policy", () => evaluate(supported, unknownPolicy));

// Caller-supplied evaluator/registry-shaped state is not an implementation seam.
let substitutedImplementationCalled = false;
const substitutionAttempt = evaluate(supported, contextFor(supported.value), {
  policyRegistry: {
    [`${SUPPORTED_CLAIM_VERIFICATION_POLICY.id}@${SUPPORTED_CLAIM_VERIFICATION_POLICY.version}`]: () => {
      substitutedImplementationCalled = true;
      return { evaluation: { state: "completed", disposition: "hold" } };
    },
  },
  evaluatorCallback: () => {
    substitutedImplementationCalled = true;
    return { evaluation: { state: "completed", disposition: "hold" } };
  },
});
assert.equal(substitutedImplementationCalled, false);
assert.deepEqual(substitutionAttempt, clear);

mkdirSync(OUTPUT_DIR, { recursive: true });
for (const [name, decision] of Object.entries({
  clear,
  contradicted: contradictedDecision,
  notCheckable: notCheckableDecision,
  mixedContributions: mixedDecision,
  failed,
})) {
  writeFileSync(resolve(OUTPUT_DIR, `${name}.json`), JSON.stringify(decision) + "\n", "utf8");
}

const receipt = {
  status: "PASS",
  contract_c_profile: "1.0.0",
  contract_d_profile: "1.0.0",
  policy: `${SUPPORTED_CLAIM_VERIFICATION_POLICY.id}@${SUPPORTED_CLAIM_VERIFICATION_POLICY.version}`,
  supported_clear: true,
  contradicted_hold: true,
  not_checkable_hold: true,
  mixed_support_counterevidence_hold: true,
  missing_target_failed_distinct_from_hold: true,
  failed_has_no_effect: true,
  target_substitution_rejected: true,
  wrong_contract_b_rejected: true,
  stale_contract_c_identity_rejected: true,
  wrong_contract_c_profile_rejected: true,
  unknown_policy_rejected: true,
  caller_policy_implementation_substitution_blocked: true,
  deterministic_canonical_contract_d: true,
  non_deciding_successor_selected: false,
};
writeFileSync(resolve(OUTPUT_DIR, "receipt.json"), JSON.stringify(receipt, null, 2) + "\n", "utf8");
console.log(JSON.stringify(receipt));
