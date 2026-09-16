import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

import {
  ContractCDecisionError,
  loadExactContractCForDecision,
} from "../../src/contractCIngress.js";
import { evaluateContractCDecision } from "../../src/contractCDecisionRuntime.js";

const SHA256_ID = /^sha256:[0-9a-f]{64}$/;

function asBytes(value, label) {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  throw new ContractCDecisionError("invalid_contract_b_index_transport", `${label} must be bytes`);
}

function sha256Id(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function runChecked(command, args, options, code, label) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
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

/**
 * Research-only strict ingress candidate.
 *
 * It deliberately composes with the maintained ingress instead of editing it:
 * 1. maintained ingress establishes exact C bytes, exact released C authority,
 *    canonical C validity, and expected top-level B bundle identity;
 * 2. this candidate additionally binds exact B-index bytes to an independently
 *    supplied SHA-256 and re-runs the released C validator with that exact index.
 *
 * A production implementation should fold the indexed validator call into the
 * maintained ingress so C is validated once, not keep this duplicate-validation
 * wrapper. This module exists only to discriminate the authority requirement.
 */
export function loadExactContractCForDecisionWithRequiredIndex({
  contractCBytes,
  expectedContractCSha256,
  contractCAuthorityRoot,
  expectedContractB,
  contractBIndexBytes,
  expectedContractBIndexSha256,
  pythonExecutable = undefined,
}) {
  const rawIndex = asBytes(contractBIndexBytes, "contractBIndexBytes");
  if (
    typeof expectedContractBIndexSha256 !== "string" ||
    !SHA256_ID.test(expectedContractBIndexSha256)
  ) {
    throw new ContractCDecisionError(
      "invalid_contract_b_index_transport",
      "expectedContractBIndexSha256 must be sha256:<64 lowercase hex>",
    );
  }

  const actualIndexSha = sha256Id(rawIndex);
  if (actualIndexSha !== expectedContractBIndexSha256) {
    throw new ContractCDecisionError(
      "contract_b_index_whole_object_mismatch",
      `Contract B index whole-object SHA-256 mismatch: expected ${expectedContractBIndexSha256}, got ${actualIndexSha}`,
    );
  }

  // Reuse the exact maintained authority and top-level B-boundary checks first.
  const contractC = loadExactContractCForDecision({
    contractCBytes,
    expectedContractCSha256,
    contractCAuthorityRoot,
    expectedContractB,
    pythonExecutable,
  });

  const rawC = Buffer.isBuffer(contractCBytes)
    ? contractCBytes
    : contractCBytes instanceof Uint8Array
      ? Buffer.from(contractCBytes)
      : null;
  if (!rawC) {
    throw new ContractCDecisionError("invalid_contract_c_transport", "contractCBytes must be bytes");
  }

  const python = pythonExecutable || "python3";
  const validatorProgram = [
    "import base64, json, sys",
    "root = sys.argv[1]",
    "sys.path.insert(0, root)",
    "from validators.contract_c import parse_json_bytes, validate_contract_c_bytes",
    "payload = json.loads(sys.stdin.read())",
    "raw_c = base64.b64decode(payload['contract_c_b64'])",
    "raw_index = base64.b64decode(payload['contract_b_index_b64'])",
    "index = parse_json_bytes(raw_index)",
    "errors = validate_contract_c_bytes(",
    "    raw_c,",
    "    expected_sha256=payload['expected_contract_c_sha256'],",
    "    contract_b_index=index,",
    ")",
    "if errors:",
    "    print(json.dumps({'errors': errors}, separators=(',', ':')), file=sys.stderr)",
    "    raise SystemExit(1)",
    "print(json.dumps({'ok': True}, separators=(',', ':')))",
  ].join("\n");

  const payload = JSON.stringify({
    contract_c_b64: rawC.toString("base64"),
    contract_b_index_b64: rawIndex.toString("base64"),
    expected_contract_c_sha256: expectedContractCSha256,
  });

  runChecked(
    python,
    ["-c", validatorProgram, contractCAuthorityRoot],
    { input: payload },
    "contract_c_indexed_validation_failed",
    "released Contract C validation with exact Contract B index failed",
  );

  return contractC;
}

export function evaluateContractCDecisionWithRequiredIndex(options) {
  loadExactContractCForDecisionWithRequiredIndex(options);
  return evaluateContractCDecision({
    contractCBytes: options.contractCBytes,
    expectedContractCSha256: options.expectedContractCSha256,
    contractCAuthorityRoot: options.contractCAuthorityRoot,
    expectedContractB: options.expectedContractB,
    decisionContext: options.decisionContext,
    pythonExecutable: options.pythonExecutable,
  });
}
