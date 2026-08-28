import { createHash } from "node:crypto";

export const RUNTIME_ID = "decision-engine-research-runtime/contract-c-rc1";

export const OUTCOME = Object.freeze({
  PASS: "pass",
  FAIL: "fail",
  UNKNOWN: "unknown",
  NOT_APPLICABLE: "not_applicable",
});

export const EXECUTION_STATUS = Object.freeze({
  COMPLETED: "completed",
  INVALID_INPUT: "invalid_input",
  INVALID_POLICY: "invalid_policy",
  SYSTEM_ERROR: "system_error",
});

export function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

export function sha256(value) {
  const bytes = typeof value === "string" ? value : canonicalJson(value);
  return createHash("sha256").update(bytes).digest("hex");
}

export function getPath(root, path) {
  const parts = path.split(".");
  let current = root;
  for (const part of parts) {
    if (current == null || typeof current !== "object" || !(part in current)) {
      return { found: false, value: undefined };
    }
    current = current[part];
  }
  return { found: true, value: current };
}

function conditionMatches(root, condition) {
  if (!condition) return true;
  const observed = getPath(root, condition.path);
  if (!observed.found) return false;
  switch (condition.op) {
    case "eq": return observed.value === condition.value;
    case "one_of": return condition.values.includes(observed.value);
    case "truthy": return Boolean(observed.value);
    case "falsy": return !observed.value;
    default: throw new Error(`unknown condition operator ${condition.op}`);
  }
}

function validatePolicy(policy) {
  if (!policy || typeof policy !== "object") return "policy is not an object";
  if (!policy.id || !policy.version) return "policy identity is incomplete";
  if (!Array.isArray(policy.criteria) || policy.criteria.length === 0) {
    return "policy needs criteria";
  }
  const ids = new Set();
  for (const criterion of policy.criteria) {
    if (!criterion.id || ids.has(criterion.id)) return "criterion ids must be unique";
    ids.add(criterion.id);
    if (!["blocking", "advisory"].includes(criterion.severity)) {
      return `criterion ${criterion.id} has invalid severity`;
    }
    if (!criterion.path) return `criterion ${criterion.id} has no path`;
    if (!criterion.op && !criterion.valueOutcomes) {
      return `criterion ${criterion.id} has no operator`;
    }
    if (criterion.op && !["eq", "one_of", "lte", "gte", "empty", "truthy", "falsy"].includes(criterion.op)) {
      return `criterion ${criterion.id} has unsupported operator ${criterion.op}`;
    }
    if (criterion.mismatchOutcome && !Object.values(OUTCOME).includes(criterion.mismatchOutcome)) {
      return `criterion ${criterion.id} has invalid mismatchOutcome`;
    }
    if (criterion.valueOutcomes) {
      for (const outcome of Object.values(criterion.valueOutcomes)) {
        if (!Object.values(OUTCOME).includes(outcome)) {
          return `criterion ${criterion.id} has invalid value outcome`;
        }
      }
    }
  }
  return null;
}

function validateCoreInput(c) {
  if (!c || typeof c !== "object") return "Contract-C-like input is not an object";
  if (!c.identity || typeof c.identity !== "object") return "missing identity object";
  if (!c.identity.result_id) return "missing identity.result_id";
  if (!c.identity.contract_b || !c.identity.contract_b.hash) return "missing Contract-B binding";
  if (!c.identity.proposition || !c.identity.proposition.hash) return "missing proposition binding";
  if (!c.identity.cal || !c.identity.cal.policy_hash) return "missing CAL policy binding";
  if (!c.execution || typeof c.execution.status !== "string") return "missing execution status";
  if (!c.conclusion || typeof c.conclusion !== "object") return "missing conclusion object";
  return null;
}

