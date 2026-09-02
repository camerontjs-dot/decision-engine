import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { ContractCDecisionError } from "../../src/contractCDecision.js";
import {
  CAUSAL_BASIS_CITATION_POLICY,
  citationTargetForContractC,
  decideBasisCitationResearch,
} from "./basisCitationPolicy.mjs";

const CONTRACT_C_ROOT = process.env.APPARATUS_CONTRACT_C_DIR;
const OUTPUT_DIR = process.env.POLICY_2_OUTPUT_DIR || "build/contract-first-policy-2";
assert.ok(CONTRACT_C_ROOT, "APPARATUS_CONTRACT_C_DIR is required");

const CANONICAL_FIXTURE_SHA256 =
  "7a66583e332be4901d13ba9f2d7e12419938c77a41b83223a4b0946ad529b7a1";

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

function loadCanonical() {
  const bytes = readFileSync(
    resolve(CONTRACT_C_ROOT, "fixtures/contract-c/1.0.0/valid-canonical.json"),
  );
  assert.equal(sha256(bytes), CANONICAL_FIXTURE_SHA256);
  return { value: JSON.parse(bytes.toString("utf8")), bytes, sha: `sha256:${sha256(bytes)}` };
}

function expectedContractB(value) {
  return structuredClone(value.input.contract_b);
}

function contextFor(value, propositionId, contributionId) {
  const target = citationTargetForContractC(value, propositionId, contributionId);
  assert.ok(target, `missing target projection for ${propositionId}/${contributionId}`);
  return {
    policy: {
      id: CAUSAL_BASIS_CITATION_POLICY.id,
      version: CAUSAL_BASIS_CITATION_POLICY.version,
    },
    proposition_id: propositionId,
    contribution_id: contributionId,
    target,
  };
}

function decide(fixture, context, expectedB = expectedContractB(fixture.value)) {
  return decideBasisCitationResearch({
    contractCBytes: fixture.bytes,
    expectedContractCSha256: fixture.sha,
    contractCAuthorityRoot: CONTRACT_C_ROOT,
    expectedContractB: expectedB,
    decisionContext: context,
    pythonExecutable: process.env.PYTHON || "python3",
  });
}

function expectError(code, fn) {
  assert.throws(fn, (error) => error instanceof ContractCDecisionError && error.code === code);
}

const canonical = loadCanonical();
const proposition = canonical.value.propositions[0];
const propositionId = proposition.proposition.proposition_id;
const causalContributionId = proposition.conclusion.basis_members.find(
  (member) => member.namespace === "contribution",
).id;
const residualContributionId = proposition.conclusion.residual_contribution_ids[0];
assert.ok(causalContributionId);
assert.ok(residualContributionId);

// Positive and negative policy cases use the same exact Contract C object. Only the explicit
// Decision target changes, so a verdict-only policy cannot explain the outcome difference.
const clearContext = contextFor(canonical.value, propositionId, causalContributionId);
const holdContext = contextFor(canonical.value, propositionId, residualContributionId);
const clear = decide(canonical, clearContext);
const hold = decide(canonical, holdContext);
assert.deepEqual(clear.evaluation, { state: "completed", disposition: "clear" });
assert.deepEqual(hold.evaluation, { state: "completed", disposition: "hold" });
assert.deepEqual(clear.effect, {
  type: "knowledge.cite_as_evidence",
  version: "1",
  params: {},
});
assert.deepEqual(hold.effect, clear.effect);
assert.notDeepEqual(clear.target, hold.target);
assert.deepEqual(hold.metadata.reason_codes, ["contract_c_contribution_residual_non_deciding"]);

