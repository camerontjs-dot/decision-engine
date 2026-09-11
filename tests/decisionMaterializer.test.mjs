import assert from "node:assert/strict";
import test from "node:test";

import { materializeBoundDecision } from "../src/decisionMaterializer.js";

function bindings() {
  return {
    inputAuthority: {
      kind: "contract-c",
      id: "result-set:test",
      immutable_id: `sha256:${"1".repeat(64)}`,
    },
    policy: {
      id: "decision-engine.contract-c.supported-claim-verification",
      version: "1.0.0",
    },
    target: {
      kind: "claim",
      id: "claim:test",
      content_sha256: `sha256:${"2".repeat(64)}`,
    },
  };
}

test("policy fragment cannot replace externally established bindings", () => {
  const { inputAuthority, policy, target } = bindings();
  const decision = materializeBoundDecision({
    inputAuthority,
    policy,
    target,
    decisionFragment: {
      input_authority: { kind: "forged", id: "forged", immutable_id: `sha256:${"3".repeat(64)}` },
      policy: { id: "forged", version: "9.9.9" },
      target: { kind: "forged", id: "forged", content_sha256: `sha256:${"4".repeat(64)}` },
      evaluation: { state: "completed", disposition: "clear" },
      effect: { type: "knowledge.add_verified_tag", version: "1", params: { scope: "claim" } },
      metadata: { reason_codes: ["test"] },
    },
  });

  assert.deepEqual(decision.input_authority, inputAuthority);
  assert.deepEqual(decision.policy, policy);
  assert.deepEqual(decision.target, target);
  assert.equal(decision.input_authority.kind, "contract-c");
  assert.equal(decision.policy.id, "decision-engine.contract-c.supported-claim-verification");
  assert.equal(decision.target.kind, "claim");
});

test("materialization clones bindings and policy-owned state", () => {
  const { inputAuthority, policy, target } = bindings();
  const decisionFragment = {
    evaluation: { state: "completed", disposition: "hold" },
    effect: { type: "knowledge.add_verified_tag", version: "1", params: { scope: "claim" } },
    metadata: { reason_codes: ["held"] },
  };
  const decision = materializeBoundDecision({ inputAuthority, policy, target, decisionFragment });

  inputAuthority.id = "mutated";
  policy.version = "mutated";
  target.id = "mutated";
  decisionFragment.evaluation.disposition = "clear";
  decisionFragment.metadata.reason_codes[0] = "mutated";

  assert.equal(decision.input_authority.id, "result-set:test");
  assert.equal(decision.policy.version, "1.0.0");
  assert.equal(decision.target.id, "claim:test");
  assert.equal(decision.evaluation.disposition, "hold");
  assert.deepEqual(decision.metadata.reason_codes, ["held"]);
});

test("FAILED materialization carries no effect unless trusted policy supplied one", () => {
  const { inputAuthority, policy, target } = bindings();
  const decision = materializeBoundDecision({
    inputAuthority,
    policy,
    target,
    decisionFragment: {
      evaluation: { state: "failed" },
      metadata: { reason_codes: ["target_not_found"] },
    },
  });

  assert.deepEqual(decision.evaluation, { state: "failed" });
  assert.equal(Object.hasOwn(decision, "effect"), false);
});

test("non-object metadata remains fail-closed at the maintained exporter", () => {
  const { inputAuthority, policy, target } = bindings();
  assert.throws(
    () =>
      materializeBoundDecision({
        inputAuthority,
        policy,
        target,
        decisionFragment: {
          evaluation: { state: "failed" },
          metadata: "not-an-object",
        },
      }),
    /metadata must be an object/,
  );
});
