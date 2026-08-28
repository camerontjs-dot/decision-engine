import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  canonicalJson,
  evaluateDecision,
  semanticReceipt,
  sha256,
} from "../research/contract-c-consumer-probe-rc1/policyRuntime.mjs";
import { evaluateViaCurrentGate } from "../research/contract-c-consumer-probe-rc1/gateAdapter.mjs";
import { evaluatePublicationTable } from "../research/contract-c-consumer-probe-rc1/independentPublicationTable.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const researchDir = path.join(__dirname, "..", "research", "contract-c-consumer-probe-rc1");
const policyDoc = JSON.parse(fs.readFileSync(path.join(researchDir, "policies.json"), "utf8"));
const fixtureDoc = JSON.parse(fs.readFileSync(path.join(researchDir, "fixtures.json"), "utf8"));
const P = policyDoc;
const F = fixtureDoc.fixtures;
const C = fixtureDoc.contexts;

const clone = (x) => structuredClone(x);
const request = (c, context, policy, subject = "subject-rc1") => ({ subject, c, context, policy });

function decisionCore(receipt) {
  return {
    execution_status: receipt.execution_status,
    neutral_state: receipt.neutral_state,
    final_recommendation: receipt.final_recommendation,
    blocking_failures: receipt.blocking_failures,
    blocking_unknowns: receipt.blocking_unknowns,
  };
}

test("four materially different policies consume the same Contract-C-like semantic fixture", () => {
  const c = F.base_supported_clean;
  const outputs = [
    evaluateDecision(request(c, C.mainframe_default, P.mainframe)),
    evaluateDecision(request(c, C.publication_public, P.publication)),
    evaluateDecision(request(c, C.sop, P.sop)),
    evaluateDecision(request(c, C.deviation_ready, P.deviation)),
  ];

  assert.deepEqual(outputs.map((r) => r.neutral_state), ["satisfied", "satisfied", "satisfied", "satisfied"]);
  assert.deepEqual(outputs.map((r) => r.final_recommendation), [
    "eligible_for_operator_review",
    "publishable_as_written",
    "conformance_supported",
    "decision_ready",
  ]);
  assert.equal(new Set(outputs.map((r) => r.input.hash)).size, 1, "C bytes must remain identical");
  assert.equal(new Set(outputs.map((r) => r.policy.hash)).size, 4, "destination policy identity must differ");
});

test("fixed C bytes plus changed destination context legitimately changes the decision", () => {
  const c = F.supported_unknown_aperture;
  const internal = evaluateDecision(request(c, C.publication_internal, P.publication));
  const publicClaim = evaluateDecision(request(c, C.publication_public, P.publication));

  assert.equal(internal.input.hash, publicClaim.input.hash);
  assert.equal(internal.neutral_state, "satisfied");
  assert.equal(internal.final_recommendation, "publishable_as_written");
  assert.equal(publicClaim.neutral_state, "unresolved");
  assert.equal(publicClaim.final_recommendation, "review_or_caveat");
});

test("same headline CAL verdict can drive different decisions when residual epistemic state differs", () => {
  for (const name of [
    "base_supported_clean",
    "supported_with_counterevidence",
    "supported_unknown_aperture",
    "supported_ineligible",
    "supported_invalid_semantics",
    "not_applicable",
  ]) {
    assert.equal(F[name].conclusion.verdict, "supported");
  }

  const evaluate = (name) => evaluateDecision(request(F[name], C.publication_public, P.publication));
  assert.equal(evaluate("base_supported_clean").final_recommendation, "publishable_as_written");
  assert.equal(evaluate("supported_with_counterevidence").final_recommendation, "withhold_or_narrow");
  assert.equal(evaluate("supported_unknown_aperture").final_recommendation, "review_or_caveat");
  assert.equal(evaluate("supported_ineligible").final_recommendation, "withhold_or_narrow");
  assert.equal(evaluate("supported_invalid_semantics").final_recommendation, "withhold_or_narrow");
  assert.equal(evaluate("not_applicable").final_recommendation, "not_applicable");
});

