import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { evaluateContractCDecision } from "../../src/contractCDecisionRuntime.js";
import { SUPPORTED_CLAIM_VERIFICATION_POLICY } from "../../src/contractCDecision.js";
import {
  CAUSAL_BASIS_CITATION_POLICY,
  citationTargetForContractC,
} from "../../src/contractCBasisCitationDecision.js";
import { ContractCDecisionError } from "../../src/contractCIngress.js";
import { canonicalizeContractDWithAuthority } from "../../src/contractDCanonicalOutput.js";

const REAL_C_SHA = "sha256:c599e97fd5b4da80ae558d5d57a351fa3b2d37081432013a9dbeaae65a80b5a3";
const EXPECTED_SEMANTIC_SHA = "4b9d69936d8ecdbaac0217561be7a3a821b70522";
const EXPECTED_POLICY_SHA = "e9c1db9e5bf3cb0bfb50f2f3615e89054fa2781c99e464b0d50b6adf0e24117b";
const ALT_SEMANTIC_SHA = "f".repeat(40);
const PROP_ID = "PIPELINE_SMOKE_001:child:1";

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) out[argv[i]] = argv[i + 1];
  for (const key of ["--contract-c-authority", "--contract-d-authority", "--fixture"]) {
    if (!out[key]) throw new Error(`missing ${key}`);
  }
  return out;
}
function expect(v, m) { if (!v) throw new Error(m); }
function sha256(bytes) { return `sha256:${createHash("sha256").update(bytes).digest("hex")}`; }
function sha256Bare(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
  }
  return value;
}
function canonicalBytes(value) { return Buffer.from(JSON.stringify(sortValue(value)) + "\n", "utf8"); }
function materialize(value) {
  const clone = structuredClone(value);
  delete clone.result_set_id;
  clone.result_set_id = `result-set:${sha256Bare(canonicalBytes(clone))}`;
  const bytes = canonicalBytes(clone);
  return { value: clone, bytes, sha: sha256(bytes) };
}
function prop(value) {
  const p = value.propositions.find((row) => row.proposition.proposition_id === PROP_ID);
  expect(p, "target proposition missing");
  return p;
}
function expectedB(value) { return structuredClone(value.input.contract_b); }
function claimContext(value) {
  const p = prop(value);
  return {
    policy: { id: SUPPORTED_CLAIM_VERIFICATION_POLICY.id, version: SUPPORTED_CLAIM_VERIFICATION_POLICY.version },
    proposition_id: PROP_ID,
    target: { kind: "claim", id: PROP_ID, content_sha256: `sha256:${p.proposition.text_sha256}` },
  };
}
function basisId(value) {
  const member = prop(value).conclusion.basis_members.find((m) => m.namespace === "contribution");
  expect(member, "basis contribution missing");
  return member.id;
}
function citationContext(value) {
  const id = basisId(value);
  const target = citationTargetForContractC(value, PROP_ID, id);
  expect(target, "citation target missing");
  return {
    policy: { id: CAUSAL_BASIS_CITATION_POLICY.id, version: CAUSAL_BASIS_CITATION_POLICY.version },
    proposition_id: PROP_ID,
    contribution_id: id,
    target,
  };
}
function evaluate(fixture, authorityC, context) {
  return evaluateContractCDecision({
    contractCBytes: fixture.bytes,
    expectedContractCSha256: fixture.sha,
    contractCAuthorityRoot: authorityC,
    expectedContractB: expectedB(fixture.value),
    decisionContext: context,
  });
}
function canonicalD(decision, authorityD) {
  return canonicalizeContractDWithAuthority({ decision, contractDAuthorityRoot: authorityD });
}
function evalPair(fixture, authorityC, authorityD) {
  const claim = evaluate(fixture, authorityC, claimContext(fixture.value));
  const citation = evaluate(fixture, authorityC, citationContext(fixture.value));
  const claimBytes = canonicalD(claim, authorityD);
  const citationBytes = canonicalD(citation, authorityD);
  return {
    claim: {
      evaluation: claim.evaluation,
      reason_codes: claim.metadata.reason_codes,
      immutable_id: claim.input_authority.immutable_id,
      contract_d_sha256: sha256(claimBytes),
    },
    citation: {
      evaluation: citation.evaluation,
      reason_codes: citation.metadata.reason_codes,
      immutable_id: citation.input_authority.immutable_id,
      contract_d_sha256: sha256(citationBytes),
    },
  };
}
function expectClearPair(pair, name) {
  expect(pair.claim.evaluation.state === "completed" && pair.claim.evaluation.disposition === "clear", `${name}: claim not CLEAR`);
  expect(pair.citation.evaluation.state === "completed" && pair.citation.evaluation.disposition === "clear", `${name}: citation not CLEAR`);
}
function expectError(code, fn) {
  let observed = null;
  try { fn(); }
  catch (error) {
    if (error instanceof ContractCDecisionError) observed = error.code;
    else throw error;
  }
  expect(observed === code, `expected ${code}, got ${observed}`);
  return observed;
}
function policyHash(value) { return sha256Bare(canonicalBytes(value)); }
function replacePolicy(value) {
  const canonical = structuredClone(value.producer.policy.canonical);
  canonical.profile_id = "alternate-cal-profile-authority-probe";
  canonical.decision_semantics = "alternate_producer_semantics_probe";
  canonical.thresholds = [{ kind: "probe-only", value: 0.75 }];
  value.producer.policy.canonical = canonical;
  value.producer.policy.sha256 = policyHash(canonical);
}
function guards(value) {
  const semanticMatch = value.producer.semantic_implementation_sha === EXPECTED_SEMANTIC_SHA;
  const policyMatch = value.producer.policy.sha256 === EXPECTED_POLICY_SHA;
  return {
    exact_semantic_implementation_pin: semanticMatch ? "clear" : "hold",
    exact_producer_policy_pin: policyMatch ? "clear" : "hold",
    both_exact_pins: semanticMatch && policyMatch ? "clear" : "hold",
  };
}

