/**
 * Separate representation of publication policy RC1.
 *
 * IMPORTANT EVIDENCE LIMIT:
 * This implementation is intentionally written without importing the candidate
 * runtime or Gate adapter, but it was produced in the same supervisory context.
 * It is therefore a separate implementation, not a contamination-free independent
 * reproduction. The result document must preserve that limitation.
 */

function criterion(id, outcome, reason = null, observed = null) {
  return { id, outcome, reason, observed };
}

export function evaluatePublicationTable(c, context = {}) {
  if (!c?.identity?.result_id || !c?.identity?.contract_b?.hash ||
      !c?.identity?.proposition?.hash || !c?.identity?.cal?.policy_hash ||
      !c?.execution || !c?.conclusion) {
    return {
      execution_status: "invalid_input",
      neutral_state: null,
      criteria: [],
      blocking_failures: [],
      blocking_unknowns: [],
      final_recommendation: null,
      approval_required: false,
      application_status: "not_applied",
    };
  }

  const rows = [];

  const execMap = { completed: "pass", partial: "unknown", failed: "unknown" };
  rows.push(criterion(
    "execution-complete",
    execMap[c.execution.status] ?? "fail",
    c.execution.status === "completed" ? null : "execution_incomplete",
    c.execution.status,
  ));

  const dispositionMap = { decided: "pass", abstained: "unknown", limited: "unknown" };
  rows.push(criterion(
    "cal-decided",
    dispositionMap[c.conclusion.disposition] ?? "fail",
    c.conclusion.disposition === "decided" ? null : "cal_abstained",
    c.conclusion.disposition,
  ));

  const verdictMap = {
    supported: "pass",
    partially_supported: "fail",
    unsupported: "fail",
    contradicted: "fail",
    overstated: "fail",
    not_checkable: "unknown",
  };
  const verdictOutcome = verdictMap[c.conclusion.verdict] ?? "fail";
  rows.push(criterion(
    "claim-supported-as-written",
    verdictOutcome,
    verdictOutcome === "fail" ? "claim_not_supportable_as_written" :
      verdictOutcome === "unknown" ? "policy_cannot_decide" : null,
    c.conclusion.verdict,
  ));

  const eligibilityMap = { eligible: "pass", ineligible: "fail", unknown: "unknown" };
  const eligibilityOutcome = eligibilityMap[c.assessments?.eligibility] ?? "unknown";
  rows.push(criterion(
    "evidence-eligible",
    eligibilityOutcome,
    eligibilityOutcome === "fail" ? "evidence_ineligible" :
      eligibilityOutcome === "unknown" ? (c.assessments?.eligibility_reason ?? "policy_cannot_decide") : null,
    c.assessments?.eligibility ?? null,
  ));

  const validityMap = { valid: "pass", invalid: "fail", unknown: "unknown" };
  const validityOutcome = validityMap[c.assessments?.semantic_validity] ?? "unknown";
  rows.push(criterion(
    "semantic-validity",
    validityOutcome,
    validityOutcome === "fail" ? "semantic_invalid" :
      validityOutcome === "unknown" ? (c.assessments?.semantic_validity_reason ?? "policy_cannot_decide") : null,
    c.assessments?.semantic_validity ?? null,
  ));

  const applicabilityMap = { applicable: "pass", not_applicable: "not_applicable", unknown: "unknown" };
  const applicabilityOutcome = applicabilityMap[c.assessments?.applicability] ?? "unknown";
  rows.push(criterion(
    "applicability",
    applicabilityOutcome,
    applicabilityOutcome === "not_applicable" ? "criterion_not_applicable" :
      applicabilityOutcome === "unknown" ? (c.assessments?.applicability_reason ?? "policy_cannot_decide") : null,
    c.assessments?.applicability ?? null,
  ));

  if (context.require_complete_aperture === true) {
    const apertureMap = { complete: "pass", incomplete: "fail", unknown: "unknown" };
    const apertureOutcome = apertureMap[c.assessments?.aperture] ?? "unknown";
    rows.push(criterion(
      "aperture",
      apertureOutcome,
      apertureOutcome === "fail" ? "aperture_incomplete" :
        apertureOutcome === "unknown" ? (c.assessments?.aperture_reason ?? "input_absent") : null,
      c.assessments?.aperture ?? null,
    ));
  } else {
    rows.push(criterion("aperture", "not_applicable", "criterion_not_applicable", null));
  }

  const counter = c.conclusion.counterevidence_count;
  const counterOutcome = typeof counter === "number" ? (counter <= 0 ? "pass" : "fail") : "unknown";
  rows.push(criterion(
    "counterevidence-within-tolerance",
    counterOutcome,
    counterOutcome === "fail" ? "material_counterevidence_present" :
      counterOutcome === "unknown" ? "input_absent" : null,
    typeof counter === "number" ? counter : null,
  ));

  const notApplicable = rows.some((r) => r.outcome === "not_applicable" && r.id === "applicability");
  const failures = rows.filter((r) => r.outcome === "fail").map((r) => r.id);
  const unknowns = rows.filter((r) => r.outcome === "unknown").map((r) => ({ id: r.id, reason: r.reason }));

  let state;
  if (notApplicable) state = "not_applicable";
  else if (failures.length) state = "unsatisfied";
  else if (unknowns.length) state = "unresolved";
  else state = "satisfied";

  const recommendations = {
    satisfied: "publishable_as_written",
    unsatisfied: "withhold_or_narrow",
    unresolved: "review_or_caveat",
    not_applicable: "not_applicable",
  };

  return {
    execution_status: "completed",
    neutral_state: state,
    criteria: rows.map(({ id, outcome, reason }) => ({ id, outcome, reason })),
    blocking_failures: failures,
    blocking_unknowns: unknowns,
    final_recommendation: recommendations[state],
    approval_required: true,
    application_status: "not_applied",
  };
}
