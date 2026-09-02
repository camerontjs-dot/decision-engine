import { createHash } from "node:crypto";

import { exportContractD } from "./contractD.js";
import {
  ContractCDecisionError,
  contractCInputAuthority,
  loadExactContractCForDecision,
} from "./contractCIngress.js";

export const CAUSAL_BASIS_CITATION_POLICY = Object.freeze({
  id: "decision-engine.contract-c.causal-basis-citation",
  version: "1.0.0",
  effect: Object.freeze({
    type: "knowledge.cite_as_evidence",
    version: "1",
    params: Object.freeze({}),
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

function sha256Hex(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
  }
  return value;
}

function canonicalTargetProjectionBytes(value) {
  return Buffer.from(JSON.stringify(sortValue(value)) + "\n", "utf8");
}

function validateDecisionContext(decisionContext) {
  exactKeys(
    decisionContext,
    ["policy", "proposition_id", "contribution_id", "target"],
    "decisionContext",
  );
  exactKeys(decisionContext.policy, ["id", "version"], "decisionContext.policy");
  if (
    decisionContext.policy.id !== CAUSAL_BASIS_CITATION_POLICY.id ||
    decisionContext.policy.version !== CAUSAL_BASIS_CITATION_POLICY.version
  ) {
    throw new ContractCDecisionError(
      "unsupported_policy",
      `only ${CAUSAL_BASIS_CITATION_POLICY.id}@${CAUSAL_BASIS_CITATION_POLICY.version} is supported`,
    );
  }

  nonEmptyString(decisionContext.proposition_id, "decisionContext.proposition_id");
  nonEmptyString(decisionContext.contribution_id, "decisionContext.contribution_id");
  exactKeys(decisionContext.target, ["kind", "id", "content_sha256"], "decisionContext.target");
  if (decisionContext.target.kind !== "claim-evidence-link") {
    throw new ContractCDecisionError(
      "invalid_context",
      "decisionContext.target.kind must be claim-evidence-link",
    );
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

function targetProjection(proposition, contribution) {
  return {
    proposition: {
      proposition_id: proposition.proposition.proposition_id,
      text_sha256: proposition.proposition.text_sha256,
    },
    contribution: {
      contribution_id: contribution.contribution_id,
      channel: contribution.channel,
      evidence_ref: structuredClone(contribution.evidence_ref),
    },
  };
}

/**
 * Derive this policy's exact target from an already validated Contract C object.
 * The helper does not validate Contract C and must not be used as an ingress substitute.
 */
export function citationTargetForContractC(contractC, propositionId, contributionId) {
  const proposition = contractC.propositions.find(
    (item) => item.proposition.proposition_id === propositionId,
  );
  if (!proposition) return null;
  const contribution = proposition.contributions.find(
    (item) => item.contribution_id === contributionId,
  );
  if (!contribution) return null;

  const projection = targetProjection(proposition, contribution);
  return {
    kind: "claim-evidence-link",
    id: `claim-evidence-link:${propositionId}:${contributionId}`,
    content_sha256: `sha256:${sha256Hex(canonicalTargetProjectionBytes(projection))}`,
  };
}

function requireExactTargetBinding(contractC, decisionContext) {
  const expected = citationTargetForContractC(
    contractC,
    decisionContext.proposition_id,
    decisionContext.contribution_id,
  );
  if (!expected) return null;
  for (const key of ["kind", "id", "content_sha256"]) {
    if (decisionContext.target[key] !== expected[key]) {
      throw new ContractCDecisionError(
        "target_binding_mismatch",
        `Decision target ${key} must match the exact claim-evidence link derived from Contract C`,
      );
    }
  }
  return expected;
}

function reasonForHold(contractC, proposition, contribution) {
  if (contractC.execution.state !== "completed") {
    return `contract_c_result_execution_${contractC.execution.state}`;
  }
  if (proposition.execution.state !== "completed") {
    return `contract_c_proposition_execution_${proposition.execution.state}`;
  }
  if (proposition.execution.completion !== "assessed") {
    return `contract_c_proposition_${proposition.execution.completion}`;
  }
  const causalContributionIds = new Set(
    proposition.conclusion.basis_members
      .filter((member) => member.namespace === "contribution")
      .map((member) => member.id),
  );
  if (!causalContributionIds.has(contribution.contribution_id)) {
    return "contract_c_contribution_residual_non_deciding";
  }
  return null;
}

function buildDecision(contractC, exactContractCSha256, decisionContext) {
  const inputAuthority = contractCInputAuthority(contractC, exactContractCSha256);
  const policy = {
    id: CAUSAL_BASIS_CITATION_POLICY.id,
    version: CAUSAL_BASIS_CITATION_POLICY.version,
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

  const contribution = proposition.contributions.find(
    (item) => item.contribution_id === decisionContext.contribution_id,
  );
  if (!contribution) {
    return exportContractD({
      input_authority: inputAuthority,
      policy,
      target,
      evaluation: { state: "failed" },
      metadata: {
        reason_codes: ["target_contribution_not_found"],
        diagnostics: {
          proposition_id: decisionContext.proposition_id,
          contribution_id: decisionContext.contribution_id,
        },
      },
    });
  }

  requireExactTargetBinding(contractC, decisionContext);

  const holdReason = reasonForHold(contractC, proposition, contribution);
  const disposition = holdReason ? "hold" : "clear";

  return exportContractD({
    input_authority: inputAuthority,
    policy,
    target,
    evaluation: { state: "completed", disposition },
    effect: structuredClone(CAUSAL_BASIS_CITATION_POLICY.effect),
    metadata: {
      reason_codes: [holdReason || "contract_c_contribution_in_causal_basis"],
      diagnostics: {
        result_execution: contractC.execution.state,
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
    },
  });
}

/**
 * Maintained bounded causal-basis citation policy over exact Contract C 1.0.0.
 *
 * This function performs no Authorization, execution, or external mutation.
 */
export function decideContractCBasisCitationToContractD({
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