const args = parseArgs(process.argv.slice(2));
const authorityC = resolve(args["--contract-c-authority"]);
const authorityD = resolve(args["--contract-d-authority"]);
const raw = readFileSync(resolve(args["--fixture"]));
expect(sha256(raw) === REAL_C_SHA, `real baseline SHA drift: ${sha256(raw)}`);
const base = { value: JSON.parse(raw.toString("utf8")), bytes: raw, sha: REAL_C_SHA };
expect(base.value.producer.semantic_implementation_sha === EXPECTED_SEMANTIC_SHA, "semantic implementation baseline drift");
expect(base.value.producer.policy.sha256 === EXPECTED_POLICY_SHA, "producer policy baseline drift");

const semanticOnlyValue = structuredClone(base.value);
semanticOnlyValue.producer.semantic_implementation_sha = ALT_SEMANTIC_SHA;
const semanticOnly = materialize(semanticOnlyValue);

const policyOnlyValue = structuredClone(base.value);
replacePolicy(policyOnlyValue);
const policyOnly = materialize(policyOnlyValue);

const bothValue = structuredClone(base.value);
bothValue.producer.semantic_implementation_sha = ALT_SEMANTIC_SHA;
replacePolicy(bothValue);
const both = materialize(bothValue);

const invalidPolicyHashValue = structuredClone(base.value);
invalidPolicyHashValue.producer.policy.canonical.profile_id = "changed-without-hash-update";
const invalidPolicyHash = materialize(invalidPolicyHashValue);

const variants = {
  baseline: base,
  semantic_implementation_substitution: semanticOnly,
  producer_policy_substitution: policyOnly,
  both_substituted: both,
};
const results = {};
for (const [name, fixture] of Object.entries(variants)) {
  const pair = evalPair(fixture, authorityC, authorityD);
  expectClearPair(pair, name);
  results[name] = {
    contract_c_sha256: fixture.sha,
    semantic_implementation_sha: fixture.value.producer.semantic_implementation_sha,
    producer_policy_sha256: fixture.value.producer.policy.sha256,
    producer_policy_canonical: structuredClone(fixture.value.producer.policy.canonical),
    maintained: pair,
    counterfactual_identity_guards: guards(fixture.value),
  };
}

