import {
  SUPPORTED_CLAIM_VERIFICATION_POLICY,
} from "../../src/contractCDecision.js";
import {
  CAUSAL_BASIS_CITATION_POLICY,
} from "../../src/contractCBasisCitationDecision.js";

function completed(disposition, effect, reason, diagnostics) {
  return {
    state: "completed",
    disposition,
    effect: structuredClone(effect),
    metadata: {
      reason_codes: [reason],
      diagnostics,
    },
  };
}

function failed(reason, diagnostics) {
  return {
    state: "failed",
    metadata: {
      reason_codes: [reason],
      diagnostics,
    },
  };
}

function supportedClaimProjection({ authority, resolution }) {
  const proposition = resolution.proposition;
  if (!proposition) {
    return failed("target_proposition_not_found", {
      proposition_id: resolution.propositionId,
    });
  }

  let reason = null;
  if (authority.execution.state !== "completed") {
    reason = `contract_c_result_execution_${authority.execution.state}`;
  } else if (proposition.execution.state !== "completed") {
    reason = `contract_c_proposition_execution_${proposition.execution.state}`;
  } else if (proposition.execution.completion !== "assessed") {
    reason = `contract_c_proposition_${proposition.execution.completion}`;
  } else if (proposition.conclusion.reported_verdict !== "supported") {
    reason = "contract_c_reported_verdict_not_supported";
  }

  const diagnostics = {
    contract_c_state: {
      result_execution: authority.execution.state,
      proposition_execution: proposition.execution.state,
      proposition_completion:
        proposition.execution.state === "completed" ? proposition.execution.completion : null,
      reported_verdict: proposition.conclusion?.reported_verdict ?? null,
    },
  };

  return completed(
    reason ? "hold" : "clear",
    SUPPORTED_CLAIM_VERIFICATION_POLICY.effect,
    reason || "contract_c_supported",
    diagnostics,
  );
}

function causalBasisCitationProjection({ authority, resolution }) {
  const proposition = resolution.proposition;
  if (!proposition) {
    return failed("target_proposition_not_found", {
      proposition_id: resolution.propositionId,
    });
  }

  const contribution = resolution.contribution;
  if (!contribution) {
    return failed("target_contribution_not_found", {
      proposition_id: resolution.propositionId,
      contribution_id: resolution.contributionId,
    });
  }

  let reason = null;
  if (authority.execution.state !== "completed") {
    reason = `contract_c_result_execution_${authority.execution.state}`;
  } else if (proposition.execution.state !== "completed") {
    reason = `contract_c_proposition_execution_${proposition.execution.state}`;
  } else if (proposition.execution.completion !== "assessed") {
    reason = `contract_c_proposition_${proposition.execution.completion}`;
  } else {
    const causalContributionIds = new Set(
      proposition.conclusion.basis_members
        .filter((member) => member.namespace === "contribution")
        .map((member) => member.id),
    );
    if (!causalContributionIds.has(contribution.contribution_id)) {
      reason = "contract_c_contribution_residual_non_deciding";
    }
  }

  return completed(
    reason ? "hold" : "clear",
    CAUSAL_BASIS_CITATION_POLICY.effect,
    reason || "contract_c_contribution_in_causal_basis",
    {
      result_execution: authority.execution.state,
      proposition_execution: proposition.execution.state,
      proposition_completion:
        proposition.execution.state === "completed" ? proposition.execution.completion : null,
      contribution_channel: contribution.channel,
      basis_membership:
        proposition.execution.state === "completed" && proposition.conclusion
          ? proposition.conclusion.basis_members.some(
              (member) =>
                member.namespace === "contribution" && member.id === contribution.contribution_id,
            )
          : false,
    },
  );
}

export const CONTRACT_C_PROJECTION_POLICY_REGISTRY = new Map([
  [
    `${SUPPORTED_CLAIM_VERIFICATION_POLICY.id}@${SUPPORTED_CLAIM_VERIFICATION_POLICY.version}`,
    supportedClaimProjection,
  ],
  [
    `${CAUSAL_BASIS_CITATION_POLICY.id}@${CAUSAL_BASIS_CITATION_POLICY.version}`,
    causalBasisCitationProjection,
  ],
]);
