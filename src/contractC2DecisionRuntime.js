import {
  SUPPORTED_CLAIM_VERIFICATION_POLICY,
  decideContractC2ToContractD,
} from "./contractC2Decision.js";
import {
  CAUSAL_BASIS_CITATION_POLICY,
  decideContractC2BasisCitationToContractD,
} from "./contractC2BasisCitationDecision.js";
import { ContractCDecisionError } from "./contractC2Ingress.js";

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
 * Small explicit dispatch boundary over the two maintained policies, applied
 * to exact Contract C 2.0.0 (Candidate A RC2) ingress.
 *
 * This mirrors src/contractCDecisionRuntime.js without changing it. Each
 * policy keeps its own C2 context validation, target semantics, Contract C2
 * reads, and Decision semantics. The runtime only selects the exact policy
 * implementation. It is not a generic registry or rule engine.
 */
export function evaluateContractC2Decision(options) {
  const key = policyKey(options?.decisionContext?.policy);

  switch (key) {
    case `${SUPPORTED_CLAIM_VERIFICATION_POLICY.id}@${SUPPORTED_CLAIM_VERIFICATION_POLICY.version}`:
      return decideContractC2ToContractD(options);
    case `${CAUSAL_BASIS_CITATION_POLICY.id}@${CAUSAL_BASIS_CITATION_POLICY.version}`:
      return decideContractC2BasisCitationToContractD(options);
    default:
      throw new ContractCDecisionError(
        "unsupported_policy",
        `unsupported Decision policy: ${key}`,
      );
  }
}
