import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { canonicalBytes, cloneJson, sha256Bytes } from "../release-qualification-assessment-authority-kernel/canonical.mjs";
import { evaluateAuthorityBoundPolicy, AuthorityPolicyKernelError } from "../release-qualification-assessment-authority-kernel/kernel.mjs";
import { produceCanonicalTaskResultAssessment } from "./producer.mjs";
import {
  REVIEWED_RESULT_CONTINUATION_POLICY,
  TASK_RESULT_POLICY_REGISTRY,
  VERIFIED_RESULT_CONTINUATION_POLICY,
} from "./policies.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EXPECTED_KERNEL_SHA = "sha256:a8bbc96c2c01e4e6ca3bb66f4ce7e4d89b3d0be4098d65cdf71c5b60bf200abb";

function parseArgs() {
  const values = new Map();
  for (let i = 2; i < process.argv.length; i += 2) values.set(process.argv[i], process.argv[i + 1]);
  for (const key of ["--evidence", "--contract-d-root", "--out"]) {
    if (!values.get(key)) throw new Error(`missing ${key}`);
  }
  return { evidencePath: values.get("--evidence"), contractDRoot: values.get("--contract-d-root"), outDir: values.get("--out") };
}

function buildAuthority(fixture, outDir, name) {
  const bytes = produceCanonicalTaskResultAssessment(fixture);
  const value = JSON.parse(bytes.toString("utf8"));
  const sha = sha256Bytes(bytes);
  writeFileSync(path.join(outDir, `${name}.assessment-authority.json`), bytes);
  return { bytes, value, sha, target: value.subject };
}

function evaluate(authority, policy, contractDRoot) {
  return evaluateAuthorityBoundPolicy({
    authorityBytes: authority.bytes,
    expectedAuthoritySha256: authority.sha,
    target: authority.target,
    policy,
    policyRegistry: TASK_RESULT_POLICY_REGISTRY,
    contractDAuthorityRoot: contractDRoot,
  });
}

function core(result) {
  return {
    evaluation: result.decision.evaluation,
    effect: result.decision.effect,
    reason_codes: result.decision.metadata?.reason_codes ?? [],
  };
}

