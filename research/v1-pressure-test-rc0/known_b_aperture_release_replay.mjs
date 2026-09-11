import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const SUBJECT = process.env.DECISION_ENGINE_SUBJECT_DIR;
const CONTRACT_C_ROOT = process.env.APPARATUS_CONTRACT_C_DIR;
const CONTRACT_D_ROOT = process.env.APPARATUS_CONTRACT_D_DIR;
const PRIOR = process.env.PRIOR_B_APERTURE_DIR;
const OUTPUT_DIR = process.env.PRESSURE_OUTPUT_DIR || "build/v1-pressure-rc0";
const PYTHON = process.env.PYTHON || "python3";
for (const [name, value] of Object.entries({ SUBJECT, CONTRACT_C_ROOT, CONTRACT_D_ROOT, PRIOR })) {
  assert.ok(value, `${name} is required`);
}

const { evaluateContractCDecision } = await import(
  pathToFileURL(resolve(SUBJECT, "src/contractCDecisionRuntime.js"))
);
const { SUPPORTED_CLAIM_VERIFICATION_POLICY } = await import(
  pathToFileURL(resolve(SUBJECT, "src/contractCDecision.js"))
);
const { CAUSAL_BASIS_CITATION_POLICY, citationTargetForContractC } = await import(
  pathToFileURL(resolve(SUBJECT, "src/contractCBasisCitationDecision.js"))
);
const { canonicalizeContractDWithAuthority } = await import(
  pathToFileURL(resolve(SUBJECT, "src/contractDCanonicalOutput.js"))
);

const REAL_C_SHA = "sha256:c599e97fd5b4da80ae558d5d57a351fa3b2d37081432013a9dbeaae65a80b5a3";
const REAL_PROP_ID = "PIPELINE_SMOKE_001:child:1";
const fixturePath = resolve(PRIOR, "research/contract-b-internal-reference-binding/real-cal-supported-child-1.contract-c.json");
const indexPath = resolve(PRIOR, "research/contract-b-internal-reference-binding/real-contract-b-index.json");

