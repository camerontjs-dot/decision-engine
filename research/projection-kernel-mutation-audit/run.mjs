import assert from "node:assert/strict";
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { sha256Bytes } from "../release-qualification-assessment-authority-kernel/canonical.mjs";
import { produceCanonicalAssessmentAuthority } from "../release-qualification-assessment-authority-kernel/producer.mjs";
import {
  REGRESSION_REVIEW_POLICY,
  RELEASE_POLICY_REGISTRY,
} from "../release-qualification-assessment-authority-kernel/releasePolicies.mjs";
import { projectDecision as originalProjectDecision } from "../contract-c-adapter-projection-kernel/projectionKernel.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SUBJECT = path.resolve(HERE, "../contract-c-adapter-projection-kernel/projectionKernel.mjs");
const EXPECTED_SUBJECT_SHA = "sha256:e12d53020b3a6a046f4ee7688db0a5ea5c5e0a63e758b1c1e5711e7b227759e3";

function parseArgs() {
  const values = new Map();
  for (let i = 2; i < process.argv.length; i += 2) values.set(process.argv[i], process.argv[i + 1]);
  for (const key of ["--contract-d-root", "--out"]) {
    if (!values.get(key)) throw new Error(`missing ${key}`);
  }
  return { contractDRoot: values.get("--contract-d-root"), outDir: values.get("--out") };
}

function replaceOnce(source, needle, replacement, id) {
  const first = source.indexOf(needle);
  assert.notEqual(first, -1, `${id}: mutation anchor absent`);
  assert.equal(source.indexOf(needle, first + needle.length), -1, `${id}: mutation anchor not unique`);
  return source.slice(0, first) + replacement + source.slice(first + needle.length);
}

async function importMutant(source, id) {
  const temp = SUBJECT.replace(/\.mjs$/, `.__mutant_${id}__.mjs`);
  writeFileSync(temp, source);
  try {
    const mod = await import(`${pathToFileURL(temp).href}?mutation=${id}-${Date.now()}-${Math.random()}`);
    return { mod, temp };
  } catch (error) {
    try { unlinkSync(temp); } catch {}
    throw error;
  }
}

function cleanup(temp) {
  try { unlinkSync(temp); } catch {}
}

function catches(fn) {
  try {
    const value = fn();
    return { threw: false, code: null, value };
  } catch (error) {
    return { threw: true, code: error?.code ?? error?.name ?? "unknown_error", message: error?.message ?? String(error) };
  }
}

function wrapRegistry(registry) {
  return new Map([...registry.entries()].map(([key, evaluator]) => [key, ({ authority }) => evaluator(authority)]));
}

function core(result) {
  return {
    evaluation: result.decision.evaluation,
    effect: result.decision.effect,
    metadata: result.decision.metadata,
  };
}

function sameCore(a, b) {
  return JSON.stringify(core(a)) === JSON.stringify(core(b));
}

function domainNeutral(source) {
  const forbidden = [
    /\bcal\b/i,
    /contract[-_ ]?c\b/i,
    /\bproposition\b/i,
    /\bcontribution\b/i,
    /\bqualification\b/i,
    /\brelease\b/i,
    /\bgithub\b/i,
    /\bworkflow\b/i,
    /\bci\b/i,
    /\btask[-_ ]?result\b/i,
  ];
  return forbidden.every((regex) => !regex.test(source));
}

const { contractDRoot, outDir } = parseArgs();
mkdirSync(outDir, { recursive: true });

const source = readFileSync(SUBJECT, "utf8");
assert.equal(sha256Bytes(Buffer.from(source, "utf8")), EXPECTED_SUBJECT_SHA, "subject projection kernel drifted from PR #58 science artifact");
assert.equal(domainNeutral(source), true, "subject kernel already contains domain vocabulary");

const fixture = JSON.parse(readFileSync(path.resolve(HERE, "../release-qualification-assessment-authority-kernel/evidence.json"), "utf8"));
const authorityBytes = produceCanonicalAssessmentAuthority(fixture);
const authority = JSON.parse(authorityBytes.toString("utf8"));
const authoritySha = sha256Bytes(authorityBytes);
const inputAuthority = {
  kind: "assessment_authority",
  id: authority.authority.logical_id,
  immutable_id: authoritySha,
};
const resolvedTarget = { target: structuredClone(authority.subject) };
const policyRegistry = wrapRegistry(RELEASE_POLICY_REGISTRY);

function project(projectFn, overrides = {}) {
  return projectFn({
    admittedAuthority: overrides.admittedAuthority ?? authority,
    inputAuthority: overrides.inputAuthority ?? inputAuthority,
    resolvedTarget: overrides.resolvedTarget ?? resolvedTarget,
    policy: overrides.policy ?? REGRESSION_REVIEW_POLICY,
    policyRegistry: overrides.policyRegistry ?? policyRegistry,
    contractDAuthorityRoot: contractDRoot,
  });
}

const baseline = project(originalProjectDecision);
assert.deepEqual(baseline.decision.evaluation, { state: "completed", disposition: "clear" });
assert.equal(baseline.decision.effect.type, "task.dispatch");

