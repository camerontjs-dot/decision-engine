import { createHash } from "node:crypto";

export const AUTHORIZATION = Object.freeze({
  PERMIT: "permit",
  REQUIRE_APPROVAL: "require_approval",
  DENY: "deny",
});

export const ACTION = Object.freeze({
  ADD_VERIFIED_TAG: "add_verified_tag",
  PROMOTE_STABLE: "promote_stable",
});

const HIGH_RISK_DOMAINS = new Set(["medical", "legal", "compliance", "finance"]);
const AUTHORIZABLE_DISPOSITION = "eligible_for_verified_state";

export function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function deny(reason, decisionSha) {
  return Object.freeze({
    authorization: AUTHORIZATION.DENY,
    reason,
    decisionSha,
    mutatesExternalState: false,
  });
}

/**
 * Research-only authorization consumer.
 *
 * It deliberately consumes no Contract C fields and performs no external I/O.
 * The Decision object supplies a bounded policy disposition and exact target;
 * operational authority comes from profile + actor + action + target context.
 */
export function evaluateAuthorization({
  decisionBytes,
  profile,
  request,
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

  if (decisionState !== "current") {
    return deny("decision_not_current", decisionSha);
  }
  if (decision?.decision?.disposition !== AUTHORIZABLE_DISPOSITION) {
    return deny("decision_not_authorizable", decisionSha);
  }

  const target = decision?.target;
  if (
    !target
    || request?.targetObjectId !== target.object_id
    || request?.targetContentSha256 !== target.content_sha256
  ) {
    return deny("target_mismatch", decisionSha);
  }

  if (!profile?.authorizedActors?.includes(request?.actor)) {
    return deny("actor_not_authorized", decisionSha);
  }

  if (!profile?.allowedActions?.includes(request?.action)) {
    return deny("action_out_of_scope", decisionSha);
  }

  // MainFrame's current stable-status boundary remains operator controlled in
  // every RC0 profile. This is authorization policy, not Decision semantics.
  if (request.action === ACTION.PROMOTE_STABLE) {
    return Object.freeze({
      authorization: AUTHORIZATION.REQUIRE_APPROVAL,
      reason: "stable_promotion_requires_approval",
      decisionSha,
      mutatesExternalState: false,
    });
  }

  if (profile.mode === "manual") {
    return Object.freeze({
      authorization: AUTHORIZATION.REQUIRE_APPROVAL,
      reason: "manual_profile",
      decisionSha,
      mutatesExternalState: false,
    });
  }

  if (HIGH_RISK_DOMAINS.has(String(request?.domain || "").toLowerCase())) {
    return Object.freeze({
      authorization: AUTHORIZATION.REQUIRE_APPROVAL,
      reason: "high_risk_domain",
      decisionSha,
      mutatesExternalState: false,
    });
  }

  if (
    request.action === ACTION.ADD_VERIFIED_TAG
    && ["supervised", "delegated-low-risk"].includes(profile.mode)
  ) {
    return Object.freeze({
      authorization: AUTHORIZATION.PERMIT,
      reason: "profile_allows_low_risk_verified_tag",
      decisionSha,
      mutatesExternalState: false,
    });
  }

  return deny("no_authorization_rule", decisionSha);
}
