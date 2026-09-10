export const REGRESSION_REVIEW_POLICY = Object.freeze({
  id: "decision-engine.release-qualification.regression-maintenance-review",
  version: "research-0",
});

export const PRODUCTION_REVIEW_POLICY = Object.freeze({
  id: "decision-engine.release-qualification.production-promotion-review",
  version: "research-0",
});

const DISPATCH_EFFECT = Object.freeze({
  type: "task.dispatch",
  version: "1",
  params: {},
});

function evidenceMap(authority) {
  return new Map(authority.evidence.map((item) => [item.id, item]));
}

function completed(disposition, reason, diagnostics = undefined) {
  const metadata = {
    reason_codes: [reason],
  };
  if (diagnostics !== undefined) {
    metadata.diagnostics = diagnostics;
  }
  return {
    state: "completed",
    disposition,
    effect: DISPATCH_EFFECT,
    metadata,
  };
}

function commonQualificationBlocker(authority) {
  if (authority.execution.state !== "completed") {
    return "assessment_execution_not_completed";
  }
  if (authority.completion.state !== "assessed") {
    return "assessment_not_assessed";
  }
  if (authority.state.outcome !== "bounded_qualification_supported") {
    return "bounded_qualification_not_supported";
  }

  const byId = evidenceMap(authority);
  if (byId.get("required-ci")?.status !== "passed") {
    return "required_ci_not_passed";
  }
  if (byId.get("contract-first-cli-conformance")?.status !== "passed") {
    return "contract_first_conformance_not_passed";
  }
  return null;
}

function regressionMaintenanceReview(authority) {
  const blocker = commonQualificationBlocker(authority);
  if (blocker) {
    return completed("hold", blocker);
  }
  return completed(
    "clear",
    "bounded_qualification_satisfies_regression_review_policy",
    {
      consumed_evidence_ids: ["required-ci", "contract-first-cli-conformance"],
    },
  );
}

function productionPromotionReview(authority) {
  const blocker = commonQualificationBlocker(authority);
  if (blocker) {
    return completed("hold", blocker);
  }

  const byId = evidenceMap(authority);
  if (byId.get("independent-reproduction")?.status !== "passed") {
    return completed(
      "hold",
      "independent_reproduction_not_established",
      {
        consumed_evidence_ids: [
          "required-ci",
          "contract-first-cli-conformance",
          "independent-reproduction",
        ],
      },
    );
  }

  return completed(
    "clear",
    "bounded_qualification_satisfies_production_review_policy",
    {
      consumed_evidence_ids: [
        "required-ci",
        "contract-first-cli-conformance",
        "independent-reproduction",
      ],
    },
  );
}

export const RELEASE_POLICY_REGISTRY = new Map([
  [`${REGRESSION_REVIEW_POLICY.id}@${REGRESSION_REVIEW_POLICY.version}`, regressionMaintenanceReview],
  [`${PRODUCTION_REVIEW_POLICY.id}@${PRODUCTION_REVIEW_POLICY.version}`, productionPromotionReview],
]);
