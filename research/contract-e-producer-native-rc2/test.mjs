import fs from "node:fs";
import assert from "node:assert/strict";
import {
  decisionIssuanceDescriptor,
  typedEffectDescriptor,
} from "./emit.mjs";

const artifacts = JSON.parse(fs.readFileSync(
  new URL("../contract-e-participant-binding-rc1/real-artifacts.json", import.meta.url),
  "utf8",
));

const base = decisionIssuanceDescriptor(artifacts);
const semanticMutation = structuredClone(artifacts);
semanticMutation.contract_c.first_proposition.semantic.reported_verdict = "laundered";
semanticMutation.contract_c.first_proposition.semantic.measurement_value = 999;
assert.deepEqual(base, decisionIssuanceDescriptor(semanticMutation));

const identityMutation = structuredClone(artifacts);
identityMutation.contract_c.result_set_id = "substituted";
assert.notDeepEqual(base, decisionIssuanceDescriptor(identityMutation));

const cite = typedEffectDescriptor(artifacts.citation_decision, "citation-agent");
assert.equal(cite.ok, true);
assert.equal(cite.descriptor.operation, "citation.use");

const task = typedEffectDescriptor(artifacts.task_decision, "task-agent");
assert.equal(task.ok, true);
assert.equal(task.descriptor.operation, "task.dispatch");

const cross = structuredClone(artifacts.citation_decision);
cross.decision.effect = "dispatch_task";
assert.equal(typedEffectDescriptor(cross, "citation-agent").ok, false);

console.log(JSON.stringify({
  semantic_invariance: true,
  identity_binding: true,
  effect_domain_binding: true,
}, null, 2));
