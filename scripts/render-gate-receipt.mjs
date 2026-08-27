/**
 * Render a human-readable receipt from a sealed Gate backtest record.
 *
 * The rule this implements (apparatus pipeline model v1, §7): every
 * human-readable receipt is generated from the sealed record by a script, and
 * the seal covers both. A receipt that says something the record does not is a
 * defect, not an interpretation.
 *
 * The 2026-08-20 receipt was authored beside its JSON instead of rendered from
 * it. It reported all eight criteria as PASS where the record says two blocking
 * criteria FAILED on every note, and then recommended promoting the seven notes
 * off that inversion. This script exists so that class of defect is structurally
 * unavailable: every number below is read out of the record.
 *
 * Two properties are deliberate:
 *
 * 1. **Deterministic.** Same record in, same bytes out. No wall clock, no
 *    environment, no ordering that depends on anything but the record. A
 *    receipt you cannot re-derive byte-for-byte is not sealed by its hash.
 *
 * 2. **Refuses rather than narrates.** Before rendering, the script re-derives
 *    each decision from the criteria the record carries. If a record's stated
 *    decision disagrees with its own criteria, the script exits non-zero
 *    instead of emitting a receipt. Rendering is not the place to resolve a
 *    contradiction in the thing being rendered.
 *
 * It re-runs nothing. It reads no note, resolves no reference, and does not
 * import the gate. Verdicts come from the record or they do not appear.
 *
 * Usage: node scripts/render-gate-receipt.mjs <record.json> [--out <receipt.md>]
 */

import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";

const SEVERITY_BLOCKING = "blocking";
const OUTCOME_PASS = "pass";
const OUTCOME_FAIL = "fail";
const OUTCOME_UNKNOWN = "unknown";

const args = process.argv.slice(2);
const positionals = [];
for (let i = 0; i < args.length; i += 1) {
  if (args[i].startsWith("--")) {
    i += 1; // skip the flag's value
    continue;
  }
  positionals.push(args[i]);
}
const argValue = (flag, fallback = null) => {
  const i = args.indexOf(flag);
  return i === -1 ? fallback : args[i + 1];
};

const IN = argValue("--in", positionals[0] ?? null);
const OUT = argValue("--out", null);
if (!IN) {
  console.error("usage: node scripts/render-gate-receipt.mjs <record.json> [--out <receipt.md>]");
  process.exit(2);
}

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

const recordBytes = readFileSync(IN);
const recordSha = sha256(recordBytes);
const selfPath = fileURLToPath(import.meta.url);
const selfSha = sha256(readFileSync(selfPath));

const parsed = JSON.parse(recordBytes.toString("utf8"));
const records = Array.isArray(parsed) ? parsed : parsed.rows ?? parsed.records ?? null;
if (!Array.isArray(records) || records.length === 0) {
  console.error(`${IN}: expected an array of gate records, or an object carrying rows/records`);
  process.exit(2);
}

// --- consistency gate -------------------------------------------------------
// Re-derive every decision from the criteria the record carries. A receipt is
// only worth rendering if the record agrees with itself.

const DECISION_RULE = (criteria) => {
  const blocking = criteria.filter((c) => c.severity === SEVERITY_BLOCKING);
  if (blocking.some((c) => c.outcome === OUTCOME_FAIL)) return "reject";
  if (blocking.some((c) => c.outcome === OUTCOME_UNKNOWN)) return "hold";
  return "promote";
};

