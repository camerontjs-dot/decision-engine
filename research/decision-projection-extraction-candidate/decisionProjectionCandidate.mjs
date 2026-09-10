import { exportContractD } from "../../src/contractD.js";
import { canonicalizeContractDWithAuthority } from "../../src/contractDCanonicalOutput.js";

function clone(value) {
  return structuredClone(value);
}

/**
 * Production-shaped research candidate for reusable Decision materialization.
 *
 * Preconditions are intentionally outside this function:
 * - inputAuthority was established by a trusted domain adapter;
 * - target was established by a trusted target resolver;
 * - policy was selected by trusted fixed policy dispatch;
 * - evaluation/effect/metadata were produced by that trusted policy invocation.
 *
 * This function is not an external trust boundary. It performs no raw authority
 * admission, target resolution, policy dispatch, or policy evaluation.
 */
export function materializeBoundDecision({
  inputAuthority,
  policy,
  target,
  evaluation,
  effect = undefined,
  metadata = undefined,
  contractDAuthorityRoot,
}) {
  const state = {
    input_authority: clone(inputAuthority),
    policy: clone(policy),
    target: clone(target),
    evaluation: clone(evaluation),
  };

  if (effect !== undefined) state.effect = clone(effect);
  if (metadata !== undefined) state.metadata = clone(metadata);

  const decision = exportContractD(state);
  const bytes = canonicalizeContractDWithAuthority({ decision, contractDAuthorityRoot });
  return { decision, bytes };
}