// Genuine evaluation failure: valid exact Contract C but requested contribution cannot be
// identified, so no effect is emitted and the state is not converted into HOLD/CLEAR.
const missingContributionId = `contribution:${"7".repeat(64)}`;
const missingContext = {
  policy: {
    id: CAUSAL_BASIS_CITATION_POLICY.id,
    version: CAUSAL_BASIS_CITATION_POLICY.version,
  },
  proposition_id: propositionId,
  contribution_id: missingContributionId,
  target: {
    kind: "claim-evidence-link",
    id: `claim-evidence-link:${propositionId}:${missingContributionId}`,
    content_sha256: `sha256:${"8".repeat(64)}`,
  },
};
const failed = decide(canonical, missingContext);
assert.deepEqual(failed.evaluation, { state: "failed" });
assert.equal("effect" in failed, false);
assert.deepEqual(failed.metadata.reason_codes, ["target_contribution_not_found"]);

// Whole-object immutable identity must match before semantic policy reads.
const wrongWholeHashContext = contextFor(canonical.value, propositionId, causalContributionId);
expectError("contract_c_whole_object_mismatch", () =>
  decideBasisCitationResearch({
    contractCBytes: canonical.bytes,
    expectedContractCSha256: `sha256:${"0".repeat(64)}`,
    contractCAuthorityRoot: CONTRACT_C_ROOT,
    expectedContractB: expectedContractB(canonical.value),
    decisionContext: wrongWholeHashContext,
    pythonExecutable: process.env.PYTHON || "python3",
  }),
);

// Exact Contract-B authority is an ingress invariant, not policy-specific semantics.
const wrongB = expectedContractB(canonical.value);
wrongB.bundle_id += "-substituted";
expectError("contract_b_binding_mismatch", () => decide(canonical, clearContext, wrongB));

// No hidden policy fallback.
const wrongPolicy = structuredClone(clearContext);
wrongPolicy.policy.version = "1.0.1";
expectError("unsupported_policy", () => decide(canonical, wrongPolicy));

// Exact target ID and content binding are both authority-bearing.
const wrongTargetId = structuredClone(clearContext);
wrongTargetId.target.id += "-substituted";
expectError("target_binding_mismatch", () => decide(canonical, wrongTargetId));

const wrongTargetContent = structuredClone(clearContext);
wrongTargetContent.target.content_sha256 = `sha256:${"1".repeat(64)}`;
expectError("target_binding_mismatch", () => decide(canonical, wrongTargetContent));

// Contract-valid state that this policy does not inspect must not silently change citation
// authority. Unknown headline verdict vocabulary is valid Contract C; performed-unknown
// assessment is also valid. Both remain irrelevant to this basis-membership policy.
const ignoredStateValue = structuredClone(canonical.value);
ignoredStateValue.propositions[0].conclusion.reported_verdict = "future_epistemic_label";
ignoredStateValue.propositions[0].assessments.eligibility = {
  state: "performed",
  value: "unknown",
};
const ignoredState = materialize(ignoredStateValue);
const ignoredContext = contextFor(ignoredState.value, propositionId, causalContributionId);
const ignoredDecision = decide(ignoredState, ignoredContext);
assert.deepEqual(ignoredDecision.evaluation, { state: "completed", disposition: "clear" });

// Missing Contract-C-required state never becomes a policy conclusion.
const missingStateValue = structuredClone(canonical.value);
delete missingStateValue.propositions[0].assessments.temporal_applicability;
const missingState = materialize(missingStateValue);
const missingStateContext = contextFor(missingState.value, propositionId, causalContributionId);
expectError("contract_c_validation_failed", () => decide(missingState, missingStateContext));

// Execution uncertainty is a policy HOLD because causal-basis citation has not been established
// under the policy's completed-result precondition. It is not rewritten into a CAL verdict.
const incompleteValue = structuredClone(canonical.value);
incompleteValue.execution = { state: "incomplete" };
const incomplete = materialize(incompleteValue);
const incompleteContext = contextFor(incomplete.value, propositionId, causalContributionId);
const incompleteDecision = decide(incomplete, incompleteContext);
assert.deepEqual(incompleteDecision.evaluation, { state: "completed", disposition: "hold" });
assert.deepEqual(incompleteDecision.metadata.reason_codes, ["contract_c_result_execution_incomplete"]);

