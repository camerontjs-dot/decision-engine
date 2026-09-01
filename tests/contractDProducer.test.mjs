import test from "node:test";
import assert from "node:assert/strict";
import { CONTRACT_D_VERSION, exportContractD } from "../src/contractD.js";

const h = "sha256:" + "1".repeat(64);
const rs = c => "result-set:" + c.repeat(64);

const decisions = {
  "source-audit-clear": {
    input_authority: { kind: "contract-c", id: "c1", immutable_id: rs("a") },
    policy: { id: "mainframe.source-audit", version: "1" },
    target: { kind: "knowledge", id: "k1", content_sha256: h },
    evaluation: { state: "completed", disposition: "clear" },
    effect: { type: "knowledge.add_verified_tag", version: "1", params: { scope: "claim" } },
    metadata: { reason_codes: ["policy_clear"] },
  },
  "citation-use-clear": {
    input_authority: { kind: "contract-c", id: "c2", immutable_id: rs("b") },
    policy: { id: "mainframe.citation-use", version: "1" },
    target: { kind: "knowledge", id: "k2", content_sha256: h },
    evaluation: { state: "completed", disposition: "clear" },
    effect: { type: "knowledge.cite_as_evidence", version: "1" },
  },
  "task-dispatch-clear": {
    input_authority: { kind: "task-review", id: "r1", immutable_id: "task-review:" + "c".repeat(64) },
    policy: { id: "mainframe.task-dispatch", version: "1" },
    target: { kind: "task", id: "t1", content_sha256: h },
    evaluation: { state: "completed", disposition: "clear" },
    effect: { type: "task.dispatch", version: "1" },
  },
  "completed-hold": {
    input_authority: { kind: "contract-c", id: "c3", immutable_id: rs("d") },
    policy: { id: "mainframe.source-audit", version: "1" },
    target: { kind: "knowledge", id: "k3", content_sha256: h },
    evaluation: { state: "completed", disposition: "hold" },
    effect: { type: "knowledge.add_verified_tag", version: "1" },
  },
  "evaluation-failed": {
    input_authority: { kind: "contract-c", id: "c4", immutable_id: rs("e") },
    policy: { id: "mainframe.source-audit", version: "1" },
    target: { kind: "knowledge", id: "k4", content_sha256: h },
    evaluation: { state: "failed" },
    metadata: { reason_codes: ["policy_evaluation_failure"] },
  },
};

test("Contract D producer uses exact v1 identity", () => {
  assert.equal(CONTRACT_D_VERSION, "1.0.0");
  for (const decision of Object.values(decisions)) {
    assert.equal(exportContractD(decision).contract_d_version, "1.0.0");
  }
});

test("producer preserves all five Decision classes without translation fields", () => {
  for (const [name, decision] of Object.entries(decisions)) {
    const output = exportContractD(decision);
    assert.deepEqual(output.input_authority, decision.input_authority, name);
    assert.deepEqual(output.policy, decision.policy, name);
    assert.deepEqual(output.target, decision.target, name);
    assert.deepEqual(output.evaluation, decision.evaluation, name);
    assert.deepEqual(output.effect, decision.effect, name);
    assert.deepEqual(output.metadata, decision.metadata, name);
    assert.equal("requested_operation" in output, false);
    assert.equal("authorization" in output, false);
    assert.equal("execution" in output, false);
    assert.equal("actor" in output, false);
  }
});

test("producer does not inject registry defaults or empty params", () => {
  const citation = exportContractD(decisions["citation-use-clear"]);
  const dispatch = exportContractD(decisions["task-dispatch-clear"]);
  const hold = exportContractD(decisions["completed-hold"]);
  assert.equal("params" in citation.effect, false);
  assert.equal("params" in dispatch.effect, false);
  assert.equal("params" in hold.effect, false);
});

test("producer clones caller state rather than retaining mutable authority references", () => {
  const decision = structuredClone(decisions["source-audit-clear"]);
  const output = exportContractD(decision);
  decision.policy.version = "mutated";
  decision.effect.params.scope = "object";
  assert.equal(output.policy.version, "1");
  assert.equal(output.effect.params.scope, "claim");
});

test("producer rejects Authorization/execution/actor field smuggling", () => {
  for (const key of ["actor", "approval", "delegation", "authorization", "execution", "requested_operation"]) {
    const decision = structuredClone(decisions["source-audit-clear"]);
    decision[key] = true;
    assert.throws(() => exportContractD(decision), /unsupported Decision field/);
  }
});

test("producer requires the exact Decision binding families", () => {
  for (const key of ["input_authority", "policy", "target", "evaluation"]) {
    const decision = structuredClone(decisions["source-audit-clear"]);
    delete decision[key];
    assert.throws(() => exportContractD(decision), /missing Decision field/);
  }
});

export { decisions };
