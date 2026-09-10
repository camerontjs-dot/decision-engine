import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { canonicalBytes, sha256Bytes } from "../release-qualification-assessment-authority-kernel/canonical.mjs";
import { produceCanonicalAssessmentAuthority } from "../release-qualification-assessment-authority-kernel/producer.mjs";
import { projectDecision } from "../contract-c-adapter-projection-kernel/projectionKernel.mjs";
import { admitExactContractC } from "../contract-c-adapter-projection-kernel/contractCAdapter.mjs";
import {
  admitManifest,
  buildManifestValue,
  manifestBytes,
  ManifestAuthorityError,
  resolveManifestEntry,
  targetForEntry,
} from "./manifestAdapter.mjs";
import { admitSourceBoundManifest } from "./sourceBoundManifestAdapter.mjs";
import {
  BOUND_ENTRY_USE_POLICY,
  COMPLETE_SET_USE_POLICY,
  MANIFEST_POLICY_REGISTRY,
} from "./manifestPolicies.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SPECIMEN_COMMIT = "33f39e88f0f94a13afe740d087e4896247695f79";
const EXPECTED_KERNEL_SHA = "sha256:e12d53020b3a6a046f4ee7688db0a5ea5c5e0a63e758b1c1e5711e7b227759e3";
const REPOSITORY = "camerontjs-dot/decision-engine";
const MANIFEST_ID = `artifact-manifest:${REPOSITORY}@${SPECIMEN_COMMIT}`;
const TARGET_PATH = "research/contract-c-adapter-projection-kernel/projectionKernel.mjs";
const REQUIRED_PATHS = [
  "research/contract-c-adapter-projection-kernel/contractCAdapter.mjs",
  "research/contract-c-adapter-projection-kernel/contractCPolicies.mjs",
  "research/contract-c-adapter-projection-kernel/projectionKernel.mjs",
  "research/contract-c-adapter-projection-kernel/run.mjs",
].sort();

function parseArgs() {
  const values = new Map();
  for (let i = 2; i < process.argv.length; i += 2) values.set(process.argv[i], process.argv[i + 1]);
  for (const key of ["--specimen-root", "--contract-c-root", "--contract-d-root", "--out"]) {
    if (!values.get(key)) throw new Error(`missing ${key}`);
  }
  return {
    specimenRoot: values.get("--specimen-root"),
    contractCRoot: values.get("--contract-c-root"),
    contractDRoot: values.get("--contract-d-root"),
    outDir: values.get("--out"),
  };
}

function manifestFromSource(specimenRoot, paths = REQUIRED_PATHS, overrides = new Map(), sourceCommit = SPECIMEN_COMMIT) {
  const roles = new Map([
    ["research/contract-c-adapter-projection-kernel/contractCAdapter.mjs", "domain_authority_adapter"],
    ["research/contract-c-adapter-projection-kernel/contractCPolicies.mjs", "domain_policy_projection"],
    ["research/contract-c-adapter-projection-kernel/projectionKernel.mjs", "decision_projection_subject"],
    ["research/contract-c-adapter-projection-kernel/run.mjs", "exact_byte_evidence_runner"],
  ]);
  return buildManifestValue({
    repository: REPOSITORY,
    commitSha: sourceCommit,
    manifestId: MANIFEST_ID,
    requiredPaths: REQUIRED_PATHS,
    entries: paths.map((entryPath) => ({
      path: entryPath,
      role: roles.get(entryPath) ?? "supplemental",
      bytes: overrides.has(entryPath) ? overrides.get(entryPath) : readFileSync(path.join(specimenRoot, entryPath)),
    })),
  });
}

function sourceAdmission(value, specimenRoot) {
  const bytes = manifestBytes(value);
  const sha = sha256Bytes(bytes);
  const admitted = admitSourceBoundManifest({
    bytes,
    expectedSha256: sha,
    sourceRoot: specimenRoot,
    expectedSource: { repository: REPOSITORY, commit_sha: SPECIMEN_COMMIT },
  });
  return { ...admitted, bytes, sha };
}

function evaluate({ admission, resolution, policy, contractDRoot }) {
  return projectDecision({
    admittedAuthority: admission.authority,
    inputAuthority: admission.inputAuthority,
    resolvedTarget: resolution,
    policy,
    policyRegistry: MANIFEST_POLICY_REGISTRY,
    contractDAuthorityRoot: contractDRoot,
  });
}

