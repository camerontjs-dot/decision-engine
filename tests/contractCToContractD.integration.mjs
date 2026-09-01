import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  ContractCDecisionError,
  SUPPORTED_CLAIM_VERIFICATION_POLICY,
  decideContractCToContractD,
} from "../src/contractCDecision.js";

const AUTHORITY_ROOT = process.env.APPARATUS_CONTRACT_C_DIR;
const RC1_ROOT = process.env.CONTRACT_C_RC1_EVIDENCE_DIR;
const OUTPUT_DIR = process.env.CONTRACT_C_TO_D_OUTPUT_DIR || "build/contract-c-to-d";
assert.ok(AUTHORITY_ROOT, "APPARATUS_CONTRACT_C_DIR is required");
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

function materialize(value) {
  const clone = structuredClone(value);
  delete clone.result_set_id;
  clone.result_set_id = `result-set:${sha256(canonicalBytes(clone))}`;
  const bytes = canonicalBytes(clone);
  return { value: clone, bytes, sha: `sha256:${sha256(bytes)}` };
}

function loadFrozen(name) {
  const bytes = readFileSync(resolve(RC1_ROOT, `${name}.json`));
  const value = JSON.parse(bytes.toString("utf8"));
  return { value, bytes, sha: `sha256:${sha256(bytes)}` };
}

function expectedContractB(value) {
  return structuredClone(value.input.contract_b);
}

