#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { evaluateContractCDecision } from "../src/contractCDecisionRuntime.js";
import { canonicalizeContractDWithAuthority } from "../src/contractDCanonicalOutput.js";

const USAGE = `Usage:
  node scripts/decision-engine-evaluate.mjs \\
    --contract-c <path> \\
    --contract-c-sha256 <sha256:...> \\
    --contract-c-authority <exact Contract C 1.0.0 checkout> \\
    --contract-d-authority <exact Contract D 1.0.0 checkout> \\
    --expected-contract-b <JSON path> \\
    --policy <id@version> \\
    --context <policy-specific JSON path> \\
    [--python <python executable>]

The command emits only canonical Contract D JSON bytes on stdout when successful.
It performs no Authorization, execution, network mutation, or downstream action.
`;

const VALUE_FLAGS = new Set([
  "--contract-c",
  "--contract-c-sha256",
  "--contract-c-authority",
  "--contract-d-authority",
  "--expected-contract-b",
  "--policy",
  "--context",
  "--python",
]);
const REQUIRED_FLAGS = [
  "--contract-c",
  "--contract-c-sha256",
  "--contract-c-authority",
  "--contract-d-authority",
  "--expected-contract-b",
  "--policy",
  "--context",
];

class CliError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "CliError";
    this.code = code;
  }
}

function parseArgs(argv) {
  if (argv.length === 1 && argv[0] === "--help") return { help: true };
  const values = new Map();
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (!VALUE_FLAGS.has(flag)) {
      throw new CliError("invalid_cli_arguments", `unknown argument: ${flag ?? "<missing>"}`);
    }
    if (value === undefined || value.startsWith("--")) {
      throw new CliError("invalid_cli_arguments", `${flag} requires a value`);
    }
    if (values.has(flag)) {
      throw new CliError("invalid_cli_arguments", `duplicate argument: ${flag}`);
    }
    values.set(flag, value);
  }
  for (const flag of REQUIRED_FLAGS) {
    if (!values.has(flag)) {
      throw new CliError("invalid_cli_arguments", `missing required argument: ${flag}`);
    }
  }
  return { help: false, values };
}

function parsePolicy(specifier) {
  const split = specifier.lastIndexOf("@");
  if (split <= 0 || split === specifier.length - 1) {
    throw new CliError("invalid_policy_specifier", "--policy must be <id>@<version>");
  }
  return {
    id: specifier.slice(0, split),
    version: specifier.slice(split + 1),
  };
}

function readStrictJson(path, pythonExecutable, label) {
  const program = [
    "import json, sys",
    "path = sys.argv[1]",
    "def pairs_hook(pairs):",
    "    out = {}",
    "    for key, value in pairs:",
    "        if key in out:",
    "            raise ValueError('duplicate JSON object key: ' + key)",
    "        out[key] = value",
    "    return out",
    "def reject_constant(value):",
    "    raise ValueError('non-finite JSON number: ' + value)",
    "raw = open(path, 'rb').read()",
    "text = raw.decode('utf-8')",
    "value = json.loads(text, object_pairs_hook=pairs_hook, parse_constant=reject_constant)",
    "sys.stdout.write(json.dumps(value, ensure_ascii=False, separators=(',', ':'), allow_nan=False))",
  ].join("\n");

  const result = spawnSync(
    pythonExecutable,
    ["-c", program, path],
    { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
  );
  if (result.error) {
    throw new CliError("invalid_json_context", `${label}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || "").trim();
    throw new CliError("invalid_json_context", `${label}${detail ? `: ${detail}` : ""}`);
  }

  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new CliError("invalid_json_context", `${label}: ${error.message}`);
  }
}

function readBytes(path, label) {
  try {
    return readFileSync(path);
  } catch (error) {
    throw new CliError("input_read_failed", `${label}: ${error.message}`);
  }
}

function fail(error) {
  const code = typeof error?.code === "string" ? error.code : "evaluation_failed_unexpectedly";
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(JSON.stringify({ status: "error", code, message }) + "\n");
  process.exitCode = 1;
}

try {
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed.help) {
    process.stdout.write(USAGE);
  } else {
    const { values } = parsed;
    const pythonExecutable = values.get("--python") || "python3";
    const expectedContractB = readStrictJson(
      values.get("--expected-contract-b"),
      pythonExecutable,
      "cannot read expected Contract B context",
    );
    const policyContext = readStrictJson(
      values.get("--context"),
      pythonExecutable,
      "cannot read Decision policy context",
    );
    if (!policyContext || typeof policyContext !== "object" || Array.isArray(policyContext)) {
      throw new CliError("invalid_json_context", "Decision policy context must be a JSON object");
    }
    if (Object.hasOwn(policyContext, "policy")) {
      throw new CliError(
        "invalid_json_context",
        "Decision policy context must not contain policy; use the explicit --policy argument",
      );
    }

    const decisionContext = {
      policy: parsePolicy(values.get("--policy")),
      ...policyContext,
    };

    const decision = evaluateContractCDecision({
      contractCBytes: readBytes(values.get("--contract-c"), "cannot read Contract C bytes"),
      expectedContractCSha256: values.get("--contract-c-sha256"),
      contractCAuthorityRoot: values.get("--contract-c-authority"),
      expectedContractB,
      decisionContext,
      pythonExecutable,
    });

    const canonical = canonicalizeContractDWithAuthority({
      decision,
      contractDAuthorityRoot: values.get("--contract-d-authority"),
      pythonExecutable,
    });
    process.stdout.write(canonical);
  }
} catch (error) {
  fail(error);
}
