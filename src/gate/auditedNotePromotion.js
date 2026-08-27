import { DECISION, evaluateGate } from "./gateHead.js";
import { NOTE_PROMOTION_BAR } from "./notePromotionBar.js";
import { decideAuditedClaim } from "../auditDecisionEngine.js";

function assertInputs(noteItem, claimAuditResults) {
  if (!noteItem || typeof noteItem !== "object") {
    throw new TypeError("noteItem must be a parsed MainFrame note Gate item.");
  }
  if (!Array.isArray(claimAuditResults)) {
    throw new TypeError("claimAuditResults must be an array.");
  }
}

/**
 * Compose the existing MainFrame note-structure gate with one Contract-C Gate
 * decision per audited claim.
 *
 * This function performs no retrieval, CAL execution, file mutation, or IO.
 * An adapter must prepare the note item and CAL results. A mismatch between the
 * number of claims the note parser sees and the number of audit results supplied
 * is a coverage unknown, so the note is held rather than rejected.
 */
export function evaluateAuditedNotePromotion({
  noteItem,
  claimAuditResults,
  noteBar = NOTE_PROMOTION_BAR,
} = {}) {
  assertInputs(noteItem, claimAuditResults);

  const noteDecision = evaluateGate(noteItem, noteBar);
  const claimDecisions = claimAuditResults.map((result) => decideAuditedClaim(result));

  const parsedClaimCount = Array.isArray(noteItem.claims) ? noteItem.claims.length : 0;
  const auditCoverage = {
    parsedClaimCount,
    auditedClaimCount: claimAuditResults.length,
    complete: parsedClaimCount === claimAuditResults.length && parsedClaimCount > 0,
  };

  const claimRejects = claimDecisions.filter((result) => result.decision === DECISION.REJECT);
  const claimHolds = claimDecisions.filter((result) => result.decision === DECISION.HOLD);

  let decision;
  let rationale;

  if (noteDecision.decision === DECISION.REJECT || claimRejects.length > 0) {
    decision = DECISION.REJECT;
    rationale = [
      noteDecision.decision === DECISION.REJECT ? "the note-structure bar did not clear" : null,
      claimRejects.length ? `${claimRejects.length} audited claim(s) did not clear the claim bar` : null,
    ].filter(Boolean).join("; ");
  } else if (!auditCoverage.complete || noteDecision.decision === DECISION.HOLD || claimHolds.length > 0) {
    decision = DECISION.HOLD;
    rationale = [
      !auditCoverage.complete ? "claim-audit coverage is incomplete or cannot be reconciled to the parsed note" : null,
      noteDecision.decision === DECISION.HOLD ? "the note-structure bar has unresolved blocking state" : null,
      claimHolds.length ? `${claimHolds.length} audited claim(s) have unresolved blocking state` : null,
    ].filter(Boolean).join("; ");
  } else {
    decision = DECISION.PROMOTE;
    rationale = "note structure and every supplied audited claim cleared their bars";
  }

  return {
    itemId: noteItem.id ?? null,
    profile: "audited-note-promotion-rc0",
    decision,
    rationale,
    auditCoverage,
    noteDecision,
    claimDecisions,
    requiresHumanApproval: true,
    appliedAutomatically: false,
    mainframeStatusMutation: null,
  };
}