const complaints = [];
for (const record of records) {
  const d = record.decision;
  const where = record.id ?? d?.itemId ?? "(unidentified record)";
  if (!d || !Array.isArray(d.criteria)) {
    complaints.push(`${where}: record carries no decision.criteria`);
    continue;
  }
  const derived = DECISION_RULE(d.criteria);
  if (derived !== d.decision) {
    complaints.push(
      `${where}: record states decision "${d.decision}" but its own criteria imply "${derived}"`,
    );
  }
  const statedFailures = [...(d.blockingFailures ?? [])].sort();
  const actualFailures = d.criteria
    .filter((c) => c.severity === SEVERITY_BLOCKING && c.outcome === OUTCOME_FAIL)
    .map((c) => c.id)
    .sort();
  if (statedFailures.join("|") !== actualFailures.join("|")) {
    complaints.push(
      `${where}: blockingFailures ${JSON.stringify(statedFailures)} does not match ` +
        `the blocking criteria that failed ${JSON.stringify(actualFailures)}`,
    );
  }
}
if (complaints.length) {
  console.error("refusing to render: the record disagrees with itself\n");
  for (const complaint of complaints) console.error(`  - ${complaint}`);
  process.exit(1);
}

// --- rendering helpers ------------------------------------------------------

/** Make a value safe to sit in a markdown table cell. */
const cell = (value) => String(value ?? "").replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " ").trim();

const truncate = (text, max) => {
  const flat = cell(text);
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
};

/** Render a criterion's `observed` payload as compact, readable key=value. */
function observedText(observed) {
  if (observed === null || observed === undefined) return "—";
  if (Array.isArray(observed)) return observed.length ? observed.join(", ") : "none";
  if (typeof observed !== "object") return String(observed);
  const parts = Object.entries(observed).map(([key, value]) => {
    if (Array.isArray(value)) return `${key}=[${value.length ? value.join(", ") : ""}]`;
    return `${key}=${value}`;
  });
  return parts.length ? parts.join(", ") : "—";
}

const OUTCOME_MARK = { pass: "PASS", fail: "**FAIL**", unknown: "unknown" };
const outcomeText = (outcome) => OUTCOME_MARK[outcome] ?? cell(outcome);

const plural = (n, one, many) => (n === 1 ? one : many);

// --- derived tallies --------------------------------------------------------

const counts = { promote: 0, hold: 0, reject: 0 };
for (const record of records) {
  const decision = record.decision.decision;
  counts[decision] = (counts[decision] ?? 0) + 1;
}

const criterionTally = new Map(); // id -> {description, severity, pass, fail, unknown}
for (const record of records) {
  for (const criterion of record.decision.criteria) {
    if (!criterionTally.has(criterion.id)) {
      criterionTally.set(criterion.id, {
        description: criterion.description,
        severity: criterion.severity,
        pass: 0,
        fail: 0,
        unknown: 0,
      });
    }
    criterionTally.get(criterion.id)[criterion.outcome] += 1;
  }
}

const gateClaimCount = (record) => {
  const hasClaims = record.decision.criteria.find((c) => c.id === "has-claims");
  return hasClaims?.observed?.claimCount ?? null;
};

/** Notes where the record's own annotation layer disagrees with the gate's parse. */
const claimCountDivergences = records
  .map((record) => ({
    id: record.id,
    annotated: record.claimsCount ?? (Array.isArray(record.claims) ? record.claims.length : null),
    gate: gateClaimCount(record),
  }))
  .filter((row) => row.annotated !== null && row.gate !== null && row.annotated !== row.gate);

const bars = [...new Set(records.map((r) => `${r.decision.bar?.id} v${r.decision.bar?.version}`))];
const requiresApproval = records.some((r) => r.decision.requiresHumanApproval);
const appliedAny = records.some((r) => r.decision.appliedAutomatically);
const recordName = basename(IN);
const dateMatch = /(\d{4}-\d{2}-\d{2})/.exec(recordName);
const runDate = dateMatch ? dateMatch[1] : null;

// --- the receipt ------------------------------------------------------------

const out = [];
const push = (...lines) => out.push(...lines);

