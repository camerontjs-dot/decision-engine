import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { evaluateContractCDecision } from "../../src/contractCDecisionRuntime.js";
import { SUPPORTED_CLAIM_VERIFICATION_POLICY } from "../../src/contractCDecision.js";
import { canonicalizeContractDWithAuthority } from "../../src/contractDCanonicalOutput.js";

const REAL_C_SHA = "sha256:c599e97fd5b4da80ae558d5d57a351fa3b2d37081432013a9dbeaae65a80b5a3";
const REAL_D_SHA = "sha256:db47ebc844c14aa28bbc02524684b1ea7e388e1f1eea7ee8cbc7153af7548200";
const PROP_ID = "PIPELINE_SMOKE_001:child:1";
const SLOTS = ["eligibility", "semantic_validity", "aperture_completeness", "temporal_applicability"];
const STATES = {
  not_performed: { state: "not_performed" },
  performed_unknown: { state: "performed", value: "unknown" },
  performed_adverse: { state: "performed", value: "adverse" },
  not_applicable: { state: "not_applicable" },
  failed: { state: "failed" },
};

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) out[argv[i]] = argv[i + 1];
  for (const key of ["--contract-c-authority", "--contract-d-authority", "--fixture"]) {
    if (!out[key]) throw new Error(`missing ${key}`);
  }
  return out;
}
function expect(v, m) { if (!v) throw new Error(m); }
function sha256(bytes) { return `sha256:${createHash("sha256").update(bytes).digest("hex")}`; }
function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
  }
  return value;
}
function canonicalBytes(value) { return Buffer.from(JSON.stringify(sortValue(value)) + "\n", "utf8"); }
function materialize(value) {
  const clone = structuredClone(value);
  delete clone.result_set_id;
  clone.result_set_id = `result-set:${createHash("sha256").update(canonicalBytes(clone)).digest("hex")}`;
  const bytes = canonicalBytes(clone);
  return { value: clone, bytes, sha: sha256(bytes) };
}
function prop(value) {
  const row = value.propositions.find((p) => p.proposition.proposition_id === PROP_ID);
  expect(row, "target proposition missing");
  return row;
}
function expectedB(value) { return structuredClone(value.input.contract_b); }
function context(value) {
  const row = prop(value);
  return {
    policy: { id: SUPPORTED_CLAIM_VERIFICATION_POLICY.id, version: SUPPORTED_CLAIM_VERIFICATION_POLICY.version },
    proposition_id: PROP_ID,
    target: { kind: "claim", id: PROP_ID, content_sha256: `sha256:${row.proposition.text_sha256}` },
  };
}
function currentDecision(fixture, authorityC) {
  return evaluateContractCDecision({
    contractCBytes: fixture.bytes,
    expectedContractCSha256: fixture.sha,
    contractCAuthorityRoot: authorityC,
    expectedContractB: expectedB(fixture.value),
    decisionContext: context(fixture.value),
  });
}
function currentDisposition(fixture, authorityC) {
  const d = currentDecision(fixture, authorityC);
  return { disposition: d.evaluation.disposition, reason: d.metadata.reason_codes[0] };
}
function hasExplicitNegative(assessments) {
  return Object.values(assessments).some((state) =>
    state.state === "failed" || (state.state === "performed" && state.value === "adverse")
  );
}
function hasExplicitUnresolvedOrNegative(assessments) {
  return Object.values(assessments).some((state) =>
    state.state === "failed" ||
    (state.state === "performed" && (state.value === "unknown" || state.value === "adverse"))
  );
}
function candidateNegativeOnly(value) {
  const assessments = prop(value).assessments;
  return hasExplicitNegative(assessments)
    ? { disposition: "hold", reason: "candidate_explicit_negative_or_failed_assessment" }
    : { disposition: "clear", reason: "candidate_no_explicit_negative_or_failed_assessment" };
}
function candidateUnresolvedOrNegative(value) {
  const assessments = prop(value).assessments;
  return hasExplicitUnresolvedOrNegative(assessments)
    ? { disposition: "hold", reason: "candidate_explicit_unknown_negative_or_failed_assessment" }
    : { disposition: "clear", reason: "candidate_no_explicit_unknown_negative_or_failed_assessment" };
}

