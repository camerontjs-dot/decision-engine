import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { evaluateContractCDecision } from "../../src/contractCDecisionRuntime.js";
import { SUPPORTED_CLAIM_VERIFICATION_POLICY } from "../../src/contractCDecision.js";
import {
  CAUSAL_BASIS_CITATION_POLICY,
  citationTargetForContractC,
} from "../../src/contractCBasisCitationDecision.js";
import { ContractCDecisionError } from "../../src/contractCIngress.js";
import { canonicalizeContractDWithAuthority } from "../../src/contractDCanonicalOutput.js";

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) out[argv[i]] = argv[i + 1];
  for (const key of ["--pipeline-out", "--contract-c-authority", "--contract-d-authority"]) {
    if (!out[key]) throw new Error(`missing ${key}`);
  }
  return out;
}
function expect(value, message) { if (!value) throw new Error(message); }
function sha256(bytes) { return `sha256:${createHash("sha256").update(bytes).digest("hex")}`; }
function policyIdentity(policy) { return { id: policy.id, version: policy.version }; }
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
function materialize(value) {
  const clone = structuredClone(value);
  delete clone.result_set_id;
  clone.result_set_id = `result-set:${createHash("sha256").update(canonicalBytes(clone)).digest("hex")}`;
  const bytes = canonicalBytes(clone);
  return { value: clone, bytes, sha: sha256(bytes) };
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

const args = parseArgs(process.argv.slice(2));
const pipelineOut = resolve(args["--pipeline-out"]);
const contractCAuthorityRoot = resolve(args["--contract-c-authority"]);
const contractDAuthorityRoot = resolve(args["--contract-d-authority"]);
const receipt = JSON.parse(readFileSync(join(pipelineOut, "PIPELINE-RECEIPT.json"), "utf8"));
expect(receipt.pipeline_status === "PASS", "controlled mixed pipeline did not PASS");
expect(receipt.production_promotion_authorized === false, "upstream unexpectedly authorizes promotion");

const child = receipt.cal.children.find((row) => row.proposition_id === "PIPELINE_SMOKE_001:child:1");
expect(child, "child 1 missing");
expect(child.contract_c_validation.status === "PASS", "Contract C validation did not PASS");
expect(child.internal_cal_conclusion.disposition === "abstained", `expected mixed CAL abstention, got ${child.internal_cal_conclusion.disposition}`);
expect(child.internal_cal_conclusion.verdict === null, `expected null mixed verdict, got ${child.internal_cal_conclusion.verdict}`);
expect(child.internal_cal_conclusion.reason_code === "mixed_categorical_relations", `expected mixed_categorical_relations, got ${child.internal_cal_conclusion.reason_code}`);
expect(child.contract_c_projection.contract_c_completion === "not_checkable", `expected not_checkable projection, got ${child.contract_c_projection.contract_c_completion}`);
expect(child.contract_c_projection.contract_c_reported_verdict === "not_checkable", `expected not_checkable verdict, got ${child.contract_c_projection.contract_c_reported_verdict}`);

const stageRelations = (child.stages ?? []).map((stage) => stage.categorical_relation?.relation).filter(Boolean).sort();
expect(JSON.stringify(stageRelations) === JSON.stringify(["REFUTES", "SUPPORTS"]), `expected warranted support+refute stages, got ${JSON.stringify(stageRelations)}`);
for (const stage of child.stages ?? []) {
  expect(stage.categorical_relation?.warranted === true, `stage ${stage.passage_id} was not warranted`);
}

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
expect(proposition.execution.state === "completed", "Contract C proposition not completed");
expect(proposition.execution.completion === "not_checkable", `expected not_checkable, got ${proposition.execution.completion}`);
expect(proposition.conclusion.reported_verdict === "not_checkable", "mixed Contract C did not report not_checkable");
expect(proposition.contributions.length === 2, `expected two contributions, got ${proposition.contributions.length}`);
expect(proposition.conclusion.basis_members.length === 0, `expected no basis members, got ${proposition.conclusion.basis_members.length}`);
expect(proposition.conclusion.residual_contribution_ids.length === 2, `expected two residual contributions, got ${proposition.conclusion.residual_contribution_ids.length}`);
expect(new Set(proposition.contributions.map((c) => c.channel)).size === 2, "expected support and counterevidence channels");

function claimContext() {
  return {
    policy: policyIdentity(SUPPORTED_CLAIM_VERIFICATION_POLICY),
    proposition_id: child.proposition_id,
    target: {
      kind: "claim",
      id: child.proposition_id,
      content_sha256: `sha256:${child.claim_text_sha256}`,
    },
  };
}
function citationContext(contributionId) {
  const target = citationTargetForContractC(contractC, child.proposition_id, contributionId);
  expect(target, `missing citation target for ${contributionId}`);
  return {
    policy: policyIdentity(CAUSAL_BASIS_CITATION_POLICY),
    proposition_id: child.proposition_id,
    contribution_id: contributionId,
    target,
  };
}
function evaluate(context, overrides = {}) {
  return evaluateContractCDecision({
    contractCBytes,
    expectedContractCSha256: exactContractCSha256,
    contractCAuthorityRoot,
    expectedContractB,
    decisionContext: context,
    ...overrides,
  });
}

const claimDecision = evaluate(claimContext());
expect(claimDecision.evaluation.state === "completed" && claimDecision.evaluation.disposition === "hold", "mixed claim did not HOLD");
expect(claimDecision.metadata.reason_codes[0] === "contract_c_proposition_not_checkable", `unexpected mixed claim reason ${claimDecision.metadata.reason_codes}`);
const claimD = canonicalizeContractDWithAuthority({ decision: claimDecision, contractDAuthorityRoot });

const citationDecisions = [];
for (const contribution of proposition.contributions) {
  const context = citationContext(contribution.contribution_id);
  const decision = evaluate(context);
  expect(decision.evaluation.state === "completed" && decision.evaluation.disposition === "hold", `mixed citation ${contribution.contribution_id} did not HOLD`);
  expect(decision.metadata.reason_codes[0] === "contract_c_proposition_not_checkable", `unexpected mixed citation reason ${decision.metadata.reason_codes}`);
  const contractD = canonicalizeContractDWithAuthority({ decision, contractDAuthorityRoot });
  citationDecisions.push({
    contribution_id: contribution.contribution_id,
    channel: contribution.channel,
    evaluation: decision.evaluation,
    reason_codes: decision.metadata.reason_codes,
    contract_d_sha256: sha256(contractD),
  });
}

const attacks = {};
attacks.wrong_contract_c_digest = expectError("contract_c_whole_object_mismatch", () =>
  evaluate(claimContext(), { expectedContractCSha256: `sha256:${"0".repeat(64)}` }),
);
const wrongB = structuredClone(expectedContractB);
wrongB.bundle_hash = `sha256:${"1".repeat(64)}`;
attacks.wrong_contract_b_binding = expectError("contract_b_binding_mismatch", () =>
  evaluate(claimContext(), { expectedContractB: wrongB }),
);
const wrongClaimTarget = claimContext();
wrongClaimTarget.target.content_sha256 = `sha256:${"2".repeat(64)}`;
attacks.wrong_claim_target = expectError("target_binding_mismatch", () => evaluate(wrongClaimTarget));

const c0 = proposition.contributions[0];
const c1 = proposition.contributions[1];
const wrongCitationTarget = citationContext(c0.contribution_id);
wrongCitationTarget.target.content_sha256 = `sha256:${"3".repeat(64)}`;
attacks.wrong_citation_target = expectError("target_binding_mismatch", () => evaluate(wrongCitationTarget));

const replay = citationContext(c0.contribution_id);
replay.contribution_id = c1.contribution_id;
attacks.cross_contribution_target_replay = expectError("target_binding_mismatch", () => evaluate(replay));

const missingPropId = "PIPELINE_SMOKE_001:child:missing";
const missingPropDecision = evaluate({
  policy: policyIdentity(SUPPORTED_CLAIM_VERIFICATION_POLICY),
  proposition_id: missingPropId,
  target: { kind: "claim", id: missingPropId, content_sha256: `sha256:${"4".repeat(64)}` },
});
expect(missingPropDecision.evaluation.state === "failed", "missing proposition did not fail evaluation");
expect(!("effect" in missingPropDecision), "missing proposition unexpectedly carried an effect");
expect(missingPropDecision.metadata.reason_codes[0] === "target_proposition_not_found", "wrong missing proposition reason");
attacks.missing_proposition = "evaluation.failed/target_proposition_not_found";

const missingContributionId = `contribution:${"5".repeat(64)}`;
const missingContributionDecision = evaluate({
  policy: policyIdentity(CAUSAL_BASIS_CITATION_POLICY),
  proposition_id: child.proposition_id,
  contribution_id: missingContributionId,
  target: {
    kind: "claim-evidence-link",
    id: `claim-evidence-link:${child.proposition_id}:${missingContributionId}`,
    content_sha256: `sha256:${"6".repeat(64)}`,
  },
});
expect(missingContributionDecision.evaluation.state === "failed", "missing contribution did not fail evaluation");
expect(!("effect" in missingContributionDecision), "missing contribution unexpectedly carried an effect");
expect(missingContributionDecision.metadata.reason_codes[0] === "target_contribution_not_found", "wrong missing contribution reason");
attacks.missing_contribution = "evaluation.failed/target_contribution_not_found";

const wrongPolicy = claimContext();
wrongPolicy.policy.version = "9.9.9";
attacks.unsupported_policy = expectError("unsupported_policy", () => evaluate(wrongPolicy));
attacks.wrong_authority_root = expectError("authority_identity_mismatch", () =>
  evaluate(claimContext(), { contractCAuthorityRoot: contractDAuthorityRoot }),
);

const invalidValue = structuredClone(contractC);
invalidValue.propositions[0].conclusion.reported_verdict = "supported";
const invalid = materialize(invalidValue);
attacks.semantic_invalid_contract_c = expectError("contract_c_validation_failed", () =>
  evaluateContractCDecision({
    contractCBytes: invalid.bytes,
    expectedContractCSha256: invalid.sha,
    contractCAuthorityRoot,
    expectedContractB,
    decisionContext: claimContext(),
  }),
);

const result = {
  schema: "decision-engine-adversarial-state-matrix-v1",
  decision_engine_head: process.env.DECISION_ENGINE_RESEARCH_HEAD ?? null,
  upstream: {
    cal_head: process.env.CAL_HEAD ?? null,
    contract_b: expectedContractB,
    contract_c_sha256: exactContractCSha256,
    internal_cal_conclusion: child.internal_cal_conclusion,
    contract_c_projection: child.contract_c_projection,
    stage_relations: stageRelations,
    contribution_channels: proposition.contributions.map((c) => c.channel).sort(),
    contribution_count: proposition.contributions.length,
    basis_member_count: proposition.conclusion.basis_members.length,
    residual_contribution_count: proposition.conclusion.residual_contribution_ids.length,
  },
  observed: {
    claim_policy: {
      evaluation: claimDecision.evaluation,
      reason_codes: claimDecision.metadata.reason_codes,
      contract_d_sha256: sha256(claimD),
    },
    citation_policy: citationDecisions,
    attacks,
    all_positive_surfaces_closed:
      claimDecision.evaluation.disposition === "hold" &&
      citationDecisions.every((row) => row.evaluation.disposition === "hold"),
  },
  interpretation:
    "A CAL-produced mixed warranted support/refutation state remains not_checkable at Contract C and cannot be flattened by Decision Engine into a verified claim or a deciding-evidence citation. Exact-object, binding, target, replay, policy, authority, and semantic-invalid mutations fail closed.",
  production_promotion_authorized: false,
};
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
