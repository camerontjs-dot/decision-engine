import { createHash } from "node:crypto";

export class ResearchContractCError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ResearchContractCError";
    this.code = code;
  }
}

const SHA256 = /^sha256:[0-9a-f]{64}$/;
const RESULT_SET = /^result-set:[0-9a-f]{64}$/;
const CONTRIBUTION = /^contribution:[0-9a-f]{64}$/;
const ALLOWED_CHANNELS = new Set(["support", "counterevidence", "non_deciding"]);
const ALLOWED_FORMS = new Set([
  "single_necessary",
  "independent_sufficient_alternatives",
  "jointly_sufficient",
  "redundant_non_deciding",
]);

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
  }
  return value;
}

export function canonicalBytes(value) {
  return Buffer.from(`${JSON.stringify(sortValue(value))}\n`, "utf8");
}

function sha256Hex(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function wholeObjectSha256(bytes) {
  return `sha256:${sha256Hex(bytes)}`;
}

export function contributionId(channel, evidenceRef) {
  return `contribution:${sha256Hex(canonicalBytes({ channel, evidence_ref: evidenceRef }))}`;
}

export function resultSetId(value) {
  const copy = structuredClone(value);
  delete copy.result_set_id;
  return `result-set:${sha256Hex(canonicalBytes(copy))}`;
}

export function withResultSetId(value) {
  const copy = structuredClone(value);
  delete copy.result_set_id;
  copy.result_set_id = resultSetId(copy);
  return copy;
}

function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ResearchContractCError("invalid_shape", `${label} must be an object`);
  }
  return value;
}

function requireString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new ResearchContractCError("invalid_shape", `${label} must be a non-empty string`);
  }
  return value;
}

function requireExactProfile(value, expectedProfile) {
  requireObject(expectedProfile, "expectedProfile");
  const expectedVersion = requireString(expectedProfile.contract_c_version, "expectedProfile.contract_c_version");
  const expectedPolicyProfile = requireString(expectedProfile.policy_profile, "expectedProfile.policy_profile");
  const expectedDigest = requireString(expectedProfile.whole_object_sha256, "expectedProfile.whole_object_sha256");
  if (!SHA256.test(expectedDigest)) {
    throw new ResearchContractCError("invalid_context", "expected profile whole-object identity is malformed");
  }
  if (value.contract_c_version !== expectedVersion) {
    throw new ResearchContractCError("profile_mismatch", "Contract C research version does not match externally selected profile");
  }
  if (value.producer?.policy?.canonical?.profile !== expectedPolicyProfile) {
    throw new ResearchContractCError("profile_mismatch", "Contract C policy profile does not match externally selected profile");
  }
}

function requireContractBBinding(value, index) {
  requireObject(index, "contractBIndex");
  const actual = requireObject(value.input?.contract_b, "Contract C input.contract_b");
  for (const key of ["contract_version", "bundle_id", "bundle_hash"]) {
    if (actual[key] !== index[key]) {
      throw new ResearchContractCError("contract_b_binding_mismatch", `Contract B ${key} mismatch`);
    }
  }
}

function validateEvidenceRef(ref, index) {
  requireObject(ref, "evidence_ref");
  const sourceId = requireString(ref.source_id, "evidence_ref.source_id");
  const passageId = requireString(ref.passage_id, "evidence_ref.passage_id");
  const passageSha = requireString(ref.passage_sha256, "evidence_ref.passage_sha256");
  if (!SHA256.test(passageSha)) {
    throw new ResearchContractCError("evidence_binding_mismatch", "passage SHA-256 is malformed");
  }
  const indexed = index.passages?.[passageId];
  if (!indexed || indexed.source_id !== sourceId || indexed.passage_sha256 !== passageSha) {
    throw new ResearchContractCError("evidence_binding_mismatch", `evidence reference ${passageId} does not match Contract B`);
  }
  return { source_id: sourceId, passage_id: passageId, passage_sha256: passageSha };
}