expect(results.baseline.counterfactual_identity_guards.exact_semantic_implementation_pin === "clear", "semantic pin changed baseline");
expect(results.baseline.counterfactual_identity_guards.exact_producer_policy_pin === "clear", "policy pin changed baseline");
expect(results.baseline.counterfactual_identity_guards.both_exact_pins === "clear", "both pins changed baseline");
expect(results.semantic_implementation_substitution.counterfactual_identity_guards.exact_semantic_implementation_pin === "hold", "semantic pin did not catch semantic substitution");
expect(results.semantic_implementation_substitution.counterfactual_identity_guards.exact_producer_policy_pin === "clear", "policy pin should not catch semantic-only substitution");
expect(results.producer_policy_substitution.counterfactual_identity_guards.exact_semantic_implementation_pin === "clear", "semantic pin should not catch policy-only substitution");
expect(results.producer_policy_substitution.counterfactual_identity_guards.exact_producer_policy_pin === "hold", "policy pin did not catch policy substitution");
expect(results.both_substituted.counterfactual_identity_guards.both_exact_pins === "hold", "combined guard did not catch both substitution");

for (const name of ["semantic_implementation_substitution", "producer_policy_substitution", "both_substituted"]) {
  expect(results[name].maintained.claim.immutable_id === results[name].contract_c_sha256, `${name}: claim input authority did not bind exact changed C`);
  expect(results[name].maintained.citation.immutable_id === results[name].contract_c_sha256, `${name}: citation input authority did not bind exact changed C`);
  expect(results[name].maintained.claim.contract_d_sha256 !== results.baseline.maintained.claim.contract_d_sha256, `${name}: claim Contract D bytes replayed baseline`);
  expect(results[name].maintained.citation.contract_d_sha256 !== results.baseline.maintained.citation.contract_d_sha256, `${name}: citation Contract D bytes replayed baseline`);
}

const invalidPolicyHashError = expectError("contract_c_validation_failed", () =>
  evaluate(invalidPolicyHash, authorityC, claimContext(invalidPolicyHash.value)),
);

const result = {
  schema: "decision-engine-contract-c-producer-authority-binding-v1",
  semantics: "AUTHORITY_SCOPE_COUNTERFACTUAL",
  world_causal_claim: false,
  exact_baseline: {
    source_pr: 41,
    contract_c_sha256: REAL_C_SHA,
    semantic_implementation_sha: EXPECTED_SEMANTIC_SHA,
    producer_policy_sha256: EXPECTED_POLICY_SHA,
  },
  observed_variants: results,
  negative_control: {
    producer_policy_changed_without_hash_update: invalidPolicyHashError,
  },
  discriminating_result: {
    maintained_policies_clear_all_contract_c_valid_producer_identity_substitutions: true,
    changed_contract_c_identity_propagates_into_contract_d: true,
    semantic_implementation_and_policy_identity_are_independent_guard_dimensions: true,
    one_single_identity_pin_is_insufficient_for_both_substitution_classes: true,
    both_exact_pins_preserve_real_baseline_and_reject_all_tested_identity_substitutions: true,
  },
  interpretation:
    "Maintained DE currently treats exact Contract C validity and whole-object authority as sufficient without separately allowlisting the producer semantic implementation or producer policy identity. Contract C enforces producer-policy self-consistency but not a specific producer identity. If the verified-tag/citation policies are intended to be valid only for the tested CAL RC0 producer semantics, both producer identity dimensions are currently outside the Decision predicate. If the intended architecture is deliberately producer-agnostic across all Contract-C-valid producers, the observed invariance is expected rather than a defect.",
  maintained_change_authorized: false,
  alternate_producer_legitimacy_claimed: false,
};
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
