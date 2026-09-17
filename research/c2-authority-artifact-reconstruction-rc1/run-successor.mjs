import assert from "node:assert/strict";
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const originalPath = resolve(here, "run.mjs");
const generatedPath = resolve(here, ".run-successor.generated.mjs");
const original = readFileSync(originalPath, "utf8");

const needle = '"bundle_id": str(manifest["bundle"]["bundle_id"]),';
const replacement = '"bundle_id": str(manifest["bundle_id"]),';
const occurrences = original.split(needle).length - 1;
assert.equal(occurrences, 1, "expected exactly one frozen RC1 manifest-path defect");

writeFileSync(generatedPath, original.replace(needle, replacement), "utf8");
try {
  const result = spawnSync(process.execPath, [generatedPath], {
    env: process.env,
    stdio: "inherit",
  });
  process.exitCode = result.status ?? 1;
} finally {
  try {
    unlinkSync(generatedPath);
  } catch {
    // Preserve the primary experiment outcome; cleanup is non-authoritative.
  }
}
