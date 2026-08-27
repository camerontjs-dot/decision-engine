/**
 * Backtest the note-promotion Gate head against MainFrame's existing corpus.
 *
 * What this can and cannot measure
 * --------------------------------
 * Every `type: note` in `10_knowledge/` is either `stable` or `audited`. There
 * are no rejected syntheses on disk. So this backtest measures the **false-
 * reject rate on known-good notes** — would the gate have blocked something a
 * human promoted? — and it cannot measure the false-accept rate at all.
 *
 * The `quarantined` class is not a usable negative for this bar either: all 107
 * are `type: raw`, all carry `provenance: fabricated-citation`, and all share
 * the date 2026-08-09. They are one incident labelled by one mechanical sweep,
 * and the label is written in the frontmatter. Scoring against them measures
 * whether the harness can read a field, not whether the gate works. The
 * resolver below therefore reads quarantine state only for *cited sources*
 * (which is a real integrity signal about the citing note), and the leaking
 * fields are stripped from any note before the gate parses it.
 *
 * Usage: node scripts/backtest-note-gate.mjs [--repo <path>] [--json <out>]
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, basename } from "node:path";

import { DECISION, evaluateGate, summarizeDecisions } from "../src/gate/gateHead.js";
import { NOTE_PROMOTION_BAR, parseNoteToGateItem, splitFrontmatter } from "../src/gate/notePromotionBar.js";

const args = process.argv.slice(2);
const argValue = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i === -1 ? fallback : args[i + 1];
};
// This adapter reads a caller-supplied MainFrame checkout. Keep the public
// repository portable and fail closed when that private corpus is not supplied.
const REPO = argValue("--repo", process.env.MAINFRAME_REPO || null);
if (!REPO) {
  console.error("error: --repo <MainFrame root> or MAINFRAME_REPO is required");
  process.exit(2);
}
const KNOWLEDGE = join(REPO, "10_knowledge");
const JSON_OUT = argValue("--json", null);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(full, out);
    else if (entry.endsWith(".md")) out.push(full);
  }
  return out;
}

const fmValue = (fm, key) => {
  const m = new RegExp(`^${key}:\\s*(.*)$`, "m").exec(fm);
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : null;
};

console.log("indexing 10_knowledge ...");
const files = walk(KNOWLEDGE);
const index = new Map(); // basename + relpath -> {status, quarantined}
const notes = [];
for (const file of files) {
  const text = readFileSync(file, "utf8");
  const { frontmatter } = splitFrontmatter(text);
  const status = fmValue(frontmatter, "status");
  const type = fmValue(frontmatter, "type");
  const provenance = fmValue(frontmatter, "provenance");
  const rel = relative(REPO, file);
  const record = {
    status,
    quarantined: status === "quarantined" || provenance === "fabricated-citation",
  };
  index.set(rel, record);
  index.set(basename(file), record);
  if (type === "note") notes.push({ file, rel, text, status });
}
console.log(`  ${files.length} files indexed, ${notes.length} of type: note`);

const TARGET_ARG = argValue("--target", "stable,audited");
const TARGET = new Set(TARGET_ARG.split(",").map((s) => s.trim()));
const SUBSET = argValue("--subset", null);

/** Resolve a reference to {exists, quarantined}. Unresolvable -> exists:false. */
function resolve(ref) {
  const cleaned = ref.replace(/^\[\[|\]\]$/g, "").replace(/^\.\//, "").replace(/\|.*$/, "").trim();
  const candidates = [cleaned, basename(cleaned), `${cleaned}.md`, `${basename(cleaned)}.md`];
  for (const candidate of candidates) {
    if (index.has(candidate)) return { exists: true, quarantined: index.get(candidate).quarantined };
  }
  return { exists: false, quarantined: false };
}

/**
 * Remove the fields that leak the historical label. A backtest that leaves them
 * in measures the harness, not the gate.
 */
function stripLeakingFields(text) {
  const { frontmatter, body } = splitFrontmatter(text);
  const cleanedFm = frontmatter
    .split("\n")
    .filter((line) => !/^(provenance|quarantined|citation_status|status):/.test(line))
    .join("\n");
  const cleanedBody = body.replace(/^>\s*\*\*⚠ QUARANTINED[\s\S]*?(?=\n\n)/m, "");
  return `---\n${cleanedFm}\n---\n${cleanedBody}`;
}

const subjects = notes.filter((n) => {
  if (SUBSET && !n.rel.includes(SUBSET)) return false;
  if (TARGET.has("all")) return true;
  if (TARGET.has("needs-audit")) {
    const { frontmatter } = splitFrontmatter(n.text);
    const tagsMatch = frontmatter.match(/^tags:\s*\[(.*?)\]/m);
    const tags = tagsMatch ? tagsMatch[1].split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")) : [];
    return n.status === "needs-audit" || tags.includes("needs-audit");
  }
  return TARGET.has(n.status);
});
console.log(`\nbacktesting ${subjects.length} notes (target: ${TARGET_ARG}${SUBSET ? `, subset: ${SUBSET}` : ""})\n`);

const decisions = [];
const rows = [];
for (const note of subjects) {
  const item = parseNoteToGateItem(note.rel, stripLeakingFields(note.text), resolve);
  const decision = evaluateGate(item, NOTE_PROMOTION_BAR);
  decisions.push(decision);
  rows.push({
    file: note.rel,
    humanStatus: note.status,
    gate: decision.decision,
    agrees: decision.decision === DECISION.PROMOTE,
    blocking: decision.blockingFailures,
    unknown: decision.blockingUnknowns,
    caveats: decision.caveats.map((c) => c.id),
    claimCount: item.claims.length,
  });
}

const summary = summarizeDecisions(decisions);
const promoted = rows.filter((r) => r.gate === DECISION.PROMOTE).length;
const rejected = rows.filter((r) => r.gate === DECISION.REJECT);
const held = rows.filter((r) => r.gate === DECISION.HOLD);

console.log("=".repeat(70));
console.log("CORPUS CONFORMANCE PROFILE — how many human-promoted notes meet each");
console.log("criterion. Read this as adoption of a convention, NOT as gate accuracy:");
console.log("a criterion the corpus never adopted fails everything, and that is a fact");
console.log("about the corpus, not evidence the criterion is wrong.");
console.log("");
console.log(`  clears the full bar: ${promoted}/${rows.length} ` +
            `(${((promoted / rows.length) * 100).toFixed(1)}%)`);
console.log(`  blocked:             ${rejected.length}`);
console.log(`  held (unchecked):    ${held.length}`);
console.log(`  close calls:         ${summary.closeCalls}`);
console.log("\nper-criterion outcomes across the corpus:");
for (const [id, counts] of Object.entries(summary.byCriterion)) {
  console.log(`  ${id.padEnd(26)} pass=${String(counts.pass).padStart(3)} ` +
              `fail=${String(counts.fail).padStart(3)} unknown=${String(counts.unknown).padStart(3)}`);
}

const citesQuarantined = rows.filter((r) => r.blocking.includes("no-quarantined-sources"));
console.log("\n" + "=".repeat(70));
console.log(`INTEGRITY CHECK — human-promoted notes citing a quarantined source: ` +
            `${citesQuarantined.length}`);
for (const row of citesQuarantined) console.log(`  [${row.humanStatus}] ${row.file}`);

if (rejected.length) {
  console.log("\nfalse rejects, with the criterion that blocked each:");
  for (const row of rejected.slice(0, 20)) {
    console.log(`  [${row.humanStatus}] ${row.file}`);
    console.log(`      blocked by: ${row.blocking.join(", ")} (claims parsed: ${row.claimCount})`);
  }
}

if (JSON_OUT) {
  writeFileSync(JSON_OUT, JSON.stringify({ summary, rows }, null, 2));
  console.log(`\nwrote ${JSON_OUT}`);
}

console.log("\n" + "=".repeat(70));
console.log("HOW TO READ THIS");
console.log("");
console.log("1. There are no rejected syntheses on disk — every type: note is stable or");
console.log("   audited. The false-ACCEPT rate of this bar is therefore unmeasured and");
console.log("   unmeasurable against the current corpus.");
console.log("2. The per-claim label + Evidence-line convention appears in roughly 9 of");
console.log("   these notes. The criteria that depend on it are a FORWARD standard for");
console.log("   new notes, not a description of how the promoted set was written.");
console.log("3. The criteria that do NOT depend on that convention — evidence-resolves,");
console.log("   no-quarantined-sources, links-declared — are measurable today and are");
console.log("   the findings worth acting on.");
