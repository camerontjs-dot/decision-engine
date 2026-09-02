import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

import {
  CONTRACT_C_AUTHORITY,
  ContractCDecisionError,
} from "../../src/contractCDecision.js";
import { exportContractD } from "../../src/contractD.js";

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

function canonicalProjectionBytes(value) {
  return Buffer.from(JSON.stringify(sortValue(value)) + "\n", "utf8");
}

function runChecked(command, args, options, code, label) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    ...options,
  });
  if (result.error) {
    throw new ContractCDecisionError(code, `${label}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || "").trim();
    throw new ContractCDecisionError(code, `${label}${detail ? `: ${detail}` : ""}`);
  }
  return result.stdout.trim();
}

function verifyCanonicalAuthorityRoot(authorityRoot) {
  nonEmptyString(authorityRoot, "contractCAuthorityRoot");

  const head = runChecked(
    "git",
    ["-C", authorityRoot, "rev-parse", "HEAD"],
    {},
    "authority_identity_mismatch",
    "cannot resolve Contract C authority HEAD",
  );
  if (head !== CONTRACT_C_AUTHORITY.releaseCommit) {
    throw new ContractCDecisionError(
      "authority_identity_mismatch",
      `Contract C authority HEAD must be ${CONTRACT_C_AUTHORITY.releaseCommit}, got ${head}`,
    );
  }

  const tagObject = runChecked(
    "git",
    ["-C", authorityRoot, "rev-parse", `refs/tags/${CONTRACT_C_AUTHORITY.tag}`],
    {},
    "authority_identity_mismatch",
    "cannot resolve Contract C release tag",
  );
  if (tagObject !== CONTRACT_C_AUTHORITY.tagObject) {
    throw new ContractCDecisionError(
      "authority_identity_mismatch",
      `Contract C tag object must be ${CONTRACT_C_AUTHORITY.tagObject}, got ${tagObject}`,
    );
  }

  const peeled = runChecked(
    "git",
    ["-C", authorityRoot, "rev-parse", `${CONTRACT_C_AUTHORITY.tag}^{}`],
    {},
    "authority_identity_mismatch",
    "cannot peel Contract C release tag",
  );
  if (peeled !== CONTRACT_C_AUTHORITY.releaseCommit) {
    throw new ContractCDecisionError(
      "authority_identity_mismatch",
      `Contract C release tag must peel to ${CONTRACT_C_AUTHORITY.releaseCommit}, got ${peeled}`,
    );
  }

  const validatorPath = resolve(authorityRoot, "validators/contract_c.py");
  const validatorBytes = readFileSync(validatorPath);
  const validatorBlob = createHash("sha1")
    .update(Buffer.from(`blob ${validatorBytes.length}\0`, "utf8"))
    .update(validatorBytes)
    .digest("hex");
  if (validatorBlob !== CONTRACT_C_AUTHORITY.validatorBlob) {
    throw new ContractCDecisionError(
      "authority_identity_mismatch",
      `Contract C validator blob must be ${CONTRACT_C_AUTHORITY.validatorBlob}, got ${validatorBlob}`,
    );
  }
}

function validateExactContractC({
  contractCBytes,
  expectedContractCSha256,
  contractCAuthorityRoot,
  pythonExecutable,
}) {
  const raw = Buffer.isBuffer(contractCBytes)
    ? contractCBytes
    : contractCBytes instanceof Uint8Array
      ? Buffer.from(contractCBytes)
      : null;
  if (!raw) {
    throw new ContractCDecisionError("invalid_contract_c_transport", "contractCBytes must be bytes");
  }
  if (typeof expectedContractCSha256 !== "string" || !SHA256_ID.test(expectedContractCSha256)) {
    throw new ContractCDecisionError(
      "invalid_contract_c_transport",
      "expectedContractCSha256 must be sha256:<64 lowercase hex>",
    );
  }

  const actual = sha256Hex(raw);
  if (`sha256:${actual}` !== expectedContractCSha256) {
    throw new ContractCDecisionError(
      "contract_c_whole_object_mismatch",
      `Contract C whole-object SHA-256 mismatch: expected ${expectedContractCSha256}, got sha256:${actual}`,
    );
  }

  verifyCanonicalAuthorityRoot(contractCAuthorityRoot);

  const python = pythonExecutable || "python3";
  const validatorProgram = [
    "import json, sys",
    "root, expected = sys.argv[1], sys.argv[2]",
    "sys.path.insert(0, root)",
    "from validators.contract_c import validate_contract_c_bytes",
    "raw = sys.stdin.buffer.read()",
    "errors = validate_contract_c_bytes(raw, expected_sha256=expected)",
    "if errors:",
    "    print(json.dumps({'errors': errors}), file=sys.stderr)",
    "    raise SystemExit(1)",
    "print(json.dumps({'ok': True}))",
  ].join("\n");

  runChecked(
    python,
    ["-c", validatorProgram, contractCAuthorityRoot, expectedContractCSha256],
    { input: raw },
    "contract_c_validation_failed",
    "canonical Contract C validation failed",
  );

  return JSON.parse(raw.toString("utf8"));
}

function validateExpectedContractB(expectedContractB) {
  exactKeys(
    expectedContractB,
    ["contract_version", "bundle_id", "bundle_hash"],
    "expectedContractB",
  );
  nonEmptyString(expectedContractB.contract_version, "expectedContractB.contract_version");
  nonEmptyString(expectedContractB.bundle_id, "expectedContractB.bundle_id");
  if (typeof expectedContractB.bundle_hash !== "string" || !SHA256_ID.test(expectedContractB.bundle_hash)) {
    throw new ContractCDecisionError(
      "invalid_context",
      "expectedContractB.bundle_hash must be sha256:<64 lowercase hex>",
    );
  }
}

function requireContractBBinding(contractC, expectedContractB) {
  validateExpectedContractB(expectedContractB);
  const actual = contractC.input.contract_b;
  for (const key of ["contract_version", "bundle_id", "bundle_hash"]) {
    if (actual[key] !== expectedContractB[key]) {
      throw new ContractCDecisionError(
        "contract_b_binding_mismatch",
        `Contract C input.contract_b.${key} does not match the expected Contract B authority`,
      );
    }
  }
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
    content_sha256: `sha256:${sha256Hex(canonicalProjectionBytes(projection))}`,
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

function holdReason(contractC, proposition, contribution) {
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
  const inputAuthority = {
    kind: "contract-c",
    id: contractC.result_set_id,
    immutable_id: exactContractCSha256,
  };
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

  const reason = holdReason(contractC, proposition, contribution);
  const disposition = reason ? "hold" : "clear";

  return exportContractD({
    input_authority: inputAuthority,
    policy,
    target,
    evaluation: { state: "completed", disposition },
    effect: structuredClone(CAUSAL_BASIS_CITATION_POLICY.effect),
    metadata: {
      reason_codes: [reason || "contract_c_contribution_in_causal_basis"],
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
 * Research-only Contract C 1.0.0 -> causal-basis citation Decision -> Contract D 1.0.0.
 *
 * No Authorization, execution, network mutation, or downstream action is performed.
 */
export function decideBasisCitationResearch({
  contractCBytes,
  expectedContractCSha256,
  contractCAuthorityRoot,
  expectedContractB,
  decisionContext,
  pythonExecutable = undefined,
}) {
  validateDecisionContext(decisionContext);
  const contractC = validateExactContractC({
    contractCBytes,
    expectedContractCSha256,
    contractCAuthorityRoot,
    pythonExecutable,
  });
  requireContractBBinding(contractC, expectedContractB);
  return buildDecision(contractC, expectedContractCSha256, decisionContext);
}
