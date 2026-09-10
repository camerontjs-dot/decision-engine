import { createHash } from "node:crypto";

export const SHADOW_VERSION = "research-non-deciding-rc0";
export const ALLOWED_CHANNELS = new Set(["support", "counterevidence", "non_deciding"]);
export const ALLOWED_CAUSAL_FORMS = new Set([
  "single_necessary",
  "independent_sufficient_alternatives",
  "jointly_sufficient",
  "redundant_non_deciding",
]);

export class ShadowConsumerError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ShadowConsumerError";
    this.code = code;
  }
}

function sha256Hex(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function canonicalJson(value) {
  if (value === null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  throw new ShadowConsumerError("invalid_json_value", "unsupported JSON value");
}

export function canonicalBytes(value) {
  return Buffer.from(`${canonicalJson(value)}\n`, "utf8");
}

export function resultSetIdentity(value) {
  const payload = structuredClone(value);
  delete payload.result_set_id;
  return `result-set:${sha256Hex(canonicalBytes(payload))}`;
}

function requireObject(value, code, message) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ShadowConsumerError(code, message);
  }
}

function requireString(value, code, message) {
  if (typeof value !== "string" || value.length === 0) {
    throw new ShadowConsumerError(code, message);
  }
}

function requireEqual(actual, expected, code, message) {
  if (actual !== expected) throw new ShadowConsumerError(code, message);
}

function validateCausalCardinality(causalForm, basisCount) {
  if (!ALLOWED_CAUSAL_FORMS.has(causalForm)) {
    throw new ShadowConsumerError("unknown_causal_form", `unknown causal form ${causalForm}`);
  }
  if (causalForm === "single_necessary" && basisCount !== 1) {
    throw new ShadowConsumerError("causal_cardinality", "single_necessary requires exactly one basis member");
  }
  if (
    (causalForm === "independent_sufficient_alternatives" || causalForm === "jointly_sufficient") &&
    basisCount < 2
  ) {
    throw new ShadowConsumerError("causal_cardinality", `${causalForm} requires at least two basis members`);
  }
  if (causalForm === "redundant_non_deciding" && basisCount !== 0) {
    throw new ShadowConsumerError("causal_cardinality", "redundant_non_deciding requires zero basis members");
  }
}

function validateContribution(contribution, contractBIndex) {
  requireObject(contribution, "invalid_contribution", "contribution must be an object");
  requireString(contribution.contribution_id, "invalid_contribution", "contribution id required");
  if (!ALLOWED_CHANNELS.has(contribution.channel)) {
    throw new ShadowConsumerError("unknown_channel", `unknown contribution channel ${contribution.channel}`);
  }
  requireObject(contribution.evidence_ref, "invalid_evidence_ref", "evidence_ref must be an object");
  const { passage_id: passageId, source_id: sourceId, passage_sha256: passageSha } = contribution.evidence_ref;
  requireString(passageId, "invalid_evidence_ref", "passage_id required");
  requireString(sourceId, "invalid_evidence_ref", "source_id required");
  requireString(passageSha, "invalid_evidence_ref", "passage_sha256 required");
  const indexed = contractBIndex.passages?.[passageId];
  if (!indexed) {
    throw new ShadowConsumerError("contract_b_reference_mismatch", `passage ${passageId} absent from Contract B index`);
  }
  if (indexed.source_id !== sourceId || indexed.passage_sha256 !== passageSha) {
    throw new ShadowConsumerError("contract_b_reference_mismatch", `evidence reference mismatch for ${passageId}`);
  }
}

function validateProposition(proposition, contractBIndex) {
  requireObject(proposition, "invalid_proposition", "proposition must be an object");
  requireObject(proposition.proposition, "invalid_proposition", "proposition identity required");
  const propositionId = proposition.proposition.proposition_id;
  const textSha = proposition.proposition.text_sha256;
  requireString(propositionId, "invalid_proposition", "proposition_id required");
  requireString(textSha, "invalid_proposition", "text_sha256 required");
  const expectedTextSha = contractBIndex.propositions?.[propositionId];
  if (!expectedTextSha) {
    throw new ShadowConsumerError("contract_b_proposition_mismatch", `proposition ${propositionId} absent from Contract B index`);
  }
  requireEqual(textSha, expectedTextSha, "contract_b_proposition_mismatch", `proposition text hash mismatch for ${propositionId}`);

  if (!Array.isArray(proposition.contributions)) {
    throw new ShadowConsumerError("invalid_contributions", "contributions must be an array");
  }
  const contributionMap = new Map();
  for (const contribution of proposition.contributions) {
    validateContribution(contribution, contractBIndex);
    if (contributionMap.has(contribution.contribution_id)) {
      throw new ShadowConsumerError("duplicate_contribution", `duplicate contribution ${contribution.contribution_id}`);
    }
    contributionMap.set(contribution.contribution_id, contribution);
  }

  requireObject(proposition.execution, "invalid_execution", "proposition execution required");
  requireObject(proposition.conclusion, "invalid_conclusion", "completed proposition conclusion required");
  const basis = proposition.conclusion.basis_members;
  const residual = proposition.conclusion.residual_contribution_ids;
  if (!Array.isArray(basis) || !Array.isArray(residual)) {
    throw new ShadowConsumerError("invalid_conclusion", "basis_members and residual_contribution_ids must be arrays");
  }

  const basisContributionIds = [];
  for (const member of basis) {
    requireObject(member, "invalid_basis", "basis member must be an object");
    if (member.namespace === "contribution") {
      if (!contributionMap.has(member.id)) {
        throw new ShadowConsumerError("unknown_basis_contribution", `basis references unknown contribution ${member.id}`);
      }
      basisContributionIds.push(member.id);
    }
  }
  for (const id of residual) {
    if (!contributionMap.has(id)) {
      throw new ShadowConsumerError("unknown_residual_contribution", `residual references unknown contribution ${id}`);
    }
  }
  const basisSet = new Set(basisContributionIds);
  const residualSet = new Set(residual);
  for (const id of basisSet) {
    if (residualSet.has(id)) {
      throw new ShadowConsumerError("causal_residual_overlap", `contribution ${id} is both causal and residual`);
    }
  }
  const classified = new Set([...basisSet, ...residualSet]);
  for (const id of contributionMap.keys()) {
    if (!classified.has(id)) {
      throw new ShadowConsumerError("unclassified_contribution", `retained contribution ${id} is unclassified`);
    }
  }

  validateCausalCardinality(proposition.conclusion.causal_form, basis.length);

  if (proposition.execution.state === "completed") {
    if (proposition.execution.completion === "not_checkable" && proposition.conclusion.reported_verdict !== "not_checkable") {
      throw new ShadowConsumerError("completion_verdict_mismatch", "not_checkable completion requires not_checkable verdict");
    }
    if (proposition.execution.completion === "assessed" && proposition.conclusion.reported_verdict === "not_checkable") {
      throw new ShadowConsumerError("completion_verdict_mismatch", "assessed completion cannot report not_checkable");
    }
  }

  return { contributionMap, basisContributionIds };
}

