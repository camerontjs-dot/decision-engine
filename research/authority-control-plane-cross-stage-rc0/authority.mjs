export const JURISDICTION = Object.freeze({
  IN: "IN_JURISDICTION",
  OUT: "OUT_OF_JURISDICTION",
  HIGHER: "REQUIRES_HIGHER_AUTHORITY",
  INDETERMINATE: "INDETERMINATE",
});

function result(jurisdiction, reason, profileId = null) {
  return Object.freeze({ jurisdiction, reason, profile_id: profileId });
}

function parseTime(value) {
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function requestIsComplete(request) {
  return Boolean(
    request
    && typeof request.actor === "string"
    && typeof request.operation === "string"
    && request.target
    && typeof request.target.class === "string"
    && typeof request.target.id === "string"
    && Number.isInteger(request.batch_size)
    && request.batch_size > 0
  );
}

function ruleMatches(rule, request) {
  return Boolean(
    rule.actor === request.actor
    && rule.operation === request.operation
    && Array.isArray(rule.target_classes)
    && rule.target_classes.includes(request.target.class)
  );
}

export function evaluateJurisdiction({ profile, request, operationRegistry, now }) {
  if (!profile || !operationRegistry || typeof now !== "string") {
    return result(JURISDICTION.INDETERMINATE, "authority_state_missing");
  }
  if (!requestIsComplete(request)) {
    return result(JURISDICTION.INDETERMINATE, "request_incomplete", profile.id ?? null);
  }

  const operation = operationRegistry[request.operation];
  if (!operation) {
    return result(JURISDICTION.INDETERMINATE, "operation_unknown", profile.id ?? null);
  }
  if (!Array.isArray(operation.target_classes) || !operation.target_classes.includes(request.target.class)) {
    return result(JURISDICTION.OUT, "operation_target_class_mismatch", profile.id ?? null);
  }

  if (profile.revoked === true) {
    return result(JURISDICTION.OUT, "authority_revoked", profile.id ?? null);
  }
  const at = parseTime(now);
  const validFrom = parseTime(profile.valid_from);
  const validUntil = parseTime(profile.valid_until);
  if (at === null || validFrom === null || validUntil === null) {
    return result(JURISDICTION.INDETERMINATE, "authority_time_unparseable", profile.id ?? null);
  }
  if (at < validFrom || at > validUntil) {
    return result(JURISDICTION.OUT, "authority_not_current", profile.id ?? null);
  }

  const grants = Array.isArray(profile.grants) ? profile.grants : [];
  const escalations = Array.isArray(profile.escalations) ? profile.escalations : [];
  const matchingGrants = grants.filter((rule) => ruleMatches(rule, request));

  for (const grant of matchingGrants) {
    if (grant.requires_independent_verifier === true && request.context?.executor_actor === request.actor) {
      return result(JURISDICTION.OUT, "independence_requirement_failed", profile.id ?? null);
    }
    if (request.batch_size <= grant.max_batch) {
      return result(JURISDICTION.IN, "delegated_scope_matches", profile.id ?? null);
    }
  }

  const matchingEscalation = escalations.find(
    (rule) => ruleMatches(rule, request) && request.batch_size <= rule.max_batch,
  );
  if (matchingEscalation) {
    return result(JURISDICTION.HIGHER, "delegated_scope_insufficient", profile.id ?? null);
  }

  if (matchingGrants.length > 0) {
    return result(JURISDICTION.OUT, "requested_scope_exceeds_authority", profile.id ?? null);
  }

  return result(JURISDICTION.OUT, "actor_or_scope_not_authorized", profile.id ?? null);
}

export function deriveDelegatedProfile(parent, specification) {
  if (!parent || !specification || !Array.isArray(specification.grants)) {
    return Object.freeze({ ok: false, reason: "delegation_input_invalid" });
  }
  if (parent.revoked === true) {
    return Object.freeze({ ok: false, reason: "parent_revoked" });
  }
  const parentUntil = parseTime(parent.valid_until);
  const childUntil = parseTime(specification.valid_until);
  if (parentUntil === null || childUntil === null || childUntil > parentUntil) {
    return Object.freeze({ ok: false, reason: "delegation_expiry_exceeds_parent" });
  }

  for (const requested of specification.grants) {
    const parentGrant = (parent.grants || []).find((grant) => (
      grant.actor === requested.actor
      && grant.operation === requested.operation
      && requested.target_classes.every((targetClass) => grant.target_classes.includes(targetClass))
      && requested.max_batch <= grant.max_batch
    ));
    if (!parentGrant) {
      return Object.freeze({ ok: false, reason: "delegation_exceeds_parent_scope" });
    }
  }

  return Object.freeze({
    ok: true,
    profile: Object.freeze({
      id: specification.id,
      valid_from: specification.valid_from ?? parent.valid_from,
      valid_until: specification.valid_until,
      revoked: false,
      grants: specification.grants.map((grant) => Object.freeze({ ...grant })),
      escalations: [],
    }),
  });
}

export function semanticsAwareNegativeControl({ profile, request, operationRegistry, now }) {
  if (
    request?.operation === "repository.write.runtime"
    && request?.semantic_payload?.opaque === "semantic-allows-protected"
  ) {
    return result(JURISDICTION.IN, "semantic_payload_improperly_granted_authority", profile?.id ?? null);
  }
  return evaluateJurisdiction({ profile, request, operationRegistry, now });
}

export function verifyObservedOutcome({ executionAuthorization, executorReport, observedPostState, verifierJurisdiction }) {
  const observedMap = Object.freeze({
    APPLIED: "VERIFIED_APPLIED",
    NOT_APPLIED: "VERIFIED_NOT_APPLIED",
    PARTIAL: "VERIFIED_PARTIAL",
    UNKNOWN: "VERIFIED_UNKNOWN",
  });

  if (verifierJurisdiction !== JURISDICTION.IN) {
    return Object.freeze({
      authoritative: false,
      outcome: "UNVERIFIED",
      execution_authorization: executionAuthorization,
      executor_report: executorReport,
      observed_post_state: observedPostState,
    });
  }

  return Object.freeze({
    authoritative: true,
    outcome: observedMap[observedPostState] ?? "VERIFIED_UNKNOWN",
    execution_authorization: executionAuthorization,
    executor_report: executorReport,
    observed_post_state: observedPostState,
  });
}
