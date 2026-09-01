#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";

import {
  ContractCDecisionError,
  decideContractCToContractD,
} from "../../src/contractCDecision.js";

const ALLOWED = new Set([
  "contract-c",
  "expected-contract-c-sha256",
  "contract-c-authority-root",
  "expected-contract-b",
  "decision-context",
  "python",
  "output",
]);

function usage() {
  return [
    "Usage: node invoke.mjs",
    "  --contract-c <path>",
    "  --expected-contract-c-sha256 <sha256:...>",
    "  --contract-c-authority-root <path>",
    "  --expected-contract-b <json-path>",
    "  --decision-context <json-path>",
    "  [--python <executable>]",
    "  [--output <json-path>]",
  ].join("\n");
}

function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const token = argv[index];
    const value = argv[index + 1];
    if (!token?.startsWith("--") || value === undefined) throw new Error(usage());
    const key = token.slice(2);
    if (!ALLOWED.has(key) || Object.hasOwn(values, key)) {
      throw new Error(`invalid or duplicate option: ${token}\n${usage()}`);
    }
    values[key] = value;
  }
  for (const required of [
    "contract-c",
    "expected-contract-c-sha256",
    "contract-c-authority-root",
    "expected-contract-b",
    "decision-context",
  ]) {
    if (!values[required]) throw new Error(`missing --${required}\n${usage()}`);
  }
  return values;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

try {
  const args = parseArgs(process.argv.slice(2));
  const decision = decideContractCToContractD({
    contractCBytes: readFileSync(args["contract-c"]),
    expectedContractCSha256: args["expected-contract-c-sha256"],
    contractCAuthorityRoot: args["contract-c-authority-root"],
    expectedContractB: readJson(args["expected-contract-b"]),
    decisionContext: readJson(args["decision-context"]),
    pythonExecutable: args.python,
  });

  const encoded = `${JSON.stringify(decision)}\n`;
  if (args.output) writeFileSync(args.output, encoded, "utf8");
  else process.stdout.write(encoded);
} catch (error) {
  if (error instanceof ContractCDecisionError) {
    process.stderr.write(`${JSON.stringify({ status: "ERROR", code: error.code, message: error.message })}\n`);
    process.exitCode = 2;
  } else {
    process.stderr.write(`${error?.stack || error}\n`);
    process.exitCode = 1;
  }
}