function contextFor(value, propositionId = value.propositions[0].proposition.proposition_id) {
  const proposition = value.propositions.find((item) => item.proposition.proposition_id === propositionId);
  assert.ok(proposition, `missing proposition fixture ${propositionId}`);
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

function decide(fixture, context = contextFor(fixture.value), expectedB = expectedContractB(fixture.value)) {
  return decideContractCToContractD({
    contractCBytes: fixture.bytes,
    expectedContractCSha256: fixture.sha,
    contractCAuthorityRoot: AUTHORITY_ROOT,
    expectedContractB: expectedB,
    decisionContext: context,
    pythonExecutable: process.env.PYTHON || "python3",
  });
}

function expectError(code, fn) {
  assert.throws(fn, (error) => error instanceof ContractCDecisionError && error.code === code);
}

const supported = loadFrozen("supported-tied-alternatives");
const unsupported = loadFrozen("unsupported-residual");
const needsSource = loadFrozen("needs-source-credential");
const notCheckable = loadFrozen("not-checkable-unclassified");
const overstated = loadFrozen("overstated-joint-state");

// Real current-CAL reachability evidence from frozen RC1: exact supported clears; other
// valid epistemic states remain valid inputs and hold rather than becoming malformed input.
const clear = decide(supported);
assert.deepEqual(clear.evaluation, { state: "completed", disposition: "clear" });
assert.deepEqual(clear.effect, {
  type: "knowledge.add_verified_tag",
  version: "1",
  params: { scope: "claim" },
});
assert.equal(clear.input_authority.id, supported.value.result_set_id);
assert.equal(clear.input_authority.immutable_id, supported.sha);
assert.equal(clear.target.id, supported.value.propositions[0].proposition.proposition_id);

for (const [label, fixture] of [
  ["unsupported", unsupported],
  ["needs_source", needsSource],
  ["not_checkable", notCheckable],
  ["overstated", overstated],
]) {
  const decision = decide(fixture);
  assert.deepEqual(decision.evaluation, { state: "completed", disposition: "hold" }, label);
  assert.equal(decision.effect.type, "knowledge.add_verified_tag", label);
}

// Exact Contract-C whole-object binding: a stale/replayed expected digest cannot authorize
// semantic policy interpretation.
expectError("contract_c_whole_object_mismatch", () =>
  decideContractCToContractD({
    contractCBytes: supported.bytes,
    expectedContractCSha256: unsupported.sha,
    contractCAuthorityRoot: AUTHORITY_ROOT,
    expectedContractB: expectedContractB(supported.value),
    decisionContext: contextFor(supported.value),
  }),
);

// Wrong Contract-B authority fails before policy semantics are used.
const wrongB = expectedContractB(supported.value);
wrongB.bundle_id += "-substituted";
expectError("contract_b_binding_mismatch", () => decide(supported, contextFor(supported.value), wrongB));

// Wrong Contract-C version fails in the canonical Contract-C validator, not in policy code.
const wrongVersionValue = structuredClone(supported.value);
wrongVersionValue.contract_c_version = "1.0.1";
const wrongVersion = materialize(wrongVersionValue);
expectError("contract_c_validation_failed", () =>
  decide(wrongVersion, contextFor(wrongVersion.value), expectedContractB(wrongVersion.value)),
);

// Unknown/future verdict vocabulary remains valid Contract-C epistemic data but fails safe
// at this policy boundary as HOLD.
const futureVerdictValue = structuredClone(supported.value);
futureVerdictValue.propositions[0].conclusion.reported_verdict = "future_epistemic_state";
const futureVerdict = materialize(futureVerdictValue);
assert.deepEqual(decide(futureVerdict).evaluation, { state: "completed", disposition: "hold" });

// Same decision context + materially different Contract-C epistemic state remains distinct.
const changedEpistemicValue = structuredClone(supported.value);
changedEpistemicValue.propositions[0].conclusion.reported_verdict = "unsupported";
const changedEpistemic = materialize(changedEpistemicValue);
assert.deepEqual(decide(changedEpistemic).evaluation, { state: "completed", disposition: "hold" });
assert.notEqual(changedEpistemic.sha, supported.sha);

// Same headline verdict but different authority-relevant result-set execution is not collapsed:
// this policy explicitly depends on result-set completion.
const incompleteResultValue = structuredClone(supported.value);
incompleteResultValue.execution = { state: "incomplete" };
const incompleteResult = materialize(incompleteResultValue);
const incompleteDecision = decide(incompleteResult);
assert.equal(incompleteResult.value.propositions[0].conclusion.reported_verdict, "supported");
assert.deepEqual(incompleteDecision.evaluation, { state: "completed", disposition: "hold" });
assert.deepEqual(incompleteDecision.metadata.reason_codes, ["contract_c_result_execution_incomplete"]);

// Same exact Contract C + materially different explicit target context can yield different
// Decisions. This synthetic metamorphic object is used only to test the context seam, not to
// claim producer reachability.
const multiValue = structuredClone(supported.value);
const heldProposition = structuredClone(multiValue.propositions[0]);
heldProposition.proposition.proposition_id += "-held-context";
heldProposition.conclusion.reported_verdict = "unsupported";
multiValue.propositions.push(heldProposition);
const multi = materialize(multiValue);
const clearContext = contextFor(multi.value, multi.value.propositions[0].proposition.proposition_id);
const holdContext = contextFor(multi.value, heldProposition.proposition.proposition_id);
const contextClear = decide(multi, clearContext);
const contextHold = decide(multi, holdContext);
assert.deepEqual(contextClear.evaluation, { state: "completed", disposition: "clear" });
assert.deepEqual(contextHold.evaluation, { state: "completed", disposition: "hold" });
assert.notDeepEqual(contextClear.target, contextHold.target);

// Target/content substitution fails closed rather than turning diagnostics into authority.
const substitutedTarget = contextFor(supported.value);
substitutedTarget.target.content_sha256 = `sha256:${"0".repeat(64)}`;
expectError("target_binding_mismatch", () => decide(supported, substitutedTarget));

// No hidden policy defaults. Unknown policy identity never falls through to the supported policy.
const substitutedPolicy = contextFor(supported.value);
substitutedPolicy.policy.version = "1.0.1";
expectError("unsupported_policy", () => decide(supported, substitutedPolicy));

// A valid Contract C and well-formed target context that cannot identify a requested proposition
// reaches Contract-D evaluation failure, not epistemic HOLD and not a clear candidate.
const missingContext = contextFor(supported.value);
missingContext.proposition_id = "absent-proposition";
missingContext.target = {
  kind: "claim",
  id: "absent-proposition",
  content_sha256: `sha256:${"7".repeat(64)}`,
};
const failed = decide(supported, missingContext);
assert.deepEqual(failed.evaluation, { state: "failed" });
assert.equal("effect" in failed, false);

// Evaluator self-tests against plausible weak implementations.
function weakVerdictOnly(raw) {
  const parsed = JSON.parse(raw.toString("utf8"));
  return parsed.propositions[0].conclusion?.reported_verdict === "supported" ? "clear" : "hold";
}
assert.equal(weakVerdictOnly(wrongVersion.bytes), "clear");
expectError("contract_c_validation_failed", () =>
  decide(wrongVersion, contextFor(wrongVersion.value), expectedContractB(wrongVersion.value)),
);

function weakContextCollapse(value) {
  return value.propositions[0].conclusion?.reported_verdict === "supported" ? "clear" : "hold";
}
assert.equal(weakContextCollapse(multi.value), "clear");
assert.equal(contextHold.evaluation.disposition, "hold");

function weakAuthorizationCollapse(decision) {
  return decision.evaluation.state === "completed" && decision.evaluation.disposition === "clear"
    ? "authorized"
    : "not_authorized";
}
assert.equal(weakAuthorizationCollapse(clear), "authorized");

mkdirSync(OUTPUT_DIR, { recursive: true });
for (const [name, decision] of Object.entries({ clear, hold: decide(unsupported), failed, contextClear, contextHold })) {
  writeFileSync(resolve(OUTPUT_DIR, `${name}.json`), JSON.stringify(decision) + "\n", "utf8");
}

writeFileSync(
  resolve(OUTPUT_DIR, "integration-summary.json"),
  JSON.stringify(
    {
      status: "PASS",
      policy: {
        id: SUPPORTED_CLAIM_VERIFICATION_POLICY.id,
        version: SUPPORTED_CLAIM_VERIFICATION_POLICY.version,
      },
      real_cal_cases: 5,
      clear_reachable: true,
      hold_reachable: true,
      evaluation_failed_reachable: true,
      stale_hash_rejected: true,
      wrong_contract_b_rejected: true,
      wrong_version_rejected: true,
      target_substitution_rejected: true,
      policy_substitution_rejected: true,
      context_sensitive: true,
      same_headline_execution_distinguished: true,
      weak_validation_bypass_detected: true,
      weak_context_collapse_detected: true,
      weak_authorization_collapse_seeded: true,
    },
    null,
    2,
  ) + "\n",
  "utf8",
);

console.log(JSON.stringify({ status: "PASS", output_dir: OUTPUT_DIR }));