const results = [];

async function audit({ id, description, transform, observe, classify }) {
  const mutated = transform(source);
  const { mod, temp } = await importMutant(mutated, id);
  try {
    const observation = await observe(mod.projectDecision);
    const classification = classify(observation);
    results.push({ id, description, classification, observation });
  } finally {
    cleanup(temp);
  }
}

await audit({
  id: "M1",
  description: "unknown policy falls back to first registered evaluator",
  transform: (s) => replaceOnce(
    s,
    '  const evaluator = policyRegistry.get(policyKey(policy));\n  if (typeof evaluator !== "function") {\n    fail("unknown_policy", `unknown policy ${policyKey(policy)}`);\n  }\n',
    '  const evaluator = policyRegistry.get(policyKey(policy)) ?? policyRegistry.values().next().value; // MUTANT M1\n',
    "M1",
  ),
  observe: async (fn) => catches(() => project(fn, { policy: { id: REGRESSION_REVIEW_POLICY.id, version: "research-unknown" } })),
  classify: (o) => o.threw ? "SURVIVED_UNEXPLAINED" : "KILLED",
});

await audit({
  id: "M2",
  description: "FAILED policy result carrying an effect is accepted",
  transform: (s) => replaceOnce(
    s,
    '    if (result.effect !== undefined) fail("invalid_policy_result", "failed result cannot carry effect");\n',
    '    // MUTANT M2: effect-bearing failed result accepted.\n',
    "M2",
  ),
  observe: async (fn) => {
    const registry = new Map([["mutation.failed-effect@1", () => ({
      state: "failed",
      effect: { type: "task.dispatch", version: "1", params: {} },
      metadata: { reason_codes: ["synthetic_failed"] },
    })]]);
    return catches(() => project(fn, { policy: { id: "mutation.failed-effect", version: "1" }, policyRegistry: registry }));
  },
  classify: (o) => o.threw ? "SURVIVED_UNEXPLAINED" : "KILLED",
});

await audit({
  id: "M3",
  description: "completed CLEAR/HOLD without effect bypasses kernel check",
  transform: (s) => replaceOnce(
    s,
    '  if (!plainObject(result.effect)) fail("invalid_policy_result", "completed result must carry effect");\n',
    '  // MUTANT M3: missing completed effect accepted by kernel.\n',
    "M3",
  ),
  observe: async (fn) => {
    const registry = new Map([["mutation.missing-effect@1", () => ({
      state: "completed",
      disposition: "clear",
      metadata: { reason_codes: ["synthetic_clear"] },
    })]]);
    return catches(() => project(fn, { policy: { id: "mutation.missing-effect", version: "1" }, policyRegistry: registry }));
  },
  classify: (o) => {
    if (!o.threw) return "KILLED";
    return o.code === "invalid_policy_result" ? "SURVIVED_UNEXPLAINED" : "SURVIVED_KERNEL_REDUNDANT_DOWNSTREAM";
  },
});

await audit({
  id: "M4",
  description: "metadata silently becomes disposition authority",
  transform: (s) => replaceOnce(
    s,
    '    evaluation: normalized.evaluation,\n',
    '    evaluation: normalized.metadata?.force_hold === true ? { state: "completed", disposition: "hold" } : normalized.evaluation, // MUTANT M4\n',
    "M4",
  ),
  observe: async (fn) => {
    const registry = new Map([["mutation.metadata-authority@1", () => ({
      state: "completed",
      disposition: "clear",
      effect: { type: "task.dispatch", version: "1", params: {} },
      metadata: { reason_codes: ["synthetic_clear"], force_hold: true },
    })]]);
    const original = project(originalProjectDecision, { policy: { id: "mutation.metadata-authority", version: "1" }, policyRegistry: registry });
    const mutant = project(fn, { policy: { id: "mutation.metadata-authority", version: "1" }, policyRegistry: registry });
    return { original: core(original), mutant: core(mutant), changed: !sameCore(original, mutant) };
  },
  classify: (o) => o.changed ? "KILLED" : "SURVIVED_UNEXPLAINED",
});

await audit({
  id: "M5",
  description: "input-authority immutable identity is substituted during Decision packaging",
  transform: (s) => replaceOnce(
    s,
    '    input_authority: structuredClone(inputAuthority),\n',
    `    input_authority: { ...structuredClone(inputAuthority), immutable_id: "sha256:${"0".repeat(64)}" }, // MUTANT M5\n`,
    "M5",
  ),
  observe: async (fn) => {
    const mutant = project(fn);
    return {
      exact_bytes_equal: mutant.bytes.equals(baseline.bytes),
      input_authority_equal: JSON.stringify(mutant.decision.input_authority) === JSON.stringify(baseline.decision.input_authority),
    };
  },
  classify: (o) => (!o.exact_bytes_equal && !o.input_authority_equal) ? "KILLED" : "SURVIVED_UNEXPLAINED",
});

