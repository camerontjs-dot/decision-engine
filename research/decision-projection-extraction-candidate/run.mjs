import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  SUPPORTED_CLAIM_VERIFICATION_POLICY,
  decideContractCToContractD,
} from "../../src/contractCDecision.js";
import {
  CAUSAL_BASIS_CITATION_POLICY,
  citationTargetForContractC,
  decideContractCBasisCitationToContractD,
} from "../../src/contractCBasisCitationDecision.js";
import { canonicalizeContractDWithAuthority } from "../../src/contractDCanonicalOutput.js";

import {
  admitExactContractC,
  resolveCitationTarget,
  resolveClaimTarget,
} from "../contract-c-adapter-projection-kernel/contractCAdapter.mjs";
import { CONTRACT_C_PROJECTION_POLICY_REGISTRY } from "../contract-c-adapter-projection-kernel/contractCPolicies.mjs";
import { projectBoundDecisionFragment } from "../projection-minimality-ablation/minimalProjection.mjs";

import { evaluateAuthorityBoundPolicy } from "../release-qualification-assessment-authority-kernel/kernel.mjs";
import { produceCanonicalAssessmentAuthority } from "../release-qualification-assessment-authority-kernel/producer.mjs";
import {
  REGRESSION_REVIEW_POLICY,
  RELEASE_POLICY_REGISTRY,
} from "../release-qualification-assessment-authority-kernel/releasePolicies.mjs";
import {
  canonicalBytes,
  sha256Bytes,
} from "../release-qualification-assessment-authority-kernel/canonical.mjs";

import { produceCanonicalTaskResultAssessment } from "../agent-result-assessment-authority-kernel/producer.mjs";
import {
  TASK_RESULT_POLICY_REGISTRY,
  VERIFIED_RESULT_CONTINUATION_POLICY,
} from "../agent-result-assessment-authority-kernel/policies.mjs";

import {
  buildManifestValue,
  manifestBytes,
  resolveManifestEntry,
  targetForEntry,
} from "../artifact-manifest-authority-projection/manifestAdapter.mjs";
import { admitSourceBoundManifest } from "../artifact-manifest-authority-projection/sourceBoundManifestAdapter.mjs";
import {
  COMPLETE_SET_USE_POLICY,
  MANIFEST_POLICY_REGISTRY,
} from "../artifact-manifest-authority-projection/manifestPolicies.mjs";

import { materializeBoundDecision } from "./decisionProjectionCandidate.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SPECIMEN_COMMIT = "33f39e88f0f94a13afe740d087e4896247695f79";
const REPOSITORY = "camerontjs-dot/decision-engine";
const MANIFEST_ID = `artifact-manifest:${REPOSITORY}@${SPECIMEN_COMMIT}`;
const MANIFEST_TARGET_PATH = "research/contract-c-adapter-projection-kernel/projectionKernel.mjs";
const MANIFEST_REQUIRED_PATHS = [
  "research/contract-c-adapter-projection-kernel/contractCAdapter.mjs",
  "research/contract-c-adapter-projection-kernel/contractCPolicies.mjs",
  "research/contract-c-adapter-projection-kernel/projectionKernel.mjs",
  "research/contract-c-adapter-projection-kernel/run.mjs",
].sort();

function parseArgs() {
  const values = new Map();
  for (let i = 2; i < process.argv.length; i += 2) values.set(process.argv[i], process.argv[i + 1]);
  for (const key of ["--contract-c-root", "--contract-d-root", "--specimen-root", "--out"]) {
    if (!values.get(key)) throw new Error(`missing ${key}`);
  }
  return {
    contractCRoot: values.get("--contract-c-root"),
    contractDRoot: values.get("--contract-d-root"),
    specimenRoot: values.get("--specimen-root"),
    outDir: values.get("--out"),
  };
}