function exactDConsumer(result, authority, policy, contractDRoot) {
  const payload = {
    decision: result.decision,
    expected: {
      input_authority: {
        kind: "assessment_authority",
        id: authority.value.authority.logical_id,
        immutable_id: authority.sha,
      },
      policy,
      target: authority.target,
      requested_operation: "task.dispatch",
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
    "x = ApplicabilityExpectation(input_authority=e['input_authority'], policy=e['policy'], target=e['target'], requested_operation=e['requested_operation'], effect_params=e['effect_params'])",
    "print(json.dumps(consume(p['decision'], x), sort_keys=True))",
  ].join("\n");
  const proc = spawnSync("python3", ["-c", program, contractDRoot], { input: JSON.stringify(payload), encoding: "utf8" });
  assert.equal(proc.status, 0, proc.stderr || proc.stdout);
  return JSON.parse(proc.stdout);
}

function expectKernelError(fn, code) {
  try { fn(); } catch (error) {
    assert.ok(error instanceof AuthorityPolicyKernelError, `unexpected error: ${error}`);
    assert.equal(error.code, code);
    return;
  }
  assert.fail(`expected ${code}`);
}

function recomputePatchIdentity(fixture, patchText) {
  const next = cloneJson(fixture);
  const bytes = Buffer.from(patchText, "utf8");
  next.result.patch_base64 = bytes.toString("base64");
  next.result.patch_bytes = bytes.length;
  next.result.patch_sha256 = sha256Bytes(bytes);
  return next;
}

function kernelDomainGuard(kernelSource) {
  const forbidden = [/\bcal\b/i, /contract[-_ ]?c\b/i, /\brelease\b/i, /\bqualification\b/i, /\bgithub\b/i, /\bworkflow\b/i, /\bci\b/i, /\bconformance\b/i, /\bagent\b/i, /\btask[-_ ]?result\b/i];
  for (const regex of forbidden) assert.equal(regex.test(kernelSource), false, `domain token leaked into exact reused kernel: ${regex}`);
}

const { evidencePath, contractDRoot, outDir } = parseArgs();
mkdirSync(outDir, { recursive: true });
const fixture = JSON.parse(readFileSync(evidencePath, "utf8"));

const kernelPath = path.resolve(HERE, "../release-qualification-assessment-authority-kernel/kernel.mjs");
const kernelSource = readFileSync(kernelPath);
const kernelSha = sha256Bytes(kernelSource);
assert.equal(kernelSha, EXPECTED_KERNEL_SHA, "second domain did not reuse exact first-domain kernel bytes");
kernelDomainGuard(kernelSource.toString("utf8"));

const baseline = buildAuthority(fixture, outDir, "baseline");
assert.equal(baseline.value.state.outcome, "task_result_verified");
const policyA = evaluate(baseline, VERIFIED_RESULT_CONTINUATION_POLICY, contractDRoot);
const policyB = evaluate(baseline, REVIEWED_RESULT_CONTINUATION_POLICY, contractDRoot);
assert.deepEqual(policyA.decision.evaluation, { state: "completed", disposition: "clear" });
assert.deepEqual(policyB.decision.evaluation, { state: "completed", disposition: "hold" });
assert.deepEqual(policyB.decision.metadata.reason_codes, ["independent_review_not_established"]);
assert.equal(policyA.decision.effect.type, "task.dispatch");
assert.equal(policyB.decision.effect.type, "task.dispatch");

const repeatA = evaluate(baseline, VERIFIED_RESULT_CONTINUATION_POLICY, contractDRoot);
const repeatB = evaluate(baseline, REVIEWED_RESULT_CONTINUATION_POLICY, contractDRoot);
assert.ok(policyA.bytes.equals(repeatA.bytes));
assert.ok(policyB.bytes.equals(repeatB.bytes));

const consumeA = exactDConsumer(policyA, baseline, VERIFIED_RESULT_CONTINUATION_POLICY, contractDRoot);
const consumeB = exactDConsumer(policyB, baseline, REVIEWED_RESULT_CONTINUATION_POLICY, contractDRoot);
assert.equal(consumeA.outcome, "candidate_for_authorization");
assert.equal(consumeB.outcome, "hold");

// Natural semantic falsifier: keep a self-consistent patch identity but remove the required failure-code behavior marker.
const patchText = Buffer.from(fixture.result.patch_base64, "base64").toString("utf8");
const markerRemovedFixture = recomputePatchIdentity(fixture, patchText.replaceAll("authority_identity_mismatch", "authority_identity_changed"));
const markerRemoved = buildAuthority(markerRemovedFixture, outDir, "marker-removed");
assert.equal(markerRemoved.value.evidence.find((item) => item.id === "exact-result-patch").status, "passed");
assert.equal(markerRemoved.value.evidence.find((item) => item.id === "required-regression-behavior").status, "adverse");
assert.equal(markerRemoved.value.state.outcome, "task_result_adverse");
assert.equal(evaluate(markerRemoved, VERIFIED_RESULT_CONTINUATION_POLICY, contractDRoot).decision.evaluation.disposition, "hold");

const scopeViolationFixture = cloneJson(fixture);
scopeViolationFixture.result.changed_files.push("src/contractCIngress.js");
const scopeViolation = buildAuthority(scopeViolationFixture, outDir, "scope-violation");
assert.equal(scopeViolation.value.evidence.find((item) => item.id === "scope-conformance").status, "adverse");
assert.equal(scopeViolation.value.state.outcome, "task_result_adverse");
assert.equal(evaluate(scopeViolation, VERIFIED_RESULT_CONTINUATION_POLICY, contractDRoot).decision.evaluation.disposition, "hold");

const ciFailureFixture = cloneJson(fixture);
ciFailureFixture.verification_runs.find((item) => item.id === "required-ci").conclusion = "failure";
const ciFailure = buildAuthority(ciFailureFixture, outDir, "ci-failure");
assert.equal(ciFailure.value.state.outcome, "task_result_adverse");
assert.equal(evaluate(ciFailure, VERIFIED_RESULT_CONTINUATION_POLICY, contractDRoot).decision.evaluation.disposition, "hold");

const reviewFixture = cloneJson(fixture);
reviewFixture.additional_observations = [{
  id: "independent-review",
  kind: "synthetic_independent_review_control",
  status: "passed",
  reviewer_immutable_id: "synthetic:independent-review:control-1",
}];
const review = buildAuthority(reviewFixture, outDir, "synthetic-review");
assert.equal(evaluate(review, VERIFIED_RESULT_CONTINUATION_POLICY, contractDRoot).decision.evaluation.disposition, "clear");
assert.equal(evaluate(review, REVIEWED_RESULT_CONTINUATION_POLICY, contractDRoot).decision.evaluation.disposition, "clear");

const irrelevantFixture = cloneJson(fixture);
irrelevantFixture.additional_observations = [{
  id: "irrelevant-note",
  kind: "synthetic_irrelevant_control",
  status: "passed",
  immutable_note: "control-1",
}];
const irrelevant = buildAuthority(irrelevantFixture, outDir, "irrelevant-residual");
const irrelevantA = evaluate(irrelevant, VERIFIED_RESULT_CONTINUATION_POLICY, contractDRoot);
const irrelevantB = evaluate(irrelevant, REVIEWED_RESULT_CONTINUATION_POLICY, contractDRoot);
assert.deepEqual(core(irrelevantA), core(policyA));
assert.deepEqual(core(irrelevantB), core(policyB));
assert.notEqual(irrelevant.sha, baseline.sha);

expectKernelError(() => evaluateAuthorityBoundPolicy({
  authorityBytes: baseline.bytes,
  expectedAuthoritySha256: `sha256:${"0".repeat(64)}`,
  target: baseline.target,
  policy: VERIFIED_RESULT_CONTINUATION_POLICY,
  policyRegistry: TASK_RESULT_POLICY_REGISTRY,
  contractDAuthorityRoot: contractDRoot,
}), "authority_whole_object_mismatch");

expectKernelError(() => evaluateAuthorityBoundPolicy({
  authorityBytes: baseline.bytes,
  expectedAuthoritySha256: baseline.sha,
  target: { ...baseline.target, content_sha256: `sha256:${"0".repeat(64)}` },
  policy: VERIFIED_RESULT_CONTINUATION_POLICY,
  policyRegistry: TASK_RESULT_POLICY_REGISTRY,
  contractDAuthorityRoot: contractDRoot,
}), "target_binding_mismatch");

expectKernelError(() => evaluateAuthorityBoundPolicy({
  authorityBytes: baseline.bytes,
  expectedAuthoritySha256: baseline.sha,
  target: baseline.target,
  policy: { id: VERIFIED_RESULT_CONTINUATION_POLICY.id, version: "research-999" },
  policyRegistry: TASK_RESULT_POLICY_REGISTRY,
  contractDAuthorityRoot: contractDRoot,
}), "unknown_policy");

const result = {
  status: "PASS",
  domain: "task_result_verification",
  exact_reused_kernel_sha256: kernelSha,
  first_domain_expected_kernel_sha256: EXPECTED_KERNEL_SHA,
  frozen_task: {
    id: fixture.task.id,
    candidate_sha: fixture.task.candidate_sha,
    patch_sha256: fixture.result.patch_sha256,
    changed_files: fixture.result.changed_files,
    verification_runs: fixture.verification_runs.map((item) => item.run_id),
  },
  baseline: {
    authority_sha256: baseline.sha,
    outcome: baseline.value.state.outcome,
    policy_a: { core: core(policyA), contract_d_sha256: sha256Bytes(policyA.bytes), consumer_outcome: consumeA.outcome },
    policy_b: { core: core(policyB), contract_d_sha256: sha256Bytes(policyB.bytes), consumer_outcome: consumeB.outcome },
  },
  semantic_falsifiers: {
    exact_patch_identity_preserved_while_required_marker_removed: true,
    marker_removed_assessment: markerRemoved.value.state.outcome,
    scope_violation_assessment: scopeViolation.value.state.outcome,
    ci_failure_assessment: ciFailure.value.state.outcome,
  },
  policy_sensitivity: {
    synthetic_independent_review_clears_stricter_policy: true,
    synthetic_independent_review_preserves_base_policy_clear: true,
  },
  invariance: {
    irrelevant_residual_preserves_policy_a_core: true,
    irrelevant_residual_preserves_policy_b_core: true,
    irrelevant_residual_changes_authority_identity: irrelevant.sha !== baseline.sha,
  },
  fail_closed: {
    wrong_authority_digest_rejected: true,
    wrong_target_content_rejected: true,
    unknown_policy_version_rejected: true,
  },
  determinism: {
    policy_a_repeat_bytes: policyA.bytes.equals(repeatA.bytes),
    policy_b_repeat_bytes: policyB.bytes.equals(repeatB.bytes),
  },
  non_claims: [
    "PR52 authorship is not attributed to an autonomous agent",
    "synthetic independent review is only a sensitivity control",
    "exact assessment bytes are bound but production producer trust-root establishment remains unresolved",
    "second-domain PASS does not authorize maintained kernel extraction",
  ],
};

writeFileSync(path.join(outDir, "RESULT.json"), canonicalBytes(result));
console.log(JSON.stringify(result, null, 2));