await audit({
  id: "M6",
  description: "resolved target content identity is substituted during Decision packaging",
  transform: (s) => replaceOnce(
    s,
    '    target: structuredClone(resolvedTarget.target),\n',
    `    target: { ...structuredClone(resolvedTarget.target), content_sha256: "sha256:${"1".repeat(64)}" }, // MUTANT M6\n`,
    "M6",
  ),
  observe: async (fn) => {
    const mutant = project(fn);
    return {
      exact_bytes_equal: mutant.bytes.equals(baseline.bytes),
      target_equal: JSON.stringify(mutant.decision.target) === JSON.stringify(baseline.decision.target),
    };
  },
  classify: (o) => (!o.exact_bytes_equal && !o.target_equal) ? "KILLED" : "SURVIVED_UNEXPLAINED",
});

await audit({
  id: "M7",
  description: "exact Contract-D authority/canonicalization is bypassed",
  transform: (s) => replaceOnce(
    s,
    '  const bytes = canonicalizeContractDWithAuthority({ decision, contractDAuthorityRoot });\n',
    '  const bytes = Buffer.from(JSON.stringify(decision), "utf8"); // MUTANT M7\n',
    "M7",
  ),
  observe: async (fn) => {
    const mutant = project(fn);
    return { exact_bytes_equal: mutant.bytes.equals(baseline.bytes), mutant_sha256: sha256Bytes(mutant.bytes), baseline_sha256: sha256Bytes(baseline.bytes) };
  },
  classify: (o) => o.exact_bytes_equal ? "SURVIVED_UNEXPLAINED" : "KILLED",
});

await audit({
  id: "M8",
  description: "invalid completed disposition is coerced to HOLD",
  transform: (s) => {
    let out = replaceOnce(
      s,
      '  if (result.state !== "completed" || !["clear", "hold"].includes(result.disposition)) {\n    fail("invalid_policy_result", "completed result must have clear or hold disposition");\n  }\n',
      '  if (result.state !== "completed") fail("invalid_policy_result", "completed result required");\n  const coercedDisposition = ["clear", "hold"].includes(result.disposition) ? result.disposition : "hold"; // MUTANT M8\n',
      "M8a",
    );
    out = replaceOnce(
      out,
      '    evaluation: { state: "completed", disposition: result.disposition },\n',
      '    evaluation: { state: "completed", disposition: coercedDisposition },\n',
      "M8b",
    );
    return out;
  },
  observe: async (fn) => {
    const registry = new Map([["mutation.invalid-disposition@1", () => ({
      state: "completed",
      disposition: "maybe",
      effect: { type: "task.dispatch", version: "1", params: {} },
      metadata: { reason_codes: ["synthetic_maybe"] },
    })]]);
    return catches(() => project(fn, { policy: { id: "mutation.invalid-disposition", version: "1" }, policyRegistry: registry }));
  },
  classify: (o) => o.threw ? "SURVIVED_UNEXPLAINED" : "KILLED",
});

const domainMutant = `const CAL_DOMAIN_BRANCH = true;\n${source}`;
results.push({
  id: "M9",
  description: "generic kernel gains explicit domain branch vocabulary",
  classification: domainNeutral(domainMutant) ? "SURVIVED_UNEXPLAINED" : "KILLED",
  observation: { neutrality_guard_rejected: !domainNeutral(domainMutant) },
});

const unexplained = results.filter((item) => item.classification === "SURVIVED_UNEXPLAINED");
const redundant = results.filter((item) => item.classification === "SURVIVED_KERNEL_REDUNDANT_DOWNSTREAM");
const killed = results.filter((item) => item.classification === "KILLED");

const result = {
  status: unexplained.length === 0 ? "PASS" : "INCONCLUSIVE_SURVIVING_MUTANTS",
  subject_record_head: "00251c6d01a45f6cb14fc3d8ac4c7a4fb566f57c",
  subject_science_head: "33f39e88f0f94a13afe740d087e4896247695f79",
  subject_projection_kernel_sha256: EXPECTED_SUBJECT_SHA,
  exact_contract_d_authority: "298a1a0f7b7b6d7712e11200d04faec3e1ca169b",
  baseline_contract_d_sha256: sha256Bytes(baseline.bytes),
  counts: {
    total: results.length,
    killed: killed.length,
    survived_kernel_redundant_downstream: redundant.length,
    survived_unexplained: unexplained.length,
  },
  mutants: results,
  interpretation: {
    tested_projection_responsibilities_have_no_unexplained_survivors: unexplained.length === 0,
    domain_neutrality_guard_is_discriminating: results.find((item) => item.id === "M9")?.classification === "KILLED",
    completed_effect_check_may_be_redundantly_enforced_by_contract_d: results.find((item) => item.id === "M3")?.classification === "SURVIVED_KERNEL_REDUNDANT_DOWNSTREAM",
  },
  non_claims: [
    "mutation audit does not establish that the seam is the right abstraction",
    "mutation audit does not test domain-specific authority admission or target resolution",
    "mutation audit does not authorize maintained extraction",
  ],
};

writeFileSync(path.join(outDir, "MUTATION-RESULT.json"), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
if (unexplained.length > 0) process.exitCode = 2;
