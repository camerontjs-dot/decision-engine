export const CONTRACT_D_VERSION = "1.0.0";

const ALLOWED_KEYS = new Set([
  "input_authority",
  "policy",
  "target",
  "evaluation",
  "effect",
  "metadata",
]);

function assertPlainObject(value, name) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object`);
  }
}

function cloneJson(value) {
  return structuredClone(value);
}

/**
 * Export already-owned Decision state as Contract D v1 wire state.
 *
 * This function does not decide policy, invent defaults, authorize an action,
 * or record execution. It only packages Decision state already supplied by the
 * caller. Contract validity and semantic normalization remain owned by the
 * canonical Apparatus Contract D validator.
 */
export function exportContractD(decisionState) {
  assertPlainObject(decisionState, "decisionState");

  for (const key of Object.keys(decisionState)) {
    if (!ALLOWED_KEYS.has(key)) {
      throw new TypeError(`unsupported Decision field for Contract D: ${key}`);
    }
  }

  for (const key of ["input_authority", "policy", "target", "evaluation"]) {
    if (!(key in decisionState)) {
      throw new TypeError(`missing Decision field for Contract D: ${key}`);
    }
  }

  assertPlainObject(decisionState.input_authority, "input_authority");
  assertPlainObject(decisionState.policy, "policy");
  assertPlainObject(decisionState.target, "target");
  assertPlainObject(decisionState.evaluation, "evaluation");

  const output = {
    contract_d_version: CONTRACT_D_VERSION,
    input_authority: cloneJson(decisionState.input_authority),
    policy: cloneJson(decisionState.policy),
    target: cloneJson(decisionState.target),
    evaluation: cloneJson(decisionState.evaluation),
  };

  if ("effect" in decisionState) {
    assertPlainObject(decisionState.effect, "effect");
    output.effect = cloneJson(decisionState.effect);
  }
  if ("metadata" in decisionState) {
    assertPlainObject(decisionState.metadata, "metadata");
    output.metadata = cloneJson(decisionState.metadata);
  }

  return output;
}