function validateContribution(row, index) {
  requireObject(row, "contribution");
  const channel = requireString(row.channel, "contribution.channel");
  if (!ALLOWED_CHANNELS.has(channel)) {
    throw new ResearchContractCError("unknown_channel", `unsupported contribution channel ${channel}`);
  }
  const ref = validateEvidenceRef(row.evidence_ref, index);
  const expectedId = contributionId(channel, ref);
  if (row.contribution_id !== expectedId || !CONTRIBUTION.test(row.contribution_id)) {
    throw new ResearchContractCError("contribution_identity_mismatch", "contribution identity does not match channel/evidence material");
  }
  return { contribution_id: row.contribution_id, channel, evidence_ref: ref };
}

function validatePropositionBinding(row, index) {
  const proposition = requireObject(row.proposition, "proposition");
  const propositionId = requireString(proposition.proposition_id, "proposition.proposition_id");
  const textHash = requireString(proposition.text_sha256, "proposition.text_sha256");
  if (index.propositions?.[propositionId] !== textHash) {
    throw new ResearchContractCError("proposition_binding_mismatch", "proposition identity/hash does not match Contract B");
  }
  return { proposition_id: propositionId, text_sha256: textHash };
}

function classifyParticipation(row, contributions) {
  const conclusion = requireObject(row.conclusion, "conclusion");
  const causalForm = requireString(conclusion.causal_form, "conclusion.causal_form");
  if (!ALLOWED_FORMS.has(causalForm)) {
    throw new ResearchContractCError("invalid_causal_form", `unsupported causal form ${causalForm}`);
  }
  if (!Array.isArray(conclusion.basis_members) || !Array.isArray(conclusion.residual_contribution_ids)) {
    throw new ResearchContractCError("invalid_shape", "conclusion basis/residual sets must be arrays");
  }

  const contributionById = new Map(contributions.map((item) => [item.contribution_id, item]));
  const causalIds = conclusion.basis_members
    .filter((item) => item?.namespace === "contribution")
    .map((item) => item.id);
  const residualIds = conclusion.residual_contribution_ids;
  const causalSet = new Set(causalIds);
  const residualSet = new Set(residualIds);

  if (causalSet.size !== causalIds.length || residualSet.size !== residualIds.length) {
    throw new ResearchContractCError("duplicate_participation", "duplicate causal or residual contribution identity");
  }
  for (const id of causalSet) {
    if (!contributionById.has(id)) {
      throw new ResearchContractCError("basis_reference_mismatch", `causal contribution ${id} is missing`);
    }
    if (residualSet.has(id)) {
      throw new ResearchContractCError("causal_residual_overlap", `contribution ${id} is both causal and residual`);
    }
  }
  for (const id of residualSet) {
    if (!contributionById.has(id)) {
      throw new ResearchContractCError("residual_reference_mismatch", `residual contribution ${id} is missing`);
    }
  }
  for (const id of contributionById.keys()) {
    if (!causalSet.has(id) && !residualSet.has(id)) {
      throw new ResearchContractCError("unclassified_contribution", `retained contribution ${id} is neither causal nor residual`);
    }
  }

  const causal = causalIds.map((id) => contributionById.get(id));
  const residual = residualIds.map((id) => contributionById.get(id));
  if (causalForm === "single_necessary" && causal.length !== 1) {
    throw new ResearchContractCError("causal_cardinality_mismatch", "single_necessary requires one causal contribution");
  }
  if (["independent_sufficient_alternatives", "jointly_sufficient"].includes(causalForm) && causal.length < 2) {
    throw new ResearchContractCError("causal_cardinality_mismatch", `${causalForm} requires at least two causal contributions`);
  }
  if (causalForm === "redundant_non_deciding" && causal.length !== 0) {
    throw new ResearchContractCError("causal_cardinality_mismatch", "redundant_non_deciding cannot have causal contributions");
  }

  return { causal_form: causalForm, causal, residual };
}

