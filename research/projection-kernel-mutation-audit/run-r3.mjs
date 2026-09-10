import assert from "node:assert/strict";
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ORIGINAL = path.join(HERE, "run.mjs");
const CORRECTED = path.join(HERE, "run.__r3_corrected__.mjs");

let source = readFileSync(ORIGINAL, "utf8");

const oldTransform = '    \'    evaluation: normalized.metadata?.force_hold === true ? { state: "completed", disposition: "hold" } : normalized.evaluation, // MUTANT M4\\n\',';
const newTransform = '    \'    evaluation: normalized.metadata?.diagnostics?.force_hold === true ? { state: "completed", disposition: "hold" } : normalized.evaluation, // MUTANT M4\\n\',';
const oldMetadata = '      metadata: { reason_codes: ["synthetic_clear"], force_hold: true },';
const newMetadata = '      metadata: { reason_codes: ["synthetic_clear"], diagnostics: { force_hold: true } },';
const oldCalGuard = '    /\\bcal\\b/i,';
const newCalGuard = '    /(^|[^A-Za-z0-9])cal([^A-Za-z0-9]|$)/i,';

for (const [label, needle] of [
  ["M4 transform", oldTransform],
  ["M4 metadata", oldMetadata],
  ["M9 CAL guard", oldCalGuard],
]) {
  assert.equal(source.includes(needle), true, `${label} correction anchor absent`);
}

source = source
  .replace(oldTransform, newTransform)
  .replace(oldMetadata, newMetadata)
  .replace(oldCalGuard, newCalGuard);

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
