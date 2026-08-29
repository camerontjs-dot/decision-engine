import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const APPARATUS = process.env.APPARATUS_CONTRACT_C_DIR;
assert.ok(APPARATUS, "APPARATUS_CONTRACT_C_DIR is required");

const fixturePath = resolve(APPARATUS, "fixtures/contract-c/1.0.0/valid-canonical.json");
const shaPath = resolve(APPARATUS, "fixtures/contract-c/1.0.0/valid-canonical.sha256");
const indexPath = resolve(APPARATUS, "fixtures/contract-c/1.0.0/contract-b-index.json");

const raw = readFileSync(fixturePath);
const text = raw.toString("utf8");
const artifact = JSON.parse(text);
const index = JSON.parse(readFileSync(indexPath, "utf8"));
const expectedSha = readFileSync(shaPath, "utf8").trim().split(/\s+/)[0];

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalBytes(value) {
  return Buffer.from(JSON.stringify(sortObject(value)) + "\n", "utf8");
}

function sortObject(value) {
  if (Array.isArray(value)) return value.map(sortObject);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortObject(value[key])]),
    );
  }
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new Error("non-finite number");
  }
  return value;
}

function contentIdentity(value) {
  const clone = structuredClone(value);
  delete clone.result_set_id;
  return "result-set:" + sha256(canonicalBytes(clone));
}

function exactKeys(object, allowed, label) {
  assert.deepEqual(Object.keys(object).sort(), [...allowed].sort(), label);
}

const assessmentStates = new Set(["not_performed", "performed", "failed", "not_applicable"]);
function validateAssessmentState(value) {
  assert.equal(typeof value, "object");
  assert.ok(assessmentStates.has(value.state));
  if (value.state === "performed") {
    exactKeys(value, ["state", "value"], "performed assessment exact fields");
    assert.ok(["unknown", "adverse"].includes(value.value));
  } else {
    exactKeys(value, ["state"], "non-performed assessment exact fields");
  }
}

function validateConsumerShape(value) {
  exactKeys(
    value,
    ["contract_c_version", "execution", "input", "producer", "propositions", "result_set_id"],
    "exact v1 top-level fields",
  );
  assert.equal(value.contract_c_version, "1.0.0");
  assert.ok(["completed", "failed", "incomplete"].includes(value.execution.state));
  exactKeys(value.execution, ["state"], "result-set execution exact fields");

  exactKeys(value.input, ["contract_b"], "input exact fields");
  exactKeys(
    value.input.contract_b,
    ["contract_version", "bundle_id", "bundle_hash"],
    "Contract-B binding exact fields",
  );

  exactKeys(value.producer, ["semantic_implementation_sha", "policy"], "producer exact fields");
  exactKeys(value.producer.policy, ["sha256", "canonical"], "policy exact fields");
  assert.equal(sha256(canonicalBytes(value.producer.policy.canonical)), value.producer.policy.sha256);

  assert.ok(Array.isArray(value.propositions));
  for (const proposition of value.propositions) {
    exactKeys(
      proposition,
      ["proposition", "execution", "assessments", "contributions", "measurement", "conclusion"],
      "proposition exact fields",
    );
    exactKeys(proposition.proposition, ["proposition_id", "text_sha256"], "proposition binding fields");

    assert.ok(["completed", "failed", "incomplete"].includes(proposition.execution.state));
    if (proposition.execution.state === "completed") {
      exactKeys(proposition.execution, ["state", "completion"], "completed execution fields");
      assert.ok(["assessed", "not_checkable"].includes(proposition.execution.completion));
      assert.ok(proposition.conclusion);
    } else {
      exactKeys(proposition.execution, ["state"], "non-completed execution fields");
      assert.equal(proposition.conclusion, null);
    }

    exactKeys(
      proposition.assessments,
      ["eligibility", "semantic_validity", "aperture_completeness", "temporal_applicability"],
      "required assessment slots",
    );
    Object.values(proposition.assessments).forEach(validateAssessmentState);

    const contributionIds = new Set();
    for (const contribution of proposition.contributions) {
      exactKeys(contribution, ["contribution_id", "channel", "evidence_ref"], "contribution fields");
      assert.ok(["support", "counterevidence"].includes(contribution.channel));
      exactKeys(
        contribution.evidence_ref,
        ["source_id", "passage_id", "passage_sha256"],
        "evidence reference fields",
      );
      assert.ok(!contributionIds.has(contribution.contribution_id));
      contributionIds.add(contribution.contribution_id);
    }

    if (proposition.measurement !== null) {
      exactKeys(
        proposition.measurement,
        ["kind", "value", "basis_contribution_ids"],
        "measurement fields",
      );
      for (const id of proposition.measurement.basis_contribution_ids) {
        assert.ok(contributionIds.has(id), "measurement basis must reference retained contribution");
      }
    }

    if (proposition.conclusion !== null) {
      exactKeys(
        proposition.conclusion,
        [
          "reported_verdict",
          "terminal_branch",
          "causal_form",
          "basis_members",
          "residual_contribution_ids",
          "rule_roles",
        ],
        "conclusion fields",
      );
      assert.ok(
        [
          "single_necessary",
          "independent_sufficient_alternatives",
          "jointly_sufficient",
          "redundant_non_deciding",
        ].includes(proposition.conclusion.causal_form),
      );

      const basisContributionIds = new Set(
        proposition.conclusion.basis_members
          .filter((row) => row.namespace === "contribution")
          .map((row) => row.id),
      );
      const residual = new Set(proposition.conclusion.residual_contribution_ids);
      for (const id of basisContributionIds) assert.ok(contributionIds.has(id));
      for (const id of residual) assert.ok(contributionIds.has(id));
      for (const id of basisContributionIds) assert.ok(!residual.has(id));
      assert.deepEqual(
        [...new Set([...basisContributionIds, ...residual])].sort(),
        [...contributionIds].sort(),
        "every retained contribution must be causal or residual",
      );

      if (proposition.conclusion.causal_form === "single_necessary") {
        assert.equal(proposition.conclusion.basis_members.length, 1);
      }
      if (
        proposition.conclusion.causal_form === "independent_sufficient_alternatives" ||
        proposition.conclusion.causal_form === "jointly_sufficient"
      ) {
        assert.ok(proposition.conclusion.basis_members.length >= 2);
      }
      if (proposition.conclusion.causal_form === "redundant_non_deciding") {
        assert.equal(proposition.conclusion.basis_members.length, 0);
      }

      if (proposition.execution.state === "completed" && proposition.execution.completion === "not_checkable") {
        assert.equal(proposition.conclusion.reported_verdict, "not_checkable");
      }
    }
  }

  assert.equal(value.result_set_id, contentIdentity(value));
}

