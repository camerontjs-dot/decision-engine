// Experimental Contract-C adapter for the Decision Engine Gate head.
//
// Contract C carries the audit state CAL actually produced. The Gate head owns
// the downstream bar. Keeping those two surfaces separate prevents a CAL
// verdict from silently becoming a MainFrame lifecycle decision.

import { OUTCOME, SEVERITY, defineBar, evaluateGate } from "./gate/gateHead.js";

export const CONTRACT_C_PROFILE = "contract-c-rc0";
export const DECISION_RECEIPT_PROFILE = "decision-receipt-rc0";

export const SUPPORT_VERDICTS = Object.freeze([
  "supported",
  "partially_supported",
  "unsupported",
  "contradicted",
  "not_checkable",
]);

export const VERDICT_REASONS = Object.freeze([
  "out_of_scope",
  "no_entail_signal",
  "no_evidence",
  "conflicting_evidence",
  "absence_not_decidable",
]);

export const AUDIT_FLAGS = Object.freeze([
  "overstated",
  "inferred",
  "source_scope_error",
  "false_caution",
  "missed_counterevidence",
  "coverage_loss",
]);

export const CITATION_STATUSES = Object.freeze([
  "correct",
  "partial",
  "wrong_source",
  "missing_needed",
  "not_cited",
  "not_applicable",
]);

export const AUDIT_CONFIDENCE = Object.freeze(["low", "medium", "high"]);

const BLOCKING_AUDIT_FLAGS = Object.freeze([
  "overstated",
  "source_scope_error",
  "missed_counterevidence",
  "coverage_loss",
]);

const REVIEW_AUDIT_FLAGS = Object.freeze(["inferred", "false_caution"]);

function assertNonEmptyString(value, field) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`${field} must be a non-empty string.`);
  }
}

function assertEnum(value, allowed, field) {
  if (!allowed.includes(value)) {
    throw new TypeError(`${field} must be one of: ${allowed.join(", ")}.`);
  }
}

function sortedUniqueStrings(values = []) {
  if (!Array.isArray(values)) throw new TypeError("Expected an array of strings.");
  const normalized = values.map((value) => {
    assertNonEmptyString(value, "array item");
    return value;
  });
  return [...new Set(normalized)].sort();
}

function sortedEnumSet(values, allowed, field) {
  const normalized = sortedUniqueStrings(values ?? []);
  normalized.forEach((value) => assertEnum(value, allowed, field));
  return normalized;
}

function sortedRuleIds(rules = []) {
  if (!Array.isArray(rules)) throw new TypeError("audit.rulesFired must be an array.");
  return [...new Set(rules.map((rule) => {
    if (typeof rule === "string") {
      assertNonEmptyString(rule, "rule id");
      return rule;
    }
    if (rule && typeof rule === "object") {
      const id = rule.ruleId ?? rule.rule_id;
      assertNonEmptyString(id, "rule id");
      return id;
    }
    throw new TypeError("Each fired rule must be a rule id or rule object.");
  }))].sort();
}

export function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value);
}

/**
 * Project an implementation-rich CAL result into the candidate stable seam.
 * Unknown keys are intentionally ignored: an implementation detail only earns
 * a place in Contract C after a boundary experiment shows a downstream need.
 */
