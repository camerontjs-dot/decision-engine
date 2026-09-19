#!/usr/bin/env node

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

function readJson(path, label) {
  let raw;
  try {
    raw = readFileSync(path, "utf8");
  } catch (error) {
    throw new CliError("input_read_failed", `${label}: ${error.message}`);
  }
  try {
    return JSON.parse(raw);
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
    const target = readJson(values.get("--target"), "cannot read Decision target");
    const consumerInputs = readJson(
      values.get("--consumer-inputs"),
      "cannot read frozen-consumer inputs",
    );
    const decision = decideParentBoundContractCToContractD({
      contractCBytes: readBytes(values.get("--contract-c"), "cannot read Contract C"),
      expectedContractCSha256: values.get("--contract-c-sha256"),
      consumerRoot: values.get("--consumer-authority"),
      consumerInputs,
      decisionContext: { target },
      pythonExecutable: values.get("--python") || "python3",
    });
    const canonical = canonicalizeContractDWithAuthority({
      decision,
      contractDAuthorityRoot: values.get("--contract-d-authority"),
      pythonExecutable: values.get("--python") || "python3",
    });
    process.stdout.write(canonical);
  }
} catch (error) {
  fail(error);
}