const args = parseArgs(process.argv.slice(2));
const authorityC = resolve(args["--contract-c-authority"]);
const authorityD = resolve(args["--contract-d-authority"]);
const raw = readFileSync(resolve(args["--fixture"]));
expect(sha256(raw) === REAL_C_SHA, `real CAL fixture SHA mismatch: ${sha256(raw)}`);
const base = { value: JSON.parse(raw.toString("utf8")), bytes: raw, sha: REAL_C_SHA };
expect(prop(base.value).conclusion.reported_verdict === "supported", "real CAL baseline not supported");
expect(prop(base.value).execution.state === "completed" && prop(base.value).execution.completion === "assessed", "real CAL baseline not completed/assessed");
expect(SLOTS.every((slot) => prop(base.value).assessments[slot].state === "not_performed"), "real CAL baseline assessments drifted");

const maintainedBaseline = currentDecision(base, authorityC);
expect(maintainedBaseline.evaluation.disposition === "clear", "real CAL baseline did not CLEAR maintained Policy A");
const maintainedBaselineD = canonicalizeContractDWithAuthority({ decision: maintainedBaseline, contractDAuthorityRoot: authorityD });
expect(sha256(maintainedBaselineD) === REAL_D_SHA, `PR #41 exact Contract D reproduction drift: ${sha256(maintainedBaselineD)}`);
const candidateBaselineNegative = candidateNegativeOnly(base.value);
const candidateBaselineUnresolved = candidateUnresolvedOrNegative(base.value);
expect(candidateBaselineNegative.disposition === "clear", "negative-only candidate changed real CAL baseline");
expect(candidateBaselineUnresolved.disposition === "clear", "unresolved-or-negative candidate changed real CAL baseline");

const matrix = [];
for (const slot of SLOTS) {
  for (const [stateName, state] of Object.entries(STATES)) {
    const value = structuredClone(base.value);
    prop(value).assessments[slot] = structuredClone(state);
    const fixture = materialize(value);
    const maintained = currentDisposition(fixture, authorityC);
    expect(maintained.disposition === "clear", `maintained Policy A assessment invariance drifted for ${slot}/${stateName}`);
    const negativeOnly = candidateNegativeOnly(fixture.value);
    const unresolvedOrNegative = candidateUnresolvedOrNegative(fixture.value);
    matrix.push({
      slot,
      state: stateName,
      contract_c_sha256: fixture.sha,
      maintained,
      candidate_explicit_negative_guard: negativeOnly,
      candidate_unresolved_or_negative_guard: unresolvedOrNegative,
    });
  }
}

for (const row of matrix) {
  if (row.state === "performed_adverse" || row.state === "failed") {
    expect(row.candidate_explicit_negative_guard.disposition === "hold", `negative guard leaked ${row.slot}/${row.state}`);
    expect(row.candidate_unresolved_or_negative_guard.disposition === "hold", `unresolved guard leaked ${row.slot}/${row.state}`);
  }
  if (row.state === "not_performed" || row.state === "not_applicable") {
    expect(row.candidate_explicit_negative_guard.disposition === "clear", `negative guard changed benign baseline ${row.slot}/${row.state}`);
    expect(row.candidate_unresolved_or_negative_guard.disposition === "clear", `unresolved guard changed benign baseline ${row.slot}/${row.state}`);
  }
  if (row.state === "performed_unknown") {
    expect(row.candidate_explicit_negative_guard.disposition === "clear", `negative-only guard unexpectedly blocked unknown ${row.slot}`);
    expect(row.candidate_unresolved_or_negative_guard.disposition === "hold", `unresolved guard failed to block unknown ${row.slot}`);
  }
}

function combination(name, assessments) {
  const value = structuredClone(base.value);
  prop(value).assessments = structuredClone(assessments);
  const fixture = materialize(value);
  const maintained = currentDisposition(fixture, authorityC);
  expect(maintained.disposition === "clear", `${name}: maintained Policy A no longer invariant`);
  return {
    name,
    contract_c_sha256: fixture.sha,
    assessments: structuredClone(assessments),
    maintained,
    candidate_explicit_negative_guard: candidateNegativeOnly(fixture.value),
    candidate_unresolved_or_negative_guard: candidateUnresolvedOrNegative(fixture.value),
  };
}