export function projectContractC(calResult) {
  if (!calResult || typeof calResult !== "object") {
    throw new TypeError("calResult must be an object.");
  }

  const { upstream = {}, claim = {}, audit = {}, integrity = {} } = calResult;

  assertNonEmptyString(upstream.contractBBundleId, "upstream.contractBBundleId");
  assertNonEmptyString(upstream.contractBBundleSha256, "upstream.contractBBundleSha256");
  assertNonEmptyString(claim.claimId, "claim.claimId");
  assertNonEmptyString(claim.claimText, "claim.claimText");
  assertNonEmptyString(claim.claimTextSha256, "claim.claimTextSha256");
  assertNonEmptyString(audit.calVersion, "audit.calVersion");
  assertNonEmptyString(audit.auditConfigHash, "audit.auditConfigHash");
  assertNonEmptyString(audit.rulesVersion, "audit.rulesVersion");
  assertNonEmptyString(audit.rulesHash, "audit.rulesHash");
  assertEnum(audit.supportVerdict, SUPPORT_VERDICTS, "audit.supportVerdict");
  assertEnum(audit.citationStatus, CITATION_STATUSES, "audit.citationStatus");
  assertEnum(audit.auditConfidence, AUDIT_CONFIDENCE, "audit.auditConfidence");
  assertNonEmptyString(integrity.calResultSha256, "integrity.calResultSha256");

  if (audit.supportVerdict === "not_checkable") {
    assertNonEmptyString(audit.supportVerdictReason, "audit.supportVerdictReason");
    assertEnum(audit.supportVerdictReason, VERDICT_REASONS, "audit.supportVerdictReason");
  } else if (audit.supportVerdictReason !== null && audit.supportVerdictReason !== undefined) {
    assertEnum(audit.supportVerdictReason, VERDICT_REASONS, "audit.supportVerdictReason");
  }

  return {
    profile: CONTRACT_C_PROFILE,
    upstream: {
      contractBBundleId: upstream.contractBBundleId,
      contractBBundleSha256: upstream.contractBBundleSha256,
    },
    claim: {
      claimId: claim.claimId,
      claimText: claim.claimText,
      claimTextSha256: claim.claimTextSha256,
    },
    audit: {
      calVersion: audit.calVersion,
      auditConfigHash: audit.auditConfigHash,
      rulesVersion: audit.rulesVersion,
      rulesHash: audit.rulesHash,
      supportVerdict: audit.supportVerdict,
      supportVerdictReason: audit.supportVerdictReason ?? null,
      auditFlags: sortedEnumSet(audit.auditFlags ?? [], AUDIT_FLAGS, "audit.auditFlags"),
      citationStatus: audit.citationStatus,
      auditConfidence: audit.auditConfidence,
      rulesFired: sortedRuleIds(audit.rulesFired ?? []),
      explicitUnknowns: sortedUniqueStrings(audit.explicitUnknowns ?? []),
      decisionBasisPassageIds: sortedUniqueStrings(audit.decisionBasisPassageIds ?? []),
      decisionBasisPassageHashes: sortedUniqueStrings(audit.decisionBasisPassageHashes ?? []),
      assessmentReceiptHashes: sortedUniqueStrings(audit.assessmentReceiptHashes ?? []),
    },
    integrity: {
      calResultSha256: integrity.calResultSha256,
    },
  };
}

export function contractCToGateItem(calResult) {
  const contractC = projectContractC(calResult);
  return {
    id: contractC.claim.claimId,
    kind: "audited-claim",
    contractC,
  };
}

function intersects(values, candidates) {
  const set = new Set(values);
  return candidates.filter((candidate) => set.has(candidate));
}

/**
 * First MainFrame-facing bar over Contract-C audit state.
 *
 * It intentionally mirrors the Gate head's epistemic semantics:
 * - a known failure to clear the bar -> FAIL / reject recommendation;
 * - an unresolved audit state -> UNKNOWN / hold;
 * - review-worthy but non-blocking state -> advisory caveat;
 * - even a promote recommendation remains human-applied.
 */
