import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

import { evaluateJurisdiction, JURISDICTION } from "./frozen-authority.mjs";
import {
  adapters,
  adaptCitationUse,
  adaptTaskExecution,
  weakGenericEligibleAdapter,
  semanticsLeakingAdmissionAdapter,
} from "./adapters.mjs";
import { validateAdapterBinding, validateDeclarationSet, mutateRequest } from "./declaration-validator.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const readJson = (name) => JSON.parse(fs.readFileSync(path.join(HERE, name), "utf8"));
const clone = (value) => structuredClone(value);
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

const artifacts = readJson("real-artifacts.json");
const declarations = readJson("participant-declarations.json");
const authority = readJson("authority-profile.json");
const evaluatorSource = fs.readFileSync(path.join(HERE, "frozen-authority.mjs"), "utf8");
const artifactsBytes = fs.readFileSync(path.join(HERE, "real-artifacts.json"));
const declarationsBytes = fs.readFileSync(path.join(HERE, "participant-declarations.json"));
const evaluationTime = artifacts.evaluation_time;

const failures = [];
const observations = {};
function check(name, condition, detail = null) {
  if (!condition) failures.push({ name, detail });
}

function jurisdiction(request) {
  return evaluateJurisdiction({
    profile: authority.profile,
    request,
    operationRegistry: authority.operation_registry,
    now: evaluationTime,
  });
}

const stages = [
  "source-access",
  "evidence-admission",
  "cal-assessment",
  "decision-issuance",
  "citation-use",
  "task-execution",
  "outcome-verification",
];

// Declaration shape and ownership/exclusion coherence.
const declarationCheck = validateDeclarationSet(declarations);
check("declaration_set_coherent", declarationCheck.ok, declarationCheck.failures);

// The target evaluator body itself must remain semantically ignorant.
const evaluatorBody = evaluatorSource.slice(
  evaluatorSource.indexOf("export function evaluateJurisdiction"),
  evaluatorSource.indexOf("export function deriveDelegatedProfile"),
);
const evaluatorForbiddenTokens = [
  "semantic_payload",
  "reported_verdict",
  "measurement",
  "support_status",
  "trust_level",
  "reason_codes",
  "decision.effect",
  "passage_text",
];
const evaluatorSemanticReads = evaluatorForbiddenTokens.filter((token) => evaluatorBody.includes(token));
check("frozen_evaluator_semantically_ignorant", evaluatorSemanticReads.length === 0, evaluatorSemanticReads);

// Baseline real/frozen projections must bind and be in jurisdiction.
const baseline = {};
for (const stage of stages) {
  const request = adapters[stage](artifacts);
  const validation = validateAdapterBinding({ stage, request, artifacts, declarations, evaluationTime });
  const auth = validation.ok ? jurisdiction(request) : null;
  baseline[stage] = { validation, jurisdiction: auth?.jurisdiction ?? null };
  check(`${stage}:adapter_binding_valid`, validation.ok, validation);
  check(`${stage}:in_jurisdiction`, auth?.jurisdiction === JURISDICTION.IN, auth);
}
observations.baseline = baseline;

// Semantic-label sensitivity probes. These are projection-level probes, not claims
// that the mutated projections remain canonical serialized artifacts with valid seals.
const semanticVariant = clone(artifacts);
semanticVariant.contract_b.claim.scaffold_support_status = "unsupported";
semanticVariant.contract_b.claim.scaffold_claim_strength = 0.01;
semanticVariant.contract_b.claim.scaffold_extraction_fidelity = 0.02;
semanticVariant.contract_b.claim.evidence_passages[0].source_trust_level = "background";
semanticVariant.contract_b.passage.extraction_method = "auto_retrieved";
semanticVariant.contract_c.first_proposition.semantic.reported_verdict = "unsupported";
semanticVariant.contract_c.first_proposition.semantic.terminal_branch = "semantic-projection-mutated";
semanticVariant.contract_c.first_proposition.semantic.measurement_value = 0.01;
semanticVariant.contract_c.first_proposition.semantic.causal_form = "redundant_non_deciding";
semanticVariant.citation_decision.decision.reason_codes = ["semantic_reason_mutated"];
semanticVariant.task_decision.decision.reason_codes = ["semantic_reason_mutated"];
semanticVariant.execution_record.executor_report = "FAILURE";
semanticVariant.execution_record.observed_post_state = "NOT_APPLIED";

