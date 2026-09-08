import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { evaluateContractCDecision } from "../../src/contractCDecisionRuntime.js";
import { SUPPORTED_CLAIM_VERIFICATION_POLICY } from "../../src/contractCDecision.js";
import { citationTargetForContractC } from "../../src/contractCBasisCitationDecision.js";
import { canonicalizeContractDWithAuthority } from "../../src/contractDCanonicalOutput.js";

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) out[argv[i]] = argv[i + 1];
  for (const key of ["--pipeline-out", "--contract-c-authority", "--contract-d-authority"]) {
    if (!out[key]) throw new Error(`missing ${key}`);
  }
  return out;
}
function expect(v, m) { if (!v) throw new Error(m); }
function sha256(bytes) { return `sha256:${createHash("sha256").update(bytes).digest("hex")}`; }
function policyIdentity(policy) { return { id: policy.id, version: policy.version }; }

const args = parseArgs(process.argv.slice(2));
const pipelineOut = resolve(args["--pipeline-out"]);
const contractCAuthorityRoot = resolve(args["--contract-c-authority"]);
const contractDAuthorityRoot = resolve(args["--contract-d-authority"]);
const receipt = JSON.parse(readFileSync(join(pipelineOut, "PIPELINE-RECEIPT.json"), "utf8"));

expect(receipt.pipeline_status === "PASS", "controlled pipeline did not PASS");
expect(receipt.production_promotion_authorized === false, "upstream unexpectedly authorizes promotion");
const child = receipt.cal.children.find((row) => row.proposition_id === "PIPELINE_SMOKE_001:child:1");
expect(child, "child 1 missing");
expect(child.contract_c_validation.status === "PASS", "Contract C validation did not PASS");
expect(child.internal_cal_conclusion.disposition === "abstained", `expected CAL abstained, got ${child.internal_cal_conclusion.disposition}`);
expect(child.internal_cal_conclusion.verdict === "not_checkable", `expected not_checkable, got ${child.internal_cal_conclusion.verdict}`);

const expectedContractB = {
  contract_version: receipt.contract_b.validation.contract_version,
  bundle_id: receipt.contract_b.bundle_id,
  bundle_hash: receipt.contract_b.bundle_hash,
};
const contractCPath = join(pipelineOut, child.contract_c_path);
const contractCBytes = readFileSync(contractCPath);
const contractC = JSON.parse(contractCBytes.toString("utf8"));
const exactContractCSha256 = sha256(contractCBytes);
const proposition = contractC.propositions.find((row) => row.proposition.proposition_id === child.proposition_id);
expect(proposition, "Contract C proposition missing");
expect(proposition.conclusion.reported_verdict === "not_checkable", `expected Contract C not_checkable, got ${proposition.conclusion.reported_verdict}`);

const claimDecision = evaluateContractCDecision({
  contractCBytes,
  expectedContractCSha256: exactContractCSha256,
  contractCAuthorityRoot,
  expectedContractB,
  decisionContext: {
    policy: policyIdentity(SUPPORTED_CLAIM_VERIFICATION_POLICY),
    proposition_id: child.proposition_id,
    target: {
      kind: "claim",
      id: child.proposition_id,
      content_sha256: `sha256:${child.claim_text_sha256}`,
    },
  },
});
expect(claimDecision.evaluation.state === "completed", `expected completed Decision evaluation, got ${claimDecision.evaluation.state}`);
expect(claimDecision.evaluation.disposition === "hold", `expected HOLD, got ${claimDecision.evaluation.disposition}`);
expect(
  claimDecision.metadata.reason_codes.includes("contract_c_reported_verdict_not_supported"),
  `unexpected HOLD reason: ${claimDecision.metadata.reason_codes.join(",")}`,
);
const claimContractD = canonicalizeContractDWithAuthority({ decision: claimDecision, contractDAuthorityRoot });

const basisContributions = proposition.conclusion.basis_members.filter((member) => member.namespace === "contribution");
expect(basisContributions.length === 0, `expected no deciding contribution basis, got ${basisContributions.length}`);
const contributions = proposition.contributions ?? [];
const derivedCitationTargets = contributions
  .map((contribution) => citationTargetForContractC(contractC, child.proposition_id, contribution.contribution_id))
  .filter(Boolean);
expect(derivedCitationTargets.length === 0, `expected no citable contribution target, got ${derivedCitationTargets.length}`);

const stage = child.stages?.[0] ?? null;
const result = {
  schema: "decision-engine-cal-valid-abstention-v1",
  decision_engine_head: process.env.DECISION_ENGINE_RESEARCH_HEAD ?? null,
  upstream: {
    cal_head: process.env.CAL_HEAD ?? null,
    controlled_admission_change: {
      proposition_id: child.proposition_id,
      baseline_accepted: ["PIPE-P1"],
      variant_accepted: ["PIPE-P3"],
      baseline_rejected: ["PIPE-P3"],
      variant_rejected: ["PIPE-P1"],
      note: "P3 states only that Women and Men appeared in a report and contains no strict comparison.",
    },
    contract_b: expectedContractB,
    contract_c_sha256: exactContractCSha256,
    cal_conclusion: child.internal_cal_conclusion,
    contract_c_projection: child.contract_c_projection,
    measurement_status: stage?.measurement?.status ?? null,
    failure_category: stage?.failure_category ?? null,
  },
  observed: {
    supported_claim_policy: {
      evaluation: claimDecision.evaluation,
      reason_codes: claimDecision.metadata.reason_codes,
      effect: claimDecision.effect,
      contract_d_sha256: sha256(claimContractD),
    },
    causal_basis: {
      basis_contribution_count: basisContributions.length,
      contribution_count: contributions.length,
      derived_citation_target_count: derivedCitationTargets.length,
    },
    safe_no_positive_decision_surface:
      claimDecision.evaluation.disposition === "hold" && derivedCitationTargets.length === 0,
  },
  interpretation: "A valid CAL abstention remains a Decision HOLD for claim verification and exposes no exact contribution target that the maintained causal-basis citation helper can nominate as deciding evidence.",
  nonclaims: [
    "This does not establish that every CAL abstention has zero residual contributions.",
    "This does not establish source legitimacy or corpus completeness.",
    "This does not establish Authorization or execution.",
  ],
  production_promotion_authorized: false,
};
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