push(
  "---",
  'title: "Gate Head — Needs-Audit Backlog Backtest, Rendered Receipt"',
  'type: "evaluation-receipt"',
  'status: "final"',
  `bar: "${cell(bars.join(", "))}"`,
  runDate ? `date: "${runDate}"` : null,
  `source_record: "${cell(recordName)}"`,
  `source_record_sha256: "${recordSha}"`,
  `rendered_by: "workbench/scripts/${basename(selfPath)}"`,
  `rendered_by_sha256: "${selfSha}"`,
  'tags: ["decision-engine", "gate-head", "backtest", "rendered-receipt"]',
  "---",
  "",
  "# Gate Head — Needs-Audit Backlog Backtest, Rendered Receipt",
  "",
  "> **This file is generated.** Every figure below is read out of",
  `> \`${cell(recordName)}\`. Do not edit it by hand — edit the record or the`,
  "> renderer and run:",
  ">",
  "> ```bash",
  `> node scripts/${basename(selfPath)} ../outputs/${cell(recordName)} --out ../outputs/${cell(
    recordName.replace(/\.json$/, ".md"),
  )}`,
  "> ```",
  "",
  `**Record:** \`${cell(recordName)}\`  `,
  `**Record SHA-256:** \`${recordSha}\`  `,
  `**Renderer SHA-256:** \`${selfSha}\`  `,
  `**Bar:** ${cell(bars.join(", "))}  `,
  `**Items judged:** ${records.length}`,
  "",
  "---",
  "",
  "## 1. Result",
  "",
);

const verdictLine = Object.entries(counts)
  .filter(([, n]) => n > 0)
  .map(([decision, n]) => `**${n} ${decision}**`)
  .join(", ");
push(`${records.length} ${plural(records.length, "item", "items")} judged: ${verdictLine}.`, "");

if (counts.reject === records.length) {
  push(
    "Every item in this run was **rejected**. No note here cleared the bar, and nothing in this",
    "record supports promoting any of them.",
    "",
  );
}

push(
  "| Item | Domain | Gate verdict | Blocking failures | Unchecked | Advisory caveats |",
  "|---|---|:---:|---|---|---|",
);
for (const record of records) {
  const d = record.decision;
  push(
    `| \`${cell(record.id)}\` | \`${cell(record.domain)}\` | **${d.decision.toUpperCase()}** | ` +
      `${d.blockingFailures.length ? d.blockingFailures.map((f) => `\`${cell(f)}\``).join(", ") : "none"} | ` +
      `${d.blockingUnknowns.length ? d.blockingUnknowns.map((u) => `\`${cell(u)}\``).join(", ") : "none"} | ` +
      `${d.caveats.length ? d.caveats.map((c) => `\`${cell(c.id)}\``).join(", ") : "none"} |`,
  );
}
push("");

push(
  "---",
  "",
  "## 2. Criterion outcomes across the run",
  "",
  `Tallied over all ${records.length} ${plural(records.length, "item", "items")}. A blocking \`fail\``,
  "rejects; a blocking `unknown` holds and never rejects; advisory outcomes ride along as caveats.",
  "",
  "| # | Criterion | Severity | Pass | Fail | Unknown |",
  "|---|---|---|:---:|:---:|:---:|",
);
let n = 0;
for (const [id, t] of criterionTally) {
  n += 1;
  const fail = t.fail > 0 ? `**${t.fail}**` : "0";
  push(
    `| ${n} | \`${cell(id)}\` | ${cell(t.severity)} | ${t.pass}/${records.length} | ` +
      `${fail}/${records.length} | ${t.unknown}/${records.length} |`,
  );
}
push("");

const failingCriteria = [...criterionTally.entries()].filter(([, t]) => t.fail > 0);
if (failingCriteria.length) {
  push(
    `${failingCriteria.length} ${plural(failingCriteria.length, "criterion", "criteria")} failed at least once:`,
    "",
  );
  for (const [id, t] of failingCriteria) {
    push(`- \`${cell(id)}\` — ${cell(t.description)} Failed on ${t.fail}/${records.length}.`);
  }
  push("");
}

push("---", "", "## 3. Per-item detail", "");
push(
  "Rationale strings are reproduced verbatim. This receipt renders the record; it does not",
  "correct it.",
  "",
);

