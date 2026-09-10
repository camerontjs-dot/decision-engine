import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  CAUSAL_BASIS_CITATION_POLICY,
  citationTargetForContractC,
} from "../../src/contractCBasisCitationDecision.js";
import { SUPPORTED_CLAIM_VERIFICATION_POLICY } from "../../src/contractCDecision.js";
import { evaluateContractCDecision } from "../../src/contractCDecisionRuntime.js";
import { ContractCDecisionError } from "../../src/contractCIngress.js";
import { canonicalizeContractDWithAuthority } from "../../src/contractDCanonicalOutput.js";

const C_ROOT = process.env.APPARATUS_CONTRACT_C_DIR;
const D_ROOT = process.env.APPARATUS_CONTRACT_D_DIR;
const INPUT_DIR = process.env.NONCAL_C_INPUT_DIR;
const OUTPUT_DIR = process.env.NONCAL_DE_OUTPUT_DIR || "build/noncal-de";
const PYTHON = process.env.PYTHON || "python3";

assert.ok(C_ROOT, "APPARATUS_CONTRACT_C_DIR is required");
assert.ok(D_ROOT, "APPARATUS_CONTRACT_D_DIR is required");
assert.ok(INPUT_DIR, "NONCAL_C_INPUT_DIR is required");

const contractCBytes = readFileSync(resolve(INPUT_DIR, "contract-c.json"));
const contractC = JSON.parse(contractCBytes.toString("utf8"));
const contractCSha = readFileSync(resolve(INPUT_DIR, "contract-c.sha256"), "utf8").trim();
const expectedContractB = JSON.parse(readFileSync(resolve(INPUT_DIR, "expected-contract-b.json"), "utf8"));

assert.equal(`sha256:${createHash("sha256").update(contractCBytes).digest("hex")}`, contractCSha);
assert.equal(contractC.contract_c_version, "1.0.0");
assert.notEqual(contractC.producer.policy.canonical.id, "cal");

mkdirSync(OUTPUT_DIR, { recursive: true });

function claimTarget(proposition) {
  return {
    kind: "claim",
    id: proposition.proposition.proposition_id,
    content_sha256: `sha256:${proposition.proposition.text_sha256}`,
  };
}

function evaluate(policy, extraContext) {
  return evaluateContractCDecision({
    contractCBytes,
    expectedContractCSha256: contractCSha,
    contractCAuthorityRoot: C_ROOT,
    expectedContractB,
    decisionContext: {
      policy: { id: policy.id, version: policy.version },
      ...extraContext,
    },
    pythonExecutable: PYTHON,
  });
}

function canonical(decision) {
  return canonicalizeContractDWithAuthority({
    decision,
    contractDAuthorityRoot: D_ROOT,
    pythonExecutable: PYTHON,
  });
}

const byId = new Map(contractC.propositions.map((row) => [row.proposition.proposition_id, row]));
const childIds = ["C01_DIRECT:child:1", "C01_DIRECT:child:2"];
const outputs = {};

