import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { exportContractD } from "../../src/contractD.js";
import {
  ContractDOutputError,
  canonicalizeContractDWithAuthority,
} from "../../src/contractDCanonicalOutput.js";
import {
  SUPPORTED_CLAIM_VERIFICATION_POLICY,
  decideContractCToContractD,
} from "../../src/contractCDecision.js";
import {
  CAUSAL_BASIS_CITATION_POLICY,
  citationTargetForContractC,
  decideContractCBasisCitationToContractD,
} from "../../src/contractCBasisCitationDecision.js";

import { projectDecision } from "../contract-c-adapter-projection-kernel/projectionKernel.mjs";
import {
  admitExactContractC,
  resolveCitationTarget,
  resolveClaimTarget,
} from "../contract-c-adapter-projection-kernel/contractCAdapter.mjs";
import { CONTRACT_C_PROJECTION_POLICY_REGISTRY } from "../contract-c-adapter-projection-kernel/contractCPolicies.mjs";

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

import { projectBoundDecisionFragment } from "./minimalProjection.mjs";

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

function args() {
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

function fragmentFromTrustedPolicyResult(result) {
  // This conversion is deliberately outside the generic projection candidate.
  // It is part of trusted policy machinery, not caller-controlled projection.
  const fragment = {
    evaluation: result?.state === "failed"
      ? { state: "failed" }
      : { state: result?.state, disposition: result?.disposition },
  };
  if (result && Object.prototype.hasOwnProperty.call(result, "effect")) {
    fragment.effect = structuredClone(result.effect);
  }
  if (result && Object.prototype.hasOwnProperty.call(result, "metadata")) {
    fragment.metadata = structuredClone(result.metadata);
  }
  return fragment;
}

function wrappedObjectRegistry(registry) {
  return new Map([...registry.entries()].map(([key, evaluator]) => [
    key,
    ({ authority }) => evaluator(authority),
  ]));
}

function compareCurrentToMinimal({
  name,
  admittedAuthority,
  inputAuthority,
  resolvedTarget,
  policy,
  currentRegistry,
  trustedEvaluator,
  contractDRoot,
  expectedDecision = undefined,
}) {
  const current = projectDecision({
    admittedAuthority,
    inputAuthority,
    resolvedTarget,
    policy,
    policyRegistry: currentRegistry,
    contractDAuthorityRoot: contractDRoot,
  });
  const policyResult = trustedEvaluator({ authority: admittedAuthority, resolution: resolvedTarget });
  const minimal = projectBoundDecisionFragment({
    inputAuthority,
    policy,
    target: resolvedTarget.target,
    decisionFragment: fragmentFromTrustedPolicyResult(policyResult),
    contractDAuthorityRoot: contractDRoot,
  });

  assert.deepEqual(minimal.decision, current.decision, `${name}: Decision object changed under minimal projection`);
  assert.ok(minimal.bytes.equals(current.bytes), `${name}: exact Contract D bytes changed under minimal projection`);
  if (expectedDecision) {
    assert.deepEqual(minimal.decision, expectedDecision.decision, `${name}: minimal projection differs from maintained/legacy Decision`);
    assert.ok(minimal.bytes.equals(expectedDecision.bytes), `${name}: minimal projection differs from maintained/legacy exact bytes`);
  }
  return {
    exact_bytes_equal: true,
    contract_d_sha256: digest(minimal.bytes),
    evaluation: minimal.decision.evaluation,
    reason_codes: minimal.decision.metadata?.reason_codes ?? [],
  };
}

function loadContractCFixture(contractCRoot) {
  const bytes = readFileSync(path.join(contractCRoot, "fixtures/contract-c/1.0.0/valid-canonical.json"));
  return {
    bytes,
    value: JSON.parse(bytes.toString("utf8")),
    sha: digest(bytes),
  };
}

function cExpectedB(value) {
  return structuredClone(value.input.contract_b);
}

function canonicalMaintained({ decision, contractDRoot }) {
  return {
    decision,
    bytes: canonicalizeContractDWithAuthority({ decision, contractDAuthorityRoot: contractDRoot }),
  };
}

function contractCCases({ contractCRoot, contractDRoot }) {
  const fixture = loadContractCFixture(contractCRoot);
  const admitted = admitExactContractC({
    contractCBytes: fixture.bytes,
    expectedContractCSha256: fixture.sha,
    contractCAuthorityRoot: contractCRoot,
    expectedContractB: cExpectedB(fixture.value),
    pythonExecutable: "python3",
  });
  const proposition = fixture.value.propositions[0];
  const propositionId = proposition.proposition.proposition_id;
  const claimTarget = {
    kind: "claim",
    id: propositionId,
    content_sha256: `sha256:${proposition.proposition.text_sha256}`,
  };
  const claimPolicy = {
    id: SUPPORTED_CLAIM_VERIFICATION_POLICY.id,
    version: SUPPORTED_CLAIM_VERIFICATION_POLICY.version,
  };
  const claimResolution = resolveClaimTarget({
    authority: admitted.authority,
    propositionId,
    target: claimTarget,
  });
  const maintainedClaimDecision = decideContractCToContractD({
    contractCBytes: fixture.bytes,
    expectedContractCSha256: fixture.sha,
    contractCAuthorityRoot: contractCRoot,
    expectedContractB: cExpectedB(fixture.value),
    decisionContext: { policy: claimPolicy, proposition_id: propositionId, target: claimTarget },
    pythonExecutable: "python3",
  });

  const cases = {};
  cases.claim = compareCurrentToMinimal({
    name: "contract-c-claim",
    admittedAuthority: admitted.authority,
    inputAuthority: admitted.inputAuthority,
    resolvedTarget: claimResolution,
    policy: claimPolicy,
    currentRegistry: CONTRACT_C_PROJECTION_POLICY_REGISTRY,
    trustedEvaluator: CONTRACT_C_PROJECTION_POLICY_REGISTRY.get(policyKey(claimPolicy)),
    contractDRoot,
    expectedDecision: canonicalMaintained({ decision: maintainedClaimDecision, contractDRoot }),
  });

  const causalContributionId = proposition.conclusion.basis_members.find((member) => member.namespace === "contribution").id;
  const citationTarget = citationTargetForContractC(fixture.value, propositionId, causalContributionId);
  assert.ok(citationTarget);
  const citationPolicy = {
    id: CAUSAL_BASIS_CITATION_POLICY.id,
    version: CAUSAL_BASIS_CITATION_POLICY.version,
  };
  const citationResolution = resolveCitationTarget({
    authority: admitted.authority,
    propositionId,
    contributionId: causalContributionId,
    target: citationTarget,
  });
  const maintainedCitationDecision = decideContractCBasisCitationToContractD({
    contractCBytes: fixture.bytes,
    expectedContractCSha256: fixture.sha,
    contractCAuthorityRoot: contractCRoot,
    expectedContractB: cExpectedB(fixture.value),
    decisionContext: {
      policy: citationPolicy,
      proposition_id: propositionId,
      contribution_id: causalContributionId,
      target: citationTarget,
    },
    pythonExecutable: "python3",
  });
  cases.citation = compareCurrentToMinimal({
    name: "contract-c-causal-citation",
    admittedAuthority: admitted.authority,
    inputAuthority: admitted.inputAuthority,
    resolvedTarget: citationResolution,
    policy: citationPolicy,
    currentRegistry: CONTRACT_C_PROJECTION_POLICY_REGISTRY,
    trustedEvaluator: CONTRACT_C_PROJECTION_POLICY_REGISTRY.get(policyKey(citationPolicy)),
    contractDRoot,
    expectedDecision: canonicalMaintained({ decision: maintainedCitationDecision, contractDRoot }),
  });

  const missingTarget = {
    kind: "claim",
    id: "projection-minimality:missing-proposition",
    content_sha256: `sha256:${"7".repeat(64)}`,
  };
  const missingResolution = resolveClaimTarget({
    authority: admitted.authority,
    propositionId: missingTarget.id,
    target: missingTarget,
  });
  const maintainedMissingDecision = decideContractCToContractD({
    contractCBytes: fixture.bytes,
    expectedContractCSha256: fixture.sha,
    contractCAuthorityRoot: contractCRoot,
    expectedContractB: cExpectedB(fixture.value),
    decisionContext: { policy: claimPolicy, proposition_id: missingTarget.id, target: missingTarget },
    pythonExecutable: "python3",
  });
  cases.failed_missing_target = compareCurrentToMinimal({
    name: "contract-c-failed-missing-target",
    admittedAuthority: admitted.authority,
    inputAuthority: admitted.inputAuthority,
    resolvedTarget: missingResolution,
    policy: claimPolicy,
    currentRegistry: CONTRACT_C_PROJECTION_POLICY_REGISTRY,
    trustedEvaluator: CONTRACT_C_PROJECTION_POLICY_REGISTRY.get(policyKey(claimPolicy)),
    contractDRoot,
    expectedDecision: canonicalMaintained({ decision: maintainedMissingDecision, contractDRoot }),
  });
  return cases;
}

function releaseCase({ contractDRoot }) {
  const fixture = JSON.parse(readFileSync(path.resolve(HERE, "../release-qualification-assessment-authority-kernel/evidence.json"), "utf8"));
  const bytes = produceCanonicalAssessmentAuthority(fixture);
  const authority = JSON.parse(bytes.toString("utf8"));
  const sha = sha256Bytes(bytes);
  const inputAuthority = {
    kind: "assessment_authority",
    id: authority.authority.logical_id,
    immutable_id: sha,
  };
  const target = structuredClone(authority.subject);
  const legacy = evaluateAuthorityBoundPolicy({
    authorityBytes: bytes,
    expectedAuthoritySha256: sha,
    target,
    policy: REGRESSION_REVIEW_POLICY,
    policyRegistry: RELEASE_POLICY_REGISTRY,
    contractDAuthorityRoot: contractDRoot,
  });
  return compareCurrentToMinimal({
    name: "release-qualification",
    admittedAuthority: authority,
    inputAuthority,
    resolvedTarget: { target },
    policy: REGRESSION_REVIEW_POLICY,
    currentRegistry: wrappedObjectRegistry(RELEASE_POLICY_REGISTRY),
    trustedEvaluator: ({ authority: value }) => RELEASE_POLICY_REGISTRY.get(policyKey(REGRESSION_REVIEW_POLICY))(value),
    contractDRoot,
    expectedDecision: legacy,
  });
}

function taskResultCase({ contractDRoot }) {
  const fixture = JSON.parse(readFileSync(path.resolve(HERE, "../agent-result-assessment-authority-kernel/evidence.json"), "utf8"));
  const bytes = produceCanonicalTaskResultAssessment(fixture);
  const authority = JSON.parse(bytes.toString("utf8"));
  const sha = sha256Bytes(bytes);
  const inputAuthority = {
    kind: "assessment_authority",
    id: authority.authority.logical_id,
    immutable_id: sha,
  };
  const target = structuredClone(authority.subject);
  const legacy = evaluateAuthorityBoundPolicy({
    authorityBytes: bytes,
    expectedAuthoritySha256: sha,
    target,
    policy: VERIFIED_RESULT_CONTINUATION_POLICY,
    policyRegistry: TASK_RESULT_POLICY_REGISTRY,
    contractDAuthorityRoot: contractDRoot,
  });
  return compareCurrentToMinimal({
    name: "task-result",
    admittedAuthority: authority,
    inputAuthority,
    resolvedTarget: { target },
    policy: VERIFIED_RESULT_CONTINUATION_POLICY,
    currentRegistry: wrappedObjectRegistry(TASK_RESULT_POLICY_REGISTRY),
    trustedEvaluator: ({ authority: value }) => TASK_RESULT_POLICY_REGISTRY.get(policyKey(VERIFIED_RESULT_CONTINUATION_POLICY))(value),
    contractDRoot,
    expectedDecision: legacy,
  });
}

function manifestFromSource(specimenRoot, paths = MANIFEST_REQUIRED_PATHS) {
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
    entries: paths.map((entryPath) => ({
      path: entryPath,
      role: roles.get(entryPath) ?? "supplemental",
      bytes: readFileSync(path.join(specimenRoot, entryPath)),
    })),
  });
}