// Records sealed before the plural fix in `gateHead.js` carry "criteriona" in their
// rationale. Say so where it shows, rather than quietly rewriting a sealed string. The
// note disappears on its own once every record in a run was produced by the fixed engine.
const misspelled = records.filter((r) => /criteriona/.test(r.decision.rationale ?? ""));
if (misspelled.length) {
  push(
    `> **Known engine defect, visible below.** ${misspelled.length} of ${records.length} rationale`,
    "> strings read `criteriona` where they should read `criteria`: the gate built its plural as",
    '> `"criterion" + (n === 1 ? "" : "a")`. The string is cosmetic and carries no part of any',
    "> verdict. It was fixed in `src/gate/gateHead.js` after this run was sealed, and these records",
    "> keep the string they were sealed with — re-sealing seven records to correct a typo would be",
    "> the more expensive mistake.",
    "",
  );
}
for (const record of records) {
  const d = record.decision;
  push(
    `### \`${cell(record.id)}\` — ${cell(record.title)}`,
    "",
    `- **Path:** \`${cell(record.path)}\``,
    record.lane ? `- **Lane:** \`${cell(record.lane)}\` | **Domain:** \`${cell(record.domain)}\`` : null,
    `- **Verdict:** **${d.decision.toUpperCase()}**`,
    `- **Rationale (verbatim from the record):** \`${cell(d.rationale)}\``,
    `- **Close call:** \`${d.closeCall}\` | **Requires human approval:** \`${d.requiresHumanApproval}\` | **Applied automatically:** \`${d.appliedAutomatically}\``,
    "",
    "| Criterion | Severity | Outcome | Observed | Note |",
    "|---|---|:---:|---|---|",
  );
  for (const criterion of d.criteria) {
    push(
      `| \`${cell(criterion.id)}\` | ${cell(criterion.severity)} | ${outcomeText(criterion.outcome)} | ` +
        `${cell(observedText(criterion.observed))} | ${criterion.note ? cell(criterion.note) : "—"} |`,
    );
  }
  push("");

  if (record.resolutions && Object.keys(record.resolutions).length) {
    const entries = Object.entries(record.resolutions);
    const dangling = entries.filter(([, r]) => r.exists === false).length;
    const tainted = entries.filter(([, r]) => r.quarantined === true).length;
    push(
      `**Reference resolution** — ${entries.length} checked, ${dangling} dangling, ${tainted} quarantined.`,
      "",
      "| Reference | Exists | Quarantined |",
      "|---|:---:|:---:|",
    );
    for (const [ref, r] of entries) {
      push(`| \`${cell(ref)}\` | ${r.exists ? "yes" : "**no**"} | ${r.quarantined ? "**yes**" : "no"} |`);
    }
    push("");
  }
}

// --- the annotation layer ---------------------------------------------------

const anyClaims = records.some((r) => Array.isArray(r.claims) && r.claims.length);
if (anyClaims) {
  push(
    "---",
    "",
    "## 4. Authored claim annotations (not gate output)",
    "",
    "The record carries a per-claim decomposition alongside the gate's result. **The gate did",
    "not produce it and did not consult it.** The note-promotion bar is entirely structural —",
    "it checks whether a claim carries a label, whether it points at a source, and whether that",
    "source exists and is clean. It has no vocabulary for evidence tiers or confidence grades,",
    "so the `tier` and `confidence` values below are authored annotations reproduced from the",
    "record, not findings the engine reached.",
    "",
  );

  if (claimCountDivergences.length) {
    push(
      `**These annotations disagree with the gate on ${claimCountDivergences.length} of ${records.length} ` +
        `${plural(records.length, "item", "items")}.** The annotation layer counts more claims than the`,
      "gate parsed, on every item where they differ:",
      "",
      "| Item | Annotated claims | Claims the gate parsed | Difference |",
      "|---|:---:|:---:|:---:|",
    );
    for (const row of claimCountDivergences) {
      const diff = row.annotated - row.gate;
      push(`| \`${cell(row.id)}\` | ${row.annotated} | ${row.gate} | ${diff > 0 ? `+${diff}` : diff} |`);
    }
    push(
      "",
      "The gate's count is the one its verdict rests on: `every-claim-labelled` and",
      "`every-claim-cites-evidence` report their totals against the claims the gate parsed. The",
      "record does not carry per-claim identities for the unlabelled and uncited ones, so this",
      "receipt cannot name which claims they were.",
      "",
    );
  }

  for (const record of records) {
    if (!Array.isArray(record.claims) || !record.claims.length) continue;
    push(
      `### \`${cell(record.id)}\` — ${record.claims.length} annotated ${plural(record.claims.length, "claim", "claims")}`,
      "",
      "| Section | Claim | Annotated type | Cited source | Tier | Confidence | Excerpt |",
      "|---|---|---|---|---|---|---|",
    );
    for (const claim of record.claims) {
      push(
        `| ${truncate(claim.section, 46)} | ${truncate(claim.title, 54)} | \`${cell(claim.claimType)}\` | ` +
          `${truncate(claim.citedSource, 38)} | ${cell(claim.tier)} | ${cell(claim.confidence)} | ` +
          `${truncate(claim.bodyExcerpt, 96)} |`,
      );
    }
    push("");
  }
}

