import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

import { ContractCDecisionError } from "./contractCIngress.js";

export { ContractCDecisionError };

export const CONTRACT_C2_AUTHORITY = Object.freeze({
  repository: "camerontjs-dot/apparatus-contracts",
  version: "2.0.0",
  wireProfile: "contract-c-successor-candidate-a-rc2-research",
  exactHead: "b42c827acb0a9fe65353354d709add0e27bab307",
  promotionBranch: "promotion/contract-c-2.0.0-exact-rc2-authority-20260913",
  validatorV2Blob: "bb5a381f89828ddc92adfdedcc4e9d98069f436d",
  validatorRc2Blob: "1d2ecd228cde807138013c33c8675c3003421d3c",
  schemaBlob: "45ebaa1e5b7342422b4d6a19f897e72de4bb148f",
  referenceRc2Blob: "ad5ed3ac71a8f8680188beb363c9d952c9922b15",
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

function gitBlob(authorityRoot, relPath, code, label) {
  return runChecked(
    "git",
    ["-C", authorityRoot, "hash-object", relPath],
    {},
    code,
    label,
  );
}

function verifyCanonicalC2AuthorityRoot(authorityRoot) {
  nonEmptyString(authorityRoot, "contractC2AuthorityRoot");

  const head = runChecked(
    "git",
    ["-C", authorityRoot, "rev-parse", "HEAD"],
    {},
    "authority_identity_mismatch",
    "cannot resolve Contract C2 authority HEAD",
  );
  if (head !== CONTRACT_C2_AUTHORITY.exactHead) {
    throw new ContractCDecisionError(
      "authority_identity_mismatch",
      `Contract C2 authority HEAD must be ${CONTRACT_C2_AUTHORITY.exactHead}, got ${head}`,
    );
  }

  const v2Blob = gitBlob(
    authorityRoot,
    "validators/contract_c_v2.py",
    "authority_identity_mismatch",
    "cannot hash Contract C2 v2 validator",
  );
  if (v2Blob !== CONTRACT_C2_AUTHORITY.validatorV2Blob) {
    throw new ContractCDecisionError(
      "authority_identity_mismatch",
      `Contract C2 v2 validator blob must be ${CONTRACT_C2_AUTHORITY.validatorV2Blob}, got ${v2Blob}`,
    );
  }

  const rc2Blob = gitBlob(
    authorityRoot,
    "validators/contract_c_rc2.py",
    "authority_identity_mismatch",
    "cannot hash Contract C2 RC2 validator",
  );
  if (rc2Blob !== CONTRACT_C2_AUTHORITY.validatorRc2Blob) {
    throw new ContractCDecisionError(
      "authority_identity_mismatch",
      `Contract C2 RC2 validator blob must be ${CONTRACT_C2_AUTHORITY.validatorRc2Blob}, got ${rc2Blob}`,
    );
  }

  const schemaBlob = gitBlob(
    authorityRoot,
    "schema/contract-c/2.0.0/schema.json",
    "authority_identity_mismatch",
    "cannot hash Contract C2 schema",
  );
  if (schemaBlob !== CONTRACT_C2_AUTHORITY.schemaBlob) {
    throw new ContractCDecisionError(
      "authority_identity_mismatch",
      `Contract C2 schema blob must be ${CONTRACT_C2_AUTHORITY.schemaBlob}, got ${schemaBlob}`,
    );
  }

  const refBlob = gitBlob(
    authorityRoot,
    "schema/contract-c/2.0.0/reference/candidate_a_rc2.py",
    "authority_identity_mismatch",
    "cannot hash Contract C2 frozen reference",
  );
  if (refBlob !== CONTRACT_C2_AUTHORITY.referenceRc2Blob) {
    throw new ContractCDecisionError(
      "authority_identity_mismatch",
      `Contract C2 frozen reference blob must be ${CONTRACT_C2_AUTHORITY.referenceRc2Blob}, got ${refBlob}`,
    );
  }

  const promotionPath = resolve(authorityRoot, "schema/contract-c/2.0.0/promotion-version.json");
  let promotion;
  try {
    promotion = JSON.parse(readFileSync(promotionPath, "utf8"));
  } catch (error) {
    throw new ContractCDecisionError(
      "authority_identity_mismatch",
      `cannot read Contract C2 promotion version: ${error.message}`,
    );
  }
  if (
    promotion.candidate_compatibility_version !== CONTRACT_C2_AUTHORITY.version ||
    promotion.wire_profile !== CONTRACT_C2_AUTHORITY.wireProfile
  ) {
    throw new ContractCDecisionError(
      "authority_identity_mismatch",
      `Contract C2 promotion version must be ${CONTRACT_C2_AUTHORITY.version}/${CONTRACT_C2_AUTHORITY.wireProfile}`,
    );
  }
}

function validateExactContractC2({
  contractC2Bytes,
  expectedContractC2Sha256,
  contractC2AuthorityRoot,
  pythonExecutable,
}) {
  const raw = Buffer.isBuffer(contractC2Bytes)
    ? contractC2Bytes
    : contractC2Bytes instanceof Uint8Array
      ? Buffer.from(contractC2Bytes)
      : null;
  if (!raw) {
    throw new ContractCDecisionError("invalid_contract_c_transport", "contractC2Bytes must be bytes");
  }
  if (typeof expectedContractC2Sha256 !== "string" || !SHA256_ID.test(expectedContractC2Sha256)) {
    throw new ContractCDecisionError(
      "invalid_contract_c_transport",
      "expectedContractC2Sha256 must be sha256:<64 lowercase hex>",
    );
  }

  const actual = sha256Hex(raw);
  if (`sha256:${actual}` !== expectedContractC2Sha256) {
    throw new ContractCDecisionError(
      "contract_c_whole_object_mismatch",
      `Contract C2 whole-object SHA-256 mismatch: expected ${expectedContractC2Sha256}, got sha256:${actual}`,
    );
  }

  verifyCanonicalC2AuthorityRoot(contractC2AuthorityRoot);

  const python = pythonExecutable || "python3";
  const validatorProgram = [
    "import json, sys",
    "root, expected = sys.argv[1], sys.argv[2]",
    "sys.path.insert(0, root)",
    "from validators.contract_c_v2 import validate_object, whole_object_sha256, PROFILE, CONTRACT_C_VERSION",
    "raw = sys.stdin.buffer.read()",
    "value = json.loads(raw.decode('utf-8'))",
    "assert CONTRACT_C_VERSION == '2.0.0', 'unexpected C2 compatibility version'",
    "assert PROFILE == 'contract-c-successor-candidate-a-rc2-research', 'unexpected C2 wire profile'",
    "try:",
    "    validate_object(value)",
    "except Exception as exc:",
    "    print(json.dumps({'errors': [str(exc)]}), file=sys.stderr)",
    "    raise SystemExit(1)",
    "actual = whole_object_sha256(value)",
    "if actual != expected:",
    "    print(json.dumps({'errors': [f'whole-object mismatch: expected {expected}, got {actual}']}), file=sys.stderr)",
    "    raise SystemExit(1)",
    "print(json.dumps({'ok': True}))",
  ].join("\n");

  runChecked(
    python,
    ["-c", validatorProgram, contractC2AuthorityRoot, expectedContractC2Sha256],
    { input: raw },
    "contract_c_validation_failed",
    "canonical Contract C2 validation failed",
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

function requireContractBBinding(contractC2, expectedContractB) {
  validateExpectedContractB(expectedContractB);
  const actual = contractC2.contract_b;
  if (!actual || typeof actual !== "object") {
    throw new ContractCDecisionError(
      "contract_b_binding_mismatch",
      "Contract C2 contract_b binding is missing",
    );
  }
  for (const key of ["contract_version", "bundle_id", "bundle_hash"]) {
    if (actual[key] !== expectedContractB[key]) {
      throw new ContractCDecisionError(
        "contract_b_binding_mismatch",
        `Contract C2 contract_b.${key} does not match the expected Contract B authority`,
      );
    }
  }
}

/**
 * Policy-independent exact Contract C2 ingress for Decision Engine policies.
 *
 * This boundary is intentionally separate from the maintained Contract C 1.0
 * ingress. Strict C1 ingress continues to reject C2 objects, and strict C2
 * ingress rejects C1 objects. No C2 -> C1 semantic downgrade exists.
 */
export function loadExactContractC2ForDecision({
  contractC2Bytes,
  expectedContractC2Sha256,
  contractC2AuthorityRoot,
  expectedContractB,
  pythonExecutable = undefined,
}) {
  const contractC2 = validateExactContractC2({
    contractC2Bytes,
    expectedContractC2Sha256,
    contractC2AuthorityRoot,
    pythonExecutable,
  });
  requireContractBBinding(contractC2, expectedContractB);
  return contractC2;
}

export function contractC2InputAuthority(contractC2, exactContractC2Sha256) {
  return {
    kind: "contract-c2",
    id: contractC2.result_set_id,
    immutable_id: exactContractC2Sha256,
  };
}