function compare(op, observed, criterion) {
  switch (op) {
    case "eq": return observed === criterion.value;
    case "one_of": return criterion.values.includes(observed);
    case "lte": return typeof observed === "number" && observed <= criterion.value;
    case "gte": return typeof observed === "number" && observed >= criterion.value;
    case "empty": return Array.isArray(observed) ? observed.length === 0 : observed == null || observed === "";
    case "truthy": return Boolean(observed);
    case "falsy": return !observed;
    default: throw new Error(`unsupported operator ${op}`);
  }
}

export function evaluateCriterion(root, criterion) {
  if (criterion.applicability && !conditionMatches(root, criterion.applicability)) {
    return {
      id: criterion.id,
      severity: criterion.severity,
      outcome: OUTCOME.NOT_APPLICABLE,
      observed: null,
      reason: "criterion_not_applicable",
      path: criterion.path,
      not_applicable_effect: criterion.notApplicableEffect ?? "ignore",
    };
  }

  const observed = getPath(root, criterion.path);
  if (!observed.found) {
    return {
      id: criterion.id,
      severity: criterion.severity,
      outcome: OUTCOME.UNKNOWN,
      observed: null,
      reason: "input_absent",
      path: criterion.path,
    };
  }

  let outcome;
  let reason = null;
  if (criterion.valueOutcomes && Object.prototype.hasOwnProperty.call(criterion.valueOutcomes, String(observed.value))) {
    outcome = criterion.valueOutcomes[String(observed.value)];
  } else if (criterion.unknownValues?.includes(observed.value)) {
    outcome = OUTCOME.UNKNOWN;
  } else {
    const matches = compare(criterion.op, observed.value, criterion);
    outcome = matches ? OUTCOME.PASS : (criterion.mismatchOutcome ?? OUTCOME.FAIL);
  }

  if (outcome === OUTCOME.UNKNOWN) {
    if (criterion.unknownReasonPath) {
      const reasonValue = getPath(root, criterion.unknownReasonPath);
      reason = reasonValue.found ? reasonValue.value : null;
    }
    reason = reason ?? criterion.unknownReason ?? "policy_cannot_decide";
  } else if (outcome === OUTCOME.NOT_APPLICABLE) {
    reason = "criterion_not_applicable";
  } else if (outcome === OUTCOME.FAIL) {
    reason = criterion.failReason ?? "criterion_unsatisfied";
  }

  return {
    id: criterion.id,
    severity: criterion.severity,
    outcome,
    observed: observed.value,
    reason,
    path: criterion.path,
    not_applicable_effect: criterion.notApplicableEffect ?? "ignore",
  };
}

function chooseState(criteria) {
  const blocking = criteria.filter((c) => c.severity === "blocking");
  const blockingNotApplicable = blocking.filter(
    (c) => c.outcome === OUTCOME.NOT_APPLICABLE && c.not_applicable_effect === "policy",
  );
  if (blockingNotApplicable.length > 0) return "not_applicable";
  if (blocking.some((c) => c.outcome === OUTCOME.FAIL)) return "unsatisfied";
  if (blocking.some((c) => c.outcome === OUTCOME.UNKNOWN)) return "unresolved";
  return "satisfied";
}

function chooseRecommendation(root, policy, state) {
  for (const rule of policy.recommendationRules ?? []) {
    if (rule.state && rule.state !== state) continue;
    if (rule.when && !conditionMatches(root, rule.when)) continue;
    return rule.recommendation;
  }
  return policy.recommendations?.[state] ?? null;
}

function failureEnvelope({ executionStatus, subject, inputHash, inputId, policy, policyHash, contextHash, error }) {
  return {
    decision_id: sha256({
      namespace: "decision-engine-rc1",
      subject,
      inputHash,
      policyHash,
      contextHash,
      executionStatus,
    }),
    subject,
    input: { result_id: inputId ?? null, hash: inputHash ?? null },
    policy: policy ? { id: policy.id ?? null, version: policy.version ?? null, hash: policyHash ?? null } : null,
    runtime: { id: RUNTIME_ID },
    execution_status: executionStatus,
    neutral_state: null,
    criteria: [],
    blocking_failures: [],
    blocking_unknowns: [],
    caveats: [],
    final_recommendation: null,
    approval: { required: false },
    application: { status: "not_applied", authority: "external" },
    error,
    receipt_hash: null,
  };
}

