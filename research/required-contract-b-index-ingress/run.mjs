import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import {
  CAUSAL_BASIS_CITATION_POLICY,
  citationTargetForContractC,
} from "../../src/contractCBasisCitationDecision.js";
import { SUPPORTED_CLAIM_VERIFICATION_POLICY } from "../../src/contractCDecision.js";
import { ContractCDecisionError } from "../../src/contractCIngress.js";
import { canonicalizeContractDWithAuthority } from "../../src/contractDCanonicalOutput.js";
import { evaluateContractCDecisionWithRequiredIndex } from "./candidate-indexed-ingress.mjs";

const EXPECTED_REAL_C_SHA = "sha256:c599e97fd5b4da80ae558d5d57a351fa3b2d37081432013a9dbeaae65a80b5a3";
const EXPECTED_REAL_CLAIM_D_SHA = "sha256:db47ebc844c14aa28bbc02524684b1ea7e388e1f1eea7ee8cbc7153af7548200";
const EXPECTED_REAL_CITATION_D_SHA = "sha256:1f2ddf98a05d5772833984c3747e6cfda5ef7448d5580a73e077897e60cdfa5b";

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) out[argv[i]] = argv[i + 1];
  for (const flag of ["--contract-c-authority", "--contract-d-authority", "--fixture", "--contract-b-index"]) {
    assert.ok(out[flag], `${flag} is required`);
  }
  return out;
}

function sha256Id(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
  }
  return value;
}

function canonicalBytes(value) {
  return Buffer.from(JSON.stringify(sortValue(value)) + "\n", "utf8");
}

function materializeContractC(value) {
  const clone = structuredClone(value);
  delete clone.result_set_id;
  clone.result_set_id = `result-set:${createHash("sha256").update(canonicalBytes(clone)).digest("hex")}`;
  const bytes = canonicalBytes(clone);
  return { value: clone, bytes, sha: sha256Id(bytes) };
}

function fixtureFromBytes(bytes) {
  return { value: JSON.parse(bytes.toString("utf8")), bytes, sha: sha256Id(bytes) };
}

function claimContext(value) {
  const proposition = value.propositions[0];
  return {
    policy: {
      id: SUPPORTED_CLAIM_VERIFICATION_POLICY.id,
      version: SUPPORTED_CLAIM_VERIFICATION_POLICY.version,
    },
    proposition_id: proposition.proposition.proposition_id,
    target: {
      kind: "claim",
      id: proposition.proposition.proposition_id,
      content_sha256: `sha256:${proposition.proposition.text_sha256}`,
    },
  };
}

function citationContext(value) {
  const proposition = value.propositions[0];
  const contribution = proposition.contributions[0];
  const target = citationTargetForContractC(
    value,
    proposition.proposition.proposition_id,
    contribution.contribution_id,
  );
  assert.ok(target, "citation target must be derivable");
  return {
    policy: {
      id: CAUSAL_BASIS_CITATION_POLICY.id,
      version: CAUSAL_BASIS_CITATION_POLICY.version,
    },
    proposition_id: proposition.proposition.proposition_id,
    contribution_id: contribution.contribution_id,
    target,
  };
}

function evaluate({ fixture, indexBytes, expectedIndexSha, context, args }) {
  return evaluateContractCDecisionWithRequiredIndex({
    contractCBytes: fixture.bytes,
    expectedContractCSha256: fixture.sha,
    contractCAuthorityRoot: args["--contract-c-authority"],
    expectedContractB: structuredClone(fixture.value.input.contract_b),
    contractBIndexBytes: indexBytes,
    expectedContractBIndexSha256: expectedIndexSha,
    decisionContext: context,
    pythonExecutable: process.env.PYTHON || "python3",
  });
}

function expectCode(code, fn) {
  assert.throws(
    fn,
    (error) => error instanceof ContractCDecisionError && error.code === code,
    `expected ContractCDecisionError(${code})`,
  );
}

function mutateFixture(base, mutate) {
  const value = structuredClone(base.value);
  mutate(value);
  return materializeContractC(value);
}

