import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import { sha256Bytes } from "../release-qualification-assessment-authority-kernel/canonical.mjs";
import { produceCanonicalAssessmentAuthority } from "../release-qualification-assessment-authority-kernel/producer.mjs";
import {
  REGRESSION_REVIEW_POLICY,
  RELEASE_POLICY_REGISTRY,
} from "../release-qualification-assessment-authority-kernel/releasePolicies.mjs";
import { projectDecision } from "../contract-c-adapter-projection-kernel/projectionKernel.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EXPECTED_KERNEL_SHA = "sha256:e12d53020b3a6a046f4ee7688db0a5ea5c5e0a63e758b1c1e5711e7b227759e3";

function parseArgs() {
  const values = new Map();
  for (let i = 2; i < process.argv.length; i += 2) values.set(process.argv[i], process.argv[i + 1]);
  for (const key of ["--contract-d-root", "--out"]) if (!values.get(key)) throw new Error(`missing ${key}`);
  return { contractDRoot: values.get("--contract-d-root"), outDir: values.get("--out") };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function authorityFromFixture(fixture) {
  const bytes = produceCanonicalAssessmentAuthority(fixture);
  const value = JSON.parse(bytes.toString("utf8"));
  return {
    bytes,
    value,
    sha: sha256Bytes(bytes),
    inputAuthority: {
      kind: "assessment_authority",
      id: value.authority.logical_id,
      immutable_id: sha256Bytes(bytes),
    },
    target: value.subject,
  };
}

function registryWith(evaluator) {
  const key = `${REGRESSION_REVIEW_POLICY.id}@${REGRESSION_REVIEW_POLICY.version}`;
  return new Map([[key, evaluator]]);
}

function wrappedTrustedRegistry() {
  const key = `${REGRESSION_REVIEW_POLICY.id}@${REGRESSION_REVIEW_POLICY.version}`;
  const trusted = RELEASE_POLICY_REGISTRY.get(key);
  assert.equal(typeof trusted, "function");
  return registryWith(({ authority }) => trusted(authority));
}

function evaluate({ authority, registry, contractDRoot }) {
  return projectDecision({
    admittedAuthority: authority.value,
    inputAuthority: authority.inputAuthority,
    resolvedTarget: { target: authority.target },
    policy: REGRESSION_REVIEW_POLICY,
    policyRegistry: registry,
    contractDAuthorityRoot: contractDRoot,
  });
}

function maliciousCompleted(disposition, reason) {
  return () => ({
    state: "completed",
    disposition,
    effect: { type: "task.dispatch", version: "1", params: {} },
    metadata: {
      reason_codes: [reason],
      diagnostics: { synthetic_policy_implementation_substitution: true },
    },
  });
}

function consume({ result, authority, contractDRoot }) {
  const payload = {
    decision: result.decision,
    expected: {
      input_authority: authority.inputAuthority,
      policy: REGRESSION_REVIEW_POLICY,
      target: authority.target,
      requested_operation: "task.dispatch",
      effect_params: {},
    },
  };
  const program = [
    "import json, sys",
    "root=sys.argv[1]",
    "sys.path.insert(0, root)",
    "from validators.contract_d_consume import ApplicabilityExpectation, consume",
    "p=json.loads(sys.stdin.read())",
    "e=p['expected']",
    "x=ApplicabilityExpectation(input_authority=e['input_authority'],policy=e['policy'],target=e['target'],requested_operation=e['requested_operation'],effect_params=e['effect_params'])",
    "print(json.dumps(consume(p['decision'],x),sort_keys=True))",
  ].join("\n");
  const proc = spawnSync("python3", ["-c", program, contractDRoot], {
    input: JSON.stringify(payload), encoding: "utf8", maxBuffer: 16 * 1024 * 1024,
  });
  assert.equal(proc.status, 0, proc.stderr || proc.stdout);
  return JSON.parse(proc.stdout);
}

function pairInvariants(a, b) {
  return {
    input_authority_equal: JSON.stringify(a.decision.input_authority) === JSON.stringify(b.decision.input_authority),
    target_equal: JSON.stringify(a.decision.target) === JSON.stringify(b.decision.target),
    policy_equal: JSON.stringify(a.decision.policy) === JSON.stringify(b.decision.policy),
    effect_type_equal: a.decision.effect?.type === b.decision.effect?.type,
    contract_d_bytes_differ: !a.bytes.equals(b.bytes),
  };
}

const { contractDRoot, outDir } = parseArgs();
mkdirSync(outDir, { recursive: true });

const kernelSource = readFileSync(path.resolve(HERE, "../contract-c-adapter-projection-kernel/projectionKernel.mjs"));
assert.equal(sha256Bytes(kernelSource), EXPECTED_KERNEL_SHA, "projection kernel drifted");
const policyModuleSource = readFileSync(path.resolve(HERE, "../release-qualification-assessment-authority-kernel/releasePolicies.mjs"));
const maintainedRuntimeSource = readFileSync(path.resolve(HERE, "../../src/contractCDecisionRuntime.js"), "utf8");
assert.match(maintainedRuntimeSource, /switch \(key\)/);
assert.doesNotMatch(maintainedRuntimeSource, /policyRegistry/);

const fixture = JSON.parse(readFileSync(path.resolve(HERE, "../release-qualification-assessment-authority-kernel/evidence.json"), "utf8"));
const baselineAuthority = authorityFromFixture(fixture);
const trustedRegistry = wrappedTrustedRegistry();

// Pair A: natural trusted CLEAR, alternate implementation under identical policy identity returns HOLD.
const trustedClear = evaluate({ authority: baselineAuthority, registry: trustedRegistry, contractDRoot });
assert.deepEqual(trustedClear.decision.evaluation, { state: "completed", disposition: "clear" });
const substitutedHold = evaluate({
  authority: baselineAuthority,
  registry: registryWith(maliciousCompleted("hold", "synthetic_same_id_substituted_hold")),
  contractDRoot,
});
assert.deepEqual(substitutedHold.decision.evaluation, { state: "completed", disposition: "hold" });
const pairA = pairInvariants(trustedClear, substitutedHold);
for (const [key, value] of Object.entries(pairA)) assert.equal(value, true, `pair A invariant failed: ${key}`);
const trustedClearConsumer = consume({ result: trustedClear, authority: baselineAuthority, contractDRoot });
const substitutedHoldConsumer = consume({ result: substitutedHold, authority: baselineAuthority, contractDRoot });
assert.equal(trustedClearConsumer.outcome, "candidate_for_authorization");
assert.equal(substitutedHoldConsumer.outcome, "hold");

// Pair B: produce an adverse authority once, then hold it byte-identical while only evaluator implementation changes.
const adverseFixture = clone(fixture);
const requiredCi = adverseFixture.observations.find((item) => item.id === "required-ci");
assert.ok(requiredCi);
requiredCi.conclusion = "failure";
const adverseAuthority = authorityFromFixture(adverseFixture);
assert.equal(adverseAuthority.value.state.outcome, "bounded_qualification_not_supported");
const trustedHold = evaluate({ authority: adverseAuthority, registry: trustedRegistry, contractDRoot });
assert.deepEqual(trustedHold.decision.evaluation, { state: "completed", disposition: "hold" });
const substitutedClear = evaluate({
  authority: adverseAuthority,
  registry: registryWith(maliciousCompleted("clear", "synthetic_same_id_substituted_clear")),
  contractDRoot,
});
assert.deepEqual(substitutedClear.decision.evaluation, { state: "completed", disposition: "clear" });
const pairB = pairInvariants(trustedHold, substitutedClear);
for (const [key, value] of Object.entries(pairB)) assert.equal(value, true, `pair B invariant failed: ${key}`);
const trustedHoldConsumer = consume({ result: trustedHold, authority: adverseAuthority, contractDRoot });
const substitutedClearConsumer = consume({ result: substitutedClear, authority: adverseAuthority, contractDRoot });
assert.equal(trustedHoldConsumer.outcome, "hold");
assert.equal(substitutedClearConsumer.outcome, "candidate_for_authorization");

writeFileSync(path.join(outDir, "pair-a-trusted-clear.contract-d.json"), trustedClear.bytes);
writeFileSync(path.join(outDir, "pair-a-substituted-hold.contract-d.json"), substitutedHold.bytes);
writeFileSync(path.join(outDir, "pair-b-trusted-hold.contract-d.json"), trustedHold.bytes);
writeFileSync(path.join(outDir, "pair-b-substituted-clear.contract-d.json"), substitutedClear.bytes);

const result = {
  status: "TRUST_BOUNDARY_IDENTIFIED",
  checkpoint: "same_policy_identity_evaluator_implementation_substitution",
  frozen_projection_kernel_sha256: EXPECTED_KERNEL_SHA,
  trusted_policy_module_sha256: sha256Bytes(policyModuleSource),
  maintained_runtime: {
    uses_hardwired_switch: true,
    accepts_policy_registry_parameter: false,
    production_vulnerability_claimed: false,
  },
  fixed_policy: REGRESSION_REVIEW_POLICY,
  pair_a: {
    authority_sha256: baselineAuthority.sha,
    invariants: pairA,
    trusted_disposition: trustedClear.decision.evaluation.disposition,
    substituted_disposition: substitutedHold.decision.evaluation.disposition,
    trusted_contract_d_sha256: sha256Bytes(trustedClear.bytes),
    substituted_contract_d_sha256: sha256Bytes(substitutedHold.bytes),
    trusted_consumer_outcome: trustedClearConsumer.outcome,
    substituted_consumer_outcome: substitutedHoldConsumer.outcome,
  },
  pair_b: {
    authority_sha256: adverseAuthority.sha,
    invariants: pairB,
    trusted_disposition: trustedHold.decision.evaluation.disposition,
    substituted_disposition: substitutedClear.decision.evaluation.disposition,
    trusted_contract_d_sha256: sha256Bytes(trustedHold.bytes),
    substituted_contract_d_sha256: sha256Bytes(substitutedClear.bytes),
    trusted_consumer_outcome: trustedHoldConsumer.outcome,
    substituted_consumer_outcome: substitutedClearConsumer.outcome,
  },
  observed: {
    exact_contract_d_accepts_multiple_decisions_for_same_authority_target_policy_identity_when_evaluator_changes: true,
    policy_id_version_alone_authenticates_evaluator_code: false,
    caller_controlled_registry_is_safe_generic_api: false,
  },
  supported_inference: "policy implementation dispatch is trusted Decision machinery and must not be caller-controlled at the generic projection seam",
  non_claims: [
    "this is not a demonstrated vulnerability in maintained Contract-C runtime",
    "this does not establish that Contract D must bind an evaluator code digest",
    "this does not authorize a Contract D revision",
    "this does not authorize maintained projection-kernel extraction",
  ],
};
writeFileSync(path.join(outDir, "RESULT.json"), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
