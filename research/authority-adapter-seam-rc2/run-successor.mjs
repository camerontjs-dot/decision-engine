import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const HERE = new URL(".", import.meta.url);
const sourcePath = resolve(HERE.pathname, "run.mjs");
const executionPath = resolve(HERE.pathname, "run-execution.mjs");
const source = readFileSync(sourcePath, "utf8");

const predecessor = "assert.equal(legacy.exact_projection_kernel_sha256, EXPECTED_PROJECTION_KERNEL_SHA256);";
const successor = "assert.equal(legacy.exact_projection_kernel_sha256, `sha256:${EXPECTED_PROJECTION_KERNEL_SHA256}`);";

assert.equal(
  source.split(predecessor).length - 1,
  1,
  "successor wrapper expected exactly one known legacy digest-prefix assertion defect",
);

const corrected = source.replace(predecessor, successor);
assert.notEqual(corrected, source);
writeFileSync(executionPath, corrected, "utf8");
await import(`./run-execution.mjs?successor=${Date.now()}`);
