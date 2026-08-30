import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import {
  JURISDICTION,
  deriveDelegatedProfile,
  evaluateJurisdiction,
  semanticsAwareNegativeControl,
  verifyObservedOutcome,
} from "./authority.mjs";

const fixturePath = new URL("./fixtures.json", import.meta.url);
const fixtureBytes = readFileSync(fixturePath);
const fixture = JSON.parse(fixtureBytes.toString("utf8"));
const fixtureSha256 = createHash("sha256").update(fixtureBytes).digest("hex");
const now = fixture.evaluation_time;

function evalRequest(profileName, request) {
  return evaluateJurisdiction({
    profile: fixture.profiles[profileName],
    request,
    operationRegistry: fixture.operation_registry,
    now,
  });
}

const workflowById = Object.fromEntries(fixture.workflow.map((request) => [request.id, request]));
const profileSummaries = {};

for (const [profileName, expectedById] of Object.entries(fixture.expected_profile_results)) {
  const observed = {};
  for (const [id, expected] of Object.entries(expectedById)) {
    const actual = evalRequest(profileName, workflowById[id]).jurisdiction;
    observed[id] = actual;
    assert.equal(actual, expected, `${profileName}/${id}`);
  }
  const values = Object.values(observed);
  profileSummaries[profileName] = {
    automatic: values.filter((value) => value === JURISDICTION.IN).length,
    escalations: values.filter((value) => value === JURISDICTION.HIGHER).length,
    denials: values.filter((value) => value === JURISDICTION.OUT).length,
    indeterminate: values.filter((value) => value === JURISDICTION.INDETERMINATE).length,
    protected_false_permits: fixture.protected_cases.filter((id) => observed[id] === JURISDICTION.IN).length,
  };
}

assert.ok(profileSummaries.supervised.escalations < profileSummaries.manual.escalations);
assert.ok(profileSummaries["delegated-research"].escalations < profileSummaries.supervised.escalations);
assert.equal(profileSummaries.manual.protected_false_permits, 0);
assert.equal(profileSummaries.supervised.protected_false_permits, 0);
assert.equal(profileSummaries["delegated-research"].protected_false_permits, 0);

const semanticBase = workflowById["docs-single"];
const semanticMutation = {
  ...semanticBase,
  semantic_payload: { opaque: "opposite-domain-semantic-payload", verdict: "contradicted", score: -999 },
};
assert.deepEqual(
  evalRequest("delegated-research", semanticBase),
  evalRequest("delegated-research", semanticMutation),
  "semantic payload changed target authority result",
);

const actorSubstitution = { ...semanticBase, actor: "intruder-agent" };
assert.equal(evalRequest("delegated-research", actorSubstitution).jurisdiction, JURISDICTION.OUT);

const operationSubstitution = { ...semanticBase, operation: "repository.write.runtime" };
assert.equal(evalRequest("delegated-research", operationSubstitution).jurisdiction, JURISDICTION.HIGHER);

const targetSubstitution = {
  ...semanticBase,
  target: { class: "protected_repo", id: "repo-protected" },
};
assert.equal(evalRequest("delegated-research", targetSubstitution).jurisdiction, JURISDICTION.OUT);

const widenedBatch = { ...semanticBase, batch_size: 6 };
assert.equal(evalRequest("delegated-research", widenedBatch).jurisdiction, JURISDICTION.HIGHER);

const unknownOperation = { ...semanticBase, operation: "unknown.super-power" };
assert.equal(evalRequest("delegated-research", unknownOperation).jurisdiction, JURISDICTION.INDETERMINATE);

const missingActor = { ...semanticBase };
delete missingActor.actor;
assert.equal(evalRequest("delegated-research", missingActor).jurisdiction, JURISDICTION.INDETERMINATE);

const revokedProfile = { ...fixture.profiles["delegated-research"], revoked: true };
assert.equal(
  evaluateJurisdiction({ profile: revokedProfile, request: semanticBase, operationRegistry: fixture.operation_registry, now }).jurisdiction,
  JURISDICTION.OUT,
);

const expiredProfile = { ...fixture.profiles["delegated-research"], valid_until: "2026-08-30T14:59:59Z" };
assert.equal(
  evaluateJurisdiction({ profile: expiredProfile, request: semanticBase, operationRegistry: fixture.operation_registry, now }).jurisdiction,
  JURISDICTION.OUT,
);

const independentVerifier = workflowById.verify;
assert.equal(evalRequest("delegated-research", independentVerifier).jurisdiction, JURISDICTION.IN);
const selfVerifier = {
  ...independentVerifier,
  context: { executor_actor: independentVerifier.actor },
};
assert.equal(evalRequest("delegated-research", selfVerifier).jurisdiction, JURISDICTION.OUT);

const validDelegation = deriveDelegatedProfile(fixture.profiles["delegated-research"], {
  id: "child.docs-only",
  valid_until: "2026-10-01T00:00:00Z",
  grants: [{
    actor: "research-agent",
    operation: "repository.write.docs",
    target_classes: ["research_repo"],
    max_batch: 2,
    requires_independent_verifier: false,
  }],
});
assert.equal(validDelegation.ok, true);

