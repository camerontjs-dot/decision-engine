const h = "sha256:" + "1".repeat(64);
const rs = c => "result-set:" + c.repeat(64);

const decisions = {
  "source-audit-clear": {
    contract_d_version: "0.3.0-rc4",
    input_authority: { kind: "contract-c", id: "c1", immutable_id: rs("a") },
    policy: { id: "mainframe.source-audit", version: "1" },
    target: { kind: "knowledge", id: "k1", content_sha256: h },
    evaluation: { state: "completed", disposition: "clear" },
    effect: { type: "knowledge.add_verified_tag", version: "1", params: { scope: "claim" } },
    metadata: { reason_codes: ["policy_clear"] }
  },
  "citation-use-clear": {
    contract_d_version: "0.3.0-rc4",
    input_authority: { kind: "contract-c", id: "c2", immutable_id: rs("b") },
    policy: { id: "mainframe.citation-use", version: "1" },
    target: { kind: "knowledge", id: "k2", content_sha256: h },
    evaluation: { state: "completed", disposition: "clear" },
    effect: { type: "knowledge.cite_as_evidence", version: "1" }
  },
  "task-dispatch-clear": {
    contract_d_version: "0.3.0-rc4",
    input_authority: { kind: "task-review", id: "r1", immutable_id: "task-review:" + "c".repeat(64) },
    policy: { id: "mainframe.task-dispatch", version: "1" },
    target: { kind: "task", id: "t1", content_sha256: h },
    evaluation: { state: "completed", disposition: "clear" },
    effect: { type: "task.dispatch", version: "1" }
  },
  "completed-hold": {
    contract_d_version: "0.3.0-rc4",
    input_authority: { kind: "contract-c", id: "c3", immutable_id: rs("d") },
    policy: { id: "mainframe.source-audit", version: "1" },
    target: { kind: "knowledge", id: "k3", content_sha256: h },
    evaluation: { state: "completed", disposition: "hold" },
    effect: { type: "knowledge.add_verified_tag", version: "1" }
  },
  "evaluation-failed": {
    contract_d_version: "0.3.0-rc4",
    input_authority: { kind: "contract-c", id: "c4", immutable_id: rs("e") },
    policy: { id: "mainframe.source-audit", version: "1" },
    target: { kind: "knowledge", id: "k4", content_sha256: h },
    evaluation: { state: "failed" },
    metadata: { reason_codes: ["policy_evaluation_failure"] }
  }
};

process.stdout.write(JSON.stringify({ producer: "decision-engine-research-rc4", decisions }, null, 2) + "\n");
