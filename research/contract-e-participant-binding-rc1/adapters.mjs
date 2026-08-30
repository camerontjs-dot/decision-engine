function request(actor, operation, targetClass, targetId, currentHash, semanticPayload = {}, context = {}) {
  return Object.freeze({
    actor,
    operation,
    target: Object.freeze({ class: targetClass, id: targetId, current_hash: currentHash }),
    batch_size: 1,
    context: Object.freeze({ ...context }),
    semantic_payload: Object.freeze({ ...semanticPayload }),
  });
}

const EFFECT_MAP = Object.freeze({
  cite_as_evidence: Object.freeze({ operation: "citation.use", target_kind: "mindgraph_retrieval_result", target_class: "mindgraph_retrieval_result" }),
  dispatch_task: Object.freeze({ operation: "task.dispatch", target_kind: "mainframe_task", target_class: "mainframe_task" }),
});

export function adaptSourceAccess(artifacts) {
  const receipt = artifacts.source_access_receipt;
  return request(
    "evidence-bundler",
    "source.read",
    "source_material",
    receipt.source_url,
    receipt.source_content_hash,
    {
      scaffold_support_status: artifacts.contract_b.claim.scaffold_support_status,
      source_trust_level: artifacts.contract_b.claim.evidence_passages[0].source_trust_level,
    },
    { authority_receipt_id: receipt.receipt_id },
  );
}

export function adaptEvidenceAdmission(artifacts) {
  const passage = artifacts.contract_b.passage;
  return request(
    "evidence-bundler",
    "evidence.admit_passage",
    "evidence_passage",
    `${passage.bundle_id}::${passage.source_id}::${passage.passage_id}`,
    passage.passage_hash,
    {
      passage_text: passage.passage_text,
      extraction_method: passage.extraction_method,
      source_trust_level: artifacts.contract_b.claim.evidence_passages[0].source_trust_level,
      scaffold_support_status: artifacts.contract_b.claim.scaffold_support_status,
    },
    {
      authority_receipt_id: artifacts.source_access_receipt.receipt_id,
      source_url: passage.provenance.source_url,
      source_content_hash: passage.provenance.source_content_hash,
    },
  );
}

export function adaptCalAssessment(artifacts) {
  const { manifest, claim } = artifacts.contract_b;
  const passage = claim.evidence_passages[0];
  return request(
    "claim-audit-lab",
    "assessment.issue",
    "contract_b_claim",
    `${manifest.bundle_id}::${claim.claim_id}`,
    manifest.bundle_hash,
    {
      claim_text: claim.claim_text,
      scaffold_support_status: claim.scaffold_support_status,
      scaffold_claim_strength: claim.scaffold_claim_strength,
      scaffold_extraction_fidelity: claim.scaffold_extraction_fidelity,
      source_trust_level: passage.source_trust_level,
    },
    {
      passage_ref: `${passage.source_id}::${passage.passage_id}::${passage.passage_hash}`,
    },
  );
}

export function adaptDecisionIssuance(artifacts) {
  const c = artifacts.contract_c;
  return request(
    "decision-engine-policy",
    "decision.make",
    "contract_c_result",
    c.result_set_id,
    c.input.contract_b.bundle_hash,
    { ...c.first_proposition.semantic },
    {
      contract_b_binding: `${c.input.contract_b.contract_version}::${c.input.contract_b.bundle_id}::${c.input.contract_b.bundle_hash}`,
      producer_identity: `${c.producer.semantic_implementation_sha}::${c.producer.policy_sha256}`,
    },
  );
}

export function adaptTypedDecision(decision, actor) {
  const mapping = EFFECT_MAP[decision?.decision?.effect];
  if (!mapping) {
    return Object.freeze({ ok: false, reason: "effect_unmapped" });
  }
  if (decision?.target?.kind !== mapping.target_kind) {
    return Object.freeze({ ok: false, reason: "effect_target_kind_mismatch" });
  }
  return Object.freeze({
    ok: true,
    request: request(
      actor,
      mapping.operation,
      mapping.target_class,
      decision.target.object_id,
      decision.target.content_sha256,
      {
        disposition: decision.decision.disposition,
        reason_codes: [...(decision.decision.reason_codes || [])],
      },
      {
        decision_effect: decision.decision.effect,
        policy: `${decision.policy.id}@${decision.policy.version}`,
        input_authority: `${decision.input.authority_kind}::${decision.input.authority_id}`,
      },
    ),
  });
}

export function adaptCitationUse(artifacts) {
  return adaptTypedDecision(artifacts.citation_decision, "citation-agent");
}

export function adaptTaskExecution(artifacts) {
  return adaptTypedDecision(artifacts.task_decision, "task-agent");
}

export function adaptOutcomeVerification(artifacts) {
  const execution = artifacts.execution_record;
  return request(
    "verifier-agent",
    "outcome.verify",
    "execution_target",
    execution.execution_id,
    execution.target.current_hash,
    {
      executor_report: execution.executor_report,
      observed_post_state: execution.observed_post_state,
    },
    {
      executor_actor: execution.executor_actor,
      execution_operation: execution.operation,
      execution_target_class: execution.target.class,
      execution_target_id: execution.target.id,
    },
  );
}

// Negative control: generic eligibility is treated as sufficient and the caller may
// choose the desired downstream operation/target class. This is intentionally unsafe.
export function weakGenericEligibleAdapter(decision, requestedOperation, requestedTargetClass, actor) {
  if (decision?.decision?.disposition !== "eligible") {
    return Object.freeze({ ok: false, reason: "not_eligible" });
  }
  return Object.freeze({
    ok: true,
    request: request(
      actor,
      requestedOperation,
      requestedTargetClass,
      decision.target.object_id,
      decision.target.content_sha256,
      { generic_eligible: true },
      { source_effect_ignored: decision.decision.effect },
    ),
  });
}

// Negative control: semantic labels manufacture passage-admission authority and the
// access receipt is ignored. This is intentionally unsafe.
export function semanticsLeakingAdmissionAdapter(artifacts) {
  const passage = artifacts.contract_b.passage;
  const trusted = artifacts.contract_b.claim.evidence_passages[0].source_trust_level === "primary";
  const sourced = artifacts.contract_b.claim.scaffold_support_status === "sourced";
  if (!(trusted || sourced)) {
    return Object.freeze({ ok: false, reason: "semantic_labels_not_positive" });
  }
  return Object.freeze({
    ok: true,
    request: request(
      "evidence-bundler",
      "evidence.admit_passage",
      "evidence_passage",
      `${passage.bundle_id}::${passage.source_id}::${passage.passage_id}`,
      passage.passage_hash,
      { source_trust_level: "primary", scaffold_support_status: "sourced" },
      { authority_receipt_ignored: true },
    ),
  });
}

export const adapters = Object.freeze({
  "source-access": adaptSourceAccess,
  "evidence-admission": adaptEvidenceAdmission,
  "cal-assessment": adaptCalAssessment,
  "decision-issuance": adaptDecisionIssuance,
  "citation-use": (a) => adaptCitationUse(a).request,
  "task-execution": (a) => adaptTaskExecution(a).request,
  "outcome-verification": adaptOutcomeVerification,
});
