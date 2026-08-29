import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildSyntheticFixture } from "../fixtureFactory.mjs";

import {
  CONTRACT_C_AUTHORITY,
  canonicalObjectSha256,
  evaluateContractCShadow,
} from "../contractCGateShadowAdapter.mjs";

const barsDoc = JSON.parse(readFileSync(new URL("../bars.json", import.meta.url), "utf8"));
const strictBar = barsDoc.bars.find((bar) => bar.id === "cal-contract-c-shadow-strict-v1");
const contradictionHoldBar = barsDoc.bars.find((bar) => bar.id === "cal-contract-c-shadow-contradiction-hold-v1");

const fixture = (name) => buildSyntheticFixture(name);
const receipt = (valid) => ({ valid, authority: { ...CONTRACT_C_AUTHORITY }, errors: valid ? [] : ["authoritative validator rejected fixture"] });
const evaluate = (name, bar = strictBar, valid = true) => evaluateContractCShadow({
  contractC: fixture(name), validationReceipt: receipt(valid), propositionId: "clm-md", barSpec: bar,
});
const criterion = (result, id) => result.criteriaEvaluated.find((entry) => entry.id === id);
const outcomes = (result) => Object.fromEntries(result.criteriaEvaluated.map((entry) => [entry.id, entry.outcome]));

function reverseObjectOrder(value) {
  if (Array.isArray(value)) return value.map(reverseObjectOrder);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).reverse().map((key) => [key, reverseObjectOrder(value[key])]));
  }
  return value;
}

test("A clear positive can promote but remains operator-only shadow output", () => {
  const result = evaluate("clear-positive");
  assert.equal(result.finalDecision, "promote");
  assert.deepEqual(result.blockingFailures, []);
  assert.deepEqual(result.blockingUnknowns, []);
  assert.equal(result.requiresHumanApproval, true);
  assert.equal(result.automaticApplicationPermitted, false);
  assert.equal(result.appliedAutomatically, false);
  assert.match(result.adapter.implementation_sha256, /^[0-9a-f]{64}$/);
  assert.match(result.gateBar.canonical_spec_sha256, /^[0-9a-f]{64}$/);
  assert.match(result.contractC.canonical_sha256, /^[0-9a-f]{64}$/);
});

test("B explicit bar-defined adverse assessment rejects and names the source state", () => {
  const result = evaluate("explicit-adverse");
  assert.equal(result.finalDecision, "reject");
  assert.deepEqual(result.blockingFailures, ["semantic-validity-state"]);
  const c = criterion(result, "semantic-validity-state");
  assert.equal(c.outcome, "fail");
  assert.equal(c.observed.sourceState, "performed:adverse");
  assert.equal(c.observed.mappingStatus, "mapped");
});

test("C epistemic unknown holds rather than rejects", () => {
  const result = evaluate("epistemic-unknown");
  assert.equal(result.finalDecision, "hold");
  assert.deepEqual(result.blockingFailures, []);
  assert.ok(result.blockingUnknowns.includes("semantic-validity-state"));
  assert.equal(criterion(result, "semantic-validity-state").observed.sourceState, "performed:unknown");
});

test("D not-checkable evidence insufficiency holds without inventing failure", () => {
  const result = evaluate("evidence-insufficiency");
  assert.equal(result.finalDecision, "hold");
  assert.deepEqual(result.blockingFailures, []);
  assert.equal(criterion(result, "proposition-execution").observed.sourceState, "completed:not_checkable");
  assert.equal(criterion(result, "reported-verdict").observed.sourceState, "not_checkable");
});

test("E execution failure remains execution inability and holds", () => {
  const result = evaluate("execution-failure");
  assert.equal(result.finalDecision, "hold");
  assert.deepEqual(result.blockingFailures, []);
  const execution = criterion(result, "proposition-execution");
  assert.equal(execution.observed.sourceState, "failed");
  assert.equal(execution.outcome, "unknown");
  const verdict = criterion(result, "reported-verdict");
  assert.equal(verdict.observed.sourceStatus, "missing");
  assert.equal(verdict.outcome, "unknown");
});