const args = parseArgs(process.argv.slice(2));
const baseline = fixtureFromBytes(readFileSync(args["--fixture"]));
const exactIndexBytes = readFileSync(args["--contract-b-index"]);
const exactIndex = JSON.parse(exactIndexBytes.toString("utf8"));
const exactIndexSha = sha256Id(exactIndexBytes);

assert.equal(baseline.sha, EXPECTED_REAL_C_SHA, "real Contract C baseline drifted");
assert.deepEqual(
  {
    contract_version: exactIndex.contract_version,
    bundle_id: exactIndex.bundle_id,
    bundle_hash: exactIndex.bundle_hash,
  },
  baseline.value.input.contract_b,
  "real Contract B index top-level identity must match Contract C",
);

const claimDecision = evaluate({
  fixture: baseline,
  indexBytes: exactIndexBytes,
  expectedIndexSha: exactIndexSha,
  context: claimContext(baseline.value),
  args,
});
const citationDecision = evaluate({
  fixture: baseline,
  indexBytes: exactIndexBytes,
  expectedIndexSha: exactIndexSha,
  context: citationContext(baseline.value),
  args,
});
assert.deepEqual(claimDecision.evaluation, { state: "completed", disposition: "clear" });
assert.deepEqual(citationDecision.evaluation, { state: "completed", disposition: "clear" });

const canonicalClaimD = canonicalizeContractDWithAuthority({
  decision: claimDecision,
  contractDAuthorityRoot: args["--contract-d-authority"],
  pythonExecutable: process.env.PYTHON || "python3",
});
const canonicalCitationD = canonicalizeContractDWithAuthority({
  decision: citationDecision,
  contractDAuthorityRoot: args["--contract-d-authority"],
  pythonExecutable: process.env.PYTHON || "python3",
});
assert.equal(sha256Id(canonicalClaimD), EXPECTED_REAL_CLAIM_D_SHA, "claim Decision bytes changed");
assert.equal(sha256Id(canonicalCitationD), EXPECTED_REAL_CITATION_D_SHA, "citation Decision bytes changed");

const mutations = {
  proposition_text_hash_substitution: mutateFixture(baseline, (value) => {
    value.propositions[0].proposition.text_sha256 = "7".repeat(64);
  }),
  proposition_id_substitution: mutateFixture(baseline, (value) => {
    value.propositions[0].proposition.proposition_id = "PIPELINE_SMOKE_001:child:ghost";
  }),
  evidence_passage_hash_substitution: mutateFixture(baseline, (value) => {
    value.propositions[0].contributions[0].evidence_ref.passage_sha256 = `sha256:${"8".repeat(64)}`;
  }),
  evidence_source_id_substitution: mutateFixture(baseline, (value) => {
    value.propositions[0].contributions[0].evidence_ref.source_id = "PIPE-SX";
  }),
  evidence_passage_id_substitution: mutateFixture(baseline, (value) => {
    value.propositions[0].contributions[0].evidence_ref.passage_id = "PIPE-PX";
  }),
};

const mutationResults = {};
for (const [name, fixture] of Object.entries(mutations)) {
  expectCode("contract_c_indexed_validation_failed", () =>
    evaluate({
      fixture,
      indexBytes: exactIndexBytes,
      expectedIndexSha: exactIndexSha,
      context: claimContext(fixture.value),
      args,
    }),
  );
  expectCode("contract_c_indexed_validation_failed", () =>
    evaluate({
      fixture,
      indexBytes: exactIndexBytes,
      expectedIndexSha: exactIndexSha,
      context: citationContext(fixture.value),
      args,
    }),
  );
  mutationResults[name] = {
    contract_c_sha256: fixture.sha,
    exact_index_claim: "rejected_before_policy",
    exact_index_citation: "rejected_before_policy",
  };
}

expectCode("invalid_contract_b_index_transport", () =>
  evaluateContractCDecisionWithRequiredIndex({
    contractCBytes: baseline.bytes,
    expectedContractCSha256: baseline.sha,
    contractCAuthorityRoot: args["--contract-c-authority"],
    expectedContractB: structuredClone(baseline.value.input.contract_b),
    contractBIndexBytes: undefined,
    expectedContractBIndexSha256: exactIndexSha,
    decisionContext: claimContext(baseline.value),
  }),
);