const allUnknown = Object.fromEntries(SLOTS.map((slot) => [slot, STATES.performed_unknown]));
const allAdverse = Object.fromEntries(SLOTS.map((slot) => [slot, STATES.performed_adverse]));
const allFailed = Object.fromEntries(SLOTS.map((slot) => [slot, STATES.failed]));
const allNotApplicable = Object.fromEntries(SLOTS.map((slot) => [slot, STATES.not_applicable]));
const combinations = [
  combination("all_unknown", allUnknown),
  combination("all_adverse", allAdverse),
  combination("all_failed", allFailed),
  combination("all_not_applicable", allNotApplicable),
];
expect(combinations[0].candidate_explicit_negative_guard.disposition === "clear", "all-unknown should discriminate candidates");
expect(combinations[0].candidate_unresolved_or_negative_guard.disposition === "hold", "all-unknown should discriminate candidates");
expect(combinations[1].candidate_explicit_negative_guard.disposition === "hold" && combinations[1].candidate_unresolved_or_negative_guard.disposition === "hold", "all-adverse should HOLD both candidates");
expect(combinations[2].candidate_explicit_negative_guard.disposition === "hold" && combinations[2].candidate_unresolved_or_negative_guard.disposition === "hold", "all-failed should HOLD both candidates");
expect(combinations[3].candidate_explicit_negative_guard.disposition === "clear" && combinations[3].candidate_unresolved_or_negative_guard.disposition === "clear", "all-not-applicable should CLEAR both candidates");

const differingSingleStates = matrix
  .filter((row) => row.candidate_explicit_negative_guard.disposition !== row.candidate_unresolved_or_negative_guard.disposition)
  .map((row) => `${row.slot}/${row.state}`)
  .sort();
const expectedDifferences = SLOTS.map((slot) => `${slot}/performed_unknown`).sort();
expect(JSON.stringify(differingSingleStates) === JSON.stringify(expectedDifferences), `candidate differences escaped explicit unknown: ${differingSingleStates}`);

const result = {
  schema: "policy-a-assessment-guard-counterfactual-v1",
  semantics: "POLICY_COUNTERFACTUAL",
  world_causal_claim: false,
  exact_real_cal_baseline: {
    source_pr: 41,
    workflow_run: 34171780593,
    artifact_id: 10035941867,
    artifact_zip_sha256: "sha256:1ed05eb4353405ba6422b3fe410d82de9d5e125c63ff83c5a9d84fb050d208ec",
    contract_c_sha256: REAL_C_SHA,
    reproduced_contract_d_sha256: sha256(maintainedBaselineD),
    maintained_policy: { disposition: maintainedBaseline.evaluation.disposition, reason: maintainedBaseline.metadata.reason_codes[0] },
    assessments: structuredClone(prop(base.value).assessments),
    candidate_explicit_negative_guard: candidateBaselineNegative,
    candidate_unresolved_or_negative_guard: candidateBaselineUnresolved,
  },
  assessment_vocabulary_has_affirmative_favorable_state: false,
  single_slot_matrix: matrix,
  combinations,
  discriminating_choice: {
    only_single_slot_difference_between_candidates: "performed / unknown",
    differing_single_states: differingSingleStates,
    explicit_adverse_or_failed_blocked_by_both_candidates: true,
    current_real_cal_all_not_performed_preserved_clear_by_both_candidates: true,
    explicit_not_applicable_preserved_clear_by_both_candidates: true,
  },
  interpretation:
    "Both bounded guards close explicit adverse/failed Policy-A counterfactual states without changing the exact current real-CAL supported baseline. The remaining material choice between them is whether an explicitly performed-but-unknown assessment should itself block verified-tag candidacy. Contract C 1.0.0 has no affirmative favorable assessment state, so requiring positive generic assessment completion is not expressible under the current contract vocabulary.",
  maintained_policy_change_authorized: false,
  upstream_nonbaseline_assessment_reachability_claimed: false,
};
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
