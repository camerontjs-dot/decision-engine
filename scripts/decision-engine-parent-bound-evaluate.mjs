#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { decideParentBoundContractCToContractD } from "../src/parentBoundContractCDecision.js";
import { canonicalizeContractDWithAuthority } from "../src/contractDCanonicalOutput.js";

const USAGE = `Usage:
  node scripts/decision-engine-parent-bound-evaluate.mjs \\
    --contract-c <path> \\
    --contract-c-sha256 <sha256:...> \\
    --consumer-authority <exact frozen independent-consumer checkout> \\
    --consumer-inputs <JSON path> \\
    --contract-d-authority <exact Contract D 1.0.0 checkout> \\
    --target <JSON path> \\
    [--python <python executable>]

The command emits only canonical Contract D 1.0.0 JSON bytes on stdout.
It performs no Authorization, execution, network mutation, or downstream action.
`;

const VALUE_FLAGS = new Set([
  "--contract-c",
  "--contract-c-sha256",
  "--consumer-authority",
  "--consumer-inputs",
  "--contract-d-authority",
  "--target",
  "--python",
]);
const REQUIRED_FLAGS = [
  "--contract-c",
  "--contract-c-sha256",
  "--consumer-authority",
  "--consumer-inputs",
  "--contract-d-authority",
  "--target",
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
    { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
  );
  if (result.error) {
    throw new CliError("invalid_json_input", `${label}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || "").trim();
    throw new CliError("invalid_json_input", `${label}${detail ? `: ${detail}` : ""}`);
  }
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new CliError("invalid_json_input", `${label}: ${error.message}`);
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
    const target = readStrictJson(
      values.get("--target"),
      pythonExecutable,
      "cannot read Decision target",
    );
    const consumerInputs = readStrictJson(
      values.get("--consumer-inputs"),
      pythonExecutable,
      "cannot read frozen-consumer inputs",
    );
    const decision = decideParentBoundContractCToContractD({
      contractCBytes: readBytes(values.get("--contract-c"), "cannot read Contract C"),
      expectedContractCSha256: values.get("--contract-c-sha256"),
      consumerRoot: values.get("--consumer-authority"),
      consumerInputs,
      decisionContext: { target },
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