for (const invalidSpec of [
  {
    id: "child.runtime-illegal",
    valid_until: "2026-10-01T00:00:00Z",
    grants: [{actor: "research-agent", operation: "repository.write.runtime", target_classes: ["research_repo"], max_batch: 1, requires_independent_verifier: false}],
  },
  {
    id: "child.protected-illegal",
    valid_until: "2026-10-01T00:00:00Z",
    grants: [{actor: "research-agent", operation: "repository.write.docs", target_classes: ["protected_repo"], max_batch: 1, requires_independent_verifier: false}],
  },
  {
    id: "child.batch-illegal",
    valid_until: "2026-10-01T00:00:00Z",
    grants: [{actor: "research-agent", operation: "repository.write.docs", target_classes: ["research_repo"], max_batch: 6, requires_independent_verifier: false}],
  },
  {
    id: "child.expiry-illegal",
    valid_until: "2027-01-01T00:00:00Z",
    grants: [{actor: "research-agent", operation: "repository.write.docs", target_classes: ["research_repo"], max_batch: 1, requires_independent_verifier: false}],
  },
]) {
  assert.equal(deriveDelegatedProfile(fixture.profiles["delegated-research"], invalidSpec).ok, false, invalidSpec.id);
}

const runtimeSemanticAttack = {
  ...workflowById.runtime,
  semantic_payload: { opaque: "semantic-allows-protected" },
};
const targetControlResult = evalRequest("delegated-research", runtimeSemanticAttack).jurisdiction;
const badControlResult = semanticsAwareNegativeControl({
  profile: fixture.profiles["delegated-research"],
  request: runtimeSemanticAttack,
  operationRegistry: fixture.operation_registry,
  now,
}).jurisdiction;
assert.notEqual(targetControlResult, JURISDICTION.IN);
assert.equal(badControlResult, JURISDICTION.IN, "semantics-aware weak control did not exhibit false permit");

const stageForOperation = Object.freeze({
  "assessment.issue": "assessment",
  "decision.make": "decision",
  "repository.write.docs": "execution",
  "repository.write.runtime": "execution",
  "outcome.verify": "verification",
});
function fragmentedEvaluate(stageProfiles, request) {
  return evalRequest(stageProfiles[stageForOperation[request.operation]], request);
}
const fragmentedManual = { assessment: "manual", decision: "manual", execution: "manual", verification: "manual" };
const fragmentedDelegated = { ...fragmentedManual };
const requiredFragmentedEdits = Object.keys(fragmentedDelegated).length;
for (const stage of Object.keys(fragmentedDelegated).slice(0, -1)) fragmentedDelegated[stage] = "delegated-research";
const fragmentedMismatch = fixture.workflow.filter((request) => (
  fragmentedEvaluate(fragmentedDelegated, request).jurisdiction
  !== evalRequest("delegated-research", request).jurisdiction
));
assert.ok(requiredFragmentedEdits > 1);
assert.ok(fragmentedMismatch.some((request) => request.id === "verify"), "fragmented posture change did not preserve a stale stage");

for (const outcomeCase of fixture.outcome_cases) {
  const verification = verifyObservedOutcome({
    executionAuthorization: outcomeCase.authorization,
    executorReport: outcomeCase.executor_report,
    observedPostState: outcomeCase.observed_post_state,
    verifierJurisdiction: JURISDICTION.IN,
  });
  assert.equal(verification.authoritative, true);
  assert.equal(verification.outcome, outcomeCase.expected, outcomeCase.id);
}

const unauthorizedButApplied = verifyObservedOutcome({
  executionAuthorization: JURISDICTION.OUT,
  executorReport: "SUCCESS",
  observedPostState: "APPLIED",
  verifierJurisdiction: JURISDICTION.IN,
});
assert.equal(unauthorizedButApplied.outcome, "VERIFIED_APPLIED");
assert.equal(unauthorizedButApplied.execution_authorization, JURISDICTION.OUT);

const unverifiedSelfReport = verifyObservedOutcome({
  executionAuthorization: JURISDICTION.IN,
  executorReport: "SUCCESS",
  observedPostState: "APPLIED",
  verifierJurisdiction: JURISDICTION.OUT,
});
assert.equal(unverifiedSelfReport.authoritative, false);
assert.equal(unverifiedSelfReport.outcome, "UNVERIFIED");

const summary = {
  fixture_sha256: fixtureSha256,
  profile_summaries: profileSummaries,
  semantic_invariance: true,
  mutation_controls: {
    actor_substitution: "blocked",
    operation_substitution: "not_permitted",
    target_substitution: "blocked",
    batch_widening: "escalated",
    unknown_operation: "indeterminate",
    missing_actor: "indeterminate",
    revoked_authority: "blocked",
    expired_authority: "blocked",
    self_verification: "blocked",
  },
  delegation_non_amplification: true,
  semantics_aware_negative_control: {
    target_evaluator: targetControlResult,
    weak_control: badControlResult,
    weak_control_failed_as_intended: true,
  },
  fragmented_negative_control: {
    required_stage_updates_for_manual_to_delegated: requiredFragmentedEdits,
    intentionally_omitted_stage: "verification",
    stale_stage_detected: fragmentedMismatch.map((request) => request.id),
  },
  outcome_seam: {
    executor_report_can_disagree_with_observed_state: true,
    unauthorized_execution_can_be_observed_without_becoming_authorized: true,
    verifier_authority_required_for_authoritative_outcome: true,
  },
  encoded_gate: "PASS",
};

const output = JSON.stringify(summary, null, 2);
writeFileSync(new URL("./HOSTED-RUN.json", import.meta.url), `${output}\n`);
console.log(output);
