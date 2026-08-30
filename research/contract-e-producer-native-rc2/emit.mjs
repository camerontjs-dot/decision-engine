import fs from "node:fs";

export function decisionIssuanceDescriptor(artifacts) {
  const c = artifacts.contract_c;
  return Object.freeze({
    participant: "decision-engine-policy",
    actor: "decision-engine-policy",
    operation: "decision.make",
    target_class: "contract_c_result",
    target_id: c.result_set_id,
    current_hash: c.input.contract_b.bundle_hash,
    authority_domain: "decision_mandate",
  });
}

export function typedEffectDescriptor(decision, actor) {
  const map = {
    cite_as_evidence: ["citation.use", "mindgraph_retrieval_result"],
    dispatch_task: ["task.dispatch", "mainframe_task"],
  };
  const mapped = map[decision?.decision?.effect];
  if (!mapped) return Object.freeze({ ok: false, reason: "effect_unmapped" });
  if (decision?.target?.kind !== mapped[1]) {
    return Object.freeze({ ok: false, reason: "effect_target_kind_mismatch" });
  }
  return Object.freeze({
    ok: true,
    descriptor: Object.freeze({
      participant: actor,
      actor,
      operation: mapped[0],
      target_class: mapped[1],
      target_id: decision.target.object_id,
      current_hash: decision.target.content_sha256,
      authority_domain: "effect_execution",
      accepted_effect: decision.decision.effect,
    }),
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const artifacts = JSON.parse(fs.readFileSync(
    new URL("../contract-e-participant-binding-rc1/real-artifacts.json", import.meta.url),
    "utf8",
  ));
  const out = {
    schema: "contract-e-native-descriptor-rc2",
    descriptors: [
      decisionIssuanceDescriptor(artifacts),
      typedEffectDescriptor(artifacts.citation_decision, "citation-agent"),
      typedEffectDescriptor(artifacts.task_decision, "task-agent"),
    ],
  };
  fs.mkdirSync("artifacts/contract-e-native-rc2", { recursive: true });
  fs.writeFileSync(
    "artifacts/contract-e-native-rc2/descriptors.json",
    JSON.stringify(out, null, 2) + "\n",
  );
}