function manifestCase({ specimenRoot, contractDRoot }) {
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
  const resolution = resolveManifestEntry({
    authority: admitted.authority,
    path: MANIFEST_TARGET_PATH,
    target,
  });
  return compareCurrentToMinimal({
    name: "artifact-manifest",
    admittedAuthority: admitted.authority,
    inputAuthority: admitted.inputAuthority,
    resolvedTarget: resolution,
    policy: COMPLETE_SET_USE_POLICY,
    currentRegistry: MANIFEST_POLICY_REGISTRY,
    trustedEvaluator: MANIFEST_POLICY_REGISTRY.get(policyKey(COMPLETE_SET_USE_POLICY)),
    contractDRoot,
  });
}

function failureRecord(fn) {
  try {
    fn();
  } catch (error) {
    return {
      failed_closed: true,
      owner: error instanceof ContractDOutputError ? "exact_contract_d" : "decision_exporter_or_language_runtime",
      error_name: error?.name ?? "Error",
      error_code: error?.code ?? null,
      message: String(error?.message ?? error),
    };
  }
  assert.fail("malformed projection unexpectedly emitted valid exact Contract D");
}

function ablationMatrix({ contractDRoot }) {
  const inputAuthority = {
    kind: "assessment_authority",
    id: "projection-minimality:authority",
    immutable_id: `sha256:${"1".repeat(64)}`,
  };
  const policy = { id: "decision-engine.projection-minimality.control", version: "research-0" };
  const target = {
    kind: "projection-minimality-target",
    id: "projection-minimality:target",
    content_sha256: `sha256:${"2".repeat(64)}`,
  };
  const fragment = {
    evaluation: { state: "completed", disposition: "clear" },
    effect: { type: "task.dispatch", version: "1", params: {} },
    metadata: { reason_codes: ["projection_minimality_control"] },
  };
  const clean = projectBoundDecisionFragment({
    inputAuthority,
    policy,
    target,
    decisionFragment: fragment,
    contractDAuthorityRoot: contractDRoot,
  });

  const malformed = {
    input_authority_missing_immutable_id: () => projectBoundDecisionFragment({
      inputAuthority: { kind: inputAuthority.kind, id: inputAuthority.id }, policy, target, decisionFragment: fragment, contractDAuthorityRoot: contractDRoot,
    }),
    input_authority_extra_key: () => projectBoundDecisionFragment({
      inputAuthority: { ...inputAuthority, extra: "x" }, policy, target, decisionFragment: fragment, contractDAuthorityRoot: contractDRoot,
    }),
    policy_extra_key: () => projectBoundDecisionFragment({
      inputAuthority, policy: { ...policy, extra: "x" }, target, decisionFragment: fragment, contractDAuthorityRoot: contractDRoot,
    }),
    target_missing_content_hash: () => projectBoundDecisionFragment({
      inputAuthority, policy, target: { kind: target.kind, id: target.id }, decisionFragment: fragment, contractDAuthorityRoot: contractDRoot,
    }),
    completed_missing_effect: () => projectBoundDecisionFragment({
      inputAuthority, policy, target, decisionFragment: { evaluation: { state: "completed", disposition: "clear" }, metadata: fragment.metadata }, contractDAuthorityRoot: contractDRoot,
    }),
    completed_invalid_disposition: () => projectBoundDecisionFragment({
      inputAuthority, policy, target, decisionFragment: { ...fragment, evaluation: { state: "completed", disposition: "allow" } }, contractDAuthorityRoot: contractDRoot,
    }),
    failed_with_effect: () => projectBoundDecisionFragment({
      inputAuthority, policy, target, decisionFragment: { evaluation: { state: "failed" }, effect: fragment.effect, metadata: fragment.metadata }, contractDAuthorityRoot: contractDRoot,
    }),
    unknown_evaluation_state: () => projectBoundDecisionFragment({
      inputAuthority, policy, target, decisionFragment: { ...fragment, evaluation: { state: "pending" } }, contractDAuthorityRoot: contractDRoot,
    }),
    metadata_not_object: () => projectBoundDecisionFragment({
      inputAuthority, policy, target, decisionFragment: { ...fragment, metadata: "bad" }, contractDAuthorityRoot: contractDRoot,
    }),
  };
  const rows = {};
  for (const [name, fn] of Object.entries(malformed)) rows[name] = failureRecord(fn);
  assert.ok(Object.values(rows).every((row) => row.failed_closed));

  // Unique responsibility probe: a trusted Decision fragment must not be able to
  // replace external authority/policy/target bindings. Exact Contract D validates
  // self-consistent alternate bindings, so the generic projection layer must
  // preserve the externally supplied ones rather than blindly spreading input.
  const injection = {
    ...fragment,
    input_authority: {
      kind: "other_authority",
      id: "other:authority",
      immutable_id: `sha256:${"3".repeat(64)}`,
    },
    policy: { id: "decision-engine.other-policy", version: "1.0.0" },
    target: {
      kind: "other-target",
      id: "other:target",
      content_sha256: `sha256:${"4".repeat(64)}`,
    },
  };
  const protectedProjection = projectBoundDecisionFragment({
    inputAuthority,
    policy,
    target,
    decisionFragment: injection,
    contractDAuthorityRoot: contractDRoot,
  });
  assert.ok(protectedProjection.bytes.equals(clean.bytes), "fragment injection changed protected projection bytes");

  const unsafeState = {
    input_authority: structuredClone(inputAuthority),
    policy: structuredClone(policy),
    target: structuredClone(target),
    ...structuredClone(injection),
  };
  const unsafeDecision = exportContractD(unsafeState);
  const unsafeBytes = canonicalizeContractDWithAuthority({ decision: unsafeDecision, contractDAuthorityRoot: contractDRoot });
  assert.notDeepEqual(unsafeDecision.input_authority, inputAuthority);
  assert.notDeepEqual(unsafeDecision.policy, policy);
  assert.notDeepEqual(unsafeDecision.target, target);
  assert.ok(!unsafeBytes.equals(clean.bytes));

  return {
    malformed_rows: rows,
    all_malformed_fail_closed_without_projection_specific_validation: true,
    protected_fragment_binding_preserved: true,
    naive_spread_rebinding_still_contract_d_valid: true,
    unique_projection_responsibility: "preserve externally established input_authority/policy/target bindings while selecting only evaluation/effect/metadata from trusted policy output",
  };
}