test("unknown causes remain inspectable and are not collapsed into adverse findings", () => {
  const missing = evaluateDecision(request(F.missing_optional_policy_field, C.publication_public, P.publication));
  assert.equal(missing.neutral_state, "unresolved");
  assert.ok(missing.blocking_unknowns.some((u) => u.reason === "input_absent"));

  const abstained = evaluateDecision(request(F.abstained, C.publication_public, P.publication));
  assert.equal(abstained.neutral_state, "unresolved");
  assert.ok(abstained.blocking_unknowns.some((u) => u.reason === "cal_abstained"));

  const resolver = evaluateDecision(request(F.base_supported_clean, C.deviation_resolver_unavailable, P.deviation));
  assert.equal(resolver.neutral_state, "unresolved");
  assert.ok(resolver.blocking_unknowns.some((u) => u.reason === "resolver_unavailable"));

  const notApplicable = evaluateDecision(request(F.not_applicable, C.sop, P.sop));
  assert.equal(notApplicable.neutral_state, "not_applicable");
  assert.equal(notApplicable.final_recommendation, "requirement_not_applicable");
});

test("malformed artifact, malformed policy, and runtime failure never become substantive reject/nonconformance", () => {
  const malformedArtifact = evaluateDecision(request(F.malformed_missing_identity, C.publication_public, P.publication));
  assert.equal(malformedArtifact.execution_status, "invalid_input");
  assert.equal(malformedArtifact.neutral_state, null);
  assert.equal(malformedArtifact.final_recommendation, null);
  assert.equal(malformedArtifact.error.type, "malformed_artifact");

  const malformedPolicy = clone(P.publication);
  malformedPolicy.criteria[0].op = "prestige_operator";
  delete malformedPolicy.criteria[0].valueOutcomes;
  const badPolicy = evaluateDecision(request(F.base_supported_clean, C.publication_public, malformedPolicy));
  assert.equal(badPolicy.execution_status, "invalid_policy");
  assert.equal(badPolicy.neutral_state, null);
  assert.equal(badPolicy.final_recommendation, null);

  const runtimeFailure = evaluateDecision(
    request(F.base_supported_clean, C.publication_public, P.publication),
    { faultAtCriterion: "semantic-validity" },
  );
  assert.equal(runtimeFailure.execution_status, "system_error");
  assert.equal(runtimeFailure.neutral_state, null);
  assert.equal(runtimeFailure.final_recommendation, null);
  assert.equal(runtimeFailure.error.type, "runtime_failure");
});

test("decision receipt is deterministic, replayable, lineage-bound, and never claims application", () => {
  const req = request(F.base_supported_clean, C.publication_public, P.publication);
  const before = canonicalJson(req);
  const a = evaluateDecision(req);
  const b = evaluateDecision(req);
  const after = canonicalJson(req);

  assert.equal(a.receipt_hash, b.receipt_hash);
  assert.deepEqual(a, b);
  assert.equal(before, after, "evaluation must not mutate request state");
  assert.equal(a.application.status, "not_applied");
  assert.equal(a.application.authority, "publisher/operator");
  assert.equal(a.approval.required, true);
  assert.equal(a.input.hash, sha256(F.base_supported_clean));
  assert.equal(a.receipt_hash.length, 64);
});

