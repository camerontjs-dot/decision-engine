import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { evaluateJurisdiction, JURISDICTION } from "./authority.mjs";
import { referenceEvaluateJurisdiction } from "./reference-authority.mjs";

const fixture = JSON.parse(readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"));
const prior = JSON.parse(readFileSync(new URL("./prior-decision-specimens.json", import.meta.url), "utf8"));
const authoritySource = readFileSync(new URL("./authority.mjs", import.meta.url), "utf8");
const targetFunctionBody = authoritySource
  .split("export function evaluateJurisdiction")[1]
  ?.split("export function deriveDelegatedProfile")[0] ?? "";
assert.ok(targetFunctionBody.length > 0, "could not isolate evaluateJurisdiction source");
assert.equal(targetFunctionBody.includes("semantic_payload"), false, "target evaluator reads semantic payload directly");

const actors = [...new Set([
  ...Object.values(fixture.profiles).flatMap((profile) => [
    ...(profile.grants || []).map((rule) => rule.actor),
    ...(profile.escalations || []).map((rule) => rule.actor),
  ]).flat(),
  "intruder-agent",
])];
const operations = [...Object.keys(fixture.operation_registry), "unknown.super-power"];
const targetClasses = [...new Set(Object.values(fixture.operation_registry).flatMap((entry) => entry.target_classes))];
const batches = [1, 2, 3, 6];
const semanticPayloads = [
  { opaque: "semantic-a", verdict: "supported", score: 1 },
  { opaque: "semantic-b", verdict: "contradicted", score: -1 },
  { opaque: "semantic-c", nested: { radically: "different" }, arbitrary: [1, 2, 3] },
];

let generatedDescriptorCount = 0;
let semanticComparisons = 0;
let alternateImplementationComparisons = 0;
let protectedFalsePermits = 0;
const outcomeCounts = {
  IN_JURISDICTION: 0,
  OUT_OF_JURISDICTION: 0,
  REQUIRES_HIGHER_AUTHORITY: 0,
  INDETERMINATE: 0,
};

for (const [profileName, profile] of Object.entries(fixture.profiles)) {
  for (const actor of actors) {
    for (const operation of operations) {
      for (const targetClass of targetClasses) {
        for (const batchSize of batches) {
          const contexts = operation === "outcome.verify"
            ? [{ executor_actor: "research-agent" }, { executor_actor: actor }]
            : [undefined];
          for (const context of contexts) {
            const base = {
              actor,
              operation,
              target: { class: targetClass, id: `generated:${targetClass}` },
              batch_size: batchSize,
              ...(context ? { context } : {}),
            };
            generatedDescriptorCount += 1;
            const primaryResults = [];
            const referenceResults = [];

            for (const semantic_payload of semanticPayloads) {
              const request = { ...base, semantic_payload };
              const primary = evaluateJurisdiction({
                profile,
                request,
                operationRegistry: fixture.operation_registry,
                now: fixture.evaluation_time,
              }).jurisdiction;
              const reference = referenceEvaluateJurisdiction({
                profile,
                request,
                operationRegistry: fixture.operation_registry,
                now: fixture.evaluation_time,
              });
              primaryResults.push(primary);
              referenceResults.push(reference);
              semanticComparisons += 1;
              alternateImplementationComparisons += 1;
              assert.equal(reference, primary, `alternate mismatch ${profileName}/${actor}/${operation}/${targetClass}/${batchSize}`);
            }

            assert.ok(primaryResults.every((result) => result === primaryResults[0]), "primary semantic invariance failed");
            assert.ok(referenceResults.every((result) => result === referenceResults[0]), "reference semantic invariance failed");
            outcomeCounts[primaryResults[0]] += 1;

            const isProtectedMutation = (
              operation === "repository.write.runtime"
              || (operation === "repository.write.docs" && targetClass === "protected_repo")
            );
            if (isProtectedMutation && primaryResults[0] === JURISDICTION.IN) {
              protectedFalsePermits += 1;
            }
          }
        }
      }
    }
  }
}

assert.equal(protectedFalsePermits, 0, "generated grid found protected false permits");

const baseAuthorityRequest = fixture.workflow.find((request) => request.id === "docs-single");
assert.ok(baseAuthorityRequest);
const priorSpecimenResults = {};
for (const [name, specimen] of Object.entries(prior.specimens)) {
  const request = { ...baseAuthorityRequest, semantic_payload: specimen.decision };
  const primary = evaluateJurisdiction({
    profile: fixture.profiles["delegated-research"],
    request,
    operationRegistry: fixture.operation_registry,
    now: fixture.evaluation_time,
  }).jurisdiction;
  const reference = referenceEvaluateJurisdiction({
    profile: fixture.profiles["delegated-research"],
    request,
    operationRegistry: fixture.operation_registry,
    now: fixture.evaluation_time,
  });
  assert.equal(primary, JURISDICTION.IN, name);
  assert.equal(reference, primary, name);
  priorSpecimenResults[name] = primary;
}
assert.equal(new Set(Object.values(priorSpecimenResults)).size, 1, "prior Decision payloads changed jurisdiction");

const explicitUnknownTarget = {
  ...baseAuthorityRequest,
  target: { class: "unregistered_target", id: "generated:unknown" },
};
assert.equal(
  evaluateJurisdiction({
    profile: fixture.profiles["delegated-research"],
    request: explicitUnknownTarget,
    operationRegistry: fixture.operation_registry,
    now: fixture.evaluation_time,
  }).jurisdiction,
  JURISDICTION.OUT,
);

const malformedProfile = { ...fixture.profiles["delegated-research"], valid_until: "not-a-time" };
assert.equal(
  evaluateJurisdiction({
    profile: malformedProfile,
    request: baseAuthorityRequest,
    operationRegistry: fixture.operation_registry,
    now: fixture.evaluation_time,
  }).jurisdiction,
  JURISDICTION.INDETERMINATE,
);

const summary = {
  generated_descriptor_count: generatedDescriptorCount,
  semantic_payload_variants_per_descriptor: semanticPayloads.length,
  semantic_comparisons: semanticComparisons,
  alternate_implementation_comparisons: alternateImplementationComparisons,
  alternate_implementation_context: "same research context; not independently isolated",
  protected_false_permits: protectedFalsePermits,
  generated_outcome_counts: outcomeCounts,
  target_evaluator_static_semantic_read: false,
  prior_rc1_decisions_used_as_opaque_payloads: priorSpecimenResults,
  unknown_target: "blocked",
  malformed_authority_time: "indeterminate",
  encoded_hardening_gate: "PASS",
};

const output = JSON.stringify(summary, null, 2);
writeFileSync(new URL("./HOSTED-HARDENING.json", import.meta.url), `${output}\n`);
console.log(output);
