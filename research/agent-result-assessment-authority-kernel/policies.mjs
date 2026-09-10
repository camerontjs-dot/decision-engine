export const VERIFIED_RESULT_CONTINUATION_POLICY = Object.freeze({
  id: "decision-engine.task-result.verified-continuation",
  version: "research-0",
});

export const REVIEWED_RESULT_CONTINUATION_POLICY = Object.freeze({
  id: "decision-engine.task-result.reviewed-continuation",
  version: "research-0",
});

const EFFECT = Object.freeze({
  type: "task.dispatch",
  version: "1",
  params: {},
});

function complete(disposition, reason, diagnostics = undefined) {
  const metadata = { reason_codes: [reason] };
  if (diagnostics) metadata.diagnostics = diagnostics;
  return {
    state: "completed",
    disposition,
    effect: EFFECT,
    metadata,
  };
}

function commonBlocker(authority) {
  if (authority.execution.state !== "completed") return "task_result_assessment_execution_not_completed";
  if (authority.completion.state !== "assessed") return "task_result_assessment_not_assessed";
  if (authority.state.outcome !== "task_result_verified") return "task_result_not_verified";
  return null;
}

function verifiedContinuation(authority) {
  const blocker = commonBlocker(authority);
  if (blocker) return complete("hold", blocker);
  return complete("clear", "verified_task_result_allows_continuation_candidate");
}

function reviewedContinuation(authority) {
  const blocker = commonBlocker(authority);
  if (blocker) return complete("hold", blocker);
  const review = authority.evidence.find((item) => item.id === "independent-review");
  if (review?.status !== "passed") {
    return complete("hold", "independent_review_not_established");
  }
  return complete("clear", "reviewed_verified_task_result_allows_continuation_candidate");
}

export const TASK_RESULT_POLICY_REGISTRY = new Map([
  [`${VERIFIED_RESULT_CONTINUATION_POLICY.id}@${VERIFIED_RESULT_CONTINUATION_POLICY.version}`, verifiedContinuation],
  [`${REVIEWED_RESULT_CONTINUATION_POLICY.id}@${REVIEWED_RESULT_CONTINUATION_POLICY.version}`, reviewedContinuation],
]);
