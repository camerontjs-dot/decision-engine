import {
  ContractCDecisionError,
  contractCInputAuthority,
  loadExactContractCForDecision,
} from "../../src/contractCIngress.js";
import { citationTargetForContractC } from "../../src/contractCBasisCitationDecision.js";

function clone(value) {
  return structuredClone(value);
}

export function admitExactContractC({
  contractCBytes,
  expectedContractCSha256,
  contractCAuthorityRoot,
  expectedContractB,
  pythonExecutable = undefined,
}) {
  const authority = loadExactContractCForDecision({
    contractCBytes,
    expectedContractCSha256,
    contractCAuthorityRoot,
    expectedContractB,
    pythonExecutable,
  });
  return {
    authority,
    inputAuthority: contractCInputAuthority(authority, expectedContractCSha256),
  };
}

export function resolveClaimTarget({ authority, propositionId, target }) {
  const proposition = authority.propositions.find(
    (item) => item.proposition.proposition_id === propositionId,
  );

  if (proposition) {
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
  }

  return {
    target: clone(target),
    propositionId,
    proposition: proposition ?? null,
  };
}

export function resolveCitationTarget({
  authority,
  propositionId,
  contributionId,
  target,
}) {
  const proposition = authority.propositions.find(
    (item) => item.proposition.proposition_id === propositionId,
  );
  const contribution = proposition?.contributions.find(
    (item) => item.contribution_id === contributionId,
  ) ?? null;

  if (proposition && contribution) {
    const expected = citationTargetForContractC(authority, propositionId, contributionId);
    if (!expected) {
      throw new ContractCDecisionError(
        "target_binding_mismatch",
        "unable to derive exact Contract C citation target",
      );
    }
    for (const key of ["kind", "id", "content_sha256"]) {
      if (target[key] !== expected[key]) {
        throw new ContractCDecisionError(
          "target_binding_mismatch",
          `Decision target ${key} must match the exact claim-evidence link derived from Contract C`,
        );
      }
    }
  }

  return {
    target: clone(target),
    propositionId,
    contributionId,
    proposition: proposition ?? null,
    contribution,
  };
}