function validateContractBRefs(value) {
  assert.equal(value.input.contract_b.contract_version, index.contract_version);
  assert.equal(value.input.contract_b.bundle_id, index.bundle_id);
  assert.equal(value.input.contract_b.bundle_hash, index.bundle_hash);
  for (const proposition of value.propositions) {
    const id = proposition.proposition.proposition_id;
    assert.equal(proposition.proposition.text_sha256, index.propositions[id]);
    for (const contribution of proposition.contributions) {
      const passage = index.passages[contribution.evidence_ref.passage_id];
      assert.ok(passage, "passage must exist in Contract-B index");
      assert.equal(contribution.evidence_ref.source_id, passage.source_id);
      assert.equal(contribution.evidence_ref.passage_sha256, passage.passage_sha256);
    }
  }
}

function semanticProjection(value) {
  return value.propositions.map((p) => ({
    proposition_id: p.proposition.proposition_id,
    execution: p.execution,
    assessments: p.assessments,
    measurement: p.measurement,
    conclusion: p.conclusion,
    contributions: [...p.contributions].sort((a, b) =>
      a.contribution_id.localeCompare(b.contribution_id),
    ),
  }));
}

function expectReject(mutator, label) {
  const clone = structuredClone(artifact);
  mutator(clone);
  clone.result_set_id = contentIdentity(clone);
  assert.throws(() => validateConsumerShape(clone), undefined, label);
}

// 1. Frozen canonical bytes, hash, shape and cross-contract references.
assert.equal(raw[raw.length - 1], 0x0a, "exactly one terminal LF");
assert.equal(text.endsWith("\n\n"), false, "no second terminal LF");
assert.deepEqual(raw, canonicalBytes(artifact), "fixture must already be canonical");
assert.equal(sha256(raw), expectedSha, "whole-object SHA must match frozen external binding");
validateConsumerShape(artifact);
validateContractBRefs(artifact);

// 2. Missing/malformed required state fails closed.
expectReject((value) => {
  delete value.propositions[0].assessments.eligibility;
}, "missing required assessment must reject");
expectReject((value) => {
  value.propositions[0].assessments.eligibility = { state: "performed", value: "eligible" };
}, "malformed performed state must reject");
expectReject((value) => {
  value.unexpected = true;
}, "unknown exact-v1 field must reject");

// 3. Required state distinctions remain non-equivalent.
const stateProbe = structuredClone(artifact.propositions[0].assessments);
stateProbe.eligibility = { state: "not_performed" };
stateProbe.semantic_validity = { state: "performed", value: "unknown" };
stateProbe.aperture_completeness = { state: "performed", value: "adverse" };
stateProbe.temporal_applicability = { state: "not_applicable" };
Object.values(stateProbe).forEach(validateAssessmentState);
assert.equal(new Set(Object.values(stateProbe).map(JSON.stringify)).size, 4);

