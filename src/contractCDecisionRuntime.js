import {
  SUPPORTED_CLAIM_VERIFICATION_POLICY,
  decideContractCToContractD,
} from "./contractCDecision.js";
import {
  CAUSAL_BASIS_CITATION_POLICY,
  decideContractCBasisCitationToContractD,
} from "./contractCBasisCitationDecision.js";
import { ContractCDecisionError } from "./contractCIngress.js";

function policyKey(policy) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractCDecisionError("invalid_context", "decisionContext.policy must be an object");
  }
  if (typeof policy.id !== "string" || !policy.id || typeof policy.version !== "string" || !policy.version) {
    throw new ContractCDecisionError(
      "invalid_context",
      "decisionContext.policy must contain non-empty id and version strings",
    );
  }
  return `${policy.id}@${policy.version}`;
}

/**
 * Small explicit dispatch boundary over the two demonstrated maintained policies.
 *
 * This is intentionally not a generic registry or rule engine. Each policy keeps
 * its own context validation, target semantics, Contract C reads, and Decision
 * semantics. The runtime only selects the exact policy implementation.
 */
export function evaluateContractCDecision(options) {
  const key = policyKey(options?.decisionContext?.policy);

  switch (key) {
    case `${SUPPORTED_CLAIM_VERIFICATION_POLICY.id}@${SUPPORTED_CLAIM_VERIFICATION_POLICY.version}`:
      return decideContractCToContractD(options);
    case `${CAUSAL_BASIS_CITATION_POLICY.id}@${CAUSAL_BASIS_CITATION_POLICY.version}`:
      return decideContractCBasisCitationToContractD(options);
    default:
      throw new ContractCDecisionError(
        "unsupported_policy",
        `unsupported Decision policy: ${key}`,
      );
  }
}
