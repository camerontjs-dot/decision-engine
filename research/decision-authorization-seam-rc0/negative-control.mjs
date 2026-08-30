/**
 * Deliberately entangled negative control.
 *
 * This competing design reads operational authority directly from the Decision
 * object. Because the frozen Decision bytes cannot vary with authorization
 * profile, it cannot express the preregistered A/B/C authorization changes.
 */
export function entangledAuthorization(decisionBytes) {
  const decision = JSON.parse(decisionBytes.toString("utf8"));
  return decision?.authorization?.automaticApplicationPermitted === true
    ? "permit"
    : "require_approval";
}
