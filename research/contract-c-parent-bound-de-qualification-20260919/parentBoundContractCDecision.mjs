import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { materializeBoundDecision } from "../../src/decisionMaterializer.js";
import { SUPPORTED_CLAIM_VERIFICATION_POLICY } from "../../src/contractCDecision.js";

const CONSUMER_FREEZE = "12e7e640b229619501960b1b89cf4716d8d985b3";
const CONSUMER_BLOB = "662e94c4445d2be9034e786711429394f217c0a6";
const TEST_BLOB = "50f3104650a946b834c3ff6415bafb347863e836";
const RECEIPT_BLOB = "cb99cd2ee29d38e19c845771654898561b91552f";
const SHA256_ID = /^sha256:[0-9a-f]{64}$/;

export class ParentBoundDecisionError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ParentBoundDecisionError";
    this.code = code;
  }
}

function run(command, args, options, code, label) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    ...options,
  });
  if (result.error) throw new ParentBoundDecisionError(code, `${label}: ${result.error.message}`);
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || "").trim();
    throw new ParentBoundDecisionError(code, `${label}${detail ? `: ${detail}` : ""}`);
  }
  return result.stdout.trim();
}

function gitText(root, args) {
  return run("git", ["-C", root, ...args], {}, "consumer_authority_mismatch", "consumer authority check failed");
}

function verifyConsumerRoot(root) {
  if (gitText(root, ["rev-parse", "HEAD"]) !== CONSUMER_FREEZE) {
    throw new ParentBoundDecisionError("consumer_authority_mismatch", "wrong frozen consumer commit");
  }
  const checks = [
    ["candidate/consumer.py", CONSUMER_BLOB],
    ["candidate/test_consumer.py", TEST_BLOB],
    ["candidate/FREEZE_RECEIPT.json", RECEIPT_BLOB],
  ];
  for (const [path, expected] of checks) {
    if (gitText(root, ["rev-parse", `HEAD:${path}`]) !== expected) {
      throw new ParentBoundDecisionError("consumer_authority_mismatch", `wrong frozen consumer blob: ${path}`);
    }
  }
}

function sha256(raw) {
  return "sha256:" + createHash("sha256").update(raw).digest("hex");
}

function validateTarget(target, root) {
  const expected = {
    kind: "claim",
    id: root.proposition_id,
    content_sha256: root.text_sha256,
  };
  for (const key of Object.keys(expected)) {
    if (target?.[key] !== expected[key]) {
      throw new ParentBoundDecisionError("target_binding_mismatch", `target ${key} mismatch`);
    }
  }
}

function validateWithFrozenConsumer({
  contractCBytes,
  expectedContractCSha256,
  consumerRoot,
  consumerInputs,
  pythonExecutable = "python3",
}) {
  const raw = Buffer.isBuffer(contractCBytes) ? contractCBytes : Buffer.from(contractCBytes);
  if (!SHA256_ID.test(expectedContractCSha256) || sha256(raw) !== expectedContractCSha256) {
    throw new ParentBoundDecisionError("contract_c_whole_object_mismatch", "parent-bound Contract C whole-object mismatch");
  }
  verifyConsumerRoot(consumerRoot);

  const program = [
    "import base64, importlib.util, json, sys",
    "root=sys.argv[1]",
    "spec=importlib.util.spec_from_file_location('frozen_consumer', root + '/candidate/consumer.py')",
    "m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m)",
    "p=json.load(sys.stdin)",
    "raw=base64.b64decode(p['raw_b64'])",
    "n={k:base64.b64decode(v) for k,v in p['native_child_results_b64'].items()}",
    "try:",
    "  out=m.consume_parent_bound_contract_c(raw, contract_b_index=p['contract_b_index'], expected_authority=p['expected_authority'], contract_a_decomposition=p['contract_a_decomposition'], native_child_results=n)",
    "except m.ConsumerError as exc:",
    "  print(json.dumps({'consumer_error': exc.code}), file=sys.stderr); raise SystemExit(3)",
    "print(json.dumps(out, sort_keys=True, separators=(',',':')))",
  ].join("\n");

  const payload = {
    ...consumerInputs,
    raw_b64: raw.toString("base64"),
  };
  const stdout = run(
    pythonExecutable,
    ["-c", program, consumerRoot],
    { input: JSON.stringify(payload) },
    "contract_c_validation_failed",
    "frozen parent-bound Contract C validation failed",
  );
  return JSON.parse(stdout);
}

export function decideParentBoundContractCToContractD({
  contractCBytes,
  expectedContractCSha256,
  consumerRoot,
  consumerInputs,
  decisionContext,
  pythonExecutable = "python3",
}) {
  const contractC = validateWithFrozenConsumer({
    contractCBytes,
    expectedContractCSha256,
    consumerRoot,
    consumerInputs,
    pythonExecutable,
  });
  validateTarget(decisionContext.target, contractC.recomposition.root);

  const parentConclusion = contractC.recomposition.parent_conclusion;
  const disposition = parentConclusion === "supported" ? "clear" : "hold";
  const reasonCodes =
    disposition === "clear"
      ? ["contract_c_supported"]
      : ["contract_c_reported_verdict_not_supported"];

  return materializeBoundDecision({
    inputAuthority: {
      kind: "contract-c",
      id: contractC.result_set_id,
      immutable_id: expectedContractCSha256,
    },
    policy: {
      id: SUPPORTED_CLAIM_VERIFICATION_POLICY.id,
      version: SUPPORTED_CLAIM_VERIFICATION_POLICY.version,
    },
    target: structuredClone(decisionContext.target),
    decisionFragment: {
      evaluation: { state: "completed", disposition },
      effect: structuredClone(SUPPORTED_CLAIM_VERIFICATION_POLICY.effect),
      metadata: {
        reason_codes: reasonCodes,
        diagnostics: {
          parent_conclusion: parentConclusion,
          decomposition_id: contractC.recomposition.decomposition_id,
          operator: contractC.recomposition.operator,
        },
      },
    },
  });
}

export function readFixture(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}
