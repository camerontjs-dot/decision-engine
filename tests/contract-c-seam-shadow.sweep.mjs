import {
  canonicalJson,
  decideAuditedClaim,
  projectContractC,
} from "../src/auditDecisionEngine.js";

const checks = [];

function check(name, condition, detail = "") {
  checks.push({ name, condition, detail });
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function baseResult() {
  return {
    upstream: {
      contractBBundleId: "bundle-001",
      contractBBundleSha256: "sha256:bundle001",
    },
    claim: {
      claimId: "claim-001",
      claimText: "The synthesized note preserves source provenance.",
      claimTextSha256: "sha256:claim001",
    },
    audit: {
      calVersion: "0.4.0",
      auditConfigHash: "sha256:config001",
      rulesVersion: "cal-rules-v1.13.0",
      rulesHash: "sha256:rules001",
      supportVerdict: "supported",
      supportVerdictReason: null,
      auditFlags: [],
      citationStatus: "correct",
      auditConfidence: "high",
      rulesFired: [
        { ruleId: "R_SUPPORTED", reason: "implementation explanation not needed downstream" },
      ],
      explicitUnknowns: [],
      decisionBasisPassageIds: ["pass-002", "pass-001"],
      decisionBasisPassageHashes: ["sha256:pass002", "sha256:pass001"],
      assessmentReceiptHashes: ["sha256:assessment001"],
      implementationTelemetry: {
        retrievalScore: 0.91,
        rawLogits: [0.2, 0.3, 4.1],
        bestEntail: 0.97,
      },
    },
    integrity: {
      calResultSha256: "sha256:calresult001",
    },
  };
}

const base = baseResult();
const baseProjection = projectContractC(base);
const baseProjectionJson = canonicalJson(baseProjection);

check(
  "C1 projection preserves C-B bundle identity",
  baseProjection.upstream.contractBBundleSha256 === "sha256:bundle001",
);
check(
  "C1 projection preserves exact claim identity",
  baseProjection.claim.claimId === "claim-001" && baseProjection.claim.claimTextSha256 === "sha256:claim001",
);
check(
  "C1 projection preserves CAL result identity",
  baseProjection.integrity.calResultSha256 === "sha256:calresult001",
);
check(
  "C1 projection preserves decision basis",
  baseProjection.audit.decisionBasisPassageIds.join(",") === "pass-001,pass-002",
);

const telemetryMutation = clone(base);
telemetryMutation.audit.implementationTelemetry.retrievalScore = 0.01;
telemetryMutation.audit.implementationTelemetry.rawLogits = [9, -3, 1];
telemetryMutation.audit.implementationTelemetry.bestEntail = 0.55;
check(
  "irrelevant CAL implementation telemetry does not alter Contract C",
  canonicalJson(projectContractC(telemetryMutation)) === baseProjectionJson,
);

const ruleReasonMutation = clone(base);
ruleReasonMutation.audit.rulesFired[0].reason = "different prose explanation";
check(
  "rule explanation prose does not alter minimal Contract C",
  canonicalJson(projectContractC(ruleReasonMutation)) === baseProjectionJson,
);

const orderingMutation = clone(base);
orderingMutation.audit.decisionBasisPassageIds.reverse();
orderingMutation.audit.decisionBasisPassageHashes.reverse();
check(
  "set-like provenance ordering is canonicalized",
  canonicalJson(projectContractC(orderingMutation)) === baseProjectionJson,
);

const verdictMutation = clone(base);
verdictMutation.audit.supportVerdict = "partially_supported";
check(
  "decision-relevant verdict mutation changes Contract C",
  canonicalJson(projectContractC(verdictMutation)) !== baseProjectionJson,
);

const flagMutation = clone(base);
flagMutation.audit.auditFlags = ["overstated"];
check(
  "decision-relevant audit flag mutation changes Contract C",
  canonicalJson(projectContractC(flagMutation)) !== baseProjectionJson,
);

const citationMutation = clone(base);
citationMutation.audit.citationStatus = "wrong_source";
check(
  "citation mutation changes Contract C",
  canonicalJson(projectContractC(citationMutation)) !== baseProjectionJson,
);

const unknownMutation = clone(base);
unknownMutation.audit.explicitUnknowns = ["authority_applicability"];
check(
  "explicit unknown mutation changes Contract C",
  canonicalJson(projectContractC(unknownMutation)) !== baseProjectionJson,
);

const bundleIdentityMutation = clone(base);
bundleIdentityMutation.upstream.contractBBundleSha256 = "sha256:different-bundle";
check(
  "upstream bundle identity mutation changes Contract C",
  canonicalJson(projectContractC(bundleIdentityMutation)) !== baseProjectionJson,
);

const claimIdentityMutation = clone(base);
claimIdentityMutation.claim.claimTextSha256 = "sha256:different-claim";
check(
  "claim identity mutation changes Contract C",
  canonicalJson(projectContractC(claimIdentityMutation)) !== baseProjectionJson,
);

let missingReasonFailedClosed = false;
try {
  const missingReason = clone(base);
  missingReason.audit.supportVerdict = "not_checkable";
  missingReason.audit.supportVerdictReason = null;
  projectContractC(missingReason);
} catch {
  missingReasonFailedClosed = true;
}
check("not_checkable without a reason fails closed", missingReasonFailedClosed);

const promotion = decideAuditedClaim(base);
check("supported/high/correct becomes promotion candidate", promotion.disposition === "promotion_candidate");
check("promotion candidate still requires operator", promotion.operatorRequired === true);
check("decision receipt never mutates MainFrame status", promotion.mainframeStatusMutation === null);

const unsupported = clone(base);
unsupported.audit.supportVerdict = "unsupported";
check("unsupported claim is blocked", decideAuditedClaim(unsupported).disposition === "blocked");

const contradicted = clone(base);
contradicted.audit.supportVerdict = "contradicted";
check("contradicted claim is blocked", decideAuditedClaim(contradicted).disposition === "blocked");

const partial = clone(base);
partial.audit.supportVerdict = "partially_supported";
check(
  "partially supported claim requires human review",
  decideAuditedClaim(partial).disposition === "human_review_required",
);

const abstained = clone(base);
abstained.audit.supportVerdict = "not_checkable";
abstained.audit.supportVerdictReason = "absence_not_decidable";
check(
  "CAL abstention remains first-class downstream",
  decideAuditedClaim(abstained).disposition === "retain_synthesized",
);
check(
  "abstention reason is preserved in decision rationale",
  decideAuditedClaim(abstained).reasons.some((reason) => reason.includes("absence_not_decidable")),
);

const blockingFlag = clone(base);
blockingFlag.audit.auditFlags = ["overstated"];
check("overstated claim is blocked as written", decideAuditedClaim(blockingFlag).disposition === "blocked");

const reviewFlag = clone(base);
reviewFlag.audit.auditFlags = ["inferred"];
check(
  "inferred flag routes to human review under shadow policy",
  decideAuditedClaim(reviewFlag).disposition === "human_review_required",
);

const explicitUnknown = clone(base);
explicitUnknown.audit.explicitUnknowns = ["temporal_applicability"];
check(
  "decision-relevant unknown routes to human review",
  decideAuditedClaim(explicitUnknown).disposition === "human_review_required",
);

const wrongCitation = clone(base);
wrongCitation.audit.citationStatus = "wrong_source";
check(
  "wrong-source citation prevents promotion candidacy",
  decideAuditedClaim(wrongCitation).disposition === "human_review_required",
);

const mediumConfidence = clone(base);
mediumConfidence.audit.auditConfidence = "medium";
check(
  "below-policy audit confidence prevents promotion candidacy",
  decideAuditedClaim(mediumConfidence).disposition === "human_review_required",
);

const firstReceipt = canonicalJson(decideAuditedClaim(base));
const secondReceipt = canonicalJson(decideAuditedClaim(clone(base)));
check("decision replay is deterministic", firstReceipt === secondReceipt);

const failed = checks.filter((item) => !item.condition);
checks.forEach((item) => {
  const status = item.condition ? "PASS" : "FAIL";
  console.log(`${status} ${item.name}${item.detail ? ` - ${item.detail}` : ""}`);
});
console.log(`\n${checks.length - failed.length}/${checks.length} passed${failed.length ? `, ${failed.length} failed` : ""}.`);
if (failed.length) process.exitCode = 1;