export const AUDITED_CLAIM_PROMOTION_BAR = defineBar({
  id: "audited-claim-promotion",
  version: "0.1.0-shadow",
  description:
    "Shadow bar for deciding whether a CAL-audited MainFrame claim may proceed to operator promotion review.",
  requiresHumanApproval: true,
  criteria: [
    {
      id: "cal-support-clears-bar",
      description: "CAL support state is sufficient for the claim as written.",
      severity: SEVERITY.BLOCKING,
      evaluate: (item) => {
        const { supportVerdict, supportVerdictReason } = item.contractC.audit;
        if (supportVerdict === "supported") {
          return { outcome: OUTCOME.PASS, observed: { supportVerdict } };
        }
        if (supportVerdict === "not_checkable") {
          return {
            outcome: OUTCOME.UNKNOWN,
            observed: { supportVerdict, supportVerdictReason },
            note: "CAL abstained; no adverse or favorable default is inferred.",
          };
        }
        return {
          outcome: OUTCOME.FAIL,
          observed: { supportVerdict },
          note: "The claim as written did not receive full support.",
        };
      },
    },
    {
      id: "no-blocking-audit-flags",
      description: "No audit failure mode blocks the claim as written.",
      severity: SEVERITY.BLOCKING,
      evaluate: (item) => {
        const hits = intersects(item.contractC.audit.auditFlags, BLOCKING_AUDIT_FLAGS);
        return {
          outcome: hits.length ? OUTCOME.FAIL : OUTCOME.PASS,
          observed: { blockingFlags: hits },
          note: hits.includes("overstated") ? "Claim text must not be weakened in place to make the old audit pass." : null,
        };
      },
    },
    {
      id: "no-unresolved-audit-state",
      description: "CAL left no explicit decision-relevant state unresolved.",
      severity: SEVERITY.BLOCKING,
      evaluate: (item) => {
        const unknowns = item.contractC.audit.explicitUnknowns;
        return {
          outcome: unknowns.length ? OUTCOME.UNKNOWN : OUTCOME.PASS,
          observed: { explicitUnknowns: unknowns },
          note: unknowns.length ? "Unresolved state holds the claim; it is not treated as a failure." : null,
        };
      },
    },
    {
      id: "citation-clears-bar",
      description: "CAL citation status is sufficient for promotion review.",
      severity: SEVERITY.BLOCKING,
      evaluate: (item) => {
        const { citationStatus } = item.contractC.audit;
        const pass = citationStatus === "correct" || citationStatus === "not_applicable";
        return {
          outcome: pass ? OUTCOME.PASS : OUTCOME.FAIL,
          observed: { citationStatus },
        };
      },
    },
    {
      id: "audit-confidence-clears-bar",
      description: "CAL recorded high confidence in its own result for this shadow policy.",
      severity: SEVERITY.BLOCKING,
      evaluate: (item) => {
        const { auditConfidence } = item.contractC.audit;
        return {
          outcome: auditConfidence === "high" ? OUTCOME.PASS : OUTCOME.UNKNOWN,
          observed: { auditConfidence, required: "high" },
          note: auditConfidence === "high" ? null : "Audit confidence is below the shadow bar; hold rather than reject.",
        };
      },
    },
    {
      id: "review-audit-flags",
      description: "Non-blocking audit flags are surfaced to the operator.",
      severity: SEVERITY.ADVISORY,
      evaluate: (item) => {
        const hits = intersects(item.contractC.audit.auditFlags, REVIEW_AUDIT_FLAGS);
        return {
          outcome: hits.length ? OUTCOME.FAIL : OUTCOME.PASS,
          observed: { reviewFlags: hits },
          note: hits.length ? "These flags do not erase support, but they should be visible during operator review." : null,
        };
      },
    },
  ],
});

/** Evaluate the audit state through the existing generic Gate head. */
export function decideAuditedClaim(calResult, bar = AUDITED_CLAIM_PROMOTION_BAR) {
  const item = contractCToGateItem(calResult);
  const gateDecision = evaluateGate(item, bar);
  const contractC = item.contractC;

  return {
    profile: DECISION_RECEIPT_PROFILE,
    ...gateDecision,
    lineage: {
      contractCProfile: contractC.profile,
      claimTextSha256: contractC.claim.claimTextSha256,
      contractBBundleSha256: contractC.upstream.contractBBundleSha256,
      calResultSha256: contractC.integrity.calResultSha256,
    },
    // Load-bearing MainFrame boundary: a Gate recommendation is not a write.
    mainframeStatusMutation: null,
  };
}
