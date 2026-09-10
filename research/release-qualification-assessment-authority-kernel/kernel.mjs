import { exportContractD } from "../../src/contractD.js";
import { canonicalizeContractDWithAuthority } from "../../src/contractDCanonicalOutput.js";
import { canonicalBytes, sha256Bytes, sha256Json } from "./canonical.mjs";

const SHA256_RE = /^sha256:[0-9a-f]{64}$/;

export class AuthorityPolicyKernelError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "AuthorityPolicyKernelError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new AuthorityPolicyKernelError(code, message);
}

function plainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value, required, label) {
  if (!plainObject(value)) {
    fail("invalid_assessment_authority", `${label} must be an object`);
  }
  const actual = Object.keys(value).sort();
  const expected = [...required].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail("invalid_assessment_authority", `${label} keys must be exactly ${expected.join(",")}`);
  }
}

function nonEmptyString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    fail("invalid_assessment_authority", `${label} must be a non-empty string`);
  }
  return value;
}

function stringArray(value, label) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.length === 0)) {
    fail("invalid_assessment_authority", `${label} must be an array of non-empty strings`);
  }
  return value;
}

function validateAssessmentAuthority(value) {
  exactKeys(
    value,
    [
      "assessment_authority_version",
      "authority",
      "completion",
      "evidence",
      "execution",
      "state",
      "subject",
      "subject_content",
    ],
    "$",
  );
  if (value.assessment_authority_version !== "assessment-authority/research-0") {
    fail("invalid_assessment_authority", "unsupported assessment authority version");
  }

  exactKeys(value.authority, ["logical_id", "producer"], "$.authority");
  nonEmptyString(value.authority.logical_id, "$.authority.logical_id");
  exactKeys(value.authority.producer, ["id", "implementation_sha256", "version"], "$.authority.producer");
  nonEmptyString(value.authority.producer.id, "$.authority.producer.id");
  nonEmptyString(value.authority.producer.version, "$.authority.producer.version");
  if (!SHA256_RE.test(value.authority.producer.implementation_sha256)) {
    fail("invalid_assessment_authority", "$.authority.producer.implementation_sha256 must be sha256");
  }

  exactKeys(value.subject, ["content_sha256", "id", "kind"], "$.subject");
  nonEmptyString(value.subject.kind, "$.subject.kind");
  nonEmptyString(value.subject.id, "$.subject.id");
  if (!SHA256_RE.test(value.subject.content_sha256)) {
    fail("invalid_assessment_authority", "$.subject.content_sha256 must be sha256");
  }
  if (!plainObject(value.subject_content)) {
    fail("invalid_assessment_authority", "$.subject_content must be an object");
  }
  if (sha256Json(value.subject_content) !== value.subject.content_sha256) {
    fail("invalid_assessment_authority", "subject content digest mismatch");
  }

  exactKeys(value.execution, ["state"], "$.execution");
  nonEmptyString(value.execution.state, "$.execution.state");
  exactKeys(value.completion, ["state"], "$.completion");
  nonEmptyString(value.completion.state, "$.completion.state");

  exactKeys(value.state, ["basis", "outcome", "residual", "unknowns"], "$.state");
  nonEmptyString(value.state.outcome, "$.state.outcome");
  const basis = stringArray(value.state.basis, "$.state.basis");
  const residual = stringArray(value.state.residual, "$.state.residual");
  stringArray(value.state.unknowns, "$.state.unknowns");

  if (!Array.isArray(value.evidence)) {
    fail("invalid_assessment_authority", "$.evidence must be an array");
  }
  const evidenceIds = new Set();
  for (const [index, item] of value.evidence.entries()) {
    exactKeys(item, ["detail_sha256", "id", "immutable_id", "kind", "status"], `$.evidence[${index}]`);
    for (const key of ["id", "immutable_id", "kind", "status"]) {
      nonEmptyString(item[key], `$.evidence[${index}].${key}`);
    }
    if (!SHA256_RE.test(item.detail_sha256)) {
      fail("invalid_assessment_authority", `$.evidence[${index}].detail_sha256 must be sha256`);
    }
    if (evidenceIds.has(item.id)) {
      fail("invalid_assessment_authority", `duplicate evidence id ${item.id}`);
    }
    evidenceIds.add(item.id);
  }

  for (const id of [...basis, ...residual]) {
    if (!evidenceIds.has(id)) {
      fail("invalid_assessment_authority", `state references missing evidence ${id}`);
    }
  }
  const overlap = basis.filter((id) => residual.includes(id));
  if (overlap.length > 0) {
    fail("invalid_assessment_authority", `basis/residual overlap: ${overlap.join(",")}`);
  }

  return value;
}