function staticMinimality() {
  const source = readFileSync(path.resolve(HERE, "minimalProjection.mjs"), "utf8");
  const forbidden = [
    /policyRegistry/,
    /admittedAuthority/,
    /\bcal\b/i,
    /contract[-_ ]?c\b/i,
    /\bproposition\b/i,
    /\bcontribution\b/i,
    /\bqualification\b/i,
    /\brelease\b/i,
    /\bgithub\b/i,
    /\bworkflow\b/i,
    /\btask[-_ ]?result\b/i,
  ];
  for (const pattern of forbidden) {
    assert.equal(pattern.test(source), false, `minimal projection leaked forbidden dependency/vocabulary: ${pattern}`);
  }
  return {
    sha256: digest(Buffer.from(source, "utf8")),
    line_count: source.split("\n").length - 1,
    policy_registry_parameter_absent: true,
    domain_vocabulary_absent: true,
  };
}

const { contractCRoot, contractDRoot, specimenRoot, outDir } = args();
mkdirSync(outDir, { recursive: true });

const result = {
  status: "PASS",
  checkpoint: "decision_projection_minimality_ablation",
  exact_contract_d_authority: "298a1a0f7b7b6d7712e11200d04faec3e1ca169b",
  valid_equivalence: {
    contract_c: contractCCases({ contractCRoot, contractDRoot }),
    release_qualification: releaseCase({ contractDRoot }),
    task_result: taskResultCase({ contractDRoot }),
    artifact_manifest: manifestCase({ specimenRoot, contractDRoot }),
  },
  ablation: ablationMatrix({ contractDRoot }),
  candidate: staticMinimality(),
  supported_boundary: "trusted domain adapter -> trusted target resolver -> trusted policy implementation -> bound Decision fragment projection -> exact Contract D",
  supported_inference: "generic projection does not need to own domain semantics, policy dispatch, or duplicate Contract D structural validation; it does need to preserve externally established authority/policy/target bindings and exact Contract D materialization",
  non_claims: [
    "this does not authorize maintained extraction",
    "this does not make arbitrary caller-provided Decision fragments trusted",
    "this does not remove the need for trusted policy implementation dispatch",
    "this does not revise Contract D or authorize execution",
  ],
};

writeFileSync(path.join(outDir, "result.json"), canonicalBytes(result));
console.log(JSON.stringify(result, null, 2));
