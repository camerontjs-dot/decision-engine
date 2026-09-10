import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { canonicalBytes, cloneJson, sha256Bytes, sha256Json } from "../release-qualification-assessment-authority-kernel/canonical.mjs";
import { produceCanonicalAssessmentAuthority } from "../release-qualification-assessment-authority-kernel/producer.mjs";
import { evaluateAuthorityBoundPolicy as originalEvaluate } from "../release-qualification-assessment-authority-kernel/kernel.mjs";
import {
  PRODUCTION_REVIEW_POLICY,
  REGRESSION_REVIEW_POLICY,
  RELEASE_POLICY_REGISTRY,
} from "../release-qualification-assessment-authority-kernel/releasePolicies.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SUBJECT_DIR = path.resolve(HERE, "../release-qualification-assessment-authority-kernel");
const KERNEL_PATH = path.join(SUBJECT_DIR, "kernel.mjs");
const POLICIES_PATH = path.join(SUBJECT_DIR, "releasePolicies.mjs");

function parseArgs() {
  const values = new Map();
  for (let i = 2; i < process.argv.length; i += 2) values.set(process.argv[i], process.argv[i + 1]);
  for (const key of ["--evidence", "--contract-d-root", "--out"]) {
    if (!values.get(key)) throw new Error(`missing ${key}`);
  }
  return {
    evidencePath: values.get("--evidence"),
    contractDRoot: values.get("--contract-d-root"),
    outDir: values.get("--out"),
  };
}

function replaceOnce(source, needle, replacement, mutantId) {
  const first = source.indexOf(needle);
  assert.notEqual(first, -1, `${mutantId}: mutation anchor absent`);
  assert.equal(source.indexOf(needle, first + needle.length), -1, `${mutantId}: mutation anchor not unique`);
  return source.slice(0, first) + replacement + source.slice(first + needle.length);
}

async function importMutant(basePath, source, mutantId) {
  const ext = path.extname(basePath);
  const tempPath = basePath.slice(0, -ext.length) + `.__mutant_${mutantId}__${ext}`;
  writeFileSync(tempPath, source);
  try {
    const mod = await import(`${pathToFileURL(tempPath).href}?audit=${mutantId}-${Date.now()}-${Math.random()}`);
    return { mod, tempPath };
  } catch (error) {
    try { unlinkSync(tempPath); } catch {}
    throw error;
  }
}

