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

let unknownFlagFailedClosed = false;
try {
  const unknownFlag = clone(base);
  unknownFlag.audit.auditFlags = ["invented_future_flag"];
  projectContractC(unknownFlag);
} catch {
  unknownFlagFailedClosed = true;
}
check("unrecognized audit vocabulary fails closed", unknownFlagFailedClosed);

const promotion = decideAuditedClaim(base);
check("supported/high/correct clears the audited-claim Gate bar", promotion.decision === "promote");
check("Gate promote still requires human approval", promotion.requiresHumanApproval === true);
check("Gate recommendation is never auto-applied", promotion.appliedAutomatically === false);
check("decision receipt never mutates MainFrame status", promotion.mainframeStatusMutation === null);
check("decision receipt preserves C-B lineage", promotion.lineage.contractBBundleSha256 === "sha256:bundle001");

const unsupported = clone(base);
unsupported.audit.supportVerdict = "unsupported";
check("unsupported claim does not clear the Gate bar", decideAuditedClaim(unsupported).decision === "reject");

const contradicted = clone(base);
contradicted.audit.supportVerdict = "contradicted";
check("contradicted claim does not clear the Gate bar", decideAuditedClaim(contradicted).decision === "reject");

const partial = clone(base);
partial.audit.supportVerdict = "partially_supported";
check("partially supported claim fails the full-support bar", decideAuditedClaim(partial).decision === "reject");

const abstained = clone(base);
abstained.audit.supportVerdict = "not_checkable";
abstained.audit.supportVerdictReason = "absence_not_decidable";
const abstainedDecision = decideAuditedClaim(abstained);
check("CAL abstention becomes Gate hold, not reject", abstainedDecision.decision === "hold");
check(
  "abstention reason remains visible in criterion observation",
  abstainedDecision.criteria.some((criterion) => (
    criterion.id === "cal-support-clears-bar" &&
    criterion.observed?.supportVerdictReason === "absence_not_decidable"
  )),
);

const blockingFlag = clone(base);
blockingFlag.audit.auditFlags = ["overstated"];
const blockingDecision = decideAuditedClaim(blockingFlag);
check("overstated claim is rejected as written", blockingDecision.decision === "reject");
check(
  "overstated result explicitly warns against claim laundering",
  blockingDecision.criteria.some((criterion) => (
    criterion.id === "no-blocking-audit-flags" && criterion.note?.includes("must not be weakened")
  )),
);

const reviewFlag = clone(base);
reviewFlag.audit.auditFlags = ["inferred"];
const reviewDecision = decideAuditedClaim(reviewFlag);
check("inferred flag remains advisory under the Gate bar", reviewDecision.decision === "promote");
check("advisory inferred flag makes the decision a close call", reviewDecision.closeCall === true);
check("advisory inferred flag is preserved as a caveat", reviewDecision.caveats.some((item) => item.id === "review-audit-flags"));

const explicitUnknown = clone(base);
explicitUnknown.audit.explicitUnknowns = ["temporal_applicability"];
const unknownDecision = decideAuditedClaim(explicitUnknown);
check("decision-relevant unknown becomes Gate hold", unknownDecision.decision === "hold");
check("unknown does not become a blocking failure", unknownDecision.blockingFailures.length === 0);

const wrongCitation = clone(base);
wrongCitation.audit.citationStatus = "wrong_source";
check("wrong-source citation fails the promotion bar", decideAuditedClaim(wrongCitation).decision === "reject");

const mediumConfidence = clone(base);
mediumConfidence.audit.auditConfidence = "medium";
const confidenceDecision = decideAuditedClaim(mediumConfidence);
check("lower CAL confidence becomes Gate hold", confidenceDecision.decision === "hold");
check("lower CAL confidence is not manufactured into failure", confidenceDecision.blockingFailures.length === 0);

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