expectCode("contract_b_index_whole_object_mismatch", () =>
  evaluate({
    fixture: baseline,
    indexBytes: exactIndexBytes,
    expectedIndexSha: `sha256:${"0".repeat(64)}`,
    context: claimContext(baseline.value),
    args,
  }),
);

// Load-bearing falsifier: construct a colluding index around a mutated C while
// copying the exact same top-level B identity. A fixed independently expected
// index digest must reject it before the released indexed validator can be fooled.
const colludingFixture = mutations.proposition_text_hash_substitution;
const colludingIndexValue = structuredClone(exactIndex);
colludingIndexValue.propositions[colludingFixture.value.propositions[0].proposition.proposition_id] =
  colludingFixture.value.propositions[0].proposition.text_sha256;
const colludingIndexBytes = canonicalBytes(colludingIndexValue);
const colludingIndexSha = sha256Id(colludingIndexBytes);
assert.notEqual(colludingIndexSha, exactIndexSha);
assert.deepEqual(
  {
    contract_version: colludingIndexValue.contract_version,
    bundle_id: colludingIndexValue.bundle_id,
    bundle_hash: colludingIndexValue.bundle_hash,
  },
  baseline.value.input.contract_b,
  "colluding index deliberately retains top-level B identity",
);
expectCode("contract_b_index_whole_object_mismatch", () =>
  evaluate({
    fixture: colludingFixture,
    indexBytes: colludingIndexBytes,
    expectedIndexSha: exactIndexSha,
    context: claimContext(colludingFixture.value),
    args,
  }),
);

// Negative control: if the same caller is allowed to declare a new digest for
// its colluding index, the released indexed validator correctly sees a
// self-consistent C+index pair and cannot know that the index was not derived
// from the exact B bundle. This is why the expected index digest must come from
// independent authority rather than from the candidate itself.
const selfDeclaredColludingDecision = evaluate({
  fixture: colludingFixture,
  indexBytes: colludingIndexBytes,
  expectedIndexSha: colludingIndexSha,
  context: claimContext(colludingFixture.value),
  args,
});
assert.deepEqual(selfDeclaredColludingDecision.evaluation, {
  state: "completed",
  disposition: "clear",
});

const result = {
  schema: "decision-engine-required-contract-b-index-ingress-v1",
  semantics: "AUTHORITY_BINDING_PROTOTYPE",
  production_change_authorized: false,
  exact_baseline: {
    contract_c_sha256: baseline.sha,
    contract_b: structuredClone(baseline.value.input.contract_b),
    contract_b_index_sha256: exactIndexSha,
    claim_contract_d_sha256: sha256Id(canonicalClaimD),
    citation_contract_d_sha256: sha256Id(canonicalCitationD),
    baseline_semantics_unchanged: true,
  },
  exact_index_mutation_matrix: mutationResults,
  transport_controls: {
    missing_index_rejected: true,
    wrong_index_digest_rejected: true,
  },
  colluding_index_falsifier: {
    top_level_contract_b_identity_unchanged: true,
    colluding_index_sha256: colludingIndexSha,
    fixed_independent_expected_index_sha_rejects: true,
    self_declared_colluding_index_sha_allows_self_consistent_pair: true,
    conclusion:
      "Index bytes are only authority-bearing if their expected digest is independently established; bundle ID/hash fields inside the index are insufficient by themselves.",
  },
  smallest_supported_candidate: {
    required_inputs: [
      "exact Contract C bytes",
      "external exact Contract C SHA-256",
      "exact released Contract C authority root",
      "expected Contract B version/bundle ID/bundle hash",
      "exact Contract B index bytes",
      "independently established exact Contract B index SHA-256",
    ],
    validator: "released Contract C 1.0.0 validate_contract_c_bytes(..., contract_b_index=index)",
    policy_semantics_changed: false,
    contract_d_schema_changed: false,
  },
  residual_boundary: {
    current_cal_rc0_receipt_contains_index_sha256: false,
    upstream_or_independent_index_identity_source_required: true,
  },
};

console.log(JSON.stringify(result, null, 2));
