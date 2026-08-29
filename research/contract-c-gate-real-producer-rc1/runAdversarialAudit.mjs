import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { evaluateExactContractCShadow } from "./exactByteContractCGateAdapter.mjs";

const mutationDir = resolve(process.argv[2]);
const receiptDir = resolve(process.argv[3]);
const barPath = resolve(process.argv[4]);
const bar = JSON.parse(readFileSync(barPath, "utf8"));

function objectBytes(name) {
  return readFileSync(resolve(mutationDir, `${name}.json`));
}
function receipt(name) {
  return JSON.parse(readFileSync(resolve(receiptDir, `${name}.receipt.json`), "utf8"));
}
function evaluate(name, options = {}) {
  return evaluateExactContractCShadow({
    contractCBytes: objectBytes(name),
    validationReceipt: options.validationReceipt === undefined ? receipt(name) : options.validationReceipt,
    propositionId: options.propositionId ?? "clm-md",
    barSpec: options.barSpec ?? bar,
  });
}
function assertDecision(label, result, expected) {
  if (result.finalDecision !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${result.finalDecision}`);
  }
  if (result.requiresHumanApproval !== true || result.automaticApplicationPermitted !== false || result.appliedAutomatically !== false) {
    throw new Error(`${label}: operator-control invariant violated`);
  }
  if (result.selectRankUsed !== false) throw new Error(`${label}: Select/Rank unexpectedly used`);
}
function assertNoSemanticFailBeforeConformance(label, result) {
  if (result.contractC.conformance_state === "valid_exact_object") {
    throw new Error(`${label}: test requires conformance not to be established`);
  }
  const semantic = result.criteriaEvaluated.filter((row) => row.id !== "contract-c-conformance");
  if (semantic.some((row) => row.outcome === "fail" || row.outcome === "pass")) {
    throw new Error(`${label}: semantic PASS/FAIL acquired authority before exact conformance`);
  }
  if (result.finalDecision !== "hold") {
    throw new Error(`${label}: unestablished object must HOLD, got ${result.finalDecision}`);
  }
}

const cases = [];
function record(id, result, extra = {}) {
  cases.push({
    id,
    conformance_state: result.contractC.conformance_state,
    finalDecision: result.finalDecision,
    blockingFailures: result.blockingFailures,
    blockingUnknowns: result.blockingUnknowns,
    sourceFieldsConsumed: result.sourceFieldsConsumed,
    operator: {
      requiresHumanApproval: result.requiresHumanApproval,
      automaticApplicationPermitted: result.automaticApplicationPermitted,
      appliedAutomatically: result.appliedAutomatically,
    },
    ...extra,
  });
}

for (const [id, fixture] of [
  ["schema-invalid-object-plus-adverse-verdict", "schema-invalid-adverse"],
  ["wrong-contract-c-version", "wrong-contract-version"],
  ["mismatched-result-set-identity", "mismatched-result-set-id"],
  ["malformed-assessment-state", "malformed-assessment"],
  ["additional-unknown-field", "extra-field"],
]) {
  const result = evaluate(fixture);
  assertDecision(id, result, "hold");
  assertNoSemanticFailBeforeConformance(id, result);
  record(id, result);
}

{
  const altered = structuredClone(receipt("clear-positive"));
  altered.canonical_sha256 = "0".repeat(64);
  const result = evaluate("clear-positive", { validationReceipt: altered });
  assertDecision("altered-canonical-hash", result, "hold");
  assertNoSemanticFailBeforeConformance("altered-canonical-hash", result);
  record("altered-canonical-hash", result);
}

{
  const result = evaluate("clear-positive", { propositionId: "different-proposition" });
  assertDecision("mismatched-proposition-identity", result, "hold");
  if (result.contractC.conformance_state !== "valid_exact_object") {
    throw new Error("mismatched-proposition-identity: object authority should remain established");
  }
  const prop = result.criteriaEvaluated.find((row) => row.id === "proposition-execution");
  const verdict = result.criteriaEvaluated.find((row) => row.id === "reported-verdict");
  if (prop?.outcome !== "unknown" || verdict?.outcome !== "unknown") {
    throw new Error("mismatched-proposition-identity: adapter mapped a different proposition");
  }
  record("mismatched-proposition-identity", result);
}

{
  const result = evaluate("clear-positive", { validationReceipt: null });
  assertDecision("missing-validator-receipt", result, "hold");
  assertNoSemanticFailBeforeConformance("missing-validator-receipt", result);
  record("missing-validator-receipt", result);
}

{
  const receiptA = receipt("clear-positive");
  const result = evaluate("explicit-overstated", { validationReceipt: receiptA });
  assertDecision("validator-receipt-for-different-bytes", result, "hold");
  assertNoSemanticFailBeforeConformance("validator-receipt-for-different-bytes", result);
  record("validator-receipt-for-different-bytes", result, {
    receipt_object_sha256: receiptA.object_sha256,
  });
}

{
  const wrong = structuredClone(receipt("clear-positive"));
  wrong.authority.validator_blob_sha = "1".repeat(40);
  const result = evaluate("clear-positive", { validationReceipt: wrong });
  assertDecision("wrong-validator-version", result, "hold");
  assertNoSemanticFailBeforeConformance("wrong-validator-version", result);
  record("wrong-validator-version", result);
}

{
  const result = evaluate("future-reported-verdict");
  assertDecision("unknown-future-reported-verdict", result, "hold");
  if (result.contractC.conformance_state !== "valid_exact_object") {
    throw new Error("future verdict fixture should be valid Contract C");
  }
  const verdict = result.criteriaEvaluated.find((row) => row.id === "reported-verdict");
  if (verdict?.outcome !== "unknown" || verdict?.observed?.mappingStatus !== "unmapped") {
    throw new Error("future reported_verdict was not preserved as unmapped UNKNOWN");
  }
  record("unknown-future-reported-verdict", result);
}

{
  const clear = evaluate("clear-positive");
  const mixed = evaluate("mixed-support-refutation");
  assertDecision("contribution-control-clear", clear, "promote");
  assertDecision("contribution-only-adverse-mutation", mixed, "promote");
  const project = (result) => result.criteriaEvaluated.map((row) => ({ id: row.id, outcome: row.outcome }));
  if (JSON.stringify(project(clear)) !== JSON.stringify(project(mixed))) {
    throw new Error("contribution-only mutation changed Gate criterion outcomes");
  }
  const forbidden = ["contributions", "measurement", "evidence_ref", "assessments"];
  if (clear.sourceFieldsConsumed.some((field) => forbidden.some((token) => field.includes(token))) ||
      mixed.sourceFieldsConsumed.some((field) => forbidden.some((token) => field.includes(token)))) {
    throw new Error("minimal adapter consumed prohibited contribution/assessment/measurement fields");
  }
  record("contribution-only-adverse-mutation", mixed, {
    controlDecision: clear.finalDecision,
    invariant: true,
  });
}

{
  const result = evaluate("explicit-overstated");
  assertDecision("frozen-policy-explicit-overstated", result, "reject");
  if (!result.blockingFailures.includes("reported-verdict")) {
    throw new Error("overstated did not reject through the explicit frozen verdict rule");
  }
  record("frozen-policy-explicit-overstated", result);
}

const rejectedBarMutations = [];
for (const [id, mutate] of [
  ["requiresHumanApproval-false", (candidate) => { candidate.requiresHumanApproval = false; }],
  ["automaticApplicationPermitted-true", (candidate) => { candidate.automaticApplicationPermitted = true; }],
  ["appliedAutomatically-true", (candidate) => { candidate.appliedAutomatically = true; }],
  ["selectRankPermitted-true", (candidate) => { candidate.selectRankPermitted = true; }],
]) {
  const mutated = structuredClone(bar);
  mutate(mutated);
  let rejected = false;
  try {
    evaluate("clear-positive", { barSpec: mutated });
  } catch (error) {
    rejected = /unsafe RC1 research bar/.test(String(error?.message ?? error));
  }
  if (!rejected) throw new Error(`${id}: unsafe bar mutation was not rejected before evaluation`);
  rejectedBarMutations.push(id);
}

const report = {
  status: "PASS",
  question: "Can untrusted semantic-looking content acquire policy authority before the exact authoritative Contract C object is established?",
  answer: "NO_ON_TESTED_RC1_SURFACE",
  cases,
  operator_bar_mutations_rejected_before_evaluation: rejectedBarMutations,
  forbidden_semantic_reconstruction: {
    assessments_consumed: false,
    contributions_consumed: false,
    measurements_consumed: false,
    evidence_text_consumed: false,
    select_rank_used: false,
  },
};
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);