export function consumeMinimalInBand({ bytes, expectedProfile, contractBIndex }) {
  const externalProfile = requireObject(expectedProfile, "expectedProfile");
  const raw = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  const actualDigest = wholeObjectSha256(raw);
  if (actualDigest !== externalProfile.whole_object_sha256) {
    throw new ResearchContractCError("whole_object_mismatch", `expected ${externalProfile.whole_object_sha256}, got ${actualDigest}`);
  }

  let value;
  try {
    value = JSON.parse(raw.toString("utf8"));
  } catch (error) {
    throw new ResearchContractCError("invalid_json", `invalid JSON: ${error.message}`);
  }
  if (!raw.equals(canonicalBytes(value))) {
    throw new ResearchContractCError("noncanonical_transport", "research Contract C bytes are not canonical");
  }
  requireExactProfile(value, externalProfile);
  requireContractBBinding(value, contractBIndex);
  if (!RESULT_SET.test(value.result_set_id) || value.result_set_id !== resultSetId(value)) {
    throw new ResearchContractCError("result_set_identity_mismatch", "stale result-set identity");
  }
  if (externalProfile.result_set_id && value.result_set_id !== externalProfile.result_set_id) {
    throw new ResearchContractCError("result_set_authority_mismatch", "result-set identity does not match external expectation");
  }
  if (value.execution?.state !== "completed") {
    throw new ResearchContractCError("execution_state_mismatch", "research profile expects completed result set");
  }
  if (!Array.isArray(value.propositions) || value.propositions.length === 0) {
    throw new ResearchContractCError("invalid_shape", "Contract C must contain propositions");
  }

  const propositions = value.propositions.map((row) => {
    const proposition = validatePropositionBinding(row, contractBIndex);
    const contributions = (row.contributions || []).map((item) => validateContribution(item, contractBIndex));
    const participation = classifyParticipation(row, contributions);
    return {
      proposition,
      execution: structuredClone(row.execution),
      reported_verdict: row.conclusion?.reported_verdict ?? null,
      terminal_branch: row.conclusion?.terminal_branch ?? null,
      ...participation,
    };
  });

  return {
    contract_c_version: value.contract_c_version,
    result_set_id: value.result_set_id,
    exact_object_sha256: actualDigest,
    propositions,
  };
}

export function supportedClaimPolicyEquivalent(consumed, propositionId) {
  const proposition = consumed.propositions.find((item) => item.proposition.proposition_id === propositionId);
  if (!proposition) return { state: "failed", disposition: null, reason: "target_proposition_not_found" };
  if (proposition.execution?.state !== "completed") {
    return { state: "completed", disposition: "hold", reason: `contract_c_proposition_execution_${proposition.execution?.state}` };
  }
  if (proposition.execution?.completion !== "assessed") {
    return { state: "completed", disposition: "hold", reason: `contract_c_proposition_${proposition.execution?.completion}` };
  }
  if (proposition.reported_verdict !== "supported") {
    return { state: "completed", disposition: "hold", reason: "contract_c_reported_verdict_not_supported" };
  }
  return { state: "completed", disposition: "clear", reason: "contract_c_supported" };
}

export function unsafeNeutralImpliesClear(consumed, propositionId) {
  const proposition = consumed.propositions.find((item) => item.proposition.proposition_id === propositionId);
  if (!proposition) return "hold";
  return proposition.causal.some((item) => item.channel === "non_deciding") ? "clear" : "hold";
}

export function summarizeNeutralAttribution(consumed, propositionId) {
  const proposition = consumed.propositions.find((item) => item.proposition.proposition_id === propositionId);
  if (!proposition) throw new ResearchContractCError("target_missing", "target proposition is absent");
  const map = (item) => ({
    contribution_id: item.contribution_id,
    channel: item.channel,
    source_id: item.evidence_ref.source_id,
    passage_id: item.evidence_ref.passage_id,
    passage_sha256: item.evidence_ref.passage_sha256,
  });
  return {
    proposition_id: proposition.proposition.proposition_id,
    text_sha256: proposition.proposition.text_sha256,
    reported_verdict: proposition.reported_verdict,
    causal_form: proposition.causal_form,
    causal: proposition.causal.map(map),
    residual: proposition.residual.map(map),
  };
}
