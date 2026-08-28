import {
  DECISION as GATE_DECISION,
  OUTCOME as GATE_OUTCOME,
  SEVERITY as GATE_SEVERITY,
  defineBar,
  evaluateGate,
} from "../../src/gate/gateHead.js";
import { evaluateCriterion } from "./policyRuntime.mjs";

function matches(root, condition) {
  if (!condition) return true;
  const parts = condition.path.split(".");
  let value = root;
  for (const part of parts) {
    if (value == null || typeof value !== "object" || !(part in value)) return false;
    value = value[part];
  }
  if (condition.op === "eq") return value === condition.value;
  if (condition.op === "one_of") return condition.values.includes(value);
  return false;
}

function chooseRecommendation(root, policy, state) {
  for (const rule of policy.recommendationRules ?? []) {
    if (rule.state && rule.state !== state) continue;
    if (rule.when && !matches(root, rule.when)) continue;
    return rule.recommendation;
  }
  return policy.recommendations?.[state] ?? null;
}

export function evaluateViaCurrentGate({ subject, c, context = {}, policy }, options = {}) {
  const root = { c, context };
  const distortions = [];

  const bar = defineBar({
    id: policy.id,
    version: policy.version,
    description: `RC1 adapter for ${policy.id}`,
    requiresHumanApproval: Boolean(policy.requiresHumanApproval),
    criteria: policy.criteria.map((criterion) => ({
      id: criterion.id,
      description: criterion.id,
      severity: criterion.severity === "blocking" ? GATE_SEVERITY.BLOCKING : GATE_SEVERITY.ADVISORY,
      evaluate: () => {
        if (options.throwAtCriterion === criterion.id) {
          throw new Error(`injected resolver/runtime failure at ${criterion.id}`);
        }
        const result = evaluateCriterion(root, criterion);
        if (result.outcome === "not_applicable") {
          distortions.push({
            criterion_id: criterion.id,
            from: "not_applicable",
            to: "pass",
            reason: "current Gate has no not_applicable criterion outcome",
          });
          return {
            outcome: GATE_OUTCOME.PASS,
            observed: result.observed,
            note: "not_applicable coerced to pass for Gate compatibility",
          };
        }
        const mapped = {
          pass: GATE_OUTCOME.PASS,
          fail: GATE_OUTCOME.FAIL,
          unknown: GATE_OUTCOME.UNKNOWN,
        }[result.outcome];
        return { outcome: mapped, observed: result.observed, note: result.reason };
      },
    })),
  });

  const gate = evaluateGate({ id: subject, c, context }, bar);
  const state = {
    [GATE_DECISION.PROMOTE]: "satisfied",
    [GATE_DECISION.REJECT]: "unsatisfied",
    [GATE_DECISION.HOLD]: "unresolved",
  }[gate.decision];

  return {
    gate_decision: gate.decision,
    neutral_state: state,
    final_recommendation: chooseRecommendation(root, policy, state),
    requires_human_approval: gate.requiresHumanApproval,
    applied_automatically: gate.appliedAutomatically,
    blocking_failures: gate.blockingFailures,
    blocking_unknowns: gate.blockingUnknowns,
    semantic_distortions: distortions,
    criteria: gate.criteria,
  };
}
