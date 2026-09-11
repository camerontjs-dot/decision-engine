import { exportContractD } from "./contractD.js";

function clone(value) {
  return structuredClone(value);
}

/**
 * Materialize already-evaluated trusted Decision state while preserving the
 * authority, policy, and target bindings established by upstream maintained
 * machinery.
 *
 * This is not an external trust boundary. Raw authority admission, target
 * resolution, policy dispatch, and policy evaluation must happen before this
 * function. decisionFragment owns only evaluation plus optional effect and
 * metadata. Any authority/policy/target fields present in decisionFragment are
 * intentionally ignored.
 */
export function materializeBoundDecision({
  inputAuthority,
  policy,
  target,
  decisionFragment,
}) {
  const state = {
    input_authority: clone(inputAuthority),
    policy: clone(policy),
    target: clone(target),
    evaluation: clone(decisionFragment?.evaluation),
  };

  if (decisionFragment && Object.prototype.hasOwnProperty.call(decisionFragment, "effect")) {
    state.effect = clone(decisionFragment.effect);
  }
  if (decisionFragment && Object.prototype.hasOwnProperty.call(decisionFragment, "metadata")) {
    state.metadata = clone(decisionFragment.metadata);
  }

  return exportContractD(state);
}
