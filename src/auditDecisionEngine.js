// Experimental Contract-C decision surface.
//
// This module is deliberately separate from the public career comparison engine.
// It tests whether a small, provenance-bound CAL result can drive a deterministic
// downstream policy without re-running semantic audit or mutating MainFrame state.

export const CONTRACT_C_PROFILE = "contract-c-rc0";
export const DECISION_RECEIPT_PROFILE = "decision-receipt-rc0";

export const SUPPORT_VERDICTS = Object.freeze([
  "supported",
  "partially_supported",
  "unsupported",
  "contradicted",
  "not_checkable",
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

export const DEFAULT_PROMOTION_POLICY = Object.freeze({
  policyId: "mainframe-knowledge-promotion-shadow",
  policyVersion: "0.1.0-shadow",
  minimumAuditConfidence: "high",
  allowedCitationStatuses: Object.freeze(["correct", "not_applicable"]),
  blockingAuditFlags: Object.freeze([
    "overstated",
    "source_scope_error",
    "missed_counterevidence",
    "coverage_loss",
  ]),
  reviewAuditFlags: Object.freeze(["inferred", "false_caution"]),
  requireOperatorPromotion: true,
});

const CONFIDENCE_RANK = Object.freeze({ low: 0, medium: 1, high: 2 });

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

function sortedRuleIds(rules = []) {
  if (!Array.isArray(rules)) throw new TypeError("audit.rulesFired must be an array.");
  return [...new Set(rules.map((rule) => {
    if (typeof rule === "string") {
      assertNonEmptyString(rule, "rule id");
      return rule;
    }
    if (rule && typeof rule === "object") {
      assertNonEmptyString(rule.ruleId ?? rule.rule_id, "rule id");
      return rule.ruleId ?? rule.rule_id;
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
  }

  const explicitUnknowns = sortedUniqueStrings(audit.explicitUnknowns ?? []);
  const decisionBasisPassageIds = sortedUniqueStrings(audit.decisionBasisPassageIds ?? []);
  const decisionBasisPassageHashes = sortedUniqueStrings(audit.decisionBasisPassageHashes ?? []);
  const assessmentReceiptHashes = sortedUniqueStrings(audit.assessmentReceiptHashes ?? []);

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
      auditFlags: sortedUniqueStrings(audit.auditFlags ?? []),
      citationStatus: audit.citationStatus,
      auditConfidence: audit.auditConfidence,
      rulesFired: sortedRuleIds(audit.rulesFired ?? []),
      explicitUnknowns,
      decisionBasisPassageIds,
      decisionBasisPassageHashes,
      assessmentReceiptHashes,
    },
    integrity: {
      calResultSha256: integrity.calResultSha256,
    },
  };
}

function confidenceMeets(actual, minimum) {
  return CONFIDENCE_RANK[actual] >= CONFIDENCE_RANK[minimum];
}

function hasAny(values, candidates) {
  const set = new Set(values);
  return candidates.some((candidate) => set.has(candidate));
}

function receipt(contractC, policy, disposition, ruleIds, reasons) {
  return {
    profile: DECISION_RECEIPT_PROFILE,
    contractCProfile: contractC.profile,
    claimId: contractC.claim.claimId,
    claimTextSha256: contractC.claim.claimTextSha256,
    contractBBundleSha256: contractC.upstream.contractBBundleSha256,
    calResultSha256: contractC.integrity.calResultSha256,
    policyId: policy.policyId,
    policyVersion: policy.policyVersion,
    disposition,
    operatorRequired: policy.requireOperatorPromotion || disposition !== "promotion_candidate",
    rulesFired: ruleIds,
    reasons,
    mainframeStatusMutation: null,
  };
}

export function decideAuditedClaim(calResult, policy = DEFAULT_PROMOTION_POLICY) {
  const contractC = projectContractC(calResult);
  const { audit } = contractC;

  if (audit.supportVerdict === "contradicted" || audit.supportVerdict === "unsupported") {
    return receipt(contractC, policy, "blocked", ["DE-R01"], [
      `Claim is ${audit.supportVerdict} under the supplied CAL audit.`,
    ]);
  }

  if (hasAny(audit.auditFlags, policy.blockingAuditFlags)) {
    return receipt(contractC, policy, "blocked", ["DE-R02"], [
      "A blocking audit flag is present; the claim as written is not eligible for promotion.",
    ]);
  }

  if (audit.supportVerdict === "not_checkable") {
    return receipt(contractC, policy, "retain_synthesized", ["DE-R03"], [
      `CAL abstained: ${audit.supportVerdictReason}.`,
    ]);
  }

  if (audit.supportVerdict === "partially_supported") {
    return receipt(contractC, policy, "human_review_required", ["DE-R04"], [
      "The evidence only partially supports the claim as written.",
    ]);
  }

  if (audit.explicitUnknowns.length) {
    return receipt(contractC, policy, "human_review_required", ["DE-R05"], [
      "Decision-relevant unknown state remains explicit in the CAL result.",
    ]);
  }

  if (!policy.allowedCitationStatuses.includes(audit.citationStatus)) {
    return receipt(contractC, policy, "human_review_required", ["DE-R06"], [
      `Citation status ${audit.citationStatus} is not promotion-eligible under this policy.`,
    ]);
  }

  if (!confidenceMeets(audit.auditConfidence, policy.minimumAuditConfidence)) {
    return receipt(contractC, policy, "human_review_required", ["DE-R07"], [
      `Audit confidence ${audit.auditConfidence} is below policy minimum ${policy.minimumAuditConfidence}.`,
    ]);
  }

  if (hasAny(audit.auditFlags, policy.reviewAuditFlags)) {
    return receipt(contractC, policy, "human_review_required", ["DE-R08"], [
      "A review-only audit flag is present; automatic promotion candidacy is withheld.",
    ]);
  }

  return receipt(contractC, policy, "promotion_candidate", ["DE-R09"], [
    "The supplied CAL state satisfies the shadow promotion-candidate policy.",
    "MainFrame still owns the operator promotion gate.",
  ]);
}