test("policy mutations change decisions and/or canonical receipt identity as preregistered", () => {
  const baseCounter = evaluateDecision(request(F.supported_with_counterevidence, C.publication_public, P.publication));
  assert.equal(baseCounter.neutral_state, "unsatisfied");

  const threshold = clone(P.publication);
  threshold.criteria.find((c) => c.id === "counterevidence-within-tolerance").value = 1;
  const thresholdResult = evaluateDecision(request(F.supported_with_counterevidence, C.publication_public, threshold));
  assert.equal(thresholdResult.neutral_state, "satisfied");
  assert.notEqual(baseCounter.receipt_hash, thresholdResult.receipt_hash);

  const severity = clone(P.publication);
  severity.criteria.find((c) => c.id === "counterevidence-within-tolerance").severity = "advisory";
  const severityResult = evaluateDecision(request(F.supported_with_counterevidence, C.publication_public, severity));
  assert.equal(severityResult.neutral_state, "satisfied");
  assert.ok(severityResult.caveats.some((c) => c.id === "counterevidence-within-tolerance"));

  const unknownHandling = clone(P.publication);
  unknownHandling.criteria.find((c) => c.id === "aperture").valueOutcomes.unknown = "fail";
  const unknownBase = evaluateDecision(request(F.supported_unknown_aperture, C.publication_public, P.publication));
  const unknownMutated = evaluateDecision(request(F.supported_unknown_aperture, C.publication_public, unknownHandling));
  assert.equal(unknownBase.neutral_state, "unresolved");
  assert.equal(unknownMutated.neutral_state, "unsatisfied");
  assert.notEqual(unknownBase.receipt_hash, unknownMutated.receipt_hash);

  const logic = clone(P.publication);
  logic.criteria.find((c) => c.id === "claim-supported-as-written").valueOutcomes.supported = "fail";
  const logicResult = evaluateDecision(request(F.base_supported_clean, C.publication_public, logic));
  assert.equal(logicResult.neutral_state, "unsatisfied");

  const approval = clone(P.publication);
  approval.requiresHumanApproval = false;
  const approvalBase = evaluateDecision(request(F.base_supported_clean, C.publication_public, P.publication));
  const approvalMutated = evaluateDecision(request(F.base_supported_clean, C.publication_public, approval));
  assert.equal(approvalBase.neutral_state, approvalMutated.neutral_state);
  assert.equal(approvalMutated.approval.required, false);
  assert.notEqual(approvalBase.receipt_hash, approvalMutated.receipt_hash);
});

function suiteFor(policyName) {
  const fixtureNames = Object.keys(F).filter((name) => name !== "malformed_missing_identity");
  const contexts = {
    mainframe: [C.mainframe_default, C.mainframe_strict],
    publication: [C.publication_public, C.publication_internal],
    sop: [C.sop],
    deviation: [
      C.deviation_ready,
      C.deviation_adverse,
      C.deviation_resolver_unavailable,
      C.deviation_not_applicable,
      C.deviation_causal_unresolved,
      C.deviation_counterevidence_incomplete,
    ],
  }[policyName];
  return fixtureNames.flatMap((fixtureName) =>
    contexts.map((context, index) => ({ fixtureName, c: F[fixtureName], context, index }))
  );
}

test("criterion ablation identifies no dead criterion in the frozen synthetic suite", () => {
  const dead = [];
  for (const policyName of ["mainframe", "publication", "sop", "deviation"]) {
    const policy = P[policyName];
    const suite = suiteFor(policyName);
    for (const criterion of policy.criteria) {
      const ablated = clone(policy);
      ablated.criteria = ablated.criteria.filter((c) => c.id !== criterion.id);
      let changed = false;
      for (const row of suite) {
        const full = evaluateDecision(request(row.c, row.context, policy));
        const without = evaluateDecision(request(row.c, row.context, ablated));
        if (canonicalJson(decisionCore(full)) !== canonicalJson(decisionCore(without))) {
          changed = true;
          break;
        }
      }
      if (!changed) dead.push(`${policyName}:${criterion.id}`);
    }
  }
  assert.deepEqual(dead, []);
});