function sha256Bare(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
function sha256(bytes) { return `sha256:${sha256Bare(bytes)}`; }
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
function proposition(value) {
  assert.equal(value.propositions.length, 1);
  return value.propositions[0];
}
function expectedB(value) { return structuredClone(value.input.contract_b); }
function claimContext(value) {
  const p = proposition(value);
  return {
    policy: { id: SUPPORTED_CLAIM_VERIFICATION_POLICY.id, version: SUPPORTED_CLAIM_VERIFICATION_POLICY.version },
    proposition_id: p.proposition.proposition_id,
    target: {
      kind: "claim",
      id: p.proposition.proposition_id,
      content_sha256: `sha256:${p.proposition.text_sha256}`,
    },
  };
}
function citationContext(value) {
  const p = proposition(value);
  const member = p.conclusion.basis_members.find((item) => item.namespace === "contribution");
  assert.ok(member);
  const target = citationTargetForContractC(value, p.proposition.proposition_id, member.id);
  assert.ok(target);
  return {
    policy: { id: CAUSAL_BASIS_CITATION_POLICY.id, version: CAUSAL_BASIS_CITATION_POLICY.version },
    proposition_id: p.proposition.proposition_id,
    contribution_id: member.id,
    target,
  };
}
function evaluate(fixture, context) {
  return evaluateContractCDecision({
    contractCBytes: fixture.bytes,
    expectedContractCSha256: fixture.sha,
    contractCAuthorityRoot: CONTRACT_C_ROOT,
    expectedContractB: expectedB(fixture.value),
    decisionContext: context,
    pythonExecutable: PYTHON,
  });
}
function canonicalD(decision) {
  return canonicalizeContractDWithAuthority({
    decision,
    contractDAuthorityRoot: CONTRACT_D_ROOT,
    pythonExecutable: PYTHON,
  });
}
function pair(fixture) {
  const claim = evaluate(fixture, claimContext(fixture.value));
  const citation = evaluate(fixture, citationContext(fixture.value));
  const claimBytes = canonicalD(claim);
  const citationBytes = canonicalD(citation);
  return {
    claim: { evaluation: claim.evaluation, immutable_id: claim.input_authority.immutable_id, d_sha256: sha256(claimBytes) },
    citation: { evaluation: citation.evaluation, immutable_id: citation.input_authority.immutable_id, d_sha256: sha256(citationBytes) },
  };
}
function indexedValidation(fixture) {
  const program = [
    "import json, sys",
    "root, expected, index_path = sys.argv[1], sys.argv[2], sys.argv[3]",
    "sys.path.insert(0, root)",
    "from validators.contract_c import validate_contract_c_bytes",
    "with open(index_path, 'r', encoding='utf-8') as f: index = json.load(f)",
    "raw = sys.stdin.buffer.read()",
    "errors = validate_contract_c_bytes(raw, expected_sha256=expected, contract_b_index=index)",
    "print(json.dumps({'errors': errors}, sort_keys=True))",
    "raise SystemExit(1 if errors else 0)",
  ].join("\n");
  const proc = spawnSync(PYTHON, ["-c", program, CONTRACT_C_ROOT, fixture.sha, indexPath], {
    input: fixture.bytes,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  if (proc.error) throw proc.error;
  const parsed = JSON.parse((proc.stdout || "{}").trim() || "{}");
  return { status: proc.status === 0 ? "PASS" : "FAIL", errors: parsed.errors ?? [] };
}

const raw = readFileSync(fixturePath);
assert.equal(sha256(raw), REAL_C_SHA);
const baseline = { value: JSON.parse(raw.toString("utf8")), bytes: raw, sha: REAL_C_SHA };
assert.equal(proposition(baseline.value).proposition.proposition_id, REAL_PROP_ID);
assert.equal(indexedValidation(baseline).status, "PASS");
const baselinePair = pair(baseline);
assert.deepEqual(baselinePair.claim.evaluation, { state: "completed", disposition: "clear" });
assert.deepEqual(baselinePair.citation.evaluation, { state: "completed", disposition: "clear" });

const variants = {};
function addVariant(name, mutate) {
  const value = structuredClone(baseline.value);
  mutate(value);
  const fixture = materialize(value);
  const indexed = indexedValidation(fixture);
  assert.equal(indexed.status, "FAIL", `${name}: exact indexed validation unexpectedly passed`);
  const maintained = pair(fixture);
  assert.deepEqual(maintained.claim.evaluation, { state: "completed", disposition: "clear" });
  assert.deepEqual(maintained.citation.evaluation, { state: "completed", disposition: "clear" });
  assert.equal(maintained.claim.immutable_id, fixture.sha);
  assert.equal(maintained.citation.immutable_id, fixture.sha);
  assert.notEqual(maintained.claim.d_sha256, baselinePair.claim.d_sha256);
  assert.notEqual(maintained.citation.d_sha256, baselinePair.citation.d_sha256);
  assert.deepEqual(fixture.value.input.contract_b, baseline.value.input.contract_b);
  variants[name] = {
    contract_c_sha256: fixture.sha,
    indexed_validation: indexed,
    released_v1_claim: maintained.claim,
    released_v1_citation: maintained.citation,
  };
}

addVariant("proposition_text_hash_substitution", (value) => {
  proposition(value).proposition.text_sha256 = "7".repeat(64);
});
addVariant("proposition_id_substitution", (value) => {
  proposition(value).proposition.proposition_id = "PIPELINE_SMOKE_001:child:ghost";
});
addVariant("evidence_passage_hash_substitution", (value) => {
  proposition(value).contributions[0].evidence_ref.passage_sha256 = `sha256:${"8".repeat(64)}`;
});
addVariant("evidence_source_id_substitution", (value) => {
  proposition(value).contributions[0].evidence_ref.source_id = "PIPE-SX";
});
addVariant("evidence_passage_id_substitution", (value) => {
  proposition(value).contributions[0].evidence_ref.passage_id = "PIPE-PX";
});

const result = {
  status: "PASS",
  classification: "KNOWN_AUTHORITY_APERTURE_REPRODUCED_ON_RELEASE_ARTIFACT",
  prior_science_head: "570104216ef104ea8d3ba00f9383402b9c2e3154",
  published_decision_engine_release: "7be709b2141c767c5da89b8b94cf90233c4238fe",
  baseline_contract_c_sha256: REAL_C_SHA,
  baseline_indexed_validation: "PASS",
  substitution_count: Object.keys(variants).length,
  all_substitutions_rejected_by_exact_indexed_c_validation: Object.values(variants).every((row) => row.indexed_validation.status === "FAIL"),
  all_substitutions_clear_under_released_v1_bundle_level_ingress: Object.values(variants).every(
    (row) => row.released_v1_claim.evaluation.disposition === "clear" && row.released_v1_citation.evaluation.disposition === "clear"
  ),
  changed_c_identity_propagates_to_d: true,
  interpretation: "The published v1.0.0 artifact reproduces the documented Contract-B internal-reference trust aperture: exact whole-object C identity plus exact bundle-level B binding do not independently re-establish proposition/evidence references against an exact Contract-B index.",
  defect_status: "KNOWN_RELEASE_LIMITATION_NOT_NEWLY_DISCOVERED",
  variants,
};
writeFileSync(resolve(OUTPUT_DIR, "known-contract-b-aperture-release-replay.json"), JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result));