function parseBoundAuthority(authorityBytes, expectedAuthoritySha256) {
  if (!Buffer.isBuffer(authorityBytes)) {
    fail("invalid_assessment_authority", "authorityBytes must be a Buffer");
  }
  if (!SHA256_RE.test(expectedAuthoritySha256)) {
    fail("invalid_expected_authority_identity", "expected authority identity must be sha256");
  }
  const actual = sha256Bytes(authorityBytes);
  if (actual !== expectedAuthoritySha256) {
    fail("authority_whole_object_mismatch", `expected ${expectedAuthoritySha256}, got ${actual}`);
  }

  let value;
  try {
    value = JSON.parse(authorityBytes.toString("utf8"));
  } catch (error) {
    fail("invalid_assessment_authority", `cannot parse authority bytes: ${error.message}`);
  }
  validateAssessmentAuthority(value);
  if (!canonicalBytes(value).equals(authorityBytes)) {
    fail("noncanonical_assessment_authority", "authority bytes must equal canonical research encoding");
  }
  return { value, immutableId: actual };
}

function validateTargetExpectation(target) {
  exactKeys(target, ["content_sha256", "id", "kind"], "target");
  nonEmptyString(target.kind, "target.kind");
  nonEmptyString(target.id, "target.id");
  if (!SHA256_RE.test(target.content_sha256)) {
    fail("invalid_target_expectation", "target.content_sha256 must be sha256");
  }
}

function bindTarget(authority, target) {
  validateTargetExpectation(target);
  for (const key of ["kind", "id", "content_sha256"]) {
    if (authority.subject[key] !== target[key]) {
      fail("target_binding_mismatch", `target ${key} does not match bound authority subject`);
    }
  }
}

function validatePolicyIdentity(policy) {
  exactKeys(policy, ["id", "version"], "policy");
  nonEmptyString(policy.id, "policy.id");
  nonEmptyString(policy.version, "policy.version");
}

function policyKey(policy) {
  return `${policy.id}@${policy.version}`;
}

function normalizePolicyResult(result) {
  if (!plainObject(result)) {
    fail("invalid_policy_result", "policy result must be an object");
  }
  if (result.state === "failed") {
    if ("effect" in result) {
      fail("invalid_policy_result", "failed policy result cannot carry an effect");
    }
    return {
      evaluation: { state: "failed" },
      metadata: result.metadata,
    };
  }
  if (result.state !== "completed" || !["clear", "hold"].includes(result.disposition)) {
    fail("invalid_policy_result", "completed policy result must be clear or hold");
  }
  if (!plainObject(result.effect)) {
    fail("invalid_policy_result", "completed policy result must carry an effect");
  }
  return {
    evaluation: { state: "completed", disposition: result.disposition },
    effect: result.effect,
    metadata: result.metadata,
  };
}

export function evaluateAuthorityBoundPolicy({
  authorityBytes,
  expectedAuthoritySha256,
  target,
  policy,
  policyRegistry,
  contractDAuthorityRoot,
}) {
  const bound = parseBoundAuthority(authorityBytes, expectedAuthoritySha256);
  bindTarget(bound.value, target);
  validatePolicyIdentity(policy);

  const evaluator = policyRegistry.get(policyKey(policy));
  if (typeof evaluator !== "function") {
    fail("unknown_policy", `unknown policy ${policyKey(policy)}`);
  }

  const normalized = normalizePolicyResult(evaluator(bound.value));
  const decisionState = {
    input_authority: {
      kind: "assessment_authority",
      id: bound.value.authority.logical_id,
      immutable_id: bound.immutableId,
    },
    policy: {
      id: policy.id,
      version: policy.version,
    },
    target: {
      kind: target.kind,
      id: target.id,
      content_sha256: target.content_sha256,
    },
    evaluation: normalized.evaluation,
  };

  if (normalized.effect) {
    decisionState.effect = normalized.effect;
  }
  if (normalized.metadata) {
    decisionState.metadata = normalized.metadata;
  }

  const decision = exportContractD(decisionState);
  const bytes = canonicalizeContractDWithAuthority({
    decision,
    contractDAuthorityRoot,
  });
  return {
    authority: bound.value,
    decision,
    bytes,
  };
}
