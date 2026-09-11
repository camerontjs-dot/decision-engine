import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  CAUSAL_BASIS_CITATION_POLICY,
  citationTargetForContractC,
  decideContractCBasisCitationToContractD,
} from "../../src/contractCBasisCitationDecision.js";

function sha256(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

const [contractPath, authorityRoot, outputPath] = process.argv.slice(2);
assert.ok(contractPath && authorityRoot && outputPath, "usage: node de_probe.mjs <contract-c> <authority-root> <output>");

const contractCBytes = readFileSync(resolve(contractPath));
const contractC = JSON.parse(contractCBytes.toString("utf8"));
const proposition = contractC.propositions[0];
assert.equal(proposition.execution.completion, "not_checkable");
assert.equal(proposition.contributions.length, 2);
assert.equal(proposition.conclusion.basis_members.length, 0);
assert.equal(proposition.conclusion.residual_contribution_ids.length, 2);

const contributionId = proposition.conclusion.residual_contribution_ids[0];
const target = citationTargetForContractC(
  contractC,
  proposition.proposition.proposition_id,
  contributionId,
);
assert.ok(target);

const decision = decideContractCBasisCitationToContractD({
  contractCBytes,
  expectedContractCSha256: sha256(contractCBytes),
  contractCAuthorityRoot: resolve(authorityRoot),
  expectedContractB: contractC.input.contract_b,
  decisionContext: {
    policy: {
      id: CAUSAL_BASIS_CITATION_POLICY.id,
      version: CAUSAL_BASIS_CITATION_POLICY.version,
    },
    proposition_id: proposition.proposition.proposition_id,
    contribution_id: contributionId,
    target,
  },
  pythonExecutable: process.env.PYTHON || "python3",
});

assert.deepEqual(decision.evaluation, { state: "completed", disposition: "hold" });
assert.deepEqual(decision.metadata.reason_codes, ["contract_c_proposition_not_checkable"]);

const result = {
  schema: "decision-engine-cal-residual-reachability-v1",
  contract_c_sha256: sha256(contractCBytes),
  proposition_completion: proposition.execution.completion,
  contribution_count: proposition.contributions.length,
  basis_member_count: proposition.conclusion.basis_members.length,
  residual_contribution_count: proposition.conclusion.residual_contribution_ids.length,
  tested_contribution_id: contributionId,
  decision: {
    evaluation: decision.evaluation,
    reason_codes: decision.metadata.reason_codes,
  },
  residual_specific_reason_reached: decision.metadata.reason_codes.includes(
    "contract_c_contribution_residual_non_deciding",
  ),
  interpretation:
    "The CAL multi-deciding projection is valid Contract C but not assessed, so the maintained Decision policy HOLDs on proposition completion before residual-specific basis membership can discriminate the contribution.",
  production_promotion_authorized: false,
};

writeFileSync(resolve(outputPath), JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result, null, 2));