const semanticProbeStages = stages;
const semanticInvariance = {};
for (const stage of semanticProbeStages) {
  const baseRequest = adapters[stage](artifacts);
  const variantRequest = adapters[stage](semanticVariant);
  const baseCore = { actor: baseRequest.actor, operation: baseRequest.operation, target: baseRequest.target, batch_size: baseRequest.batch_size };
  const variantCore = { actor: variantRequest.actor, operation: variantRequest.operation, target: variantRequest.target, batch_size: variantRequest.batch_size };
  const sameBinding = JSON.stringify(baseCore) === JSON.stringify(variantCore);
  const validation = validateAdapterBinding({ stage, request: variantRequest, artifacts: semanticVariant, declarations, evaluationTime });
  const auth = validation.ok ? jurisdiction(variantRequest) : null;
  semanticInvariance[stage] = { same_binding: sameBinding, validation: validation.ok, jurisdiction: auth?.jurisdiction ?? null };
  check(`${stage}:semantic_projection_does_not_change_binding`, sameBinding, { baseCore, variantCore });
  check(`${stage}:semantic_projection_binding_valid`, validation.ok, validation);
  check(`${stage}:semantic_projection_jurisdiction_stable`, auth?.jurisdiction === baseline[stage].jurisdiction, auth);
}
observations.semantic_projection_invariance = semanticInvariance;

// Adapter-output relabeling attacks while authoritative artifacts remain fixed.
const substitutionAttacks = [
  ["source_hash", "source-access", (r) => { r.target.current_hash = "sha256:bad-source"; }],
  ["passage_id", "evidence-admission", (r) => { r.target.id = r.target.id.replace("pass-001", "pass-evil"); }],
  ["bundle_id", "cal-assessment", (r) => { r.target.id = r.target.id.replace(artifacts.contract_b.manifest.bundle_id, "bundle-evil"); }],
  ["contract_c_result_set", "decision-issuance", (r) => { r.target.id = "result-set:" + "0".repeat(64); }],
  ["citation_operation", "citation-use", (r) => { r.operation = "task.dispatch"; }],
  ["task_target_class", "task-execution", (r) => { r.target.class = "mindgraph_retrieval_result"; }],
  ["verification_execution_id", "outcome-verification", (r) => { r.target.id = "execution:substituted"; }],
];
const substitutionResults = {};
for (const [name, stage, mutation] of substitutionAttacks) {
  const mutated = mutateRequest(adapters[stage](artifacts), mutation);
  const validation = validateAdapterBinding({ stage, request: mutated, artifacts, declarations, evaluationTime });
  substitutionResults[name] = validation.reason;
  check(`substitution:${name}:rejected`, validation.ok === false, validation);
}
observations.substitution_attacks = substitutionResults;

// Upstream source/admission authority is separate from semantic labels.
const revokedAccess = clone(artifacts);
revokedAccess.source_access_receipt.revoked = true;
const revokedSourceRequest = adapters["source-access"](revokedAccess);
const revokedSourceValidation = validateAdapterBinding({ stage: "source-access", request: revokedSourceRequest, artifacts: revokedAccess, declarations, evaluationTime });
const revokedAdmissionRequest = adapters["evidence-admission"](revokedAccess);
const revokedAdmissionValidation = validateAdapterBinding({ stage: "evidence-admission", request: revokedAdmissionRequest, artifacts: revokedAccess, declarations, evaluationTime });
check("revoked_access_blocks_source_binding", revokedSourceValidation.ok === false, revokedSourceValidation);
check("revoked_access_blocks_admission_binding", revokedAdmissionValidation.ok === false, revokedAdmissionValidation);

const wrongSource = clone(artifacts);
wrongSource.source_access_receipt.source_content_hash = "sha256:" + "9".repeat(64);
const wrongSourceValidation = validateAdapterBinding({
  stage: "evidence-admission",
  request: adapters["evidence-admission"](wrongSource),
  artifacts: wrongSource,
  declarations,
  evaluationTime,
});
check("source_hash_receipt_substitution_rejected", wrongSourceValidation.ok === false, wrongSourceValidation);

const passageMismatch = clone(artifacts);
passageMismatch.contract_b.claim.evidence_passages[0].passage_hash = "sha256:" + "8".repeat(64);
const passageMismatchValidation = validateAdapterBinding({
  stage: "cal-assessment",
  request: adapters["cal-assessment"](passageMismatch),
  artifacts: passageMismatch,
  declarations,
  evaluationTime,
});
check("contract_b_claim_passage_mismatch_rejected", passageMismatchValidation.ok === false, passageMismatchValidation);

// Negative control 1: generic eligibility can launder a task Decision into citation use
// if the binding validator is bypassed.
const weakCitation = weakGenericEligibleAdapter(
  artifacts.task_decision,
  "citation.use",
  "mindgraph_retrieval_result",
  "citation-agent",
);
const weakCitationJurisdiction = weakCitation.ok ? jurisdiction(weakCitation.request) : null;
const weakCitationValidation = weakCitation.ok
  ? validateAdapterBinding({ stage: "citation-use", request: weakCitation.request, artifacts, declarations, evaluationTime })
  : null;
check("negative_control_generic_eligible_false_permit_observed", weakCitationJurisdiction?.jurisdiction === JURISDICTION.IN, weakCitationJurisdiction);
check("declaration_validator_blocks_generic_eligible_laundering", weakCitationValidation?.ok === false, weakCitationValidation);

