import { exportContractD } from "../../src/contractD.js";
import { canonicalizeContractDWithAuthority } from "../../src/contractDCanonicalOutput.js";

export class ProjectionKernelError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ProjectionKernelError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new ProjectionKernelError(code, message);
}

function plainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value, keys, label) {
  if (!plainObject(value)) fail("invalid_projection_input", `${label} must be an object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail("invalid_projection_input", `${label} keys must be exactly ${expected.join(",")}`);
  }
}

function nonEmpty(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    fail("invalid_projection_input", `${label} must be a non-empty string`);
  }
}

function validateBoundIdentity(value, label) {
  exactKeys(value, ["id", "immutable_id", "kind"], label);
  nonEmpty(value.kind, `${label}.kind`);
  nonEmpty(value.id, `${label}.id`);
  nonEmpty(value.immutable_id, `${label}.immutable_id`);
}

function validateTarget(value) {
  exactKeys(value, ["content_sha256", "id", "kind"], "target");
  nonEmpty(value.kind, "target.kind");
  nonEmpty(value.id, "target.id");
  nonEmpty(value.content_sha256, "target.content_sha256");
}

function validatePolicy(value) {
  exactKeys(value, ["id", "version"], "policy");
  nonEmpty(value.id, "policy.id");
  nonEmpty(value.version, "policy.version");
}

function policyKey(policy) {
  return `${policy.id}@${policy.version}`;
}

function normalize(result) {
  if (!plainObject(result)) fail("invalid_policy_result", "policy result must be an object");
  if (result.state === "failed") {
    if (result.effect !== undefined) fail("invalid_policy_result", "failed result cannot carry effect");
    return {
      evaluation: { state: "failed" },
      metadata: result.metadata,
    };
  }
  if (result.state !== "completed" || !["clear", "hold"].includes(result.disposition)) {
    fail("invalid_policy_result", "completed result must have clear or hold disposition");
  }
  if (!plainObject(result.effect)) fail("invalid_policy_result", "completed result must carry effect");
  return {
    evaluation: { state: "completed", disposition: result.disposition },
    effect: result.effect,
    metadata: result.metadata,
  };
}

export function projectDecision({
  admittedAuthority,
  inputAuthority,
  resolvedTarget,
  policy,
  policyRegistry,
  contractDAuthorityRoot,
}) {
  validateBoundIdentity(inputAuthority, "inputAuthority");
  validateTarget(resolvedTarget.target);
  validatePolicy(policy);

  const evaluator = policyRegistry.get(policyKey(policy));
  if (typeof evaluator !== "function") {
    fail("unknown_policy", `unknown policy ${policyKey(policy)}`);
  }

  const normalized = normalize(evaluator({
    authority: admittedAuthority,
    resolution: resolvedTarget,
  }));

  const state = {
    input_authority: structuredClone(inputAuthority),
    policy: structuredClone(policy),
    target: structuredClone(resolvedTarget.target),
    evaluation: normalized.evaluation,
  };
  if (normalized.effect !== undefined) state.effect = structuredClone(normalized.effect);
  if (normalized.metadata !== undefined) state.metadata = structuredClone(normalized.metadata);

  const decision = exportContractD(state);
  const bytes = canonicalizeContractDWithAuthority({ decision, contractDAuthorityRoot });
  return { decision, bytes };
}
