import { exportContractD } from "../../src/contractD.js";
import { canonicalizeContractDWithAuthority } from "../../src/contractDCanonicalOutput.js";

function clone(value) {
  return structuredClone(value);
}

/**
 * Research candidate for the smallest domain-neutral Decision projection seam.
 *
 * Trusted authority admission, target resolution, policy implementation dispatch,
 * and policy-specific semantic evaluation all happen before this function.
 * This layer owns only external binding plus exact Contract D materialization.
 *
 * decisionFragment may contain evaluation/effect/metadata only in authority.
 * Any other caller fields are intentionally ignored so the fragment cannot
 * override input_authority, policy, or target bindings established outside it.
 */
export function projectBoundDecisionFragment({
  inputAuthority,
  policy,
  target,
  decisionFragment,
  contractDAuthorityRoot,
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

  const decision = exportContractD(state);
  const bytes = canonicalizeContractDWithAuthority({ decision, contractDAuthorityRoot });
  return { decision, bytes };
}
