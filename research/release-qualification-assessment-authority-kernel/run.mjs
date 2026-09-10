import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { canonicalBytes, cloneJson, sha256Bytes, sha256Json } from "./canonical.mjs";
import { evaluateAuthorityBoundPolicy, AuthorityPolicyKernelError } from "./kernel.mjs";
import { produceCanonicalAssessmentAuthority } from "./producer.mjs";
import {
  PRODUCTION_REVIEW_POLICY,
  REGRESSION_REVIEW_POLICY,
  RELEASE_POLICY_REGISTRY,
} from "./releasePolicies.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

function args() {
  const values = new Map();
  for (let i = 2; i < process.argv.length; i += 2) {
    values.set(process.argv[i], process.argv[i + 1]);
  }
  for (const key of ["--evidence", "--contract-d-root", "--out"]) {
    if (!values.get(key)) {
      throw new Error(`missing ${key}`);
    }
  }
  return {
    evidencePath: values.get("--evidence"),
    contractDRoot: values.get("--contract-d-root"),
    outDir: values.get("--out"),
  };
}

function targetFromFixture(fixture) {
  const subjectContent = {
    repository: fixture.candidate.repository,
    base_sha: fixture.candidate.base_sha,
    commit_sha: fixture.candidate.commit_sha,
    tree_sha: fixture.candidate.tree_sha,
  };
  return {
    kind: "git_commit_candidate",
    id: `${fixture.candidate.repository}@${fixture.candidate.commit_sha}`,
    content_sha256: sha256Json(subjectContent),
  };
}

function buildAuthority(fixture, outDir, name) {
  const bytes = produceCanonicalAssessmentAuthority(fixture);
  const value = JSON.parse(bytes.toString("utf8"));
  const sha = sha256Bytes(bytes);
  const target = targetFromFixture(fixture);
  assert.deepEqual(value.subject, target);
  writeFileSync(path.join(outDir, `${name}.assessment-authority.json`), bytes);
  return { bytes, value, sha, target };
}

function policyCore(decision) {
  return {
    evaluation: decision.evaluation,
    effect: decision.effect,
    reason_codes: decision.metadata?.reason_codes ?? [],
  };
}

function evaluate({ authority, policy, contractDRoot, outDir, name }) {
  const result = evaluateAuthorityBoundPolicy({
    authorityBytes: authority.bytes,
    expectedAuthoritySha256: authority.sha,
    target: authority.target,
    policy,
    policyRegistry: RELEASE_POLICY_REGISTRY,
    contractDAuthorityRoot: contractDRoot,
  });
  const digest = sha256Bytes(result.bytes);
  writeFileSync(path.join(outDir, `${name}.contract-d.json`), result.bytes);
  return { ...result, digest };
}

function expectKernelError(fn, expectedCode) {
  try {
    fn();
  } catch (error) {
    assert.ok(error instanceof AuthorityPolicyKernelError, `unexpected error type: ${error}`);
    assert.equal(error.code, expectedCode);
    return;
  }
  assert.fail(`expected ${expectedCode}`);
}

