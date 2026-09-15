import { createHash } from "node:crypto";

import { materializeBoundDecision } from "./decisionMaterializer.js";
import {
  ContractCDecisionError,
  contractC2InputAuthority,
  loadExactContractC2ForDecision,
} from "./contractC2Ingress.js";

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

function parseContributionId(contributionId) {
  const prefix = "evidence:";
  if (typeof contributionId !== "string" || !contributionId.startsWith(prefix)) {
    return null;
  }
  const rest = contributionId.slice(prefix.length);
  const split = rest.indexOf(":");
  if (split <= 0 || split === rest.length - 1) return null;
  return {
    source_id: rest.slice(0, split),
    passage_id: rest.slice(split + 1),
  };
}

function findParticipant(proposition, contributionId) {
  const ref = parseContributionId(contributionId);
  if (!ref) return null;
  return (
    proposition.participants.find(
      (row) =>
        row.evidence_ref.source_id === ref.source_id &&
        row.evidence_ref.passage_id === ref.passage_id,
    ) || null
  );
}

function targetProjection(proposition, participant) {
  return {
    proposition: {
      proposition_id: proposition.proposition.proposition_id,
      content_sha256: proposition.proposition.content_sha256,
    },
    contribution: {
      contribution_id: `evidence:${participant.evidence_ref.source_id}:${participant.evidence_ref.passage_id}`,
      relation: participant.relation,
      role: participant.role,
      evidence_ref: structuredClone(participant.evidence_ref),
    },
  };
}

/**
 * Derive this policy's exact target from an already validated Contract C2 object.
 * The helper does not validate Contract C2 and must not be used as an ingress substitute.
 */
export function citationTargetForContractC2(contractC2, propositionId, contributionId) {
  const proposition = contractC2.propositions.find(
    (item) => item.proposition.proposition_id === propositionId,
  );
  if (!proposition) return null;
  const participant = findParticipant(proposition, contributionId);
  if (!participant) return null;

  const projection = targetProjection(proposition, participant);
  return {
    kind: "claim-evidence-link",
    id: `claim-evidence-link:${propositionId}:${contributionId}`,
    content_sha256: `sha256:${sha256Hex(canonicalTargetProjectionBytes(projection))}`,
  };
}

function requireExactTargetBinding(contractC2, decisionContext) {
  const expected = citationTargetForContractC2(
    contractC2,
    decisionContext.proposition_id,
    decisionContext.contribution_id,
  );
  if (!expected) return null;
  for (const key of ["kind", "id", "content_sha256"]) {
    if (decisionContext.target[key] !== expected[key]) {
      throw new ContractCDecisionError(
        "target_binding_mismatch",
        `Decision target ${key} must match the exact claim-evidence link derived from Contract C2`,
      );
    }
  }
  return expected;
}

function isCausalBasisMember(proposition, participant) {
  if (!participant || participant.role !== "causal") return false;
  const key = `${participant.evidence_ref.source_id}\0${participant.evidence_ref.passage_id}`;
  for (const group of proposition.basis_groups) {
    for (const ref of group) {
      if (`${ref.source_id}\0${ref.passage_id}` === key) return true;
    }
  }
  return false;
}

function reasonForHold(contractC2, proposition, participant) {
  if (contractC2.execution.state !== "completed") {
    return `contract_c_result_execution_${contractC2.execution.state}`;
  }
  if (proposition.execution.state !== "completed") {
    return `contract_c_proposition_execution_${proposition.execution.state}`;
  }
  if (participant && participant.relation === "non_polarized" && participant.role === "residual") {
    if (
      proposition.terminal?.verdict === "not_checkable" &&
      proposition.terminal?.reason === "UNSUPPORTED_SEMANTIC_FAMILY"
    ) {
      return "contract_c_contribution_unsupported_family_non_deciding";
    }
    if (
      proposition.terminal?.verdict === "not_checkable" &&
      proposition.terminal?.reason === "no_deciding_relation"
    ) {
      return "contract_c_contribution_no_deciding_non_deciding";
    }
  }
  if (proposition.execution.completion !== "assessed") {
    return `contract_c_proposition_${proposition.execution.completion}`;
  }
  if (!isCausalBasisMember(proposition, participant)) {
    if (participant && participant.relation === "non_polarized" && participant.role === "residual") {
      if (
        proposition.terminal?.verdict === "not_checkable" &&
        proposition.terminal?.reason === "UNSUPPORTED_SEMANTIC_FAMILY"
      ) {
        return "contract_c_contribution_unsupported_family_non_deciding";
      }
      if (
        proposition.terminal?.verdict === "not_checkable" &&
        proposition.terminal?.reason === "no_deciding_relation"
      ) {
        return "contract_c_contribution_no_deciding_non_deciding";
      }
    }
    return "contract_c_contribution_residual_non_deciding";
  }
  return null;
}

function buildDecision(contractC2, exactContractC2Sha256, decisionContext) {
  const inputAuthority = contractC2InputAuthority(contractC2, exactContractC2Sha256);
  const policy = {
    id: CAUSAL_BASIS_CITATION_POLICY.id,
    version: CAUSAL_BASIS_CITATION_POLICY.version,
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

  const participant = findParticipant(proposition, decisionContext.contribution_id);
  if (!participant) {
    return materializeBoundDecision({
      inputAuthority,
      policy,
      target,
      decisionFragment: {
        evaluation: { state: "failed" },
        metadata: {
          reason_codes: ["target_contribution_not_found"],
          diagnostics: {
            proposition_id: decisionContext.proposition_id,
            contribution_id: decisionContext.contribution_id,
            contract_c_version: "2.0.0",
          },
        },
      },
    });
  }

  requireExactTargetBinding(contractC2, decisionContext);

  const holdReason = reasonForHold(contractC2, proposition, participant);
  const disposition = holdReason ? "hold" : "clear";

  return materializeBoundDecision({
    inputAuthority,
    policy,
    target,
    decisionFragment: {
      evaluation: { state: "completed", disposition },
      effect: structuredClone(CAUSAL_BASIS_CITATION_POLICY.effect),
      metadata: {
        reason_codes: [holdReason || "contract_c_contribution_in_causal_basis"],
        diagnostics: {
          contract_c_version: "2.0.0",
          wire_profile: "contract-c-successor-candidate-a-rc2-research",
          result_execution: contractC2.execution.state,
          proposition_execution: proposition.execution.state,
          proposition_completion:
            proposition.execution.state === "completed" ? proposition.execution.completion : null,
          terminal_verdict: proposition.terminal?.verdict ?? null,
          terminal_reason: proposition.terminal?.reason ?? null,
          participant_relation: participant.relation,
          participant_role: participant.role,
          basis_membership: isCausalBasisMember(proposition, participant),
        },
      },
    },
  });
}

/**
 * Bounded causal-basis citation policy over exact Contract C 2.0.0 (Candidate A RC2).
 *
 * Same policy identity, effect, and Contract D output as the maintained C1
 * path. Only the ingress authority and the C2 participant/basis read differ.
 * A causal-basis contribution can CLEAR; a retained residual/non-deciding
 * contribution HOLDs; an unidentifiable proposition or contribution yields
 * evaluation.failed. This function performs no Authorization or mutation.
 */
export function decideContractC2BasisCitationToContractD({
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