const notAssessedValue = structuredClone(canonical.value);
notAssessedValue.propositions[0].execution = { state: "completed", completion: "not_checkable" };
notAssessedValue.propositions[0].conclusion.reported_verdict = "not_checkable";
const notAssessed = materialize(notAssessedValue);
const notAssessedContext = contextFor(notAssessed.value, propositionId, causalContributionId);
const notAssessedDecision = decide(notAssessed, notAssessedContext);
assert.deepEqual(notAssessedDecision.evaluation, { state: "completed", disposition: "hold" });
assert.deepEqual(notAssessedDecision.metadata.reason_codes, ["contract_c_proposition_not_checkable"]);

// Same logical proposition/contribution IDs with changed immutable evidence content must produce
// a different target hash. Replaying the stale target therefore fails closed even when the new
// Contract C object is itself valid and its whole-object digest is fresh.
const changedContentValue = structuredClone(canonical.value);
const changedContribution = changedContentValue.propositions[0].contributions.find(
  (item) => item.contribution_id === causalContributionId,
);
changedContribution.evidence_ref.passage_sha256 = `sha256:${"2".repeat(64)}`;
const changedContent = materialize(changedContentValue);
assert.equal(
  changedContent.value.propositions[0].proposition.proposition_id,
  canonical.value.propositions[0].proposition.proposition_id,
);
assert.equal(changedContribution.contribution_id, causalContributionId);
assert.notEqual(changedContent.sha, canonical.sha);
const freshChangedTarget = contextFor(changedContent.value, propositionId, causalContributionId);
assert.equal(freshChangedTarget.target.id, clearContext.target.id);
assert.notEqual(freshChangedTarget.target.content_sha256, clearContext.target.content_sha256);
expectError("target_binding_mismatch", () => decide(changedContent, clearContext));
assert.deepEqual(decide(changedContent, freshChangedTarget).evaluation, {
  state: "completed",
  disposition: "clear",
});

// Weak controls that should fail the preregistered discrimination.
function weakHeadlineVerdictOnly(value) {
  return value.propositions[0].conclusion?.reported_verdict === "partially_supported"
    ? "clear"
    : "hold";
}
assert.equal(weakHeadlineVerdictOnly(canonical.value), "clear");
assert.equal(weakHeadlineVerdictOnly(canonical.value), weakHeadlineVerdictOnly(canonical.value));
assert.equal(hold.evaluation.disposition, "hold");

function weakAnyRetainedContribution(_value, _contributionId) {
  return "clear";
}
assert.equal(weakAnyRetainedContribution(canonical.value, residualContributionId), "clear");
assert.equal(hold.evaluation.disposition, "hold");

mkdirSync(OUTPUT_DIR, { recursive: true });
const decisions = {
  clear,
  hold,
  failed,
  ignoredState: ignoredDecision,
  incomplete: incompleteDecision,
  notAssessed: notAssessedDecision,
};
for (const [name, decision] of Object.entries(decisions)) {
  writeFileSync(resolve(OUTPUT_DIR, `${name}.json`), JSON.stringify(decision) + "\n", "utf8");
}

const summary = {
  status: "PASS",
  policy: {
    id: CAUSAL_BASIS_CITATION_POLICY.id,
    version: CAUSAL_BASIS_CITATION_POLICY.version,
  },
  canonical_fixture_sha256: CANONICAL_FIXTURE_SHA256,
  clear_reachable: true,
  hold_reachable_same_contract_c: true,
  evaluation_failed_reachable: true,
  stale_whole_object_rejected: true,
  wrong_contract_b_rejected: true,
  wrong_policy_rejected: true,
  target_id_substitution_rejected: true,
  target_content_substitution_rejected: true,
  policy_ignored_unknown_invariant: true,
  missing_required_state_rejected: true,
  incomplete_result_holds: true,
  not_checkable_holds: true,
  same_logical_id_changed_content_rejected: true,
  weak_headline_verdict_control_fails: true,
  weak_any_contribution_control_fails: true,
  upstream_producer_reachability_claimed: false,
};
writeFileSync(resolve(OUTPUT_DIR, "research-summary.json"), JSON.stringify(summary, null, 2) + "\n");
console.log(JSON.stringify(summary));