for (const propositionId of childIds) {
  const proposition = byId.get(propositionId);
  assert.ok(proposition, `missing independent producer proposition ${propositionId}`);
  assert.deepEqual(proposition.execution, { state: "completed", completion: "assessed" });
  assert.equal(proposition.conclusion.reported_verdict, "supported");
  assert.equal(proposition.contributions.length, 1);
  assert.equal(proposition.contributions[0].channel, "support");

  const verifyDecision = evaluate(SUPPORTED_CLAIM_VERIFICATION_POLICY, {
    proposition_id: propositionId,
    target: claimTarget(proposition),
  });
  assert.deepEqual(verifyDecision.evaluation, { state: "completed", disposition: "clear" });
  assert.equal(verifyDecision.effect.type, "knowledge.add_verified_tag");
  assert.equal(verifyDecision.input_authority.immutable_id, contractCSha);
  const verifyBytes = canonical(verifyDecision);

  const contribution = proposition.contributions[0];
  const citationTarget = citationTargetForContractC(
    contractC,
    propositionId,
    contribution.contribution_id,
  );
  assert.ok(citationTarget);
  const citeDecision = evaluate(CAUSAL_BASIS_CITATION_POLICY, {
    proposition_id: propositionId,
    contribution_id: contribution.contribution_id,
    target: citationTarget,
  });
  assert.deepEqual(citeDecision.evaluation, { state: "completed", disposition: "clear" });
  assert.equal(citeDecision.effect.type, "knowledge.cite_as_evidence");
  assert.equal(citeDecision.input_authority.immutable_id, contractCSha);
  const citeBytes = canonical(citeDecision);

  // Determinism under identical independent-producer input.
  assert.deepEqual(
    canonical(evaluate(SUPPORTED_CLAIM_VERIFICATION_POLICY, {
      proposition_id: propositionId,
      target: claimTarget(proposition),
    })),
    verifyBytes,
  );

  outputs[propositionId] = {
    verification: verifyDecision,
    verification_sha256: `sha256:${createHash("sha256").update(verifyBytes).digest("hex")}`,
    citation: citeDecision,
    citation_sha256: `sha256:${createHash("sha256").update(citeBytes).digest("hex")}`,
  };
  writeFileSync(resolve(OUTPUT_DIR, `${propositionId.replaceAll(":", "-")}.verification.contract-d.json`), verifyBytes);
  writeFileSync(resolve(OUTPUT_DIR, `${propositionId.replaceAll(":", "-")}.citation.contract-d.json`), citeBytes);
}

const rootId = "C01_DIRECT:root";
const root = byId.get(rootId);
assert.ok(root);
assert.deepEqual(root.execution, { state: "completed", completion: "not_checkable" });
assert.equal(root.conclusion.reported_verdict, "not_checkable");
assert.equal(root.contributions.length, 0);

const rootDecision = evaluate(SUPPORTED_CLAIM_VERIFICATION_POLICY, {
  proposition_id: rootId,
  target: claimTarget(root),
});
assert.deepEqual(rootDecision.evaluation, { state: "completed", disposition: "hold" });
assert.deepEqual(rootDecision.metadata.reason_codes, ["contract_c_proposition_not_checkable"]);
const rootBytes = canonical(rootDecision);
writeFileSync(resolve(OUTPUT_DIR, "C01_DIRECT-root.verification.contract-d.json"), rootBytes);

// Exact target substitution remains fail-closed against the non-CAL producer.
let substitutionCode = null;
try {
  evaluate(SUPPORTED_CLAIM_VERIFICATION_POLICY, {
    proposition_id: childIds[0],
    target: {
      ...claimTarget(byId.get(childIds[0])),
      content_sha256: `sha256:${"0".repeat(64)}`,
    },
  });
} catch (error) {
  assert.ok(error instanceof ContractCDecisionError);
  substitutionCode = error.code;
}
assert.equal(substitutionCode, "target_binding_mismatch");

const summary = {
  status: "PASS",
  producer_policy: contractC.producer.policy.canonical.id,
  producer_semantic_implementation_sha: contractC.producer.semantic_implementation_sha,
  contract_c_sha256: contractCSha,
  atomic_supported_claims: childIds,
  supported_claim_policy_clear_for_atomic: true,
  causal_basis_citation_clear_for_atomic: true,
  out_of_scope_compound_root: rootId,
  out_of_scope_root_holds_not_checkable: true,
  target_substitution_rejected: true,
  target_substitution_code: substitutionCode,
  identical_input_contract_d_deterministic: true,
  exact_contract_d_authority_validated: true,
  authorization_performed: false,
  execution_performed: false,
  outputs,
};
writeFileSync(resolve(OUTPUT_DIR, "de-summary.json"), JSON.stringify(summary, null, 2) + "\n", "utf8");
console.log(JSON.stringify(summary));
