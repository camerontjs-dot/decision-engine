const h = "sha256:" + "1".repeat(64);
const rs = c => "result-set:" + c.repeat(64);

export const contractDDecisionStates = Object.freeze({
  "source-audit-clear": Object.freeze({
    input_authority: Object.freeze({ kind: "contract-c", id: "c1", immutable_id: rs("a") }),
    policy: Object.freeze({ id: "mainframe.source-audit", version: "1" }),
    target: Object.freeze({ kind: "knowledge", id: "k1", content_sha256: h }),
    evaluation: Object.freeze({ state: "completed", disposition: "clear" }),
    effect: Object.freeze({ type: "knowledge.add_verified_tag", version: "1", params: Object.freeze({ scope: "claim" }) }),
    metadata: Object.freeze({ reason_codes: Object.freeze(["policy_clear"]) }),
  }),
  "citation-use-clear": Object.freeze({
    input_authority: Object.freeze({ kind: "contract-c", id: "c2", immutable_id: rs("b") }),
    policy: Object.freeze({ id: "mainframe.citation-use", version: "1" }),
    target: Object.freeze({ kind: "knowledge", id: "k2", content_sha256: h }),
    evaluation: Object.freeze({ state: "completed", disposition: "clear" }),
    effect: Object.freeze({ type: "knowledge.cite_as_evidence", version: "1" }),
  }),
  "task-dispatch-clear": Object.freeze({
    input_authority: Object.freeze({ kind: "task-review", id: "r1", immutable_id: "task-review:" + "c".repeat(64) }),
    policy: Object.freeze({ id: "mainframe.task-dispatch", version: "1" }),
    target: Object.freeze({ kind: "task", id: "t1", content_sha256: h }),
    evaluation: Object.freeze({ state: "completed", disposition: "clear" }),
    effect: Object.freeze({ type: "task.dispatch", version: "1" }),
  }),
  "completed-hold": Object.freeze({
    input_authority: Object.freeze({ kind: "contract-c", id: "c3", immutable_id: rs("d") }),
    policy: Object.freeze({ id: "mainframe.source-audit", version: "1" }),
    target: Object.freeze({ kind: "knowledge", id: "k3", content_sha256: h }),
    evaluation: Object.freeze({ state: "completed", disposition: "hold" }),
    effect: Object.freeze({ type: "knowledge.add_verified_tag", version: "1" }),
  }),
  "evaluation-failed": Object.freeze({
    input_authority: Object.freeze({ kind: "contract-c", id: "c4", immutable_id: rs("e") }),
    policy: Object.freeze({ id: "mainframe.source-audit", version: "1" }),
    target: Object.freeze({ kind: "knowledge", id: "k4", content_sha256: h }),
    evaluation: Object.freeze({ state: "failed" }),
    metadata: Object.freeze({ reason_codes: Object.freeze(["policy_evaluation_failure"]) }),
  }),
});
