import { spawnSync } from "node:child_process";

export const CONTRACT_D_AUTHORITY = Object.freeze({
  repository: "camerontjs-dot/apparatus-contracts",
  version: "1.0.0",
  tag: "contract-d-v1.0.0",
  tagObject: "6eadd688b482f3c9fce2ce5e7a2841089d852096",
  releaseCommit: "298a1a0f7b7b6d7712e11200d04faec3e1ca169b",
  coreValidatorBlob: "564dcde5677df5ac8f86f21dc0ffd1692f44c9f0",
  effectRegistryBlob: "a40f4f4447470654bdc16d852f5927189ae30cc5",
});

export class ContractDOutputError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ContractDOutputError";
    this.code = code;
  }
}

function nonEmptyString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new ContractDOutputError("invalid_contract_d_authority", `${label} must be a non-empty string`);
  }
}

function runText(command, args, code, label) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) {
    throw new ContractDOutputError(code, `${label}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || "").trim();
    throw new ContractDOutputError(code, `${label}${detail ? `: ${detail}` : ""}`);
  }
  return result.stdout.trim();
}

export function verifyContractDAuthorityRoot(authorityRoot) {
  nonEmptyString(authorityRoot, "contractDAuthorityRoot");

  const head = runText(
    "git",
    ["-C", authorityRoot, "rev-parse", "HEAD"],
    "contract_d_authority_identity_mismatch",
    "cannot resolve Contract D authority HEAD",
  );
  if (head !== CONTRACT_D_AUTHORITY.releaseCommit) {
    throw new ContractDOutputError(
      "contract_d_authority_identity_mismatch",
      `Contract D authority HEAD must be ${CONTRACT_D_AUTHORITY.releaseCommit}, got ${head}`,
    );
  }

  const tagObject = runText(
    "git",
    ["-C", authorityRoot, "rev-parse", `refs/tags/${CONTRACT_D_AUTHORITY.tag}`],
    "contract_d_authority_identity_mismatch",
    "cannot resolve Contract D release tag",
  );
  if (tagObject !== CONTRACT_D_AUTHORITY.tagObject) {
    throw new ContractDOutputError(
      "contract_d_authority_identity_mismatch",
      `Contract D tag object must be ${CONTRACT_D_AUTHORITY.tagObject}, got ${tagObject}`,
    );
  }

  const peeled = runText(
    "git",
    ["-C", authorityRoot, "rev-parse", `${CONTRACT_D_AUTHORITY.tag}^{}`],
    "contract_d_authority_identity_mismatch",
    "cannot peel Contract D release tag",
  );
  if (peeled !== CONTRACT_D_AUTHORITY.releaseCommit) {
    throw new ContractDOutputError(
      "contract_d_authority_identity_mismatch",
      `Contract D release tag must peel to ${CONTRACT_D_AUTHORITY.releaseCommit}, got ${peeled}`,
    );
  }

  const coreBlob = runText(
    "git",
    ["-C", authorityRoot, "hash-object", "validators/contract_d_core.py"],
    "contract_d_authority_identity_mismatch",
    "cannot hash Contract D core validator",
  );
  if (coreBlob !== CONTRACT_D_AUTHORITY.coreValidatorBlob) {
    throw new ContractDOutputError(
      "contract_d_authority_identity_mismatch",
      `Contract D core validator blob must be ${CONTRACT_D_AUTHORITY.coreValidatorBlob}, got ${coreBlob}`,
    );
  }

  const registryBlob = runText(
    "git",
    ["-C", authorityRoot, "hash-object", "schema/contract-d/1.0.0/effect-registry.json"],
    "contract_d_authority_identity_mismatch",
    "cannot hash Contract D effect registry",
  );
  if (registryBlob !== CONTRACT_D_AUTHORITY.effectRegistryBlob) {
    throw new ContractDOutputError(
      "contract_d_authority_identity_mismatch",
      `Contract D effect registry blob must be ${CONTRACT_D_AUTHORITY.effectRegistryBlob}, got ${registryBlob}`,
    );
  }
}

/**
 * Validate an emitted Decision with exact Contract D 1.0.0 authority and return
 * exact Contract-D canonical JCS+LF bytes. No consumer applicability,
 * Authorization, or execution is performed here.
 */
export function canonicalizeContractDWithAuthority({
  decision,
  contractDAuthorityRoot,
  pythonExecutable = undefined,
}) {
  verifyContractDAuthorityRoot(contractDAuthorityRoot);

  let input;
  try {
    input = Buffer.from(JSON.stringify(decision), "utf8");
  } catch (error) {
    throw new ContractDOutputError(
      "contract_d_serialization_failed",
      `cannot serialize emitted Decision for exact Contract D validation: ${error.message}`,
    );
  }

  const python = pythonExecutable || "python3";
  const program = [
    "import json, sys",
    "root = sys.argv[1]",
    "sys.path.insert(0, root)",
    "from validators.contract_d_core import canonical_json_bytes, validate_decision",
    "value = json.loads(sys.stdin.buffer.read().decode('utf-8'))",
    "validate_decision(value)",
    "sys.stdout.buffer.write(canonical_json_bytes(value))",
  ].join("\n");

  const result = spawnSync(
    python,
    ["-c", program, contractDAuthorityRoot],
    {
      input,
      encoding: null,
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  if (result.error) {
    throw new ContractDOutputError(
      "contract_d_validation_failed",
      `exact Contract D validation failed: ${result.error.message}`,
    );
  }
  if (result.status !== 0) {
    const stderr = Buffer.isBuffer(result.stderr) ? result.stderr.toString("utf8") : String(result.stderr || "");
    const stdout = Buffer.isBuffer(result.stdout) ? result.stdout.toString("utf8") : String(result.stdout || "");
    const detail = (stderr || stdout).trim();
    throw new ContractDOutputError(
      "contract_d_validation_failed",
      `exact Contract D validation failed${detail ? `: ${detail}` : ""}`,
    );
  }

  return Buffer.from(result.stdout);
}
