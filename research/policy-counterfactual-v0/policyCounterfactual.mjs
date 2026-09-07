import { evaluateGate } from "../../src/gate/gateHead.js";

const FORBIDDEN_PATH_SEGMENTS = new Set(["__proto__", "prototype", "constructor"]);

function clone(value) {
  return structuredClone(value);
}

function validatePath(path) {
  if (!Array.isArray(path) || path.length === 0) {
    throw new Error("patch path must be a non-empty array");
  }
  for (const segment of path) {
    if (typeof segment !== "string" || segment.length === 0) {
      throw new Error("patch path segments must be non-empty strings");
    }
    if (FORBIDDEN_PATH_SEGMENTS.has(segment)) {
      throw new Error(`unsafe patch path segment: ${segment}`);
    }
  }
}

function readPath(root, path) {
  let cursor = root;
  for (const segment of path) {
    if (cursor === null || typeof cursor !== "object" || !(segment in cursor)) {
      throw new Error(`patch path does not exist: ${path.join(".")}`);
    }
    cursor = cursor[segment];
  }
  return cursor;
}

function writePath(root, path, value) {
  validatePath(path);
  let cursor = root;
  for (const segment of path.slice(0, -1)) {
    if (cursor === null || typeof cursor !== "object" || !(segment in cursor)) {
      throw new Error(`patch parent path does not exist: ${path.join(".")}`);
    }
    cursor = cursor[segment];
  }
  const leaf = path.at(-1);
  if (cursor === null || typeof cursor !== "object" || !(leaf in cursor)) {
    throw new Error(`patch path does not exist: ${path.join(".")}`);
  }
  cursor[leaf] = clone(value);
}

function criterionOutcomeMap(receipt) {
  return Object.fromEntries(receipt.criteria.map((criterion) => [criterion.id, criterion.outcome]));
}

function changedCriteria(baseline, counterfactual) {
  const before = criterionOutcomeMap(baseline);
  const after = criterionOutcomeMap(counterfactual);
  const ids = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...ids]
    .filter((id) => before[id] !== after[id])
    .sort()
    .map((id) => ({ id, before: before[id] ?? null, after: after[id] ?? null }));
}

export function evaluateGatePolicyCounterfactual({ item, bar, patch }) {
  if (!item || typeof item !== "object") throw new Error("item must be an object");
  if (!bar || typeof bar !== "object") throw new Error("bar must be an object");
  if (!patch || typeof patch !== "object") throw new Error("patch must be an object");

  validatePath(patch.path);
  const baselineItem = clone(item);
  const hypotheticalItem = clone(item);
  const from = clone(readPath(hypotheticalItem, patch.path));
  writePath(hypotheticalItem, patch.path, patch.value);

  const baselineReceipt = evaluateGate(baselineItem, bar);
  const counterfactualReceipt = evaluateGate(hypotheticalItem, bar);

  return {
    semantics: "POLICY_COUNTERFACTUAL",
    policy: { id: bar.id, version: bar.version ?? null },
    item_id: item.id ?? null,
    assumptions: [
      "all item fields outside the explicit patch are held fixed",
      "the patch is a hypothetical policy input, not an observation or prediction about the world",
    ],
    world_causal_claim: false,
    patch: {
      path: patch.path.join("."),
      from,
      to: clone(patch.value),
    },
    baseline: baselineReceipt,
    counterfactual: counterfactualReceipt,
    recommendation_changed: baselineReceipt.decision !== counterfactualReceipt.decision,
    changed_criteria: changedCriteria(baselineReceipt, counterfactualReceipt),
  };
}

function validateCandidate(candidate) {
  if (!candidate || typeof candidate !== "object") throw new Error("candidate must be an object");
  if (!candidate.id) throw new Error("candidate needs an id");
  validatePath(candidate.path);
  if (!Array.isArray(candidate.admissibleValues) || candidate.admissibleValues.length === 0) {
    throw new Error(`candidate ${candidate.id} needs at least one admissible value`);
  }
}

export function classifyGateUnknownCandidate({ item, bar, candidate }) {
  validateCandidate(candidate);
  const baseline = evaluateGate(clone(item), bar);
  const counterfactuals = candidate.admissibleValues.map((value) =>
    evaluateGatePolicyCounterfactual({
      item,
      bar,
      patch: { path: candidate.path, value },
    }),
  );

  const recommendationChanges = counterfactuals.filter((result) => result.recommendation_changed);
  const decisionImpact = recommendationChanges.length > 0 ? "critical" : "invariant";
  const policyMandatory = Boolean(candidate.policyMandatory);
  const routingClass = policyMandatory
    ? "policy-mandatory"
    : decisionImpact === "critical"
      ? "decision-critical"
      : "decision-invariant";

  return {
    semantics: "POLICY_UNKNOWN_CLASSIFICATION",
    policy: { id: bar.id, version: bar.version ?? null },
    item_id: item.id ?? null,
    unknown_id: candidate.id,
    path: candidate.path.join("."),
    baseline_value: clone(readPath(item, candidate.path)),
    baseline_decision: baseline.decision,
    admissible_values: clone(candidate.admissibleValues),
    policy_mandatory: policyMandatory,
    decision_impact: decisionImpact,
    routing_class: routingClass,
    changing_values: recommendationChanges.map((result) => ({
      value: result.patch.to,
      decision: result.counterfactual.decision,
      changed_criteria: result.changed_criteria,
    })),
    world_causal_claim: false,
    scope_note:
      "classification is exact only for this policy version, this fixed baseline item, and the caller-supplied admissible values",
  };
}

export function classifyGateUnknowns({ item, bar, candidates }) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new Error("candidates must be a non-empty array");
  }
  const ids = new Set();
  for (const candidate of candidates) {
    validateCandidate(candidate);
    if (ids.has(candidate.id)) throw new Error(`duplicate candidate id: ${candidate.id}`);
    ids.add(candidate.id);
  }

  const baseline = evaluateGate(clone(item), bar);
  return {
    semantics: "POLICY_UNKNOWN_SET_CLASSIFICATION",
    policy: { id: bar.id, version: bar.version ?? null },
    item_id: item.id ?? null,
    baseline_decision: baseline.decision,
    world_causal_claim: false,
    candidates: candidates.map((candidate) => classifyGateUnknownCandidate({ item, bar, candidate })),
  };
}
