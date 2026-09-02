import { exportContractD } from "./contractD.js";
import {
  CONTRACT_C_AUTHORITY,
  ContractCDecisionError,
  contractCInputAuthority,
  loadExactContractCForDecision,
} from "./contractCIngress.js";

export { CONTRACT_C_AUTHORITY, ContractCDecisionError };

export const SUPPORTED_CLAIM_VERIFICATION_POLICY = Object.freeze({
  id: "decision-engine.contract-c.supported-claim-verification",
  version: "1.0.0",
  effect: Object.freeze({
    type: "knowledge.add_verified_tag",
    version: "1",
    params: Object.freeze({ scope: "claim" }),
  }),
});

const SHA256_ID = /^sha256:[0-9a-f]{64}$/;

function exactKeys(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ContractCDecisionError("invalid_context", `${label} must be an object`);
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    throw new ContractCDecisionError(
      "invalid_context",
      `${label} must contain exactly: ${wanted.join(", ")}`,
    );
  }
}

function nonEmptyString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new ContractCDecisionError("invalid_context", `${label} must be a non-empty string`);
  }
}

function validateDecisionContext(decisionContext) {
  exactKeys(decisionContext, ["policy", "proposition_id", "target"], "decisionContext");
  exactKeys(decisionContext.policy, ["id", "version"], "decisionContext.policy");
  if (
    decisionContext.policy.id !== SUPPORTED_CLAIM_VERIFICATION_POLICY.id ||
    decisionContext.policy.version !== SUPPORTED_CLAIM_VERIFICATION_POLICY.version
  ) {
    throw new ContractCDecisionError(
      "unsupported_policy",
      `only ${SUPPORTED_CLAIM_VERIFICATION_POLICY.id}@${SUPPORTED_CLAIM_VERIFICATION_POLICY.version} is supported`,
    );
  }

  nonEmptyString(decisionContext.proposition_id, "decisionContext.proposition_id");
  exactKeys(decisionContext.target, ["kind", "id", "content_sha256"], "decisionContext.target");
  if (decisionContext.target.kind !== "claim") {
    throw new ContractCDecisionError("invalid_context", "decisionContext.target.kind must be claim");
  }
  nonEmptyString(decisionContext.target.id, "decisionContext.target.id");
  if (
    typeof decisionContext.target.content_sha256 !== "string" ||
    !SHA256_ID.test(decisionContext.target.content_sha256)
  ) {
    throw new ContractCDecisionError(
      "invalid_context",
      "decisionContext.target.content_sha256 must be sha256:<64 lowercase hex>",
    );
  }
}

function reasonForHold(contractC, proposition) {
  if (contractC.execution.state !== "completed") {
    return `contract_c_result_execution_${contractC.execution.state}`;
  }
  if (proposition.execution.state !== "completed") {
    return `contract_c_proposition_execution_${proposition.execution.state}`;
  }
  if (proposition.execution.completion !== "assessed") {
    return `contract_c_proposition_${proposition.execution.completion}`;
  }
  if (proposition.conclusion.reported_verdict !== "supported") {
    return "contract_c_reported_verdict_not_supported";
  }
  return null;
}

function stateDiagnostics(contractC, proposition) {
  return {
    result_execution: contractC.execution.state,
    proposition_execution: proposition.execution.state,
    proposition_completion:
      proposition.execution.state === "completed" ? proposition.execution.completion : null,
    reported_verdict: proposition.conclusion?.reported_verdict ?? null,
  };
}

function buildDecision(contractC, exactContractCSha256, decisionContext) {
  const inputAuthority = contractCInputAuthority(contractC, exactContractCSha256);
  const policy = {
    id: SUPPORTED_CLAIM_VERIFICATION_POLICY.id,
    version: SUPPORTED_CLAIM_VERIFICATION_POLICY.version,
  };
  const target = structuredClone(decisionContext.target);

  const proposition = contractC.propositions.find(
    (item) => item.proposition.proposition_id === decisionContext.proposition_id,
  );

  if (!proposition) {
    return exportContractD({
      input_authority: inputAuthority,
      policy,
      target,
      evaluation: { state: "failed" },
      metadata: {
        reason_codes: ["target_proposition_not_found"],
        diagnostics: { proposition_id: decisionContext.proposition_id },
      },
    });
  }

  if (target.id !== proposition.proposition.proposition_id) {
    throw new ContractCDecisionError(
      "target_binding_mismatch",
      "Decision target id must equal the exact Contract C proposition id",
    );
  }
  const expectedTargetHash = `sha256:${proposition.proposition.text_sha256}`;
  if (target.content_sha256 !== expectedTargetHash) {
    throw new ContractCDecisionError(
      "target_binding_mismatch",
      "Decision target content hash must equal the exact Contract C proposition text hash",
    );
  }

  const holdReason = reasonForHold(contractC, proposition);
  const disposition = holdReason ? "hold" : "clear";
  const reasonCodes = holdReason ? [holdReason] : ["contract_c_supported"];

  return exportContractD({
    input_authority: inputAuthority,
    policy,
    target,
    evaluation: { state: "completed", disposition },
    effect: structuredClone(SUPPORTED_CLAIM_VERIFICATION_POLICY.effect),
    metadata: {
      reason_codes: reasonCodes,
      diagnostics: { contract_c_state: stateDiagnostics(contractC, proposition) },
    },
  });
}

/**
 * Maintained bounded Contract C 1.0.0 -> Decision -> Contract D 1.0.0 path.
 *
 * This function performs no Authorization and no external mutation. A CLEAR
 * Decision can become only a downstream candidate for Authorization under
 * Contract D. Invalid or unbound Contract C input produces no Decision.
 */
export function decideContractCToContractD({
  contractCBytes,
  expectedContractCSha256,
  contractCAuthorityRoot,
  expectedContractB,
  decisionContext,
  pythonExecutable = undefined,
}) {
  validateDecisionContext(decisionContext);
  const contractC = loadExactContractCForDecision({
    contractCBytes,
    expectedContractCSha256,
    contractCAuthorityRoot,
    expectedContractB,
    pythonExecutable,
  });
  return buildDecision(contractC, expectedContractCSha256, decisionContext);
}