test("F missing required field is safe, explicit, and not inferred", () => {
  const result = evaluate("missing-required-field", strictBar, false);
  assert.equal(result.finalDecision, "hold");
  assert.deepEqual(result.blockingFailures, []);
  assert.equal(criterion(result, "contract-c-conformance").observed.sourceState, "invalid");
  const missingState = criterion(result, "semantic-validity-state");
  assert.equal(missingState.observed.sourceStatus, "missing");
  assert.equal(missingState.outcome, "unknown");
});

test("G malformed field is safe and never coerced", () => {
  const result = evaluate("malformed-field", strictBar, false);
  assert.equal(result.finalDecision, "hold");
  assert.deepEqual(result.blockingFailures, []);
  const malformedState = criterion(result, "semantic-validity-state");
  assert.equal(malformedState.observed.sourceStatus, "malformed");
  assert.equal(malformedState.outcome, "unknown");
});

test("H mixed support/refutation is not reinterpreted from contribution channels", () => {
  const positive = evaluate("clear-positive");
  const mixed = evaluate("mixed-support-refutation");
  assert.equal(mixed.finalDecision, "promote");
  assert.deepEqual(outcomes(mixed), outcomes(positive));
  assert.notEqual(mixed.contractC.canonical_sha256, positive.contractC.canonical_sha256);
  assert.ok(mixed.sourceFieldsConsumed.every((field) => !field.includes("contributions")));
});

test("I operator-only bar cannot auto-apply even when it promotes", () => {
  const result = evaluate("clear-positive");
  assert.equal(result.finalDecision, "promote");
  assert.equal(result.requiresHumanApproval, true);
  assert.equal(result.automaticApplicationPermitted, false);
  assert.equal(result.appliedAutomatically, false);
});

test("irrelevant producer identity mutation leaves Gate result unchanged", () => {
  const a = evaluate("clear-positive");
  const b = evaluate("irrelevant-producer-identity-mutation");
  assert.equal(b.finalDecision, a.finalDecision);
  assert.deepEqual(outcomes(b), outcomes(a));
  assert.notEqual(b.contractC.canonical_sha256, a.contractC.canonical_sha256);
});

test("unknown → fail mutation changes only the mapped source and yields HOLD → REJECT", () => {
  const unknown = evaluate("epistemic-unknown");
  const adverse = evaluate("explicit-adverse");
  assert.equal(unknown.finalDecision, "hold");
  assert.equal(adverse.finalDecision, "reject");
  for (const id of Object.keys(outcomes(unknown))) {
    if (id === "semantic-validity-state") continue;
    assert.equal(outcomes(adverse)[id], outcomes(unknown)[id]);
  }
  assert.equal(criterion(unknown, "semantic-validity-state").outcome, "unknown");
  assert.equal(criterion(adverse, "semantic-validity-state").outcome, "fail");
});

test("unknown → pass mutation clears only that criterion and yields HOLD → PROMOTE", () => {
  const unknown = evaluate("epistemic-unknown");
  const positive = evaluate("clear-positive");
  assert.equal(unknown.finalDecision, "hold");
  assert.equal(positive.finalDecision, "promote");
  for (const id of Object.keys(outcomes(unknown))) {
    if (id === "semantic-validity-state") continue;
    assert.equal(outcomes(positive)[id], outcomes(unknown)[id]);
  }
  assert.equal(criterion(positive, "semantic-validity-state").observed.sourceState, "not_applicable");
  assert.equal(criterion(positive, "semantic-validity-state").outcome, "pass");
});

test("missing and explicit unknown both hold but preserve different provenance", () => {
  const missingResult = evaluate("missing-required-field", strictBar, false);
  const unknownResult = evaluate("epistemic-unknown");
  assert.equal(missingResult.finalDecision, "hold");
  assert.equal(unknownResult.finalDecision, "hold");
  assert.equal(criterion(missingResult, "semantic-validity-state").observed.sourceStatus, "missing");
  assert.equal(criterion(unknownResult, "semantic-validity-state").observed.sourceStatus, "present");
  assert.equal(criterion(unknownResult, "semantic-validity-state").observed.sourceState, "performed:unknown");
});

test("field-order mutation leaves identity and Gate result unchanged", () => {
  const original = fixture("clear-positive");
  const reordered = reverseObjectOrder(original);
  const a = evaluateContractCShadow({ contractC: original, validationReceipt: receipt(true), propositionId: "clm-md", barSpec: strictBar });
  const b = evaluateContractCShadow({ contractC: reordered, validationReceipt: receipt(true), propositionId: "clm-md", barSpec: strictBar });
  assert.equal(canonicalObjectSha256(original), canonicalObjectSha256(reordered));
  assert.equal(a.contractC.canonical_sha256, b.contractC.canonical_sha256);
  assert.equal(a.finalDecision, b.finalDecision);
  assert.deepEqual(outcomes(a), outcomes(b));
});

