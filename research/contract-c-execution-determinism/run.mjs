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

const CANONICAL_C_SHA = "sha256:7a66583e332be4901d13ba9f2d7e12419938c77a41b83223a4b0946ad529b7a1";
const PROP_ID = "clm-md";

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) out[argv[i]] = argv[i + 1];
  for (const key of ["--contract-c-authority", "--contract-d-authority"]) {
    if (!out[key]) throw new Error(`missing ${key}`);
  }
  return out;
}
function expect(value, message) { if (!value) throw new Error(message); }
function sha256(bytes) { return `sha256:${createHash("sha256").update(bytes).digest("hex")}`; }
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
function policyIdentity(policy) { return { id: policy.id, version: policy.version }; }
function expectedB(value) { return structuredClone(value.input.contract_b); }
function proposition(value) {
  const row = value.propositions.find((item) => item.proposition.proposition_id === PROP_ID);
  expect(row, `${PROP_ID} missing`);
  return row;
}
function claimContext(value, reordered = false) {
  const p = proposition(value);
  const target = {
    kind: "claim",
    id: PROP_ID,
    content_sha256: `sha256:${p.proposition.text_sha256}`,
  };
  if (reordered) {
    return {
      target: { content_sha256: target.content_sha256, id: target.id, kind: target.kind },
      proposition_id: PROP_ID,
      policy: { version: SUPPORTED_CLAIM_VERIFICATION_POLICY.version, id: SUPPORTED_CLAIM_VERIFICATION_POLICY.id },
    };
  }
  return {
    policy: policyIdentity(SUPPORTED_CLAIM_VERIFICATION_POLICY),
    proposition_id: PROP_ID,
    target,
  };
}
function basisContributionId(value) {
  const p = proposition(value);
  const member = p.conclusion?.basis_members?.find((item) => item.namespace === "contribution");
  expect(member, "basis contribution missing");
  return member.id;
}
function citationContext(value, contributionId = basisContributionId(value), reordered = false) {
  const target = citationTargetForContractC(value, PROP_ID, contributionId);
  expect(target, `citation target missing for ${contributionId}`);
  if (reordered) {
    return {
      target: { content_sha256: target.content_sha256, id: target.id, kind: target.kind },
      contribution_id: contributionId,
      proposition_id: PROP_ID,
      policy: { version: CAUSAL_BASIS_CITATION_POLICY.version, id: CAUSAL_BASIS_CITATION_POLICY.id },
    };
  }
  return {
    policy: policyIdentity(CAUSAL_BASIS_CITATION_POLICY),
    proposition_id: PROP_ID,
    contribution_id: contributionId,
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
function evaluateAndCanonicalize(fixture, authorityC, authorityD, context) {
  const decision = evaluate(fixture, authorityC, context);
  const bytes = canonicalD(decision, authorityD);
  return { decision, bytes, sha: sha256(bytes) };
}
function assertHold(result, reason) {
  expect(result.decision.evaluation.state === "completed", `expected completed evaluation for ${reason}`);
  expect(result.decision.evaluation.disposition === "hold", `expected HOLD for ${reason}`);
  expect(result.decision.metadata.reason_codes[0] === reason, `expected ${reason}, got ${result.decision.metadata.reason_codes}`);
}
function summary(result) {
  return {
    evaluation: result.decision.evaluation,
    reason_codes: result.decision.metadata.reason_codes,
    contract_c_immutable_id: result.decision.input_authority.immutable_id,
    contract_d_sha256: result.sha,
  };
}

const args = parseArgs(process.argv.slice(2));
const authorityC = resolve(args["--contract-c-authority"]);
const authorityD = resolve(args["--contract-d-authority"]);
const canonicalPath = join(authorityC, "fixtures", "contract-c", "1.0.0", "valid-canonical.json");
const canonicalRaw = readFileSync(canonicalPath);
expect(sha256(canonicalRaw) === CANONICAL_C_SHA, `canonical C SHA drift: ${sha256(canonicalRaw)}`);
const base = { value: JSON.parse(canonicalRaw.toString("utf8")), bytes: canonicalRaw, sha: CANONICAL_C_SHA };
const baseProp = proposition(base.value);
const basisId = basisContributionId(base.value);
const residualId = baseProp.conclusion.residual_contribution_ids[0];
expect(residualId, "canonical residual contribution missing");

// Baseline released canonical behavior.
const baseClaim = evaluateAndCanonicalize(base, authorityC, authorityD, claimContext(base.value));
assertHold(baseClaim, "contract_c_reported_verdict_not_supported");
const baseBasis = evaluateAndCanonicalize(base, authorityC, authorityD, citationContext(base.value, basisId));
expect(baseBasis.decision.evaluation.disposition === "clear", "canonical basis citation did not CLEAR");
expect(baseBasis.decision.metadata.reason_codes[0] === "contract_c_contribution_in_causal_basis", "canonical basis reason drift");
const baseResidual = evaluateAndCanonicalize(base, authorityC, authorityD, citationContext(base.value, residualId));
assertHold(baseResidual, "contract_c_contribution_residual_non_deciding");

// Schema-valid result execution precedence.
const resultIncompleteValue = structuredClone(base.value);
resultIncompleteValue.execution = { state: "incomplete" };
const resultIncomplete = materialize(resultIncompleteValue);
const resultIncompleteClaim = evaluateAndCanonicalize(resultIncomplete, authorityC, authorityD, claimContext(resultIncomplete.value));
assertHold(resultIncompleteClaim, "contract_c_result_execution_incomplete");
const resultIncompleteBasis = evaluateAndCanonicalize(resultIncomplete, authorityC, authorityD, citationContext(resultIncomplete.value, basisId));
assertHold(resultIncompleteBasis, "contract_c_result_execution_incomplete");

const resultFailedValue = structuredClone(base.value);
resultFailedValue.execution = { state: "failed" };
const resultFailed = materialize(resultFailedValue);
const resultFailedClaim = evaluateAndCanonicalize(resultFailed, authorityC, authorityD, claimContext(resultFailed.value));
assertHold(resultFailedClaim, "contract_c_result_execution_failed");
const resultFailedBasis = evaluateAndCanonicalize(resultFailed, authorityC, authorityD, citationContext(resultFailed.value, basisId));
assertHold(resultFailedBasis, "contract_c_result_execution_failed");

// Schema-valid proposition execution precedence. Failed/incomplete propositions cannot carry conclusions.
const propIncompleteValue = structuredClone(base.value);
proposition(propIncompleteValue).execution = { state: "incomplete" };
proposition(propIncompleteValue).conclusion = null;
const propIncomplete = materialize(propIncompleteValue);
const propIncompleteClaim = evaluateAndCanonicalize(propIncomplete, authorityC, authorityD, claimContext(propIncomplete.value));
assertHold(propIncompleteClaim, "contract_c_proposition_execution_incomplete");
const propIncompleteBasis = evaluateAndCanonicalize(propIncomplete, authorityC, authorityD, citationContext(propIncomplete.value, basisId));
assertHold(propIncompleteBasis, "contract_c_proposition_execution_incomplete");

const propFailedValue = structuredClone(base.value);
proposition(propFailedValue).execution = { state: "failed" };
proposition(propFailedValue).conclusion = null;
const propFailed = materialize(propFailedValue);
const propFailedClaim = evaluateAndCanonicalize(propFailed, authorityC, authorityD, claimContext(propFailed.value));
assertHold(propFailedClaim, "contract_c_proposition_execution_failed");
const propFailedBasis = evaluateAndCanonicalize(propFailed, authorityC, authorityD, citationContext(propFailed.value, basisId));
assertHold(propFailedBasis, "contract_c_proposition_execution_failed");

const notCheckableValue = structuredClone(base.value);
proposition(notCheckableValue).execution = { state: "completed", completion: "not_checkable" };
proposition(notCheckableValue).conclusion.reported_verdict = "not_checkable";
const notCheckable = materialize(notCheckableValue);
const notCheckableClaim = evaluateAndCanonicalize(notCheckable, authorityC, authorityD, claimContext(notCheckable.value));
assertHold(notCheckableClaim, "contract_c_proposition_not_checkable");
const notCheckableBasis = evaluateAndCanonicalize(notCheckable, authorityC, authorityD, citationContext(notCheckable.value, basisId));
assertHold(notCheckableBasis, "contract_c_proposition_not_checkable");

// Stale logical target replay is re-evaluated under the new exact Contract C authority.
const oldBasisContext = citationContext(base.value, basisId);
const replayed = evaluateAndCanonicalize(resultIncomplete, authorityC, authorityD, oldBasisContext);
assertHold(replayed, "contract_c_result_execution_incomplete");
expect(baseBasis.decision.target.id === replayed.decision.target.id, "logical citation target changed unexpectedly");
expect(baseBasis.decision.target.content_sha256 === replayed.decision.target.content_sha256, "citation target content changed unexpectedly");
expect(baseBasis.decision.input_authority.immutable_id !== replayed.decision.input_authority.immutable_id, "Contract C immutable authority did not change");
expect(baseBasis.sha !== replayed.sha, "stale-target replay reused prior Contract D bytes");

// Determinism across exact repeated evaluation and context insertion order.
const repeatClaimShas = [];
const repeatBasisShas = [];
for (let i = 0; i < 5; i += 1) {
  repeatClaimShas.push(evaluateAndCanonicalize(base, authorityC, authorityD, claimContext(base.value)).sha);
  repeatBasisShas.push(evaluateAndCanonicalize(base, authorityC, authorityD, citationContext(base.value, basisId)).sha);
}
expect(new Set(repeatClaimShas).size === 1, `claim Decision nondeterminism: ${repeatClaimShas}`);
expect(new Set(repeatBasisShas).size === 1, `citation Decision nondeterminism: ${repeatBasisShas}`);
const reorderedClaim = evaluateAndCanonicalize(base, authorityC, authorityD, claimContext(base.value, true));
const reorderedBasis = evaluateAndCanonicalize(base, authorityC, authorityD, citationContext(base.value, basisId, true));
expect(reorderedClaim.sha === baseClaim.sha, "claim context insertion order changed canonical D");
expect(reorderedBasis.sha === baseBasis.sha, "citation context insertion order changed canonical D");

// Canonical-byte authority remains exact. Equivalent pretty JSON with its own digest is not canonical Contract C.
const prettyBytes = Buffer.from(JSON.stringify(base.value, null, 2) + "\n", "utf8");
expect(sha256(prettyBytes) !== base.sha, "pretty bytes unexpectedly equal canonical bytes");
const prettyFixture = { value: base.value, bytes: prettyBytes, sha: sha256(prettyBytes) };
const noncanonicalError = expectError("contract_c_validation_failed", () => evaluate(prettyFixture, authorityC, claimContext(base.value)));

// Consumer-only supported variant establishes the positive claim-policy baseline for assessment sensitivity.
const supportedValue = structuredClone(base.value);
proposition(supportedValue).conclusion.reported_verdict = "supported";
const supported = materialize(supportedValue);
const supportedClaim = evaluateAndCanonicalize(supported, authorityC, authorityD, claimContext(supported.value));
expect(supportedClaim.decision.evaluation.state === "completed" && supportedClaim.decision.evaluation.disposition === "clear", "valid supported consumer variant did not CLEAR claim policy");

const assessmentVariants = {
  eligibility_adverse: ["eligibility", { state: "performed", value: "adverse" }],
  semantic_validity_failed: ["semantic_validity", { state: "failed" }],
  aperture_adverse: ["aperture_completeness", { state: "performed", value: "adverse" }],
  temporal_adverse: ["temporal_applicability", { state: "performed", value: "adverse" }],
};
const assessmentResults = {};
for (const [name, [slot, state]] of Object.entries(assessmentVariants)) {
  const value = structuredClone(supported.value);
  proposition(value).assessments[slot] = state;
  const fixture = materialize(value);
  const claim = evaluateAndCanonicalize(fixture, authorityC, authorityD, claimContext(fixture.value));
  const basis = evaluateAndCanonicalize(fixture, authorityC, authorityD, citationContext(fixture.value, basisId));
  assessmentResults[name] = {
    contract_c_sha256: fixture.sha,
    assessment: { slot, state },
    claim_policy: summary(claim),
    citation_policy: summary(basis),
  };
}
const allAdverseValue = structuredClone(supported.value);
const allAdverseAssessments = proposition(allAdverseValue).assessments;
allAdverseAssessments.eligibility = { state: "performed", value: "adverse" };
allAdverseAssessments.semantic_validity = { state: "failed" };
allAdverseAssessments.aperture_completeness = { state: "performed", value: "adverse" };
allAdverseAssessments.temporal_applicability = { state: "performed", value: "adverse" };
const allAdverse = materialize(allAdverseValue);
const allAdverseClaim = evaluateAndCanonicalize(allAdverse, authorityC, authorityD, claimContext(allAdverse.value));
const allAdverseBasis = evaluateAndCanonicalize(allAdverse, authorityC, authorityD, citationContext(allAdverse.value, basisId));
assessmentResults.all_adverse_or_failed = {
  contract_c_sha256: allAdverse.sha,
  assessments: structuredClone(proposition(allAdverse.value).assessments),
  claim_policy: summary(allAdverseClaim),
  citation_policy: summary(allAdverseBasis),
};

const assessmentClaimDispositions = Object.fromEntries(
  Object.entries(assessmentResults).map(([name, row]) => [name, row.claim_policy.evaluation.disposition]),
);
const assessmentCitationDispositions = Object.fromEntries(
  Object.entries(assessmentResults).map(([name, row]) => [name, row.citation_policy.evaluation.disposition]),
);

const result = {
  schema: "decision-engine-contract-c-execution-determinism-v1",
  exact_authorities: {
    decision_engine_base: "a4425f8eb47449ff6c683222921bbea9483742e2",
    contract_c: "5fe55f9ed5d0ee9f026ca1b077e9d70ce0487ea1",
    contract_d: "298a1a0f7b7b6d7712e11200d04faec3e1ca169b",
    canonical_contract_c_sha256: base.sha,
  },
  baseline: {
    claim: summary(baseClaim),
    basis_citation: summary(baseBasis),
    residual_citation: summary(baseResidual),
  },
  execution_precedence: {
    result_incomplete: { claim: summary(resultIncompleteClaim), citation: summary(resultIncompleteBasis) },
    result_failed: { claim: summary(resultFailedClaim), citation: summary(resultFailedBasis) },
    proposition_incomplete: { claim: summary(propIncompleteClaim), citation: summary(propIncompleteBasis) },
    proposition_failed: { claim: summary(propFailedClaim), citation: summary(propFailedBasis) },
    proposition_not_checkable: { claim: summary(notCheckableClaim), citation: summary(notCheckableBasis) },
    all_hold: true,
  },
  stale_target_replay: {
    same_target_id: baseBasis.decision.target.id === replayed.decision.target.id,
    same_target_content_sha256: baseBasis.decision.target.content_sha256 === replayed.decision.target.content_sha256,
    baseline_disposition: baseBasis.decision.evaluation.disposition,
    replay_disposition: replayed.decision.evaluation.disposition,
    baseline_contract_c_immutable_id: baseBasis.decision.input_authority.immutable_id,
    replay_contract_c_immutable_id: replayed.decision.input_authority.immutable_id,
    baseline_contract_d_sha256: baseBasis.sha,
    replay_contract_d_sha256: replayed.sha,
  },
  determinism: {
    repeated_claim_contract_d_sha256: repeatClaimShas,
    repeated_basis_contract_d_sha256: repeatBasisShas,
    claim_unique_digest_count: new Set(repeatClaimShas).size,
    basis_unique_digest_count: new Set(repeatBasisShas).size,
    reordered_claim_context_same_contract_d: reorderedClaim.sha === baseClaim.sha,
    reordered_basis_context_same_contract_d: reorderedBasis.sha === baseBasis.sha,
    noncanonical_contract_c_error: noncanonicalError,
  },
  assessment_sensitivity: {
    supported_consumer_baseline: summary(supportedClaim),
    variants: assessmentResults,
    claim_dispositions: assessmentClaimDispositions,
    citation_dispositions: assessmentCitationDispositions,
    claim_clear_despite_any_adverse_or_failed: Object.values(assessmentClaimDispositions).some((v) => v === "clear"),
    claim_clear_despite_all_adverse_or_failed: assessmentClaimDispositions.all_adverse_or_failed === "clear",
    citation_clear_despite_all_adverse_or_failed: assessmentCitationDispositions.all_adverse_or_failed === "clear",
    upstream_producer_reachability_claimed: false,
  },
  production_promotion_authorized: false,
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
