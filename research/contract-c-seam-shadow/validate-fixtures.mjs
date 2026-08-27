/**
 * Deterministic Contract C -> Decision Engine Gate fixture check.
 *
 * This is a research-only adapter. It consumes supplied CAL/evidence
 * observations; it does not resolve sources, invoke CAL, or mutate MainFrame.
 * Run from the repository root:
 *   node research/contract-c-seam-shadow/validate-fixtures.mjs
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import {
  DECISION,
  OUTCOME,
  SEVERITY,
  defineBar,
  evaluateGate,
} from "../../src/gate/gateHead.js";

const fixtureDocument = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);

const SUPPORT_VERDICTS = new Set(fixtureDocument.vocabulary.support_verdict);
const AUDIT_FLAGS = new Set(fixtureDocument.vocabulary.audit_flags_known);
const CITATION_STATUSES = new Set(fixtureDocument.vocabulary.citation_status);
const SOURCE_STATUSES = new Set(fixtureDocument.vocabulary.source_status);
const SUPPORT_VERDICT_REASONS = new Set(fixtureDocument.reason_vocabulary.values);
const BLOCKING_AUDIT_FLAGS = new Set([
  "overstated",
  "source_scope_error",
  "missed_counterevidence",
  "coverage_loss",
]);

const sha256 = (value) => createHash("sha256").update(value, "utf8").digest("hex");
const claimHash = (fixture) => sha256(fixture.claim.text);
const evidenceHash = (evidence) => sha256(`${evidence.source_ref}\n${evidence.excerpt}`);

const resultFor = (outcome, observed, note = null) => ({ outcome, observed, note });

const CLAIM_AUDIT_RESEARCH_BAR = defineBar({
  id: "contract-c-claim-audit-research",
  version: "0.1.0",
  description:
    "Research-only mapping of supplied CAL claim-audit observations to an operator-only DE recommendation.",
  requiresHumanApproval: true,
  criteria: [
    {
      id: "cal-support-verdict",
      description: "CAL support verdict clears the proposed promotion threshold.",
      severity: SEVERITY.BLOCKING,
      evaluate: (item) => {
        const verdict = item.cal?.support_verdict;
        if (verdict === "supported") return resultFor(OUTCOME.PASS, { verdict });
        if (verdict === "not_checkable") {
          return resultFor(OUTCOME.UNKNOWN, { verdict }, "CAL did not establish support.");
        }
        if (["partially_supported", "unsupported", "contradicted"].includes(verdict)) {
          return resultFor(OUTCOME.FAIL, { verdict });
        }
        return resultFor(OUTCOME.UNKNOWN, { verdict }, "Unrecognized or missing support verdict.");
      },
    },
    {
      id: "source-admissibility",
      description: "Every supplied evidence item is available and not quarantined.",
      severity: SEVERITY.BLOCKING,
      evaluate: (item) => {
        const evidence = item.evidence;
        if (!Array.isArray(evidence) || evidence.length === 0) {
          return resultFor(OUTCOME.UNKNOWN, null, "No evidence-world observation was supplied.");
        }
        const statuses = evidence.map((entry) => entry.source_status);
        if (statuses.some((status) => ["missing", "quarantined"].includes(status))) {
          return resultFor(OUTCOME.FAIL, { statuses });
        }
        if (statuses.every((status) => status === "available")) {
          return resultFor(OUTCOME.PASS, { statuses });
        }
        return resultFor(OUTCOME.UNKNOWN, { statuses }, "Evidence status was not fully observed.");
      },
    },
    {
      id: "citation-status",
      description: "The citation status supplied at the seam is admissible for this recommendation.",
      severity: SEVERITY.BLOCKING,
      evaluate: (item) => {
        const status = item.cal?.citation_status;
        if (["correct", "not_applicable"].includes(status)) {
          return resultFor(OUTCOME.PASS, { status });
        }
        if (["partial", "wrong_source", "missing_needed", "not_cited"].includes(status)) {
          return resultFor(OUTCOME.FAIL, { status });
        }
        return resultFor(OUTCOME.UNKNOWN, { status }, "Citation status was not observed.");
      },
    },
    {
      id: "blocking-audit-flags",
      description: "No supplied CAL audit flag blocks the proposed recommendation.",
      severity: SEVERITY.BLOCKING,
      evaluate: (item) => {
        const flags = item.cal?.audit_flags;
        if (!Array.isArray(flags)) return resultFor(OUTCOME.UNKNOWN, { flags });
        const blocking = flags.filter((flag) => BLOCKING_AUDIT_FLAGS.has(flag));
        return resultFor(
          blocking.length === 0 ? OUTCOME.PASS : OUTCOME.FAIL,
          { flags, blocking },
        );
      },
    },
    {
      id: "audit-coverage",
      description: "CAL coverage for the supplied claim set is complete.",
      severity: SEVERITY.BLOCKING,
      evaluate: (item) => {
        const status = item.coverage?.status;
        if (status === "complete") return resultFor(OUTCOME.PASS, { status });
        if (status === "not_checkable") {
          return resultFor(OUTCOME.UNKNOWN, { status }, "Coverage receipt was not supplied.");
        }
        return resultFor(OUTCOME.UNKNOWN, { status }, "Coverage status was not observed.");
      },
    },
    {
      id: "inferred-caveat",
      description: "Explicit inference is retained as an advisory caveat.",
      severity: SEVERITY.ADVISORY,
      evaluate: (item) => {
        const flags = item.cal?.audit_flags ?? [];
        return resultFor(
          flags.includes("inferred") ? OUTCOME.FAIL : OUTCOME.PASS,
          { inferred: flags.includes("inferred") },
          flags.includes("inferred") ? "Claim wording contains an explicit inference." : null,
        );
      },
    },
  ],
});

const failures = [];
const checks = [];

function check(label, condition, detail = "") {
  checks.push({ label, condition, detail });
  if (!condition) failures.push({ label, detail });
}

function sameArray(actual, expected) {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

check("document is research-only", fixtureDocument.research_only === true);
check("document is marked proposed", fixtureDocument.status === "proposed");
check("raw incident material is excluded", fixtureDocument.provenance.raw_incident_published === false);
check("CAL validation is not claimed", fixtureDocument.provenance.cal_validation === false);
check("regulatory opinion is not claimed", fixtureDocument.provenance.regulatory_opinion === false);
check("reason vocabulary is versioned", Boolean(fixtureDocument.reason_vocabulary.version));
check("reason vocabulary is not ratified", fixtureDocument.reason_vocabulary.status === "observed_subset_not_ratified");
check("citation status is reserved for fixtures", fixtureDocument.field_status.citation_status === "fixture_only_reserved");
check("fixture set has eight cases", fixtureDocument.fixtures.length === 8);

for (const fixture of fixtureDocument.fixtures) {
  const prefix = fixture.id;
  const item = {
    id: fixture.id,
    claim: fixture.claim,
    evidence: fixture.evidence,
    cal: fixture.cal,
    coverage: fixture.coverage,
  };

  check(`${prefix}: id is present`, Boolean(fixture.id));
  check(`${prefix}: claim text is present`, typeof fixture.claim?.text === "string");
  check(`${prefix}: support verdict uses current vocabulary`, SUPPORT_VERDICTS.has(fixture.cal?.support_verdict));
  check(
    `${prefix}: support reason uses the versioned observed vocabulary`,
    fixture.cal?.support_verdict_reason === null || SUPPORT_VERDICT_REASONS.has(fixture.cal?.support_verdict_reason),
  );
  check(
    `${prefix}: support reason is only present for not-checkable`,
    fixture.cal?.support_verdict === "not_checkable" || fixture.cal?.support_verdict_reason === null,
  );
  check(`${prefix}: citation status uses current vocabulary`, CITATION_STATUSES.has(fixture.cal?.citation_status));
  check(`${prefix}: audit flags use known values`, (fixture.cal?.audit_flags ?? []).every((flag) => AUDIT_FLAGS.has(flag)));
  check(`${prefix}: evidence is present`, Array.isArray(fixture.evidence) && fixture.evidence.length > 0);
  check(`${prefix}: source statuses use current vocabulary`, (fixture.evidence ?? []).every((entry) => SOURCE_STATUSES.has(entry.source_status)));
  check(`${prefix}: claim hash is exact`, fixture.claim_hash === claimHash(fixture));
  check(
    `${prefix}: evidence hashes are exact`,
    (fixture.evidence ?? []).every((entry) => entry.evidence_hash === evidenceHash(entry)),
  );

  if (fixture.origin?.kind === "sanitized_incident_pattern") {
    const serialized = JSON.stringify(fixture);
    check(`${prefix}: incident controls contain no live URL`, !/https?:\/\//i.test(serialized));
    check(`${prefix}: incident controls name their origin`, Boolean(fixture.origin?.kind));
    check(`${prefix}: incident raw material is excluded`, fixture.origin.raw_material_included === false);
    check(`${prefix}: incident controls are not calibration gold`, fixture.origin.calibration_gold === false);
    check(`${prefix}: incident controls are shadow-only`, fixture.origin.evaluation_use === "shadow_only");
    check(
      `${prefix}: incident source refs are synthetic`,
      (fixture.evidence ?? []).every((entry) => entry.source_ref.startsWith("fixture://")),
    );
  }

  const decision = evaluateGate(item, CLAIM_AUDIT_RESEARCH_BAR);
  const expected = fixture.expected_gate;
  const caveatIds = decision.caveats.map((caveat) => caveat.id);
  const envelope = {
    ...decision,
    mainframeStatusMutation: null,
  };

  check(`${prefix}: decision matches`, decision.decision === expected.decision, `${decision.decision} != ${expected.decision}`);
  check(
    `${prefix}: blocking failures match`,
    sameArray(decision.blockingFailures, expected.blocking_failures),
    `${JSON.stringify(decision.blockingFailures)} != ${JSON.stringify(expected.blocking_failures)}`,
  );
  check(
    `${prefix}: blocking unknowns match`,
    sameArray(decision.blockingUnknowns, expected.blocking_unknowns),
    `${JSON.stringify(decision.blockingUnknowns)} != ${JSON.stringify(expected.blocking_unknowns)}`,
  );
  check(
    `${prefix}: caveats match`,
    sameArray(caveatIds, expected.caveats),
    `${JSON.stringify(caveatIds)} != ${JSON.stringify(expected.caveats)}`,
  );
  check(
    `${prefix}: human approval is preserved`,
    envelope.requiresHumanApproval === expected.requires_human_approval,
  );
  check(
    `${prefix}: automatic application remains false`,
    envelope.appliedAutomatically === expected.applied_automatically,
  );
  check(
    `${prefix}: MainFrame mutation remains null`,
    envelope.mainframeStatusMutation === expected.mainframe_status_mutation,
  );
}

if (failures.length > 0) {
  console.error(`Contract C fixture check failed: ${failures.length} of ${checks.length} checks failed.`);
  for (const failure of failures) {
    console.error(`- ${failure.label}${failure.detail ? `: ${failure.detail}` : ""}`);
  }
  process.exitCode = 1;
} else {
  const decisions = fixtureDocument.fixtures.map((fixture) => fixture.expected_gate.decision);
  const counts = decisions.reduce((accumulator, decision) => {
    accumulator[decision] = (accumulator[decision] ?? 0) + 1;
    return accumulator;
  }, {});
  console.log(`Contract C fixture check passed: ${checks.length} checks across ${fixtureDocument.fixtures.length} fixtures.`);
  console.log(`Gate recommendations: ${JSON.stringify(counts)}.`);
  console.log("Operator envelope: requiresHumanApproval=true, appliedAutomatically=false, mainframeStatusMutation=null.");
}