function decisionCore(result) {
  return {
    evaluation: result.decision.evaluation,
    effect: result.decision.effect,
    reason_codes: result.decision.metadata?.reason_codes ?? [],
  };
}

function expectManifestError(fn, code) {
  try {
    fn();
  } catch (error) {
    assert.ok(error instanceof ManifestAuthorityError, `unexpected manifest error ${error}`);
    assert.equal(error.code, code);
    return error.code;
  }
  assert.fail(`expected manifest error ${code}`);
}

function consumeExactD({ result, admission, policy, target, contractDRoot }) {
  const payload = {
    decision: result.decision,
    expected: {
      input_authority: admission.inputAuthority,
      policy,
      target,
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
  const proc = spawnSync("python3", ["-c", program, contractDRoot], {
    input: JSON.stringify(payload),
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  assert.equal(proc.status, 0, proc.stderr || proc.stdout);
  return JSON.parse(proc.stdout);
}

const { specimenRoot, contractCRoot, contractDRoot, outDir } = parseArgs();
mkdirSync(outDir, { recursive: true });

const kernelBytes = readFileSync(path.resolve(HERE, "../contract-c-adapter-projection-kernel/projectionKernel.mjs"));
assert.equal(sha256Bytes(kernelBytes), EXPECTED_KERNEL_SHA, "projection kernel changed from PR #58 science bytes");

const baselineValue = manifestFromSource(specimenRoot);
const baseline = sourceAdmission(baselineValue, specimenRoot);
writeFileSync(path.join(outDir, "baseline.manifest.json"), baseline.bytes);

const target = targetForEntry(baseline.authority, TARGET_PATH);
assert.ok(target, "baseline target entry absent");
const resolution = resolveManifestEntry({ authority: baseline.authority, path: TARGET_PATH, target });
const baselineEntry = evaluate({ admission: baseline, resolution, policy: BOUND_ENTRY_USE_POLICY, contractDRoot });
const baselineComplete = evaluate({ admission: baseline, resolution, policy: COMPLETE_SET_USE_POLICY, contractDRoot });
assert.deepEqual(baselineEntry.decision.evaluation, { state: "completed", disposition: "clear" });
assert.deepEqual(baselineComplete.decision.evaluation, { state: "completed", disposition: "clear" });
assert.equal(consumeExactD({ result: baselineEntry, admission: baseline, policy: BOUND_ENTRY_USE_POLICY, target, contractDRoot }).outcome, "candidate_for_authorization");
assert.equal(consumeExactD({ result: baselineComplete, admission: baseline, policy: COMPLETE_SET_USE_POLICY, target, contractDRoot }).outcome, "candidate_for_authorization");

// Valid incomplete authority: exact target remains, another required entry is absent.
const omittedPath = "research/contract-c-adapter-projection-kernel/contractCPolicies.mjs";
const incompletePaths = REQUIRED_PATHS.filter((item) => item !== omittedPath);
const incompleteValue = manifestFromSource(specimenRoot, incompletePaths);
const incomplete = sourceAdmission(incompleteValue, specimenRoot);
const incompleteTarget = targetForEntry(incomplete.authority, TARGET_PATH);
const incompleteResolution = resolveManifestEntry({ authority: incomplete.authority, path: TARGET_PATH, target: incompleteTarget });
const incompleteEntry = evaluate({ admission: incomplete, resolution: incompleteResolution, policy: BOUND_ENTRY_USE_POLICY, contractDRoot });
const incompleteComplete = evaluate({ admission: incomplete, resolution: incompleteResolution, policy: COMPLETE_SET_USE_POLICY, contractDRoot });
assert.deepEqual(incompleteEntry.decision.evaluation, { state: "completed", disposition: "clear" });
assert.deepEqual(incompleteComplete.decision.evaluation, { state: "completed", disposition: "hold" });
assert.deepEqual(incompleteComplete.decision.metadata.reason_codes, ["manifest_required_set_incomplete"]);
assert.deepEqual(incompleteComplete.decision.metadata.diagnostics.missing_paths, [omittedPath]);
assert.equal(consumeExactD({ result: incompleteEntry, admission: incomplete, policy: BOUND_ENTRY_USE_POLICY, target: incompleteTarget, contractDRoot }).outcome, "candidate_for_authorization");
assert.equal(consumeExactD({ result: incompleteComplete, admission: incomplete, policy: COMPLETE_SET_USE_POLICY, target: incompleteTarget, contractDRoot }).outcome, "hold");

// An optional observed entry changes authority identity but does not change either policy core.
const optionalPath = "research/contract-c-adapter-projection-kernel/README.md";
const optionalValue = manifestFromSource(specimenRoot, [...REQUIRED_PATHS, optionalPath]);
const optional = sourceAdmission(optionalValue, specimenRoot);
const optionalTarget = targetForEntry(optional.authority, TARGET_PATH);
const optionalResolution = resolveManifestEntry({ authority: optional.authority, path: TARGET_PATH, target: optionalTarget });
const optionalEntry = evaluate({ admission: optional, resolution: optionalResolution, policy: BOUND_ENTRY_USE_POLICY, contractDRoot });
const optionalComplete = evaluate({ admission: optional, resolution: optionalResolution, policy: COMPLETE_SET_USE_POLICY, contractDRoot });
assert.deepEqual(decisionCore(optionalEntry), decisionCore(baselineEntry));
assert.deepEqual(decisionCore(optionalComplete), decisionCore(baselineComplete));
assert.notEqual(optional.sha, baseline.sha);

// Outer whole-object replay/substitution.
expectManifestError(
  () => admitSourceBoundManifest({
    bytes: baseline.bytes,
    expectedSha256: `sha256:${"0".repeat(64)}`,
    sourceRoot: specimenRoot,
    expectedSource: { repository: REPOSITORY, commit_sha: SPECIMEN_COMMIT },
  }),
  "manifest_whole_object_mismatch",
);

// Internal content mutation with stale entry hash. Rebind outer SHA so only internal evidence can catch it.
const internalTamper = structuredClone(baselineValue);
const internalEntry = internalTamper.entries.find((item) => item.path === TARGET_PATH);
const tamperedBytes = Buffer.from(internalEntry.content_base64, "base64");
tamperedBytes[0] = tamperedBytes[0] === 0x78 ? 0x79 : 0x78;
internalEntry.content_base64 = tamperedBytes.toString("base64");
const internalTamperBytes = canonicalBytes(internalTamper);
expectManifestError(
  () => admitManifest({ bytes: internalTamperBytes, expectedSha256: sha256Bytes(internalTamperBytes) }),
  "manifest_entry_content_mismatch",
);

// Stronger adapter-truthfulness control: recompute all manifest-local identities around tampered bytes.
const fullyReboundTamper = manifestFromSource(specimenRoot, REQUIRED_PATHS, new Map([[TARGET_PATH, tamperedBytes]]));
const fullyReboundBytes = manifestBytes(fullyReboundTamper);
assert.doesNotThrow(() => admitManifest({ bytes: fullyReboundBytes, expectedSha256: sha256Bytes(fullyReboundBytes) }));
expectManifestError(
  () => admitSourceBoundManifest({
    bytes: fullyReboundBytes,
    expectedSha256: sha256Bytes(fullyReboundBytes),
    sourceRoot: specimenRoot,
    expectedSource: { repository: REPOSITORY, commit_sha: SPECIMEN_COMMIT },
  }),
  "manifest_source_entry_mismatch",
);

// Source identity relabeling with otherwise exact entries is rejected against frozen expected source.
const relabeledSource = manifestFromSource(specimenRoot, REQUIRED_PATHS, new Map(), "0".repeat(40));
const relabeledBytes = manifestBytes(relabeledSource);
expectManifestError(
  () => admitSourceBoundManifest({
    bytes: relabeledBytes,
    expectedSha256: sha256Bytes(relabeledBytes),
    sourceRoot: specimenRoot,
    expectedSource: { repository: REPOSITORY, commit_sha: SPECIMEN_COMMIT },
  }),
  "manifest_source_binding_mismatch",
);

// Nested target substitution is a resolver failure, not a generic-kernel concern.
const otherPath = REQUIRED_PATHS.find((item) => item !== TARGET_PATH);
const wrongTarget = targetForEntry(baseline.authority, otherPath);
expectManifestError(
  () => resolveManifestEntry({ authority: baseline.authority, path: TARGET_PATH, target: wrongTarget }),
  "manifest_target_binding_mismatch",
);

// Foreign assessment-authority bytes cannot be laundered through the manifest adapter.
const releaseFixture = JSON.parse(readFileSync(path.resolve(HERE, "../release-qualification-assessment-authority-kernel/evidence.json"), "utf8"));
const releaseAuthorityBytes = produceCanonicalAssessmentAuthority(releaseFixture);
expectManifestError(
  () => admitManifest({ bytes: releaseAuthorityBytes, expectedSha256: sha256Bytes(releaseAuthorityBytes) }),
  "manifest_schema_mismatch",
);

// Canonical Contract C bytes cannot be laundered through the manifest adapter.
const canonicalCBytes = readFileSync(path.join(contractCRoot, "fixtures/contract-c/1.0.0/valid-canonical.json"));
expectManifestError(
  () => admitManifest({ bytes: canonicalCBytes, expectedSha256: sha256Bytes(canonicalCBytes) }),
  "manifest_schema_mismatch",
);

// Manifest bytes cannot be reinterpreted as Contract C through the exact C adapter.
let contractCRejected = false;
let contractCRejectCode = null;
try {
  admitExactContractC({
    contractCBytes: baseline.bytes,
    expectedContractCSha256: baseline.sha,
    contractCAuthorityRoot: contractCRoot,
    expectedContractB: {
      contract_version: "1.2.0",
      bundle_id: "foreign-manifest-control",
      bundle_hash: `sha256:${"0".repeat(64)}`,
    },
  });
} catch (error) {
  contractCRejected = true;
  contractCRejectCode = error?.code ?? error?.name ?? "unknown";
}
assert.equal(contractCRejected, true, "Contract C adapter reinterpreted manifest bytes");
assert.equal(contractCRejectCode, "contract_c_validation_failed");

const result = {
  status: "PASS",
  checkpoint: "heterogeneous_artifact_manifest_authority_projection",
  exact_projection_kernel_sha256: EXPECTED_KERNEL_SHA,
  exact_specimen_commit: SPECIMEN_COMMIT,
  exact_contract_d_authority: "298a1a0f7b7b6d7712e11200d04faec3e1ca169b",
  authority_family: {
    kind: "artifact_manifest",
    assessment_authority_envelope_reused: false,
    baseline_manifest_sha256: baseline.sha,
    incomplete_manifest_sha256: incomplete.sha,
    optional_manifest_sha256: optional.sha,
  },
  baseline: {
    bound_entry: decisionCore(baselineEntry),
    complete_set: decisionCore(baselineComplete),
    bound_entry_contract_d_sha256: sha256Bytes(baselineEntry.bytes),
    complete_set_contract_d_sha256: sha256Bytes(baselineComplete.bytes),
  },
  valid_incomplete: {
    omitted_path: omittedPath,
    bound_entry_disposition: incompleteEntry.decision.evaluation.disposition,
    complete_set_disposition: incompleteComplete.decision.evaluation.disposition,
    complete_set_reason: incompleteComplete.decision.metadata.reason_codes[0],
  },
  controls: {
    optional_entry_preserves_bound_entry_policy_core: JSON.stringify(decisionCore(optionalEntry)) === JSON.stringify(decisionCore(baselineEntry)),
    optional_entry_preserves_complete_set_policy_core: JSON.stringify(decisionCore(optionalComplete)) === JSON.stringify(decisionCore(baselineComplete)),
    optional_entry_changes_authority_identity: optional.sha !== baseline.sha,
    whole_object_substitution_rejected: true,
    stale_internal_entry_hash_rejected_after_outer_rebind: true,
    fully_rebound_internal_tamper_rejected_by_external_source_binding: true,
    source_identity_relabel_rejected: true,
    nested_target_substitution_rejected: true,
    release_assessment_rejected_by_manifest_adapter: true,
    contract_c_rejected_by_manifest_adapter: true,
    manifest_rejected_by_contract_c_adapter: contractCRejected,
  },
  interpretation: {
    exact_pr58_projection_kernel_reused_without_modification: true,
    heterogeneous_raw_authority_supported_for_tested_decisions: true,
    valid_domain_incompleteness_expressed_as_policy_hold_not_ingress_failure: true,
    external_source_binding_is_stronger_than_self_consistent_manifest_rebinding: true,
    cross_domain_adapter_laundering_rejected: true,
  },
  remaining_load_bearing_assumption: "domain adapters truthfully bind the external authority they claim to admit",
  non_claims: [
    "this does not establish universal Decision authority interoperability",
    "this does not establish a generic raw ingress contract",
    "this does not authorize maintained projection-kernel extraction",
    "this does not establish that every authority domain should use artifact-manifest semantics",
  ],
};

writeFileSync(path.join(outDir, "RESULT.json"), `${JSON.stringify(result, null, 2)}\n`);
writeFileSync(path.join(outDir, "incomplete.manifest.json"), incomplete.bytes);
writeFileSync(path.join(outDir, "optional.manifest.json"), optional.bytes);
console.log(JSON.stringify(result, null, 2));
