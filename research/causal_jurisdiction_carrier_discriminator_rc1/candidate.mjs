import { createHash } from "node:crypto";

import {
  SUPPORTED_CLAIM_VERIFICATION_POLICY,
  decideContractC2ToContractD,
} from "../../src/contractC2Decision.js";
import {
  ContractCDecisionError,
  loadExactContractC2ForDecision,
} from "../../src/contractC2Ingress.js";

const SHA256_ID = /^sha256:[0-9a-f]{64}$/;
const PROFILE = "causal-jurisdiction-manifest-rc1";
const ORDINARY = "ordinary_categorical_support";
const CAUSAL_ASSERTION = "explicit_source_assertion_only";

function exactKeys(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ContractCDecisionError("invalid_jurisdiction_manifest", label + " must be an object");
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    throw new ContractCDecisionError(
      "invalid_jurisdiction_manifest",
      label + " must contain exactly: " + wanted.join(", "),
    );
  }
}

function sha256Id(bytes) {
  return "sha256:" + createHash("sha256").update(bytes).digest("hex");
}

function parseManifest(manifestBytes, expectedManifestSha256) {
  if (!Buffer.isBuffer(manifestBytes) && !(manifestBytes instanceof Uint8Array)) {
    throw new ContractCDecisionError(
      "missing_jurisdiction_manifest",
      "manifestBytes must be exact bytes",
    );
  }
  if (typeof expectedManifestSha256 !== "string" || !SHA256_ID.test(expectedManifestSha256)) {
    throw new ContractCDecisionError(
      "invalid_jurisdiction_authority",
      "expectedManifestSha256 must be sha256:<64 lowercase hex>",
    );
  }

  const bytes = Buffer.isBuffer(manifestBytes) ? manifestBytes : Buffer.from(manifestBytes);
  const actualSha = sha256Id(bytes);
  if (actualSha !== expectedManifestSha256) {
    throw new ContractCDecisionError(
      "jurisdiction_manifest_authority_mismatch",
      "jurisdiction manifest bytes do not match independently expected digest",
    );
  }

  let value;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    throw new ContractCDecisionError(
      "invalid_jurisdiction_manifest",
      "jurisdiction manifest is not valid JSON: " + error.message,
    );
  }

  exactKeys(
    value,
    [
      "profile",
      "contract_c2_sha256",
      "proposition_id",
      "content_sha256",
      "semantic_jurisdiction",
    ],
    "jurisdiction manifest",
  );

  if (value.profile !== PROFILE) {
    throw new ContractCDecisionError(
      "invalid_jurisdiction_manifest",
      "unsupported jurisdiction manifest profile",
    );
  }
  if (typeof value.contract_c2_sha256 !== "string" || !SHA256_ID.test(value.contract_c2_sha256)) {
    throw new ContractCDecisionError(
      "invalid_jurisdiction_manifest",
      "contract_c2_sha256 must be sha256:<64 lowercase hex>",
    );
  }
  if (typeof value.content_sha256 !== "string" || !SHA256_ID.test(value.content_sha256)) {
    throw new ContractCDecisionError(
      "invalid_jurisdiction_manifest",
      "content_sha256 must be sha256:<64 lowercase hex>",
    );
  }
  if (typeof value.proposition_id !== "string" || value.proposition_id.length === 0) {
    throw new ContractCDecisionError(
      "invalid_jurisdiction_manifest",
      "proposition_id must be non-empty",
    );
  }
  if (![ORDINARY, CAUSAL_ASSERTION].includes(value.semantic_jurisdiction)) {
    throw new ContractCDecisionError(
      "unsupported_semantic_jurisdiction",
      "semantic_jurisdiction is outside the frozen carrier vocabulary",
    );
  }

  return { value, exactManifestSha256: actualSha };
}

function validateDecisionContextBinding(contractC2, decisionContext) {
  exactKeys(
    decisionContext,
    ["policy", "proposition_id", "target"],
    "decisionContext",
  );
  exactKeys(decisionContext.policy, ["id", "version"], "decisionContext.policy");
  if (
    decisionContext.policy.id !== SUPPORTED_CLAIM_VERIFICATION_POLICY.id ||
    decisionContext.policy.version !== SUPPORTED_CLAIM_VERIFICATION_POLICY.version
  ) {
    throw new ContractCDecisionError(
      "unsupported_policy",
      "carrier gate is bounded to the existing supported-claim policy",
    );
  }
  exactKeys(decisionContext.target, ["kind", "id", "content_sha256"], "decisionContext.target");
  if (decisionContext.target.kind !== "claim") {
    throw new ContractCDecisionError("invalid_context", "target.kind must be claim");
  }

  const proposition = contractC2.propositions.find(
    (item) => item.proposition.proposition_id === decisionContext.proposition_id,
  );
  if (!proposition) {
    throw new ContractCDecisionError(
      "target_proposition_not_found",
      "Decision proposition is absent from exact Contract C2",
    );
  }
  if (
    decisionContext.target.id !== proposition.proposition.proposition_id ||
    decisionContext.target.content_sha256 !== proposition.proposition.content_sha256
  ) {
    throw new ContractCDecisionError(
      "target_binding_mismatch",
      "Decision target does not match exact Contract C2 proposition",
    );
  }
  return proposition;
}

export function gateSupportedClaimByJurisdiction({
  contractC2Bytes,
  expectedContractC2Sha256,
  contractC2AuthorityRoot,
  expectedContractB,
  decisionContext,
  manifestBytes,
  expectedManifestSha256,
  pythonExecutable = undefined,
}) {
  const contractC2 = loadExactContractC2ForDecision({
    contractC2Bytes,
    expectedContractC2Sha256,
    contractC2AuthorityRoot,
    expectedContractB,
    pythonExecutable,
  });
  const proposition = validateDecisionContextBinding(contractC2, decisionContext);
  const { value: manifest, exactManifestSha256 } = parseManifest(
    manifestBytes,
    expectedManifestSha256,
  );

  if (manifest.contract_c2_sha256 !== expectedContractC2Sha256) {
    throw new ContractCDecisionError(
      "jurisdiction_contract_c_binding_mismatch",
      "manifest is not bound to this exact Contract C2 object",
    );
  }
  if (manifest.proposition_id !== proposition.proposition.proposition_id) {
    throw new ContractCDecisionError(
      "jurisdiction_proposition_binding_mismatch",
      "manifest proposition_id does not match exact Contract C2 proposition",
    );
  }
  if (manifest.content_sha256 !== proposition.proposition.content_sha256) {
    throw new ContractCDecisionError(
      "jurisdiction_proposition_binding_mismatch",
      "manifest content_sha256 does not match exact Contract C2 proposition",
    );
  }

  const authority = {
    profile: PROFILE,
    immutable_id: exactManifestSha256,
    semantic_jurisdiction: manifest.semantic_jurisdiction,
  };

  if (manifest.semantic_jurisdiction === CAUSAL_ASSERTION) {
    return {
      route: "dedicated_causal_required",
      decision: null,
      jurisdiction_authority: authority,
    };
  }

  const decision = decideContractC2ToContractD({
    contractC2Bytes,
    expectedContractC2Sha256,
    contractC2AuthorityRoot,
    expectedContractB,
    decisionContext,
    pythonExecutable,
  });
  return {
    route: "generic_supported_claim",
    decision,
    jurisdiction_authority: authority,
  };
}