test("extra Contract C v1 field is held because the authoritative schema rejects it", () => {
  const result = evaluate("extra-field", strictBar, false);
  assert.equal(result.finalDecision, "hold");
  assert.deepEqual(result.blockingFailures, []);
  assert.equal(criterion(result, "contract-c-conformance").outcome, "unknown");
  assert.equal(criterion(result, "contract-c-conformance").observed.sourceState, "invalid");
});

test("invalid Contract C cannot reject even when an adverse-looking field is present", () => {
  const result = evaluate("invalid-adverse", strictBar, false);
  assert.equal(result.finalDecision, "hold");
  assert.deepEqual(result.blockingFailures, []);
  assert.equal(criterion(result, "contract-c-conformance").observed.sourceState, "invalid");
  const verdict = criterion(result, "reported-verdict");
  assert.equal(verdict.observed.sourceState, "contradicted");
  assert.equal(verdict.observed.mappingStatus, "blocked_by_contract_conformance");
  assert.equal(verdict.outcome, "unknown");
});

test("missing validation receipt blocks adverse mappings and holds", () => {
  const contractC = fixture("explicit-adverse");
  const result = evaluateContractCShadow({ contractC, validationReceipt: null, propositionId: "clm-md", barSpec: strictBar });
  assert.equal(result.finalDecision, "hold");
  assert.deepEqual(result.blockingFailures, []);
  assert.equal(criterion(result, "contract-c-conformance").observed.sourceStatus, "missing");
  const semantic = criterion(result, "semantic-validity-state");
  assert.equal(semantic.observed.sourceState, "performed:adverse");
  assert.equal(semantic.observed.mappingStatus, "blocked_by_contract_conformance");
  assert.equal(semantic.outcome, "unknown");
});

test("contradiction policy mutation changes decision only through bar policy", () => {
  const strict = evaluate("contradicted", strictBar, true);
  const holding = evaluate("contradicted", contradictionHoldBar, true);
  assert.equal(strict.contractC.canonical_sha256, holding.contractC.canonical_sha256);
  assert.equal(strict.adapter.implementation_sha256, holding.adapter.implementation_sha256);
  assert.notEqual(strict.gateBar.canonical_spec_sha256, holding.gateBar.canonical_spec_sha256);
  assert.equal(strict.finalDecision, "reject");
  assert.equal(holding.finalDecision, "hold");
  for (const id of Object.keys(outcomes(strict))) {
    if (id === "reported-verdict") continue;
    assert.equal(outcomes(strict)[id], outcomes(holding)[id]);
  }
  assert.equal(criterion(strict, "reported-verdict").outcome, "fail");
  assert.equal(criterion(holding, "reported-verdict").outcome, "unknown");
});

const authorityRoot = process.env.CONTRACT_C_AUTHORITY_ROOT;
test("authoritative frozen Contract C fixture is consumed without turning unsupported/not_performed into rejection", { skip: !authorityRoot }, () => {
  const path = join(authorityRoot, "fixtures/contract-c/1.0.0/valid-canonical.json");
  const contractC = JSON.parse(readFileSync(path, "utf8"));
  const result = evaluateContractCShadow({ contractC, validationReceipt: receipt(true), propositionId: "clm-txt", barSpec: strictBar });
  assert.equal(result.finalDecision, "hold");
  assert.deepEqual(result.blockingFailures, []);
  assert.equal(criterion(result, "reported-verdict").observed.sourceState, "unsupported");
  assert.equal(criterion(result, "reported-verdict").outcome, "unknown");
  for (const id of ["eligibility-state", "semantic-validity-state", "aperture-completeness-state", "temporal-applicability-state"]) {
    assert.equal(criterion(result, id).observed.sourceState, "not_performed");
    assert.equal(criterion(result, id).outcome, "unknown");
  }
  assert.equal(result.contractC.canonical_sha256, "7a66583e332be4901d13ba9f2d7e12419938c77a41b83223a4b0946ad529b7a1");
});
