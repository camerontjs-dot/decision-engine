import { createHash } from "node:crypto";

export const AUTHORIZATION = Object.freeze({
  PERMIT: "permit",
  REQUIRE_APPROVAL: "require_approval",
  DENY: "deny",
});

const EXACT_SHAPE = Object.freeze({
  top: ["decision_envelope_version", "input", "policy", "target", "decision"],
  input: ["authority_kind", "authority_id"],
  policy: ["id", "version"],
  target: ["kind", "object_id", "content_sha256"],
  decision: ["disposition", "effect", "reason_codes"],
});

const EFFECT_ACTION = Object.freeze({
  add_verified_tag: "add_verified_tag",
  cite_as_evidence: "cite_as_evidence",
  dispatch_task: "dispatch_task",
});

const EFFECT_TARGET_KIND = Object.freeze({
  add_verified_tag: "mainframe_knowledge_object",
  cite_as_evidence: "mindgraph_retrieval_result",
  dispatch_task: "mainframe_task",
});

const HIGH_RISK_DOMAINS = new Set(["medical", "legal", "compliance", "finance"]);

export function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function exactKeys(object, expected) {
  return object
    && typeof object === "object"
    && !Array.isArray(object)
    && JSON.stringify(Object.keys(object).sort()) === JSON.stringify([...expected].sort());
}

export function conformsCommonEnvelope(decision) {
  return Boolean(
    exactKeys(decision, EXACT_SHAPE.top)
    && exactKeys(decision.input, EXACT_SHAPE.input)
    && exactKeys(decision.policy, EXACT_SHAPE.policy)
    && exactKeys(decision.target, EXACT_SHAPE.target)
    && exactKeys(decision.decision, EXACT_SHAPE.decision)
    && typeof decision.decision_envelope_version === "string"
    && typeof decision.input.authority_kind === "string"
    && typeof decision.input.authority_id === "string"
    && typeof decision.policy.id === "string"
    && typeof decision.policy.version === "string"
    && typeof decision.target.kind === "string"
    && typeof decision.target.object_id === "string"
    && typeof decision.target.content_sha256 === "string"
    && typeof decision.decision.disposition === "string"
    && typeof decision.decision.effect === "string"
    && Array.isArray(decision.decision.reason_codes)
  );
}

function deny(reason, decisionSha) {
  return Object.freeze({
    authorization: AUTHORIZATION.DENY,
    reason,
    decisionSha,
    mutatesExternalState: false,
  });
}

function approvalRequired(reason, decisionSha) {
  return Object.freeze({
    authorization: AUTHORIZATION.REQUIRE_APPROVAL,
    reason,
    decisionSha,
    mutatesExternalState: false,
  });
}

function permit(reason, decisionSha) {
  return Object.freeze({
    authorization: AUTHORIZATION.PERMIT,
    reason,
    decisionSha,
    mutatesExternalState: false,
  });
}

/**
 * Research-only authorization consumer for three MainFrame policy effects.
 *
 * Decision owns the policy conclusion and exact target. Authorization owns
 * actor, requested action, approval state, and delegation profile. No external
 * state is read or mutated.
 */
export function evaluateAuthorization({
  decisionBytes,
  request,
  authorizationProfile,
  decisionState = "current",
}) {
  if (!Buffer.isBuffer(decisionBytes)) {
    throw new TypeError("decisionBytes must be a Buffer");
  }
  const decisionSha = sha256(decisionBytes);

  let decision;
  try {
    decision = JSON.parse(decisionBytes.toString("utf8"));
  } catch {
    return deny("decision_unparseable", decisionSha);
  }

  if (!conformsCommonEnvelope(decision)) {
    return deny("decision_shape_invalid", decisionSha);
  }
  if (decisionState !== "current") {
    return deny("decision_not_current", decisionSha);
  }
  if (decision.decision.disposition !== "eligible") {
    return deny("decision_not_authorizable", decisionSha);
  }

  const effect = decision.decision.effect;
  const expectedAction = EFFECT_ACTION[effect];
  const expectedKind = EFFECT_TARGET_KIND[effect];
  if (!expectedAction || request?.action !== expectedAction) {
    return deny("action_effect_mismatch", decisionSha);
  }
  if (decision.target.kind !== expectedKind) {
    return deny("effect_target_kind_mismatch", decisionSha);
  }
  if (
    request?.targetObjectId !== decision.target.object_id
    || request?.targetContentSha256 !== decision.target.content_sha256
  ) {
    return deny("target_mismatch", decisionSha);
  }

  const allowedActors = Array.isArray(authorizationProfile?.authorizedActors)
    ? authorizationProfile.authorizedActors
    : [];
  if (!allowedActors.includes(request?.actor)) {
    return deny("actor_not_authorized", decisionSha);
  }

  // Citation use is already a machine-readable MainFrame trust boundary. A
  // citable Decision may be consumed directly by a governed agent.
  if (effect === "cite_as_evidence") {
    return permit("citation_use_authorized", decisionSha);
  }

  // Source-audit state mutation remains operator-controlled in the current
  // profile, but a separate research delegation profile can tune this without
  // rewriting Decision semantics.
  if (effect === "add_verified_tag") {
    if (request?.humanApproval === true) {
      return permit("operator_approval_present", decisionSha);
    }
    if (
      authorizationProfile?.mode === "research-delegated-low-risk"
      && !HIGH_RISK_DOMAINS.has(String(request?.domain || "").toLowerCase())
    ) {
      return permit("delegated_low_risk_profile", decisionSha);
    }
    return approvalRequired("knowledge_state_requires_approval", decisionSha);
  }

  // Real task dispatch remains manual in the MainFrame canary authority used
  // for this experiment. A delegation profile does not override that bound.
  if (effect === "dispatch_task") {
    return request?.humanApproval === true
      ? permit("operator_approval_present", decisionSha)
      : approvalRequired("task_dispatch_requires_approval", decisionSha);
  }

  return deny("no_authorization_rule", decisionSha);
}

/**
 * Deliberately weak control: checks only that a Decision says "eligible" and
 * target identity matches. It ignores the typed effect, so it should permit
 * cross-use-case action substitution and thereby fail the RC1 decision gate.
 */
export function weakDispositionOnlyAuthorization({ decisionBytes, request }) {
  const decisionSha = sha256(decisionBytes);
  let decision;
  try {
    decision = JSON.parse(decisionBytes.toString("utf8"));
  } catch {
    return deny("decision_unparseable", decisionSha);
  }
  if (decision?.decision?.disposition !== "eligible") {
    return deny("decision_not_authorizable", decisionSha);
  }
  if (
    request?.targetObjectId !== decision?.target?.object_id
    || request?.targetContentSha256 !== decision?.target?.content_sha256
  ) {
    return deny("target_mismatch", decisionSha);
  }
  return permit("weak_eligible_only", decisionSha);
}