function cleanup(tempPath) {
  try { unlinkSync(tempPath); } catch {}
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

function authorityFromFixture(fixture) {
  const bytes = produceCanonicalAssessmentAuthority(fixture);
  const value = JSON.parse(bytes.toString("utf8"));
  return { bytes, value, sha: sha256Bytes(bytes), target: value.subject };
}

function authorityFromValue(value) {
  const bytes = canonicalBytes(value);
  return { bytes, value, sha: sha256Bytes(bytes), target: value.subject };
}

function mutateObservation(fixture, id, mutate) {
  const next = cloneJson(fixture);
  const item = next.observations.find((observation) => observation.id === id);
  assert.ok(item, `missing observation ${id}`);
  mutate(item);
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

function evaluateWith(evaluateFn, registry, authority, policy, contractDRoot, overrides = {}) {
  return evaluateFn({
    authorityBytes: overrides.authorityBytes ?? authority.bytes,
    expectedAuthoritySha256: overrides.expectedAuthoritySha256 ?? authority.sha,
    target: overrides.target ?? authority.target,
    policy: overrides.policy ?? policy,
    policyRegistry: registry,
    contractDAuthorityRoot: contractDRoot,
  });
}

function disposition(result) {
  return result.decision.evaluation.disposition;
}

function reason(result) {
  return result.decision.metadata?.reason_codes?.[0] ?? null;
}

function catches(fn) {
  try {
    fn();
    return { threw: false, code: null };
  } catch (error) {
    return { threw: true, code: error?.code ?? error?.name ?? "unknown_error" };
  }
}

function exactDBytesStatus(bytes, contractDRoot) {
  const program = [
    "import json, sys",
    "root = sys.argv[1]",
    "sys.path.insert(0, root)",
    "from validators.contract_d_core import canonical_json_bytes, validate_decision",
    "raw = sys.stdin.buffer.read()",
    "value = json.loads(raw.decode('utf-8'))",
    "validate_decision(value)",
    "canonical = canonical_json_bytes(value)",
    "sys.exit(0 if raw == canonical else 3)",
  ].join("\n");
  const result = spawnSync("python3", ["-c", program, contractDRoot], {
    input: bytes,
    encoding: null,
    maxBuffer: 16 * 1024 * 1024,
  });
  return { status: result.status, canonical: result.status === 0 };
}

function core(result) {
  return {
    evaluation: result.decision.evaluation,
    effect: result.decision.effect,
    reason_codes: result.decision.metadata?.reason_codes ?? [],
  };
}

function staticKernelGuard() {
  const source = readFileSync(KERNEL_PATH, "utf8");
  const forbidden = [/\bcal\b/i, /contract[-_ ]?c\b/i, /\brelease\b/i, /\bqualification\b/i, /\bgithub\b/i, /\bworkflow\b/i, /\bci\b/i, /\bconformance\b/i];
  assert.ok(forbidden.every((regex) => !regex.test(source)), "subject kernel already contains forbidden domain vocabulary");
}

const { evidencePath, contractDRoot, outDir } = parseArgs();
mkdirSync(outDir, { recursive: true });
staticKernelGuard();

const fixture = JSON.parse(readFileSync(evidencePath, "utf8"));
const expectedTarget = targetFromFixture(fixture);
const baseline = authorityFromFixture(fixture);
assert.deepEqual(baseline.target, expectedTarget);

// Prove original controls before auditing mutants.
const originalA = evaluateWith(originalEvaluate, RELEASE_POLICY_REGISTRY, baseline, REGRESSION_REVIEW_POLICY, contractDRoot);
const originalB = evaluateWith(originalEvaluate, RELEASE_POLICY_REGISTRY, baseline, PRODUCTION_REVIEW_POLICY, contractDRoot);
assert.equal(disposition(originalA), "clear");
assert.equal(disposition(originalB), "hold");
assert.equal(exactDBytesStatus(originalA.bytes, contractDRoot).canonical, true);
assert.equal(exactDBytesStatus(originalB.bytes, contractDRoot).canonical, true);

const naturalCiAdverse = authorityFromFixture(mutateObservation(fixture, "required-ci", (item) => { item.conclusion = "failure"; }));
const naturalCiMissing = authorityFromFixture(withoutObservation(fixture, "required-ci"));
const naturalConformanceAdverse = authorityFromFixture(mutateObservation(fixture, "contract-first-cli-conformance", (item) => { item.conclusion = "failure"; }));
const naturalConformanceMissing = authorityFromFixture(withoutObservation(fixture, "contract-first-cli-conformance"));
const naturalReproduction = authorityFromFixture(withObservation(fixture, {
  id: "independent-reproduction",
  kind: "synthetic_research_control",
  immutable_id: "synthetic:independent-reproduction:mutation-control-1",
  conclusion: "success",
  jobs: [],
}));
const naturalIrrelevant = authorityFromFixture(withObservation(fixture, {
  id: "irrelevant-side-observation",
  kind: "synthetic_irrelevant_control",
  immutable_id: "synthetic:irrelevant-side-observation:mutation-control-1",
  conclusion: "success",
  jobs: [],
}));

// Deliberately inconsistent authority probes. These are not producer-reachability claims.
const inconsistentOutcomeValue = cloneJson(baseline.value);
inconsistentOutcomeValue.state.outcome = "bounded_qualification_not_supported";
const inconsistentOutcome = authorityFromValue(inconsistentOutcomeValue);

const inconsistentCiValue = cloneJson(baseline.value);
inconsistentCiValue.evidence.find((item) => item.id === "required-ci").status = "adverse";
const inconsistentCi = authorityFromValue(inconsistentCiValue);

const inconsistentConformanceValue = cloneJson(baseline.value);
inconsistentConformanceValue.evidence.find((item) => item.id === "contract-first-cli-conformance").status = "adverse";
const inconsistentConformance = authorityFromValue(inconsistentConformanceValue);

assert.equal(disposition(evaluateWith(originalEvaluate, RELEASE_POLICY_REGISTRY, inconsistentOutcome, REGRESSION_REVIEW_POLICY, contractDRoot)), "hold");
assert.equal(disposition(evaluateWith(originalEvaluate, RELEASE_POLICY_REGISTRY, inconsistentCi, REGRESSION_REVIEW_POLICY, contractDRoot)), "hold");
assert.equal(disposition(evaluateWith(originalEvaluate, RELEASE_POLICY_REGISTRY, inconsistentConformance, REGRESSION_REVIEW_POLICY, contractDRoot)), "hold");

const kernelSource = readFileSync(KERNEL_PATH, "utf8");
const policySource = readFileSync(POLICIES_PATH, "utf8");
const results = [];

async function auditKernel(mutant) {
  const source = mutant.transform(kernelSource);
  const { mod, tempPath } = await importMutant(KERNEL_PATH, source, mutant.id);
  try {
    const observation = await mutant.observe(mod.evaluateAuthorityBoundPolicy);
    const killed = mutant.killed(observation);
    results.push({
      id: mutant.id,
      layer: "kernel",
      description: mutant.description,
      classification: killed ? "KILLED" : "SURVIVED_UNEXPLAINED",
      observation,
    });
  } finally {
    cleanup(tempPath);
  }
}

async function auditPolicy(mutant) {
  const source = mutant.transform(policySource);
  const { mod, tempPath } = await importMutant(POLICIES_PATH, source, mutant.id);
  try {
    const observation = await mutant.observe(mod.RELEASE_POLICY_REGISTRY, mod);
    let classification;
    if (mutant.killedNatural(observation)) classification = "KILLED";
    else if (mutant.killedInconsistent?.(observation)) classification = "SURVIVED_NATURAL_REDUNDANT";
    else classification = "SURVIVED_UNEXPLAINED";
    results.push({
      id: mutant.id,
      layer: "policy",
      description: mutant.description,
      classification,
      observation,
    });
  } finally {
    cleanup(tempPath);
  }
}

await auditKernel({
  id: "K1",
  description: "remove exact authority whole-object digest comparison",
  transform: (source) => replaceOnce(source,
    '  if (actual !== expectedAuthoritySha256) {\n    fail("authority_whole_object_mismatch", `expected ${expectedAuthoritySha256}, got ${actual}`);\n  }\n',
    '  // MUTANT K1: authority digest comparison bypassed.\n',
    "K1"),
  observe: async (evaluateFn) => catches(() => evaluateWith(evaluateFn, RELEASE_POLICY_REGISTRY, baseline, REGRESSION_REVIEW_POLICY, contractDRoot, {
    expectedAuthoritySha256: `sha256:${"0".repeat(64)}`,
  })),
  killed: (o) => o.threw === false,
});

await auditKernel({
  id: "K2",
  description: "remove exact target binding",
  transform: (source) => replaceOnce(source,
    '  bindTarget(bound.value, target);\n',
    '  // MUTANT K2: target binding bypassed.\n',
    "K2"),
  observe: async (evaluateFn) => catches(() => evaluateWith(evaluateFn, RELEASE_POLICY_REGISTRY, baseline, REGRESSION_REVIEW_POLICY, contractDRoot, {
    target: { ...baseline.target, content_sha256: `sha256:${"0".repeat(64)}` },
  })),
  killed: (o) => o.threw === false,
});

await auditKernel({
  id: "K3",
  description: "fallback to an available evaluator for an unknown policy identity/version",
  transform: (source) => replaceOnce(source,
    '  const evaluator = policyRegistry.get(policyKey(policy));\n  if (typeof evaluator !== "function") {\n    fail("unknown_policy", `unknown policy ${policyKey(policy)}`);\n  }\n',
    '  const evaluator = policyRegistry.get(policyKey(policy)) ?? policyRegistry.values().next().value;\n',
    "K3"),
  observe: async (evaluateFn) => catches(() => evaluateWith(evaluateFn, RELEASE_POLICY_REGISTRY, baseline, REGRESSION_REVIEW_POLICY, contractDRoot, {
    policy: { id: REGRESSION_REVIEW_POLICY.id, version: "research-999" },
  })),
  killed: (o) => o.threw === false,
});

await auditKernel({
  id: "K4",
  description: "accept noncanonical assessment-authority bytes",
  transform: (source) => replaceOnce(source,
    '  if (!canonicalBytes(value).equals(authorityBytes)) {\n    fail("noncanonical_assessment_authority", "authority bytes must equal canonical research encoding");\n  }\n',
    '  // MUTANT K4: canonical authority byte check bypassed.\n',
    "K4"),
  observe: async (evaluateFn) => {
    const noncanonical = Buffer.from(`${JSON.stringify(baseline.value, null, 2)}\n`, "utf8");
    assert.equal(noncanonical.equals(baseline.bytes), false);
    return catches(() => evaluateWith(evaluateFn, RELEASE_POLICY_REGISTRY, baseline, REGRESSION_REVIEW_POLICY, contractDRoot, {
      authorityBytes: noncanonical,
      expectedAuthoritySha256: sha256Bytes(noncanonical),
    }));
  },
  killed: (o) => o.threw === false,
});

await auditKernel({
  id: "K5",
  description: "bypass exact Contract-D authority/canonical output and return raw JSON bytes",
  transform: (source) => replaceOnce(source,
    '  const bytes = canonicalizeContractDWithAuthority({\n    decision,\n    contractDAuthorityRoot,\n  });\n',
    '  const bytes = Buffer.from(JSON.stringify(decision), "utf8"); // MUTANT K5\n',
    "K5"),
  observe: async (evaluateFn) => {
    const value = evaluateWith(evaluateFn, RELEASE_POLICY_REGISTRY, baseline, REGRESSION_REVIEW_POLICY, contractDRoot);
    return exactDBytesStatus(value.bytes, contractDRoot);
  },
  killed: (o) => o.canonical === false,
});

await auditPolicy({
  id: "P1",
  description: "remove bounded outcome blocker from common release policy predicate",
  transform: (source) => replaceOnce(source,
    '  if (authority.state.outcome !== "bounded_qualification_supported") {\n    return "bounded_qualification_not_supported";\n  }\n',
    '  // MUTANT P1: headline outcome blocker removed.\n',
    "P1"),
  observe: async (registry) => ({
    natural_ci_adverse: disposition(evaluateWith(originalEvaluate, registry, naturalCiAdverse, REGRESSION_REVIEW_POLICY, contractDRoot)),
    natural_conformance_adverse: disposition(evaluateWith(originalEvaluate, registry, naturalConformanceAdverse, REGRESSION_REVIEW_POLICY, contractDRoot)),
    inconsistent_outcome_only: disposition(evaluateWith(originalEvaluate, registry, inconsistentOutcome, REGRESSION_REVIEW_POLICY, contractDRoot)),
  }),
  killedNatural: (o) => o.natural_ci_adverse === "clear" || o.natural_conformance_adverse === "clear",
  killedInconsistent: (o) => o.inconsistent_outcome_only === "clear",
});

await auditPolicy({
  id: "P2",
  description: "remove direct required-CI evidence status check",
  transform: (source) => replaceOnce(source,
    '  if (byId.get("required-ci")?.status !== "passed") {\n    return "required_ci_not_passed";\n  }\n',
    '  // MUTANT P2: direct required-CI check removed.\n',
    "P2"),
  observe: async (registry) => ({
    natural_ci_adverse: disposition(evaluateWith(originalEvaluate, registry, naturalCiAdverse, REGRESSION_REVIEW_POLICY, contractDRoot)),
    natural_ci_missing: disposition(evaluateWith(originalEvaluate, registry, naturalCiMissing, REGRESSION_REVIEW_POLICY, contractDRoot)),
    inconsistent_ci_only: disposition(evaluateWith(originalEvaluate, registry, inconsistentCi, REGRESSION_REVIEW_POLICY, contractDRoot)),
  }),
  killedNatural: (o) => o.natural_ci_adverse === "clear" || o.natural_ci_missing === "clear",
  killedInconsistent: (o) => o.inconsistent_ci_only === "clear",
});

await auditPolicy({
  id: "P3",
  description: "remove direct contract-first-conformance evidence status check",
  transform: (source) => replaceOnce(source,
    '  if (byId.get("contract-first-cli-conformance")?.status !== "passed") {\n    return "contract_first_conformance_not_passed";\n  }\n',
    '  // MUTANT P3: direct conformance check removed.\n',
    "P3"),
  observe: async (registry) => ({
    natural_conformance_adverse: disposition(evaluateWith(originalEvaluate, registry, naturalConformanceAdverse, REGRESSION_REVIEW_POLICY, contractDRoot)),
    natural_conformance_missing: disposition(evaluateWith(originalEvaluate, registry, naturalConformanceMissing, REGRESSION_REVIEW_POLICY, contractDRoot)),
    inconsistent_conformance_only: disposition(evaluateWith(originalEvaluate, registry, inconsistentConformance, REGRESSION_REVIEW_POLICY, contractDRoot)),
  }),
  killedNatural: (o) => o.natural_conformance_adverse === "clear" || o.natural_conformance_missing === "clear",
  killedInconsistent: (o) => o.inconsistent_conformance_only === "clear",
});

await auditPolicy({
  id: "P4",
  description: "remove independent-reproduction requirement from production-review policy",
  transform: (source) => replaceOnce(source,
    '  if (byId.get("independent-reproduction")?.status !== "passed") {\n',
    '  if (false) { // MUTANT P4: independent reproduction requirement bypassed\n',
    "P4"),
  observe: async (registry) => ({
    baseline_production: disposition(evaluateWith(originalEvaluate, registry, baseline, PRODUCTION_REVIEW_POLICY, contractDRoot)),
    reproduction_production: disposition(evaluateWith(originalEvaluate, registry, naturalReproduction, PRODUCTION_REVIEW_POLICY, contractDRoot)),
  }),
  killedNatural: (o) => o.baseline_production === "clear",
});

await auditPolicy({
  id: "P5",
  description: "make irrelevant residual evidence decision-bearing",
  transform: (source) => replaceOnce(source,
    '  return null;\n}\n\nfunction regressionMaintenanceReview',
    '  if (authority.state.residual.length > 0) {\n    return "unexpected_residual_evidence"; // MUTANT P5\n  }\n  return null;\n}\n\nfunction regressionMaintenanceReview',
    "P5"),
  observe: async (registry) => ({
    baseline_regression: disposition(evaluateWith(originalEvaluate, registry, baseline, REGRESSION_REVIEW_POLICY, contractDRoot)),
    irrelevant_regression: disposition(evaluateWith(originalEvaluate, registry, naturalIrrelevant, REGRESSION_REVIEW_POLICY, contractDRoot)),
    baseline_production: disposition(evaluateWith(originalEvaluate, registry, baseline, PRODUCTION_REVIEW_POLICY, contractDRoot)),
    irrelevant_production: disposition(evaluateWith(originalEvaluate, registry, naturalIrrelevant, PRODUCTION_REVIEW_POLICY, contractDRoot)),
  }),
  killedNatural: (o) => o.irrelevant_regression !== o.baseline_regression || o.irrelevant_production !== o.baseline_production,
});

const unexplained = results.filter((item) => item.classification === "SURVIVED_UNEXPLAINED");
const killed = results.filter((item) => item.classification === "KILLED");
const redundant = results.filter((item) => item.classification === "SURVIVED_NATURAL_REDUNDANT");

const result = {
  status: unexplained.length === 0 ? "PASS_WITH_REDUNDANCY_FINDING" : "INCONCLUSIVE_SURVIVING_MUTANTS",
  base_research_head: "a6328085fc3e634e57133c5e6c5fe4d345fb4d82",
  subject_science_head: "f73b24eaff7c71f19615b6ff2c090306b1f92c96",
  baseline_authority_sha256: baseline.sha,
  baseline_policy_a: core(originalA),
  baseline_policy_b: core(originalB),
  counts: {
    total: results.length,
    killed: killed.length,
    survived_natural_redundant: redundant.length,
    survived_unexplained: unexplained.length,
  },
  mutants: results,
  interpretation: {
    kernel_controls_kill_all_preregistered_load_bearing_faults: results.filter((item) => item.layer === "kernel").every((item) => item.classification === "KILLED"),
    downstream_release_policy_duplicates_some_upstream_assessment_semantics: ["P1", "P2", "P3"].every((id) => results.find((item) => item.id === id)?.classification === "SURVIVED_NATURAL_REDUNDANT"),
    independent_reproduction_is_naturally_decision_bearing_for_stricter_policy: results.find((item) => item.id === "P4")?.classification === "KILLED",
    irrelevant_residual_invariance_is_protected: results.find((item) => item.id === "P5")?.classification === "KILLED",
  },
  non_claims: [
    "inconsistent-authority probes are defense-in-depth controls, not producer-reachability claims",
    "redundant policy checks are not automatically bugs",
    "mutation PASS does not justify maintained kernel extraction",
  ],
};

writeFileSync(path.join(outDir, "MUTATION-RESULT.json"), canonicalBytes(result));
console.log(JSON.stringify(result, null, 2));

if (unexplained.length > 0) {
  process.exitCode = 2;
}
