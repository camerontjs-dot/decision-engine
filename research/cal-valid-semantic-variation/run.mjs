import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { evaluateContractCDecision } from "../../src/contractCDecisionRuntime.js";
import { SUPPORTED_CLAIM_VERIFICATION_POLICY } from "../../src/contractCDecision.js";
import {
  CAUSAL_BASIS_CITATION_POLICY,
  citationTargetForContractC,
} from "../../src/contractCBasisCitationDecision.js";
import { canonicalizeContractDWithAuthority } from "../../src/contractDCanonicalOutput.js";

function args(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) out[argv[i]] = argv[i + 1];
  for (const key of ["--pipeline-out", "--contract-c-authority", "--contract-d-authority"]) {
    if (!out[key]) throw new Error(`missing ${key}`);
  }
  return out;
}

function expect(value, message) {
  if (!value) throw new Error(message);
}

function sha256(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function policyIdentity(policy) {
  return { id: policy.id, version: policy.version };
}

const input = args(process.argv.slice(2));
const pipelineOut = resolve(input["--pipeline-out"]);
const contractCAuthorityRoot = resolve(input["--contract-c-authority"]);
const contractDAuthorityRoot = resolve(input["--contract-d-authority"]);
const receipt = JSON.parse(readFileSync(join(pipelineOut, "PIPELINE-RECEIPT.json"), "utf8"));

expect(receipt.pipeline_status === "PASS", "controlled CAL pipeline did not PASS");
expect(receipt.production_promotion_authorized === false, "unexpected upstream promotion authorization");

const expectedContractB = {
  contract_version: receipt.contract_b.validation.contract_version,
  bundle_id: receipt.contract_b.bundle_id,
  bundle_hash: receipt.contract_b.bundle_hash,
};

const child = receipt.cal.children.find((row) => row.proposition_id === "PIPELINE_SMOKE_001:child:1");
expect(child, "controlled child 1 missing");
expect(child.contract_c_validation.status === "PASS", "controlled child Contract C validation did not PASS");
expect(child.internal_cal_conclusion.disposition === "decided", "controlled child CAL did not decide");
expect(child.internal_cal_conclusion.verdict === "contradicted", `expected contradicted CAL verdict, got ${child.internal_cal_conclusion.verdict}`);
expect(child.contract_c_projection.contract_c_completion === "assessed", "controlled Contract C is not assessed");
expect(child.contract_c_projection.contract_c_reported_verdict === "contradicted", "controlled Contract C did not report contradicted");

const contractCPath = join(pipelineOut, child.contract_c_path);
const contractCBytes = readFileSync(contractCPath);
const contractC = JSON.parse(contractCBytes.toString("utf8"));
const exactContractCSha256 = sha256(contractCBytes);
const proposition = contractC.propositions.find((row) => row.proposition.proposition_id === child.proposition_id);
expect(proposition, "controlled proposition missing from Contract C");
expect(proposition.execution.state === "completed", "controlled proposition execution not completed");
expect(proposition.execution.completion === "assessed", "controlled proposition not assessed");
expect(proposition.conclusion.reported_verdict === "contradicted", "controlled proposition not contradicted");

const claimContext = {
  policy: policyIdentity(SUPPORTED_CLAIM_VERIFICATION_POLICY),
  proposition_id: child.proposition_id,
  target: {
    kind: "claim",
    id: child.proposition_id,
    content_sha256: `sha256:${child.claim_text_sha256}`,
  },
};
const claimDecision = evaluateContractCDecision({
  contractCBytes,
  expectedContractCSha256: exactContractCSha256,
  contractCAuthorityRoot,
  expectedContractB,
  decisionContext: claimContext,
});
expect(claimDecision.evaluation.state === "completed", "supported-claim policy did not complete");
expect(claimDecision.evaluation.disposition === "hold", `expected supported-claim HOLD, got ${claimDecision.evaluation.disposition}`);
expect(claimDecision.metadata.reason_codes.includes("contract_c_reported_verdict_not_supported"), "supported-claim HOLD reason mismatch");
const claimContractD = canonicalizeContractDWithAuthority({ decision: claimDecision, contractDAuthorityRoot });

const basisMembers = proposition.conclusion.basis_members.filter((member) => member.namespace === "contribution");
expect(basisMembers.length === 1, `expected exactly one deciding contribution, got ${basisMembers.length}`);
const contributionId = basisMembers[0].id;
const contribution = proposition.contributions.find((row) => row.contribution_id === contributionId);
expect(contribution, "deciding contribution missing");
expect(contribution.channel === "counterevidence", `expected Contract C counterevidence channel, got ${contribution.channel}`);
const citationTarget = citationTargetForContractC(contractC, child.proposition_id, contributionId);
expect(citationTarget, "could not derive citation target");

const citationDecision = evaluateContractCDecision({
  contractCBytes,
  expectedContractCSha256: exactContractCSha256,
  contractCAuthorityRoot,
  expectedContractB,
  decisionContext: {
    policy: policyIdentity(CAUSAL_BASIS_CITATION_POLICY),
    proposition_id: child.proposition_id,
    contribution_id: contributionId,
    target: citationTarget,
  },
});
expect(citationDecision.evaluation.state === "completed", "citation policy did not complete");
expect(citationDecision.evaluation.disposition === "clear", `expected citation CLEAR, got ${citationDecision.evaluation.disposition}`);
expect(citationDecision.metadata.reason_codes.includes("contract_c_contribution_in_causal_basis"), "citation CLEAR reason mismatch");
const citationContractD = canonicalizeContractDWithAuthority({ decision: citationDecision, contractDAuthorityRoot });

const result = {
  schema: "decision-engine-cal-valid-semantic-variation-v1",
  decision_engine_head: process.env.DECISION_ENGINE_RESEARCH_HEAD ?? null,
  upstream: {
    cal_head: process.env.CAL_HEAD ?? null,
    controlled_change: {
      proposition_id: child.proposition_id,
      field: "comparison_direction",
      baseline: "less_than",
      variant: "greater_than",
      held_fixed: ["claim_text", "admitted_evidence_world", "evidence_bundler_profile", "CAL semantic machinery", "Contract B/C authorities"],
    },
    contract_b: expectedContractB,
    contract_c_sha256: exactContractCSha256,
    cal_conclusion: child.internal_cal_conclusion,
    contract_c_projection: child.contract_c_projection,
  },
  observed: {
    supported_claim_policy: {
      evaluation: claimDecision.evaluation,
      reason_codes: claimDecision.metadata.reason_codes,
      effect: claimDecision.effect,
      contract_d_sha256: sha256(claimContractD),
    },
    causal_basis_citation_policy: {
      contribution_id: contributionId,
      contribution_channel: contribution.channel,
      evaluation: citationDecision.evaluation,
      reason_codes: citationDecision.metadata.reason_codes,
      effect: citationDecision.effect,
      contract_d_sha256: sha256(citationContractD),
    },
    policy_discrimination_observed:
      claimDecision.evaluation.disposition === "hold" && citationDecision.evaluation.disposition === "clear",
  },
  interpretation: "The same valid CAL-produced contradicted Contract C state is treated differently by the two maintained Decision policies because they answer different decision questions: whether a claim may receive a verified tag versus whether an exact deciding evidence link belongs in the causal basis.",
  nonclaims: [
    "The controlled target reversal is a research input intervention, not a claim about the real world changing.",
    "This does not establish generic counterfactual or causal reasoning.",
    "This does not establish source legitimacy or corpus completeness.",
    "This does not establish Authorization or execution.",
  ],
  production_promotion_authorized: false,
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
