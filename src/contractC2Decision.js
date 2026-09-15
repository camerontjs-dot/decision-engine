import { materializeBoundDecision } from "./decisionMaterializer.js";
import {
  CONTRACT_C2_AUTHORITY,
  ContractCDecisionError,
  contractC2InputAuthority,
  loadExactContractC2ForDecision,
} from "./contractC2Ingress.js";

export { CONTRACT_C2_AUTHORITY, ContractCDecisionError };

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

function reasonForHold(contractC2, proposition) {
  if (contractC2.execution.state !== "completed") {
    return `contract_c_result_execution_${contractC2.execution.state}`;
  }
  if (proposition.execution.state !== "completed") {
    return `contract_c_proposition_execution_${proposition.execution.state}`;
  }
  if (
    proposition.terminal?.verdict === "not_checkable" &&
    proposition.terminal?.reason === "UNSUPPORTED_SEMANTIC_FAMILY"
  ) {
    return "contract_c_unsupported_semantic_family_not_supported";
  }
  if (
    proposition.terminal?.verdict === "not_checkable" &&
    proposition.terminal?.reason === "no_deciding_relation"
  ) {
    return "contract_c_no_deciding_relation_not_supported";
  }
  if (proposition.execution.completion !== "assessed") {
    return `contract_c_proposition_${proposition.execution.completion}`;
  }
  if (!proposition.terminal || proposition.terminal.verdict !== "supported") {
    return "contract_c_terminal_verdict_not_supported";
  }
  if (proposition.terminal.reason !== "categorical_support") {
    return "contract_c_terminal_reason_not_categorical_support";
  }
  return null;
}

function stateDiagnostics(contractC2, proposition) {
  return {
    contract_c_version: "2.0.0",
    wire_profile: CONTRACT_C2_AUTHORITY.wireProfile,
    result_execution: contractC2.execution.state,
    proposition_execution: proposition.execution.state,
    proposition_completion:
      proposition.execution.state === "completed" ? proposition.execution.completion : null,
    terminal_verdict: proposition.terminal?.verdict ?? null,
    terminal_reason: proposition.terminal?.reason ?? null,
  };
}

function buildDecision(contractC2, exactContractC2Sha256, decisionContext) {
  const inputAuthority = contractC2InputAuthority(contractC2, exactContractC2Sha256);
  const policy = {
    id: SUPPORTED_CLAIM_VERIFICATION_POLICY.id,
    version: SUPPORTED_CLAIM_VERIFICATION_POLICY.version,
  };
  const target = structuredClone(decisionContext.target);

  const proposition = contractC2.propositions.find(
    (item) => item.proposition.proposition_id === decisionContext.proposition_id,
  );

  if (!proposition) {
    return materializeBoundDecision({
      inputAuthority,
      policy,
      target,
      decisionFragment: {
        evaluation: { state: "failed" },
        metadata: {
          reason_codes: ["target_proposition_not_found"],
          diagnostics: {
            proposition_id: decisionContext.proposition_id,
            contract_c_version: "2.0.0",
          },
        },
      },
    });
  }

  if (target.id !== proposition.proposition.proposition_id) {
    throw new ContractCDecisionError(
      "target_binding_mismatch",
      "Decision target id must equal the exact Contract C2 proposition id",
    );
  }
  if (target.content_sha256 !== proposition.proposition.content_sha256) {
    throw new ContractCDecisionError(
      "target_binding_mismatch",
      "Decision target content hash must equal the exact Contract C2 proposition content hash",
    );
  }

  const holdReason = reasonForHold(contractC2, proposition);
  const disposition = holdReason ? "hold" : "clear";
  const reasonCodes = holdReason ? [holdReason] : ["contract_c_supported"];

  return materializeBoundDecision({
    inputAuthority,
    policy,
    target,
    decisionFragment: {
      evaluation: { state: "completed", disposition },
      effect: structuredClone(SUPPORTED_CLAIM_VERIFICATION_POLICY.effect),
      metadata: {
        reason_codes: reasonCodes,
        diagnostics: { contract_c_state: stateDiagnostics(contractC2, proposition) },
      },
    },
  });
}

/**
 * Bounded Contract C 2.0.0 (Candidate A RC2) -> Decision -> Contract D 1.0.0 path
 * for the supported-claim verification policy.
 *
 * Same policy identity, effect, and Contract D output as the maintained C1
 * path. Only the ingress authority and the C2 terminal-state read differ.
 * No Authorization and no external mutation. A CLEAR Decision can become only
 * a downstream candidate for Authorization under Contract D.
 */
export function decideContractC2ToContractD({
  contractC2Bytes,
  expectedContractC2Sha256,
  contractC2AuthorityRoot,
  expectedContractB,
  decisionContext,
  pythonExecutable = undefined,
}) {
  validateDecisionContext(decisionContext);
  const contractC2 = loadExactContractC2ForDecision({
    contractC2Bytes,
    expectedContractC2Sha256,
    contractC2AuthorityRoot,
    expectedContractB,
    pythonExecutable,
  });
  return buildDecision(contractC2, expectedContractC2Sha256, decisionContext);
}