export function evaluateDecision({ subject, c, context = {}, policy }, options = {}) {
  const inputHash = c ? sha256(c) : null;
  const contextHash = sha256(context);
  const inputId = c?.identity?.result_id ?? null;
  const coreError = validateCoreInput(c);
  if (coreError) {
    return failureEnvelope({
      executionStatus: EXECUTION_STATUS.INVALID_INPUT,
      subject,
      inputHash,
      inputId,
      policy,
      policyHash: policy ? sha256(policy) : null,
      contextHash,
      error: { type: "malformed_artifact", message: coreError },
    });
  }

  const policyError = validatePolicy(policy);
  const policyHash = policy ? sha256(policy) : null;
  if (policyError) {
    return failureEnvelope({
      executionStatus: EXECUTION_STATUS.INVALID_POLICY,
      subject,
      inputHash,
      inputId,
      policy,
      policyHash,
      contextHash,
      error: { type: "malformed_policy", message: policyError },
    });
  }

  const root = { c, context };
  let criteria;
  try {
    criteria = policy.criteria.map((criterion) => {
      if (options.faultAtCriterion === criterion.id) {
        throw new Error(`injected runtime failure at ${criterion.id}`);
      }
      return evaluateCriterion(root, criterion);
    });
  } catch (error) {
    return failureEnvelope({
      executionStatus: EXECUTION_STATUS.SYSTEM_ERROR,
      subject,
      inputHash,
      inputId,
      policy,
      policyHash,
      contextHash,
      error: { type: "runtime_failure", message: error.message },
    });
  }

  const neutralState = chooseState(criteria);
  const blockingFailures = criteria
    .filter((c) => c.severity === "blocking" && c.outcome === OUTCOME.FAIL)
    .map((c) => c.id);
  const blockingUnknowns = criteria
    .filter((c) => c.severity === "blocking" && c.outcome === OUTCOME.UNKNOWN)
    .map((c) => ({ id: c.id, reason: c.reason }));
  const caveats = criteria
    .filter((c) => c.severity === "advisory" && c.outcome !== OUTCOME.PASS)
    .map((c) => ({ id: c.id, outcome: c.outcome, reason: c.reason, observed: c.observed }));

  const receiptWithoutHash = {
    decision_id: sha256({
      namespace: "decision-engine-rc1",
      subject,
      inputHash,
      policyHash,
      contextHash,
    }),
    subject,
    input: { result_id: c.identity.result_id, hash: inputHash },
    policy: { id: policy.id, version: policy.version, hash: policyHash },
    runtime: { id: RUNTIME_ID },
    execution_status: EXECUTION_STATUS.COMPLETED,
    neutral_state: neutralState,
    criteria,
    blocking_failures: blockingFailures,
    blocking_unknowns: blockingUnknowns,
    caveats,
    final_recommendation: chooseRecommendation(root, policy, neutralState),
    approval: { required: Boolean(policy.requiresHumanApproval) },
    application: { status: "not_applied", authority: policy.actionAuthority ?? "external" },
    error: null,
  };

  return {
    ...receiptWithoutHash,
    receipt_hash: sha256(receiptWithoutHash),
  };
}

export function semanticReceipt(receipt) {
  return {
    execution_status: receipt.execution_status,
    neutral_state: receipt.neutral_state,
    criteria: receipt.criteria.map(({ id, outcome, reason }) => ({ id, outcome, reason })),
    blocking_failures: receipt.blocking_failures,
    blocking_unknowns: receipt.blocking_unknowns,
    final_recommendation: receipt.final_recommendation,
    approval_required: receipt.approval.required,
    application_status: receipt.application.status,
  };
}