test("irrelevant CAL telemetry is decision-invariant while full artifact lineage still changes", () => {
  const original = evaluateDecision(request(F.base_supported_clean, C.publication_public, P.publication));
  const mutatedC = clone(F.base_supported_clean);
  mutatedC.telemetry = {
    retrieval_score: 0.01,
    nli_logit: -99,
    debug_order: ["irrelevant", "mutation"],
    new_private_field: { implementation: "changed" },
  };
  const mutated = evaluateDecision(request(mutatedC, C.publication_public, P.publication));

  assert.equal(original.neutral_state, mutated.neutral_state);
  assert.equal(original.final_recommendation, mutated.final_recommendation);
  assert.deepEqual(
    original.criteria.map(({ id, outcome, reason }) => ({ id, outcome, reason })),
    mutated.criteria.map(({ id, outcome, reason }) => ({ id, outcome, reason })),
  );
  assert.notEqual(original.input.hash, mutated.input.hash, "complete input artifact identity must change");
  assert.notEqual(original.receipt_hash, mutated.receipt_hash, "lineage-bound receipt identity must change");
});

test("publication policy has a separate table implementation with matching semantic receipts on frozen cases", () => {
  const cases = [
    ["base_supported_clean", C.publication_public],
    ["supported_with_counterevidence", C.publication_public],
    ["supported_unknown_aperture", C.publication_public],
    ["supported_unknown_aperture", C.publication_internal],
    ["supported_ineligible", C.publication_public],
    ["supported_invalid_semantics", C.publication_public],
    ["not_applicable", C.publication_public],
    ["abstained", C.publication_public],
    ["missing_optional_policy_field", C.publication_public],
  ];
  for (const [fixtureName, context] of cases) {
    const runtime = semanticReceipt(
      evaluateDecision(request(F[fixtureName], context, P.publication)),
    );
    const table = evaluatePublicationTable(F[fixtureName], context);
    assert.deepEqual(runtime, table, fixtureName);
  }
});

test("current Gate can host the criterion kernel but distorts not-applicable and system-failure semantics", () => {
  for (const [policy, context] of [
    [P.mainframe, C.mainframe_default],
    [P.publication, C.publication_public],
    [P.sop, C.sop],
    [P.deviation, C.deviation_ready],
  ]) {
    const viaGate = evaluateViaCurrentGate(request(F.base_supported_clean, context, policy));
    assert.ok(["promote", "hold", "reject"].includes(viaGate.gate_decision));
    assert.equal(viaGate.applied_automatically, false);
  }

  const nativeSop = evaluateDecision(request(F.not_applicable, C.sop, P.sop));
  const gateSop = evaluateViaCurrentGate(request(F.not_applicable, C.sop, P.sop));
  assert.equal(nativeSop.neutral_state, "not_applicable");
  assert.equal(nativeSop.final_recommendation, "requirement_not_applicable");
  assert.equal(gateSop.gate_decision, "promote");
  assert.equal(gateSop.final_recommendation, "conformance_supported");
  assert.ok(gateSop.semantic_distortions.some((d) => d.from === "not_applicable"));

  const gateFailure = evaluateViaCurrentGate(
    request(F.base_supported_clean, C.publication_public, P.publication),
    { throwAtCriterion: "semantic-validity" },
  );
  const runtimeFailure = evaluateDecision(
    request(F.base_supported_clean, C.publication_public, P.publication),
    { faultAtCriterion: "semantic-validity" },
  );
  assert.equal(gateFailure.gate_decision, "hold");
  assert.ok(gateFailure.blocking_unknowns.includes("semantic-validity"));
  assert.equal(runtimeFailure.execution_status, "system_error");
  assert.equal(runtimeFailure.final_recommendation, null);
});

test("career Select/Rank code is not imported into the RC1 policy runtime", () => {
  for (const filename of ["policyRuntime.mjs", "gateAdapter.mjs", "independentPublicationTable.mjs"]) {
    const text = fs.readFileSync(path.join(researchDir, filename), "utf8");
    assert.doesNotMatch(text, /decisionEngine\.js/);
    assert.doesNotMatch(text, /weightCalibration/);
  }
});