// Negative control 2: trust/support labels can manufacture admission if access-receipt
// validation is bypassed.
const leakingAdmission = semanticsLeakingAdmissionAdapter(revokedAccess);
const leakingAdmissionJurisdiction = leakingAdmission.ok ? jurisdiction(leakingAdmission.request) : null;
const leakingAdmissionValidation = leakingAdmission.ok
  ? validateAdapterBinding({ stage: "evidence-admission", request: leakingAdmission.request, artifacts: revokedAccess, declarations, evaluationTime })
  : null;
check("negative_control_semantic_admission_false_permit_observed", leakingAdmissionJurisdiction?.jurisdiction === JURISDICTION.IN, leakingAdmissionJurisdiction);
check("declaration_validator_blocks_semantic_admission_laundering", leakingAdmissionValidation?.ok === false, leakingAdmissionValidation);

// Primary participant-domain substitution: can a citation participant consume a task
// effect merely because both effects exist in the global effect map?
const citationAsTaskArtifacts = clone(artifacts);
citationAsTaskArtifacts.citation_decision = clone(artifacts.task_decision);
const citationAsTask = adaptCitationUse(citationAsTaskArtifacts);
const citationAsTaskValidation = citationAsTask.ok
  ? validateAdapterBinding({ stage: "citation-use", request: citationAsTask.request, artifacts: citationAsTaskArtifacts, declarations, evaluationTime })
  : citationAsTask;
check(
  "citation_participant_rejects_task_effect",
  citationAsTaskValidation.ok === false,
  citationAsTaskValidation,
);

const taskAsCitationArtifacts = clone(artifacts);
taskAsCitationArtifacts.task_decision = clone(artifacts.citation_decision);
const taskAsCitation = adaptTaskExecution(taskAsCitationArtifacts);
const taskAsCitationValidation = taskAsCitation.ok
  ? validateAdapterBinding({ stage: "task-execution", request: taskAsCitation.request, artifacts: taskAsCitationArtifacts, declarations, evaluationTime })
  : taskAsCitation;
check(
  "task_participant_rejects_citation_effect",
  taskAsCitationValidation.ok === false,
  taskAsCitationValidation,
);

// Unknown effects must not inherit a nearby mapping.
const unknownEffectArtifacts = clone(artifacts);
unknownEffectArtifacts.citation_decision.decision.effect = "cite_or_dispatch_maybe";
const unknownEffect = adaptCitationUse(unknownEffectArtifacts);
check("unknown_effect_adapter_fails_closed", unknownEffect.ok === false && unknownEffect.reason === "effect_unmapped", unknownEffect);

// Outcome verification authority is independent of executor report / observed result.
const outcomeBase = adapters["outcome-verification"](artifacts);
const outcomeVariant = adapters["outcome-verification"](semanticVariant);
check(
  "outcome_report_does_not_change_verifier_authority_request",
  JSON.stringify({ ...outcomeBase, semantic_payload: undefined }) === JSON.stringify({ ...outcomeVariant, semantic_payload: undefined }),
  { outcomeBase, outcomeVariant },
);
const selfVerify = clone(artifacts);
selfVerify.execution_record.executor_actor = "verifier-agent";
const selfVerifyRequest = adapters["outcome-verification"](selfVerify);
const selfVerifyValidation = validateAdapterBinding({ stage: "outcome-verification", request: selfVerifyRequest, artifacts: selfVerify, declarations, evaluationTime });
const selfVerifyJurisdiction = selfVerifyValidation.ok ? jurisdiction(selfVerifyRequest) : null;
check("self_verification_rejected_by_frozen_authority", selfVerifyJurisdiction?.jurisdiction === JURISDICTION.OUT, selfVerifyJurisdiction);

observations.negative_controls = {
  generic_eligible_direct_jurisdiction: weakCitationJurisdiction?.jurisdiction ?? null,
  generic_eligible_binding_validation: weakCitationValidation?.reason ?? null,
  semantic_admission_direct_jurisdiction: leakingAdmissionJurisdiction?.jurisdiction ?? null,
  semantic_admission_binding_validation: leakingAdmissionValidation?.reason ?? null,
};
observations.participant_domain_substitution = {
  citation_as_task_validation: citationAsTaskValidation,
  task_as_citation_validation: taskAsCitationValidation,
};

const summary = {
  fixture_sha256: sha256(artifactsBytes),
  declaration_sha256: sha256(declarationsBytes),
  frozen_authority_git_blob_expected: "5012f6398f6953e458de87179a318bc45d1df456",
  stage_count: stages.length,
  failures,
  observations,
  encoded_gate: failures.length === 0 ? "PASS" : "FAIL",
};

fs.writeFileSync(path.join(HERE, "HOSTED-RUN.json"), JSON.stringify(summary, null, 2) + "\n");
console.log(JSON.stringify(summary, null, 2));
if (failures.length > 0) process.exitCode = 1;
