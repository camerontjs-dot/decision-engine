export const REFERENCE_JURISDICTION = Object.freeze({
  IN: "IN_JURISDICTION",
  OUT: "OUT_OF_JURISDICTION",
  HIGHER: "REQUIRES_HIGHER_AUTHORITY",
  INDETERMINATE: "INDETERMINATE",
});

function validRequest(request) {
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

function current(profile, now) {
  const time = Date.parse(now);
  const from = Date.parse(profile?.valid_from);
  const until = Date.parse(profile?.valid_until);
  if (![time, from, until].every(Number.isFinite)) return null;
  return profile.revoked !== true && time >= from && time <= until;
}

export function referenceEvaluateJurisdiction({ profile, request, operationRegistry, now }) {
  if (!profile || !operationRegistry || typeof now !== "string" || !validRequest(request)) {
    return REFERENCE_JURISDICTION.INDETERMINATE;
  }

  const operationDeclaration = operationRegistry[request.operation];
  if (!operationDeclaration) return REFERENCE_JURISDICTION.INDETERMINATE;
  if (!operationDeclaration.target_classes?.includes(request.target.class)) return REFERENCE_JURISDICTION.OUT;

  const isCurrent = current(profile, now);
  if (isCurrent === null) return REFERENCE_JURISDICTION.INDETERMINATE;
  if (!isCurrent) return REFERENCE_JURISDICTION.OUT;

  const candidates = [
    ...(profile.grants || []).map((rule) => ({ ...rule, outcome: REFERENCE_JURISDICTION.IN })),
    ...(profile.escalations || []).map((rule) => ({ ...rule, outcome: REFERENCE_JURISDICTION.HIGHER })),
  ].filter((rule) => (
    rule.actor === request.actor
    && rule.operation === request.operation
    && rule.target_classes?.includes(request.target.class)
  ));

  const permitCandidates = candidates.filter((rule) => rule.outcome === REFERENCE_JURISDICTION.IN);
  if (
    permitCandidates.some((rule) => (
      rule.requires_independent_verifier === true
      && request.context?.executor_actor === request.actor
    ))
  ) {
    return REFERENCE_JURISDICTION.OUT;
  }

  if (permitCandidates.some((rule) => request.batch_size <= rule.max_batch)) {
    return REFERENCE_JURISDICTION.IN;
  }

  if (candidates.some((rule) => (
    rule.outcome === REFERENCE_JURISDICTION.HIGHER
    && request.batch_size <= rule.max_batch
  ))) {
    return REFERENCE_JURISDICTION.HIGHER;
  }

  return REFERENCE_JURISDICTION.OUT;
}