// --- what follows -----------------------------------------------------------

push("---", "", "## 5. What follows from this record", "");

const promoted = records.filter((r) => r.decision.decision === "promote");
const held = records.filter((r) => r.decision.decision === "hold");
const rejected = records.filter((r) => r.decision.decision === "reject");

if (rejected.length) {
  push(
    `**${rejected.length} ${plural(rejected.length, "item", "items")} rejected.** ` +
      `${rejected.length === records.length ? "No item in this run cleared the bar." : "These did not clear the bar."}`,
    "A reject is not a finding about whether the note is true or useful. It is a finding that",
    "the note does not meet the structural bar: claims that carry a label, and claims that point",
    "at a source. The remedy is to label and cite the claims the gate could not, then re-run.",
    "",
    "The following must **not** happen on the strength of this record:",
    "",
    "- clearing `needs-audit`",
    "- advancing `status` to `audited` or `stable`",
    "",
  );
}
if (held.length) {
  push(
    `**${held.length} ${plural(held.length, "item", "items")} held.** Nothing failed; a blocking criterion`,
    "was not checked. A hold is not a rejection — supply the missing observation and re-run.",
    "",
  );
}
if (promoted.length) {
  push(
    `**${promoted.length} ${plural(promoted.length, "item", "items")} cleared the bar.** ` +
      (requiresApproval
        ? "This is a recommendation, not a state change: the bar is operator-only (ADR-019 puts " +
          "`status: stable` in Tier C, never auto-applied), so an operator applies it or it does " +
          "not happen."
        : "The bar does not require human approval."),
    "",
  );
}
push(
  `Across this run \`requiresHumanApproval\` is \`${requiresApproval}\` and \`appliedAutomatically\` is`,
  `\`${appliedAny}\` — the engine applied nothing.`,
  "",
);

push(
  "---",
  "",
  "## 6. Provenance",
  "",
  `| | |`,
  `|---|---|`,
  `| Sealed record | \`${cell(recordName)}\` |`,
  `| Record SHA-256 | \`${recordSha}\` |`,
  `| Renderer | \`workbench/scripts/${cell(basename(selfPath))}\` |`,
  `| Renderer SHA-256 | \`${selfSha}\` |`,
  `| Items | ${records.length} |`,
  `| Bar | ${cell(bars.join(", "))} |`,
  "",
  "This receipt is a deterministic function of the record: the same record and the same",
  "renderer reproduce these bytes exactly. Both hashes above are covered by `SHA256SUMS`",
  "beside the record, so a reader can re-derive the receipt and check it against the seal.",
  "",
);

const text = `${out.filter((line) => line !== null).join("\n").replace(/\n{3,}/g, "\n\n").trimEnd()}\n`;

if (OUT) {
  writeFileSync(OUT, text);
  console.error(`rendered ${records.length} records -> ${OUT}`);
  console.error(`  record   sha256 ${recordSha}`);
  console.error(`  renderer sha256 ${selfSha}`);
} else {
  process.stdout.write(text);
}
