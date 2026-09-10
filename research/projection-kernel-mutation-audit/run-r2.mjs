import assert from "node:assert/strict";
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ORIGINAL = path.join(HERE, "run.mjs");
const CORRECTED = path.join(HERE, "run.__r2_corrected__.mjs");

let source = readFileSync(ORIGINAL, "utf8");
const oldTransform = '    \'    evaluation: normalized.metadata?.force_hold === true ? { state: "completed", disposition: "hold" } : normalized.evaluation, // MUTANT M4\\n\',';
const newTransform = '    \'    evaluation: normalized.metadata?.diagnostics?.force_hold === true ? { state: "completed", disposition: "hold" } : normalized.evaluation, // MUTANT M4\\n\',';
const oldMetadata = '      metadata: { reason_codes: ["synthetic_clear"], force_hold: true },';
const newMetadata = '      metadata: { reason_codes: ["synthetic_clear"], diagnostics: { force_hold: true } },';

assert.equal(source.includes(oldTransform), true, "R2 transform correction anchor absent");
assert.equal(source.includes(oldMetadata), true, "R2 metadata correction anchor absent");
source = source.replace(oldTransform, newTransform).replace(oldMetadata, newMetadata);
writeFileSync(CORRECTED, source);

try {
  const result = spawnSync(process.execPath, [CORRECTED, ...process.argv.slice(2)], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  try { unlinkSync(CORRECTED); } catch {}
}