export function admitShadow({ rawBytes, expectedSha256, contractBIndex, enforceExpectedSha = true }) {
  if (!Buffer.isBuffer(rawBytes)) {
    throw new ShadowConsumerError("invalid_transport", "rawBytes must be a Buffer");
  }
  const actualSha = `sha256:${sha256Hex(rawBytes)}`;
  if (enforceExpectedSha && actualSha !== expectedSha256) {
    throw new ShadowConsumerError("whole_object_mismatch", `expected ${expectedSha256}, got ${actualSha}`);
  }
  let value;
  try {
    value = JSON.parse(rawBytes.toString("utf8"));
  } catch (error) {
    throw new ShadowConsumerError("invalid_json", String(error));
  }
  requireObject(value, "invalid_top_level", "shadow Contract C must be an object");
  requireEqual(value.contract_c_version, SHADOW_VERSION, "version_mismatch", "wrong shadow Contract C version");
  requireObject(value.input?.contract_b, "invalid_contract_b_binding", "Contract B binding required");
  for (const key of ["contract_version", "bundle_id", "bundle_hash"]) {
    requireEqual(
      value.input.contract_b[key],
      contractBIndex[key],
      "contract_b_binding_mismatch",
      `Contract B ${key} mismatch`,
    );
  }
  const expectedResultId = resultSetIdentity(value);
  requireEqual(value.result_set_id, expectedResultId, "result_set_identity_mismatch", "result_set_id mismatch");
  if (!Array.isArray(value.propositions) || value.propositions.length === 0) {
    throw new ShadowConsumerError("invalid_propositions", "at least one proposition is required");
  }

  const propositionViews = [];
  for (const proposition of value.propositions) {
    const { contributionMap, basisContributionIds } = validateProposition(proposition, contractBIndex);
    propositionViews.push({
      proposition_id: proposition.proposition.proposition_id,
      text_sha256: proposition.proposition.text_sha256,
      execution_state: proposition.execution.state,
      completion: proposition.execution.completion ?? null,
      reported_verdict: proposition.conclusion?.reported_verdict ?? null,
      terminal_branch: proposition.conclusion?.terminal_branch ?? null,
      causal_form: proposition.conclusion?.causal_form ?? null,
      causal_contributions: basisContributionIds.map((id) => ({
        contribution_id: id,
        channel: contributionMap.get(id).channel,
        evidence_ref: structuredClone(contributionMap.get(id).evidence_ref),
      })),
      residual_contribution_ids: structuredClone(proposition.conclusion?.residual_contribution_ids ?? []),
    });
  }

  return {
    exact_sha256: actualSha,
    result_set_id: value.result_set_id,
    contract_b: structuredClone(value.input.contract_b),
    result_execution_state: value.execution?.state ?? null,
    propositions: propositionViews,
    raw: value,
  };
}

export function evaluateSupportedClaimPolicyCore(admitted, propositionId) {
  const proposition = admitted.propositions.find((item) => item.proposition_id === propositionId);
  if (!proposition) return { state: "failed", disposition: null, reason: "target_proposition_not_found" };
  if (admitted.result_execution_state !== "completed") {
    return { state: "completed", disposition: "hold", reason: `contract_c_result_execution_${admitted.result_execution_state}` };
  }
  if (proposition.execution_state !== "completed") {
    return { state: "completed", disposition: "hold", reason: `contract_c_proposition_execution_${proposition.execution_state}` };
  }
  if (proposition.completion !== "assessed") {
    return { state: "completed", disposition: "hold", reason: `contract_c_proposition_${proposition.completion}` };
  }
  if (proposition.reported_verdict !== "supported") {
    return { state: "completed", disposition: "hold", reason: "contract_c_reported_verdict_not_supported" };
  }
  return { state: "completed", disposition: "clear", reason: "contract_c_supported" };
}

export function unsafeEvidencePresenceEvaluator(admitted, propositionId) {
  const proposition = admitted.propositions.find((item) => item.proposition_id === propositionId);
  if (!proposition) return { state: "failed", disposition: null, reason: "target_proposition_not_found" };
  if (proposition.causal_contributions.some((item) => item.channel === "non_deciding")) {
    return { state: "completed", disposition: "clear", reason: "unsafe_neutral_evidence_presence" };
  }
  return evaluateSupportedClaimPolicyCore(admitted, propositionId);
}