function consumeExactD({ decision, authoritySha, authorityId, policy, target, contractDRoot, requestedOperation = "task.dispatch" }) {
  const payload = {
    decision,
    expected: {
      input_authority: {
        kind: "assessment_authority",
        id: authorityId,
        immutable_id: authoritySha,
      },
      policy,
      target,
      requested_operation: requestedOperation,
      effect_params: {},
    },
  };
  const program = [
    "import json, sys",
    "root = sys.argv[1]",
    "sys.path.insert(0, root)",
    "from validators.contract_d_consume import ApplicabilityExpectation, consume",
    "p = json.loads(sys.stdin.read())",
    "e = p['expected']",
    "expectation = ApplicabilityExpectation(input_authority=e['input_authority'], policy=e['policy'], target=e['target'], requested_operation=e['requested_operation'], effect_params=e['effect_params'])",
    "print(json.dumps(consume(p['decision'], expectation), sort_keys=True))",
  ].join("\n");
  const result = spawnSync("python3", ["-c", program, contractDRoot], {
    input: JSON.stringify(payload),
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

function mutateObservation(fixture, id, mutate) {
  const next = cloneJson(fixture);
  const observation = next.observations.find((item) => item.id === id);
  assert.ok(observation, `missing observation ${id}`);
  mutate(observation);
  return next;
}

function withoutObservation(fixture, id) {
  const next = cloneJson(fixture);
  next.observations = next.observations.filter((item) => item.id !== id);
  return next;
}

function withObservation(fixture, observation) {
  const next = cloneJson(fixture);
  next.observations.push(observation);
  return next;
}

function assertKernelHasNoDomainVocabulary() {
  const source = readFileSync(path.join(HERE, "kernel.mjs"), "utf8");
  const forbidden = [
    ["CAL", /\bcal\b/i],
    ["Contract C", /contract[-_ ]?c\b/i],
    ["release", /\brelease\b/i],
    ["qualification", /\bqualification\b/i],
    ["GitHub", /\bgithub\b/i],
    ["workflow", /\bworkflow\b/i],
    ["CI", /\bci\b/i],
    ["conformance", /\bconformance\b/i],
  ];
  for (const [label, regex] of forbidden) {
    assert.equal(regex.test(source), false, `generic kernel contains forbidden domain token: ${label}`);
  }
}

const { evidencePath, contractDRoot, outDir } = args();
mkdirSync(outDir, { recursive: true });
assertKernelHasNoDomainVocabulary();

const fixture = JSON.parse(readFileSync(evidencePath, "utf8"));
const baseline = buildAuthority(fixture, outDir, "baseline");

const baselineA = evaluate({
  authority: baseline,
  policy: REGRESSION_REVIEW_POLICY,
  contractDRoot,
  outDir,
  name: "baseline-policy-a",
});
const baselineB = evaluate({
  authority: baseline,
  policy: PRODUCTION_REVIEW_POLICY,
  contractDRoot,
  outDir,
  name: "baseline-policy-b",
});

assert.deepEqual(baselineA.decision.evaluation, { state: "completed", disposition: "clear" });
assert.deepEqual(baselineB.decision.evaluation, { state: "completed", disposition: "hold" });
assert.equal(baselineA.decision.effect.type, "task.dispatch");
assert.equal(baselineB.decision.effect.type, "task.dispatch");
assert.deepEqual(baselineB.decision.metadata.reason_codes, ["independent_reproduction_not_established"]);

const baselineARepeat = evaluateAuthorityBoundPolicy({
  authorityBytes: baseline.bytes,
  expectedAuthoritySha256: baseline.sha,
  target: baseline.target,
  policy: REGRESSION_REVIEW_POLICY,
  policyRegistry: RELEASE_POLICY_REGISTRY,
  contractDAuthorityRoot: contractDRoot,
});
const baselineBRepeat = evaluateAuthorityBoundPolicy({
  authorityBytes: baseline.bytes,
  expectedAuthoritySha256: baseline.sha,
  target: baseline.target,
  policy: PRODUCTION_REVIEW_POLICY,
  policyRegistry: RELEASE_POLICY_REGISTRY,
  contractDAuthorityRoot: contractDRoot,
});
assert.ok(baselineA.bytes.equals(baselineARepeat.bytes));
assert.ok(baselineB.bytes.equals(baselineBRepeat.bytes));

const consumeA = consumeExactD({
  decision: baselineA.decision,
  authoritySha: baseline.sha,
  authorityId: baseline.value.authority.logical_id,
  policy: REGRESSION_REVIEW_POLICY,
  target: baseline.target,
  contractDRoot,
});
const consumeB = consumeExactD({
  decision: baselineB.decision,
  authoritySha: baseline.sha,
  authorityId: baseline.value.authority.logical_id,
  policy: PRODUCTION_REVIEW_POLICY,
  target: baseline.target,
  contractDRoot,
});
assert.equal(consumeA.outcome, "candidate_for_authorization");
assert.equal(consumeB.outcome, "hold");

const heldWrongOperation = consumeExactD({
  decision: baselineB.decision,
  authoritySha: baseline.sha,
  authorityId: baseline.value.authority.logical_id,
  policy: PRODUCTION_REVIEW_POLICY,
  target: baseline.target,
  contractDRoot,
  requestedOperation: "knowledge.add_verified_tag",
});
assert.equal(heldWrongOperation.outcome, "not_applicable");
assert.equal(heldWrongOperation.reason, "requested_operation_mismatch");

const ciAdverseFixture = mutateObservation(fixture, "required-ci", (observation) => {
  observation.conclusion = "failure";
});
const ciAdverse = buildAuthority(ciAdverseFixture, outDir, "ci-adverse");
const ciAdverseA = evaluate({ authority: ciAdverse, policy: REGRESSION_REVIEW_POLICY, contractDRoot, outDir, name: "ci-adverse-policy-a" });
assert.equal(ciAdverseA.decision.evaluation.disposition, "hold");

const ciMissing = buildAuthority(withoutObservation(fixture, "required-ci"), outDir, "ci-missing");
const ciMissingA = evaluate({ authority: ciMissing, policy: REGRESSION_REVIEW_POLICY, contractDRoot, outDir, name: "ci-missing-policy-a" });
assert.equal(ciMissingA.decision.evaluation.disposition, "hold");

const conformanceAdverseFixture = mutateObservation(fixture, "contract-first-cli-conformance", (observation) => {
  observation.jobs[0].conclusion = "failure";
});
const conformanceAdverse = buildAuthority(conformanceAdverseFixture, outDir, "conformance-adverse");
const conformanceAdverseA = evaluate({ authority: conformanceAdverse, policy: REGRESSION_REVIEW_POLICY, contractDRoot, outDir, name: "conformance-adverse-policy-a" });
assert.equal(conformanceAdverseA.decision.evaluation.disposition, "hold");

const conformanceMissing = buildAuthority(withoutObservation(fixture, "contract-first-cli-conformance"), outDir, "conformance-missing");
const conformanceMissingA = evaluate({ authority: conformanceMissing, policy: REGRESSION_REVIEW_POLICY, contractDRoot, outDir, name: "conformance-missing-policy-a" });
assert.equal(conformanceMissingA.decision.evaluation.disposition, "hold");

const reproductionFixture = withObservation(fixture, {
  id: "independent-reproduction",
  kind: "synthetic_research_control",
  immutable_id: "synthetic:independent-reproduction:control-1",
  conclusion: "success",
  jobs: [],
});
const reproduction = buildAuthority(reproductionFixture, outDir, "synthetic-reproduction");
const reproductionA = evaluate({ authority: reproduction, policy: REGRESSION_REVIEW_POLICY, contractDRoot, outDir, name: "synthetic-reproduction-policy-a" });
const reproductionB = evaluate({ authority: reproduction, policy: PRODUCTION_REVIEW_POLICY, contractDRoot, outDir, name: "synthetic-reproduction-policy-b" });
assert.equal(reproductionA.decision.evaluation.disposition, "clear");
assert.equal(reproductionB.decision.evaluation.disposition, "clear");
assert.ok(reproduction.value.state.residual.includes("independent-reproduction"));

const irrelevantFixture = withObservation(fixture, {
  id: "irrelevant-side-observation",
  kind: "synthetic_irrelevant_control",
  immutable_id: "synthetic:irrelevant-side-observation:control-1",
  conclusion: "success",
  jobs: [],
});
const irrelevant = buildAuthority(irrelevantFixture, outDir, "irrelevant-residual");
const irrelevantA = evaluate({ authority: irrelevant, policy: REGRESSION_REVIEW_POLICY, contractDRoot, outDir, name: "irrelevant-residual-policy-a" });
const irrelevantB = evaluate({ authority: irrelevant, policy: PRODUCTION_REVIEW_POLICY, contractDRoot, outDir, name: "irrelevant-residual-policy-b" });
assert.deepEqual(policyCore(irrelevantA.decision), policyCore(baselineA.decision));
assert.deepEqual(policyCore(irrelevantB.decision), policyCore(baselineB.decision));
assert.notEqual(irrelevant.sha, baseline.sha);
assert.notEqual(irrelevantA.digest, baselineA.digest);
assert.notEqual(irrelevantB.digest, baselineB.digest);

expectKernelError(
  () => evaluateAuthorityBoundPolicy({
    authorityBytes: baseline.bytes,
    expectedAuthoritySha256: `sha256:${"0".repeat(64)}`,
    target: baseline.target,
    policy: REGRESSION_REVIEW_POLICY,
    policyRegistry: RELEASE_POLICY_REGISTRY,
    contractDAuthorityRoot: contractDRoot,
  }),
  "authority_whole_object_mismatch",
);

expectKernelError(
  () => evaluateAuthorityBoundPolicy({
    authorityBytes: baseline.bytes,
    expectedAuthoritySha256: baseline.sha,
    target: { ...baseline.target, content_sha256: `sha256:${"0".repeat(64)}` },
    policy: REGRESSION_REVIEW_POLICY,
    policyRegistry: RELEASE_POLICY_REGISTRY,
    contractDAuthorityRoot: contractDRoot,
  }),
  "target_binding_mismatch",
);

expectKernelError(
  () => evaluateAuthorityBoundPolicy({
    authorityBytes: baseline.bytes,
    expectedAuthoritySha256: baseline.sha,
    target: baseline.target,
    policy: { id: REGRESSION_REVIEW_POLICY.id, version: "research-999" },
    policyRegistry: RELEASE_POLICY_REGISTRY,
    contractDAuthorityRoot: contractDRoot,
  }),
  "unknown_policy",
);

const kernelSource = readFileSync(path.join(HERE, "kernel.mjs"));
const producerSource = readFileSync(path.join(HERE, "producer.mjs"));
const result = {
  status: "PASS",
  boundary: "research_only_non_cal_assessment_authority",
  baseline_evidence: {
    candidate_head: fixture.candidate.commit_sha,
    ci_run: "34430551382",
    contract_first_run: "34430551350",
    independent_reproduction_in_packet: false,
  },
  implementation: {
    kernel_sha256: sha256Bytes(kernelSource),
    producer_sha256: sha256Bytes(producerSource),
    exact_contract_d_release: "298a1a0f7b7b6d7712e11200d04faec3e1ca169b",
  },
  baseline: {
    authority_sha256: baseline.sha,
    policy_a: {
      core: policyCore(baselineA.decision),
      contract_d_sha256: baselineA.digest,
      consumer_outcome: consumeA.outcome,
    },
    policy_b: {
      core: policyCore(baselineB.decision),
      contract_d_sha256: baselineB.digest,
      consumer_outcome: consumeB.outcome,
      wrong_operation_consumer_outcome: heldWrongOperation.outcome,
    },
  },
  sensitivity: {
    required_ci_adverse_holds: ciAdverseA.decision.evaluation.disposition === "hold",
    required_ci_missing_holds: ciMissingA.decision.evaluation.disposition === "hold",
    conformance_adverse_holds: conformanceAdverseA.decision.evaluation.disposition === "hold",
    conformance_missing_holds: conformanceMissingA.decision.evaluation.disposition === "hold",
    synthetic_independent_reproduction_clears_policy_b: reproductionB.decision.evaluation.disposition === "clear",
    synthetic_independent_reproduction_preserves_policy_a_clear: reproductionA.decision.evaluation.disposition === "clear",
  },
  invariance: {
    irrelevant_residual_preserves_policy_a_core: JSON.stringify(policyCore(irrelevantA.decision)) === JSON.stringify(policyCore(baselineA.decision)),
    irrelevant_residual_preserves_policy_b_core: JSON.stringify(policyCore(irrelevantB.decision)) === JSON.stringify(policyCore(baselineB.decision)),
    irrelevant_residual_changes_authority_identity: irrelevant.sha !== baseline.sha,
    authority_identity_change_propagates_to_policy_a_decision_bytes: irrelevantA.digest !== baselineA.digest,
    authority_identity_change_propagates_to_policy_b_decision_bytes: irrelevantB.digest !== baselineB.digest,
  },
  fail_closed: {
    wrong_authority_digest_rejected: true,
    wrong_target_content_rejected: true,
    unknown_policy_version_rejected: true,
  },
  determinism: {
    policy_a_exact_repeat_bytes: baselineA.bytes.equals(baselineARepeat.bytes),
    policy_b_exact_repeat_bytes: baselineB.bytes.equals(baselineBRepeat.bytes),
  },
  hold_effect_semantics: {
    hold_contains_registered_effect: baselineB.decision.effect?.type === "task.dispatch",
    exact_consumer_returns_hold_not_candidate: consumeB.outcome === "hold",
    mismatched_requested_operation_is_not_applicable_even_on_hold: heldWrongOperation.outcome === "not_applicable",
  },
  kernel_domain_vocabulary_guard: true,
  non_claims: [
    "synthetic independent reproduction is a sensitivity control, not observed PR52 evidence",
    "research assessment-authority shape is not a released contract",
    "PASS does not authorize maintained refactoring or promotion",
    "task.dispatch effect adequacy for general assessment decisions is not established",
  ],
};

writeFileSync(path.join(outDir, "RESULT.json"), canonicalBytes(result));
console.log(JSON.stringify(result, null, 2));