// 4. Execution failure/incomplete remain distinct from completed not_checkable.
const failed = structuredClone(artifact);
failed.propositions[0].execution = { state: "failed" };
failed.propositions[0].conclusion = null;
failed.result_set_id = contentIdentity(failed);
validateConsumerShape(failed);
const incomplete = structuredClone(artifact);
incomplete.propositions[0].execution = { state: "incomplete" };
incomplete.propositions[0].conclusion = null;
incomplete.result_set_id = contentIdentity(incomplete);
validateConsumerShape(incomplete);
const notCheckable = structuredClone(artifact);
notCheckable.propositions[0].execution = { state: "completed", completion: "not_checkable" };
notCheckable.propositions[0].conclusion.reported_verdict = "not_checkable";
notCheckable.result_set_id = contentIdentity(notCheckable);
validateConsumerShape(notCheckable);
assert.notDeepEqual(failed.propositions[0].execution, notCheckable.propositions[0].execution);
assert.notDeepEqual(incomplete.propositions[0].execution, notCheckable.propositions[0].execution);

// 5. Causal multiplicity and residual state are preserved without selecting a winner.
const single = structuredClone(artifact.propositions[0]);
assert.equal(single.conclusion.causal_form, "single_necessary");
assert.ok(single.conclusion.residual_contribution_ids.length >= 1);

const independent = structuredClone(single);
independent.conclusion.causal_form = "independent_sufficient_alternatives";
independent.conclusion.basis_members = independent.contributions.slice(0, 2).map((row) => ({
  namespace: "contribution",
  id: row.contribution_id,
}));
independent.conclusion.residual_contribution_ids = independent.contributions
  .slice(2)
  .map((row) => row.contribution_id);
independent.measurement.basis_contribution_ids = independent.conclusion.basis_members.map((row) => row.id);
validateConsumerShape({
  ...structuredClone(artifact),
  propositions: [independent],
  result_set_id: contentIdentity({ ...structuredClone(artifact), propositions: [independent] }),
});

const joint = structuredClone(single);
joint.conclusion.causal_form = "jointly_sufficient";
joint.conclusion.basis_members = [
  { namespace: "state", id: "state:a" },
  { namespace: "state", id: "state:b" },
];
joint.conclusion.residual_contribution_ids = joint.contributions.map((row) => row.contribution_id);
const jointWrapper = structuredClone(artifact);
jointWrapper.propositions = [joint];
jointWrapper.result_set_id = contentIdentity(jointWrapper);
validateConsumerShape(jointWrapper);

const redundant = structuredClone(single);
redundant.conclusion.causal_form = "redundant_non_deciding";
redundant.conclusion.basis_members = [];
redundant.conclusion.residual_contribution_ids = redundant.contributions.map((row) => row.contribution_id);
const redundantWrapper = structuredClone(artifact);
redundantWrapper.propositions = [redundant];
redundantWrapper.result_set_id = contentIdentity(redundantWrapper);
validateConsumerShape(redundantWrapper);

// 6. Coherent residual deletion may remain locally valid but external immutable hash detects it.
const deletion = structuredClone(artifact);
const p0 = deletion.propositions[0];
const deletedId = p0.conclusion.residual_contribution_ids[0];
p0.contributions = p0.contributions.filter((row) => row.contribution_id !== deletedId);
p0.conclusion.residual_contribution_ids = p0.conclusion.residual_contribution_ids.filter((id) => id !== deletedId);
deletion.result_set_id = contentIdentity(deletion);
validateConsumerShape(deletion);
assert.notEqual(sha256(canonicalBytes(deletion)), expectedSha, "whole-object identity catches coherent deletion");

// 7. Array order changes byte identity, while a consumer may preserve order-invariant semantic interpretation.
const reordered = structuredClone(artifact);
reordered.propositions[0].contributions.reverse();
reordered.result_set_id = contentIdentity(reordered);
validateConsumerShape(reordered);
assert.notEqual(sha256(canonicalBytes(reordered)), expectedSha, "array order is byte-significant");
assert.deepEqual(semanticProjection(reordered), semanticProjection(artifact), "consumer semantics may normalize contribution order");

// 8. Downstream policy is outside Contract C and cannot rewrite CAL state.
const before = JSON.stringify(semanticProjection(artifact));
function downstreamPolicy(value, mode) {
  return value.propositions.map((p) => ({
    proposition_id: p.proposition.proposition_id,
    route:
      mode === "strict"
        ? (p.conclusion.reported_verdict === "supported" ? "accept" : "review")
        : "accept",
  }));
}
assert.notDeepEqual(downstreamPolicy(artifact, "strict"), downstreamPolicy(artifact, "permissive"));
assert.equal(JSON.stringify(semanticProjection(artifact)), before, "downstream policy must not mutate Contract-C state");

console.log(JSON.stringify({
  status: "PASS",
  contract_c_sha256: expectedSha,
  contract_c_version: artifact.contract_c_version,
  propositions: artifact.propositions.length,
  checks: [
    "canonical-byte-and-whole-object-binding",
    "exact-contract-b-reference-integrity",
    "missing-malformed-and-unknown-field-fail-closed",
    "required-state-distinction",
    "failure-incomplete-vs-not-checkable",
    "causal-multiplicity-and-residual-preservation",
    "coherent-deletion-hash-detection",
    "array-order-byte-vs-semantic-behavior",
    "downstream-policy-firewall",
  ],
}, null, 2));
