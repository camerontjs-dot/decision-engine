import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

import { evaluateContractCDecision } from "../../src/contractCDecisionRuntime.js";
import { SUPPORTED_CLAIM_VERIFICATION_POLICY } from "../../src/contractCDecision.js";
import {
  CAUSAL_BASIS_CITATION_POLICY,
  citationTargetForContractC,
} from "../../src/contractCBasisCitationDecision.js";
import { canonicalizeContractDWithAuthority } from "../../src/contractDCanonicalOutput.js";

const REAL_C_SHA = "sha256:c599e97fd5b4da80ae558d5d57a351fa3b2d37081432013a9dbeaae65a80b5a3";
const REAL_PROP_ID = "PIPELINE_SMOKE_001:child:1";

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) out[argv[i]] = argv[i + 1];
  for (const key of ["--contract-c-authority", "--contract-d-authority", "--fixture", "--contract-b-index"]) {
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
    return Object.fromEntries(Object.keys(value).sort().map((k) => [k, sortValue(value[k])]));
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
  expect(Array.isArray(value.propositions) && value.propositions.length === 1, "expected one proposition");
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
  const member = p.conclusion.basis_members.find((m) => m.namespace === "contribution");
  expect(member, "basis contribution missing");
  const target = citationTargetForContractC(value, p.proposition.proposition_id, member.id);
  expect(target, "citation target missing");
  return {
    policy: { id: CAUSAL_BASIS_CITATION_POLICY.id, version: CAUSAL_BASIS_CITATION_POLICY.version },
    proposition_id: p.proposition.proposition_id,
    contribution_id: member.id,
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
function pair(fixture, authorityC, authorityD) {
  const claim = evaluate(fixture, authorityC, claimContext(fixture.value));
  const citation = evaluate(fixture, authorityC, citationContext(fixture.value));
  const claimD = canonicalizeContractDWithAuthority({ decision: claim, contractDAuthorityRoot: authorityD });
  const citationD = canonicalizeContractDWithAuthority({ decision: citation, contractDAuthorityRoot: authorityD });
  return {
    claim: {
      evaluation: claim.evaluation,
      reason_codes: claim.metadata.reason_codes,
      immutable_id: claim.input_authority.immutable_id,
      contract_d_sha256: sha256(claimD),
    },
    citation: {
      evaluation: citation.evaluation,
      reason_codes: citation.metadata.reason_codes,
      immutable_id: citation.input_authority.immutable_id,
      contract_d_sha256: sha256(citationD),
    },
  };
}
function expectClearPair(value, name) {
  expect(value.claim.evaluation.state === "completed" && value.claim.evaluation.disposition === "clear", `${name}: claim not CLEAR`);
  expect(value.citation.evaluation.state === "completed" && value.citation.evaluation.disposition === "clear", `${name}: citation not CLEAR`);
}
function indexedValidation(fixture, authorityC, indexPath) {
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
  const proc = spawnSync("python3", ["-c", program, authorityC, fixture.sha, indexPath], {
    input: fixture.bytes,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  if (proc.error) throw proc.error;
  const parsed = JSON.parse((proc.stdout || "{}").trim() || "{}");
  return { status: proc.status === 0 ? "PASS" : "FAIL", errors: parsed.errors ?? [], returncode: proc.status };
}

const args = parseArgs(process.argv.slice(2));
const authorityC = resolve(args["--contract-c-authority"]);
const authorityD = resolve(args["--contract-d-authority"]);
const indexPath = resolve(args["--contract-b-index"]);
const raw = readFileSync(resolve(args["--fixture"]));
expect(sha256(raw) === REAL_C_SHA, `baseline C SHA drift: ${sha256(raw)}`);
const base = { value: JSON.parse(raw.toString("utf8")), bytes: raw, sha: REAL_C_SHA };
expect(proposition(base.value).proposition.proposition_id === REAL_PROP_ID, "baseline proposition drift");

const baselineIndexed = indexedValidation(base, authorityC, indexPath);
expect(baselineIndexed.status === "PASS", `baseline indexed validation failed: ${baselineIndexed.errors}`);
const baselinePair = pair(base, authorityC, authorityD);
expectClearPair(baselinePair, "baseline");

const variants = {};
function addVariant(name, mutator) {
  const value = structuredClone(base.value);
  mutator(value);
  const fixture = materialize(value);
  const indexed = indexedValidation(fixture, authorityC, indexPath);
  expect(indexed.status === "FAIL", `${name}: exact indexed validation unexpectedly PASS`);
  const maintained = pair(fixture, authorityC, authorityD);
  expectClearPair(maintained, name);
  expect(maintained.claim.immutable_id === fixture.sha && maintained.citation.immutable_id === fixture.sha, `${name}: changed C identity not bound into D`);
  expect(maintained.claim.contract_d_sha256 !== baselinePair.claim.contract_d_sha256, `${name}: claim D replayed baseline bytes`);
  expect(maintained.citation.contract_d_sha256 !== baselinePair.citation.contract_d_sha256, `${name}: citation D replayed baseline bytes`);
  variants[name] = {
    contract_c_sha256: fixture.sha,
    input_contract_b: structuredClone(fixture.value.input.contract_b),
    proposition: structuredClone(proposition(fixture.value).proposition),
    evidence_ref: structuredClone(proposition(fixture.value).contributions[0].evidence_ref),
    exact_indexed_validation: indexed,
    maintained_de: maintained,
    research_full_index_guard: "hold",
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

const expectedBinding = base.value.input.contract_b;
for (const [name, row] of Object.entries(variants)) {
  expect(JSON.stringify(row.input_contract_b) === JSON.stringify(expectedBinding), `${name}: top-level Contract B binding drifted`);
}

const result = {
  schema: "decision-engine-contract-b-internal-reference-binding-v1",
  semantics: "AUTHORITY_APERTURE_PROBE",
  exact_baseline: {
    source_pr: 41,
    contract_c_sha256: REAL_C_SHA,
    contract_b: structuredClone(base.value.input.contract_b),
    indexed_validation: baselineIndexed,
    maintained_de: baselinePair,
    research_full_index_guard: "clear",
  },
  variants,
  discriminating_result: {
    maintained_de_accepts_all_tested_no_index_valid_reference_substitutions: true,
    released_contract_c_validator_with_exact_b_index_rejects_all_tested_substitutions: true,
    bundle_level_contract_b_binding_unchanged_in_all_variants: true,
    changed_contract_c_identity_propagates_into_contract_d: true,
    exact_b_index_is_sufficient_to_discriminate_all_tested_internal_reference_substitutions: true,
  },
  interpretation:
    "Maintained DE establishes exact Contract C whole-object identity and exact Contract B bundle-level identity, but it does not independently establish the proposition/evidence reference relation from C into that B bundle because it invokes the released Contract C validator without the optional exact Contract B index. The released validator can establish that relation when given the index. Whether DE should require that stronger validation depends on whether downstream Decision is meant to trust a separately assured C artifact or re-establish C-to-B reference integrity itself.",
  maintained_change_authorized: false,
};
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