function digest(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function policyKey(policy) {
  return `${policy.id}@${policy.version}`;
}

function normalizedPolicyFields(result) {
  const evaluation = result.state === "failed"
    ? { state: "failed" }
    : { state: result.state, disposition: result.disposition };
  return {
    evaluation,
    effect: Object.prototype.hasOwnProperty.call(result, "effect") ? structuredClone(result.effect) : undefined,
    metadata: Object.prototype.hasOwnProperty.call(result, "metadata") ? structuredClone(result.metadata) : undefined,
  };
}

function materializePolicyResult({ inputAuthority, policy, target, result, contractDRoot }) {
  return materializeBoundDecision({
    inputAuthority,
    policy,
    target,
    ...normalizedPolicyFields(result),
    contractDAuthorityRoot: contractDRoot,
  });
}

function compareExact(name, expected, actual) {
  assert.deepEqual(actual.decision, expected.decision, `${name}: Decision object differs`);
  assert.ok(actual.bytes.equals(expected.bytes), `${name}: exact Contract D bytes differ`);
  return {
    exact_bytes_equal: true,
    contract_d_sha256: digest(actual.bytes),
    evaluation: actual.decision.evaluation,
    reason_codes: actual.decision.metadata?.reason_codes ?? [],
  };
}

function canonicalMaintained(decision, contractDRoot) {
  return {
    decision,
    bytes: canonicalizeContractDWithAuthority({ decision, contractDAuthorityRoot: contractDRoot }),
  };
}

function contractCCallSites({ contractCRoot, contractDRoot }) {
  const bytes = readFileSync(path.join(contractCRoot, "fixtures/contract-c/1.0.0/valid-canonical.json"));
  const value = JSON.parse(bytes.toString("utf8"));
  const sha = digest(bytes);
  const expectedB = structuredClone(value.input.contract_b);
  const admitted = admitExactContractC({
    contractCBytes: bytes,
    expectedContractCSha256: sha,
    contractCAuthorityRoot: contractCRoot,
    expectedContractB: expectedB,
    pythonExecutable: "python3",
  });

  const proposition = value.propositions[0];
  const propositionId = proposition.proposition.proposition_id;
  const claimPolicy = {
    id: SUPPORTED_CLAIM_VERIFICATION_POLICY.id,
    version: SUPPORTED_CLAIM_VERIFICATION_POLICY.version,
  };
  const claimTarget = {
    kind: "claim",
    id: propositionId,
    content_sha256: `sha256:${proposition.proposition.text_sha256}`,
  };
  const claimResolution = resolveClaimTarget({ authority: admitted.authority, propositionId, target: claimTarget });
  const claimEvaluator = CONTRACT_C_PROJECTION_POLICY_REGISTRY.get(policyKey(claimPolicy));
  const claimResult = claimEvaluator({ authority: admitted.authority, resolution: claimResolution });
  const extractedClaim = materializePolicyResult({
    inputAuthority: admitted.inputAuthority,
    policy: claimPolicy,
    target: claimTarget,
    result: claimResult,
    contractDRoot,
  });
  const maintainedClaim = canonicalMaintained(decideContractCToContractD({
    contractCBytes: bytes,
    expectedContractCSha256: sha,
    contractCAuthorityRoot: contractCRoot,
    expectedContractB: expectedB,
    decisionContext: { policy: claimPolicy, proposition_id: propositionId, target: claimTarget },
    pythonExecutable: "python3",
  }), contractDRoot);

  const causalId = proposition.conclusion.basis_members.find((item) => item.namespace === "contribution").id;
  const citationTarget = citationTargetForContractC(value, propositionId, causalId);
  assert.ok(citationTarget);
  const citationPolicy = {
    id: CAUSAL_BASIS_CITATION_POLICY.id,
    version: CAUSAL_BASIS_CITATION_POLICY.version,
  };
  const citationResolution = resolveCitationTarget({
    authority: admitted.authority,
    propositionId,
    contributionId: causalId,
    target: citationTarget,
  });
  const citationEvaluator = CONTRACT_C_PROJECTION_POLICY_REGISTRY.get(policyKey(citationPolicy));
  const citationResult = citationEvaluator({ authority: admitted.authority, resolution: citationResolution });
  const extractedCitation = materializePolicyResult({
    inputAuthority: admitted.inputAuthority,
    policy: citationPolicy,
    target: citationTarget,
    result: citationResult,
    contractDRoot,
  });
  const maintainedCitation = canonicalMaintained(decideContractCBasisCitationToContractD({
    contractCBytes: bytes,
    expectedContractCSha256: sha,
    contractCAuthorityRoot: contractCRoot,
    expectedContractB: expectedB,
    decisionContext: {
      policy: citationPolicy,
      proposition_id: propositionId,
      contribution_id: causalId,
      target: citationTarget,
    },
    pythonExecutable: "python3",
  }), contractDRoot);

  const missingTarget = {
    kind: "claim",
    id: "extraction-candidate:missing-proposition",
    content_sha256: `sha256:${"7".repeat(64)}`,
  };
  const missingResolution = resolveClaimTarget({
    authority: admitted.authority,
    propositionId: missingTarget.id,
    target: missingTarget,
  });
  const missingResult = claimEvaluator({ authority: admitted.authority, resolution: missingResolution });
  const extractedMissing = materializePolicyResult({
    inputAuthority: admitted.inputAuthority,
    policy: claimPolicy,
    target: missingTarget,
    result: missingResult,
    contractDRoot,
  });
  const maintainedMissing = canonicalMaintained(decideContractCToContractD({
    contractCBytes: bytes,
    expectedContractCSha256: sha,
    contractCAuthorityRoot: contractCRoot,
    expectedContractB: expectedB,
    decisionContext: { policy: claimPolicy, proposition_id: missingTarget.id, target: missingTarget },
    pythonExecutable: "python3",
  }), contractDRoot);

  return {
    claim: compareExact("contract-c-claim", maintainedClaim, extractedClaim),
    citation: compareExact("contract-c-citation", maintainedCitation, extractedCitation),
    missing_target: compareExact("contract-c-missing-target", maintainedMissing, extractedMissing),
  };
}

function releaseAuthorityFromFixture(fixture) {
  const bytes = produceCanonicalAssessmentAuthority(fixture);
  const authority = JSON.parse(bytes.toString("utf8"));
  return {
    bytes,
    authority,
    sha: sha256Bytes(bytes),
    inputAuthority: {
      kind: "assessment_authority",
      id: authority.authority.logical_id,
      immutable_id: sha256Bytes(bytes),
    },
    target: structuredClone(authority.subject),
  };
}

function releaseCallScoped({ admission, contractDRoot }) {
  const evaluator = RELEASE_POLICY_REGISTRY.get(policyKey(REGRESSION_REVIEW_POLICY));
  const result = evaluator(admission.authority);
  return materializePolicyResult({
    inputAuthority: admission.inputAuthority,
    policy: REGRESSION_REVIEW_POLICY,
    target: admission.target,
    result,
    contractDRoot,
  });
}

function releaseTests({ contractDRoot }) {
  const baselineFixture = JSON.parse(readFileSync(path.resolve(HERE, "../release-qualification-assessment-authority-kernel/evidence.json"), "utf8"));
  const baseline = releaseAuthorityFromFixture(baselineFixture);
  const baselineLegacy = evaluateAuthorityBoundPolicy({
    authorityBytes: baseline.bytes,
    expectedAuthoritySha256: baseline.sha,
    target: baseline.target,
    policy: REGRESSION_REVIEW_POLICY,
    policyRegistry: RELEASE_POLICY_REGISTRY,
    contractDAuthorityRoot: contractDRoot,
  });
  const baselineScoped = releaseCallScoped({ admission: baseline, contractDRoot });
  const baselineExact = compareExact("release-baseline", baselineLegacy, baselineScoped);
  assert.equal(baselineScoped.decision.evaluation.disposition, "clear");

  const adverseFixture = structuredClone(baselineFixture);
  const requiredCi = adverseFixture.observations.find((item) => item.id === "required-ci");
  assert.ok(requiredCi);
  requiredCi.conclusion = "failure";
  const adverse = releaseAuthorityFromFixture(adverseFixture);
  const adverseLegacy = evaluateAuthorityBoundPolicy({
    authorityBytes: adverse.bytes,
    expectedAuthoritySha256: adverse.sha,
    target: adverse.target,
    policy: REGRESSION_REVIEW_POLICY,
    policyRegistry: RELEASE_POLICY_REGISTRY,
    contractDAuthorityRoot: contractDRoot,
  });
  const adverseScoped = releaseCallScoped({ admission: adverse, contractDRoot });
  const adverseExact = compareExact("release-adverse", adverseLegacy, adverseScoped);
  assert.equal(adverseScoped.decision.evaluation.disposition, "hold");

  // Core falsifier: detach the trusted CLEAR result from authority A and replay
  // only its policy-owned fields against adverse authority B under the same exact
  // policy identity. Exact Contract D cannot establish whether these fields were
  // actually computed for B.
  const evaluator = RELEASE_POLICY_REGISTRY.get(policyKey(REGRESSION_REVIEW_POLICY));
  const baselinePolicyResult = evaluator(baseline.authority);
  assert.equal(baselinePolicyResult.disposition, "clear");
  const replay = materializePolicyResult({
    inputAuthority: adverse.inputAuthority,
    policy: REGRESSION_REVIEW_POLICY,
    target: adverse.target,
    result: baselinePolicyResult,
    contractDRoot,
  });
  assert.equal(replay.decision.evaluation.disposition, "clear");
  assert.notEqual(digest(replay.bytes), digest(adverseScoped.bytes));

  // Stronger same-target-shape observation: both outputs are exact-D valid and
  // differ only because one uses stale detached policy semantics.
  return {
    baseline: baselineExact,
    adverse: adverseExact,
    replay: {
      same_policy_identity: true,
      authority_changed: baseline.sha !== adverse.sha,
      trusted_adverse_disposition: adverseScoped.decision.evaluation.disposition,
      detached_replay_disposition: replay.decision.evaluation.disposition,
      detached_replay_exact_contract_d_valid: true,
      trusted_adverse_contract_d_sha256: digest(adverseScoped.bytes),
      detached_replay_contract_d_sha256: digest(replay.bytes),
      detached_policy_result_is_not_self_binding: true,
    },
  };
}

function taskResultTest({ contractDRoot }) {
  const fixture = JSON.parse(readFileSync(path.resolve(HERE, "../agent-result-assessment-authority-kernel/evidence.json"), "utf8"));
  const bytes = produceCanonicalTaskResultAssessment(fixture);
  const authority = JSON.parse(bytes.toString("utf8"));
  const sha = sha256Bytes(bytes);
  const inputAuthority = { kind: "assessment_authority", id: authority.authority.logical_id, immutable_id: sha };
  const target = structuredClone(authority.subject);
  const evaluator = TASK_RESULT_POLICY_REGISTRY.get(policyKey(VERIFIED_RESULT_CONTINUATION_POLICY));
  const result = evaluator(authority);
  const extracted = materializePolicyResult({
    inputAuthority,
    policy: VERIFIED_RESULT_CONTINUATION_POLICY,
    target,
    result,
    contractDRoot,
  });
  const legacy = evaluateAuthorityBoundPolicy({
    authorityBytes: bytes,
    expectedAuthoritySha256: sha,
    target,
    policy: VERIFIED_RESULT_CONTINUATION_POLICY,
    policyRegistry: TASK_RESULT_POLICY_REGISTRY,
    contractDAuthorityRoot: contractDRoot,
  });
  return compareExact("task-result", legacy, extracted);
}

function manifestFromSource(specimenRoot) {
  const roles = new Map([
    ["research/contract-c-adapter-projection-kernel/contractCAdapter.mjs", "domain_authority_adapter"],
    ["research/contract-c-adapter-projection-kernel/contractCPolicies.mjs", "domain_policy_projection"],
    ["research/contract-c-adapter-projection-kernel/projectionKernel.mjs", "decision_projection_subject"],
    ["research/contract-c-adapter-projection-kernel/run.mjs", "exact_byte_evidence_runner"],
  ]);
  return buildManifestValue({
    repository: REPOSITORY,
    commitSha: SPECIMEN_COMMIT,
    manifestId: MANIFEST_ID,
    requiredPaths: MANIFEST_REQUIRED_PATHS,
    entries: MANIFEST_REQUIRED_PATHS.map((entryPath) => ({
      path: entryPath,
      role: roles.get(entryPath),
      bytes: readFileSync(path.join(specimenRoot, entryPath)),
    })),
  });
}

function manifestTest({ specimenRoot, contractDRoot }) {
  const value = manifestFromSource(specimenRoot);
  const bytes = manifestBytes(value);
  const sha = sha256Bytes(bytes);
  const admitted = admitSourceBoundManifest({
    bytes,
    expectedSha256: sha,
    sourceRoot: specimenRoot,
    expectedSource: { repository: REPOSITORY, commit_sha: SPECIMEN_COMMIT },
  });
  const target = targetForEntry(admitted.authority, MANIFEST_TARGET_PATH);
  assert.ok(target);
  const resolution = resolveManifestEntry({ authority: admitted.authority, path: MANIFEST_TARGET_PATH, target });
  const evaluator = MANIFEST_POLICY_REGISTRY.get(policyKey(COMPLETE_SET_USE_POLICY));
  const result = evaluator({ authority: admitted.authority, resolution });
  const extracted = materializePolicyResult({
    inputAuthority: admitted.inputAuthority,
    policy: COMPLETE_SET_USE_POLICY,
    target,
    result,
    contractDRoot,
  });
  const priorMinimal = projectBoundDecisionFragment({
    inputAuthority: admitted.inputAuthority,
    policy: COMPLETE_SET_USE_POLICY,
    target,
    decisionFragment: normalizedPolicyFields(result),
    contractDAuthorityRoot: contractDRoot,
  });
  return compareExact("artifact-manifest", priorMinimal, extracted);
}

function determinismAndOwnership({ contractDRoot }) {
  const inputAuthority = {
    kind: "assessment_authority",
    id: "extraction-candidate:ownership",
    immutable_id: `sha256:${"1".repeat(64)}`,
  };
  const policy = { id: "decision-engine.extraction-candidate.ownership", version: "research-0" };
  const target = {
    kind: "extraction-candidate-target",
    id: "extraction-candidate:target",
    content_sha256: `sha256:${"2".repeat(64)}`,
  };
  const evaluation = { state: "completed", disposition: "clear" };
  const effect = { type: "task.dispatch", version: "1", params: {} };
  const metadata = { reason_codes: ["ownership_control"] };

  const hashes = [];
  for (let i = 0; i < 10; i += 1) {
    const result = materializeBoundDecision({ inputAuthority, policy, target, evaluation, effect, metadata, contractDAuthorityRoot: contractDRoot });
    hashes.push(digest(result.bytes));
  }
  assert.equal(new Set(hashes).size, 1);

  const result = materializeBoundDecision({ inputAuthority, policy, target, evaluation, effect, metadata, contractDAuthorityRoot: contractDRoot });
  const decisionBefore = structuredClone(result.decision);
  const bytesBefore = Buffer.from(result.bytes);

  inputAuthority.id = "mutated-authority";
  policy.id = "mutated-policy";
  target.id = "mutated-target";
  evaluation.disposition = "hold";
  effect.params.changed = true;
  metadata.reason_codes[0] = "mutated";

  assert.deepEqual(result.decision, decisionBefore, "returned Decision aliased caller inputs");
  assert.ok(result.bytes.equals(bytesBefore), "returned bytes changed after caller mutation");

  result.decision.evaluation.disposition = "hold";
  assert.ok(result.bytes.equals(bytesBefore), "returned canonical bytes aliased mutable Decision object");

  return {
    ten_run_single_sha256: hashes[0],
    deterministic_across_10_runs: true,
    caller_input_mutation_does_not_change_returned_decision: true,
    caller_input_mutation_does_not_change_returned_bytes: true,
    returned_decision_mutation_does_not_change_returned_bytes: true,
  };
}

function staticSurface() {
  const source = readFileSync(path.resolve(HERE, "decisionProjectionCandidate.mjs"), "utf8");
  const prohibitedTokens = ["policyRegistry", "admittedAuthority", "evaluator:", "evaluationCallback", "rawAuthority"];
  for (const token of prohibitedTokens) assert.equal(source.includes(token), false, `candidate leaked ${token}`);
  return {
    sha256: digest(Buffer.from(source, "utf8")),
    line_count: source.split("\n").length - 1,
    policy_registry_parameter_absent: true,
    evaluator_callback_parameter_absent: true,
    raw_authority_parameter_absent: true,
  };
}

const { contractCRoot, contractDRoot, specimenRoot, outDir } = parseArgs();
mkdirSync(outDir, { recursive: true });

const result = {
  status: "SUPPORTED_WITH_TRUST_BOUNDARY",
  checkpoint: "production_shaped_decision_projection_extraction_candidate",
  exact_contract_d_authority: "298a1a0f7b7b6d7712e11200d04faec3e1ca169b",
  live_main_expected: "358c2bb20f490bf25e808434394b26a70a16a123",
  call_site_equivalence: {
    contract_c: contractCCallSites({ contractCRoot, contractDRoot }),
    release_qualification: releaseTests({ contractDRoot }),
    task_result: taskResultTest({ contractDRoot }),
    artifact_manifest: manifestTest({ specimenRoot, contractDRoot }),
  },
  machinery: {
    determinism_and_ownership: determinismAndOwnership({ contractDRoot }),
    static_surface: staticSurface(),
  },
  supported_inference: "the small materializer is supported as trusted internal Decision Engine plumbing after same-call trusted admission, target resolution, and fixed policy evaluation; a detached policy result is not independently bound to the authority/target against which it is later materialized",
  architectural_boundary: "domain wrapper must own admission + target resolution + fixed policy dispatch + immediate materialization; materializeBoundDecision is not an external trust boundary and must not accept detached untrusted policy-result state",
  smaller_next_change_if_promoted_later: "extract only bound Decision materialization; do not extract caller-controlled registry or a public detached-policy-result protocol",
  non_claims: [
    "this does not authorize maintained extraction or merge",
    "this does not make detached policy results portable warrants",
    "this does not revise Contract D",
    "this does not authorize Authorization or execution",
  ],
};

writeFileSync(path.join(outDir, "result.json"), canonicalBytes(result));
console.log(JSON.stringify(result, null, 2));
