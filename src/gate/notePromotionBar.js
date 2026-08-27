/**
 * The note-promotion bar — the Gate head's first MainFrame application.
 *
 * The bar is derived from what a `status: stable` note in `10_knowledge/`
 * actually looks like, not from an idea of what one should look like: every
 * claim carries a confidence label, every claim points at evidence, and the
 * evidence it points at exists and is not itself quarantined.
 *
 * MainFrame's routing policy (ADR-019) puts `status: stable` in Tier C —
 * "never auto-applied regardless of rule match". The bar therefore declares
 * `requiresHumanApproval`, and a `promote` from it is a recommendation with a
 * receipt, never a state change.
 *
 * The parser is intentionally shallow. It reads the conventions the corpus
 * already uses and reports `unknown` where it cannot tell, because a parser
 * that guesses would manufacture the failures the gate is supposed to detect.
 */

import { SEVERITY, OUTCOME, defineBar } from "./gateHead.js";

const CLAIM_LABEL = /\[\s*(?:(?:source-claim|inference|observation|hypothesis|assumption)[^\]]*|[^\]]*\/\s*[^\]]+confidence|[^\]]+\/\s*[^\]]+)\s*\]/i;
const EVIDENCE_LINE = /^\s*\*Evidence:\*\s*(.+)$/i;
const REF_TOKEN = /`([^`]+\.md)`|\[\[([^\]]+)\]\]|([a-zA-Z0-9_\-]+\.md)/g;
const PLACEHOLDER = /\b(TODO|TBD|FIXME|XXX|\[placeholder\]|lorem ipsum)\b/i;

/** Split frontmatter from body. Returns `{ frontmatter, body }`. */
export function splitFrontmatter(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  if (!match) return { frontmatter: "", body: text };
  return { frontmatter: match[1], body: match[2] };
}

function frontmatterValue(frontmatter, key) {
  const line = new RegExp(`^${key}:\\s*(.*)$`, "m").exec(frontmatter);
  if (!line) return null;
  return line[1].trim().replace(/^["']|["']$/g, "");
}

function frontmatterList(frontmatter, key) {
  // Supports both `key: ["a", "b"]` and a YAML block list under `key:`.
  const inline = new RegExp(`^${key}:\\s*\\[(.*)\\]\\s*$`, "m").exec(frontmatter);
  if (inline) {
    return inline[1]
      .split(",")
      .map((v) => v.trim().replace(/^["']|["']$/g, "").replace(/^\[\[|\]\]$/g, ""))
      .filter(Boolean);
  }
  // Walk the lines instead of regexing across them: a block list ends at the
  // next line that starts in column 0, and JS regex has no \Z to lean on.
  const lines = frontmatter.split("\n");
  const start = lines.findIndex((line) => new RegExp(`^${key}:\\s*$`).test(line));
  if (start === -1) return [];
  const values = [];
  for (const line of lines.slice(start + 1)) {
    if (/^\S/.test(line)) break;
    const entry = /^\s*-\s*(.+)$/.exec(line);
    if (entry) values.push(entry[1].trim().replace(/^["']|["']$/g, "").replace(/^\[\[|\]\]$/g, ""));
  }
  return values.filter(Boolean);
}

function extractRefs(line) {
  const refs = [];
  let match;
  REF_TOKEN.lastIndex = 0;
  while ((match = REF_TOKEN.exec(line)) !== null) {
    const ref = match[1] || match[2] || match[3];
    if (ref) refs.push(ref.trim().replace(/^\[\[|\]\]$/g, ""));
  }
  return refs;
}

/**
 * Parse a note into a Gate item.
 *
 * `resolve` is supplied by the caller and answers "does this reference point at
 * a real, non-quarantined file?" as `{ exists, quarantined }`. When it is
 * omitted the resolution criteria record `unknown` rather than guessing — the
 * engine holds, and never rejects, on an unchecked criterion.
 */
export function parseNoteToGateItem(id, text, resolve = null) {
  const { frontmatter, body } = splitFrontmatter(text);

  // A claim is a paragraph carrying a `[kind / confidence]` or epistemic label. The
  // `*Evidence:*` line that follows it, if any, belongs to that claim.
  const blocks = body.split(/\n\s*\n/);
  const claims = [];
  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i];
    const label = CLAIM_LABEL.exec(block);
    const isNumberedPoint = /^\s*(?:\*\*\d+\.|\d+\.\s+\*\*)/.test(block);
    if (!label && !isNumberedPoint) continue;

    let evidenceRefs = [];
    let hasEvidenceLine = false;
    for (const line of block.split("\n")) {
      const evidence = EVIDENCE_LINE.exec(line);
      if (evidence) {
        hasEvidenceLine = true;
        evidenceRefs = evidenceRefs.concat(extractRefs(evidence[1]));
      }
    }
    // The evidence line is sometimes the following block.
    if (!hasEvidenceLine && blocks[i + 1]) {
      const evidence = EVIDENCE_LINE.exec(blocks[i + 1].trim());
      if (evidence) {
        hasEvidenceLine = true;
        evidenceRefs = extractRefs(evidence[1]);
      }
    }
    // If the claim itself has an inlined SOURCE-CLAIM label or extracts refs directly
    if (!hasEvidenceLine) {
      if (label && /source-claim/i.test(label[0])) {
        hasEvidenceLine = true;
      }
      const inlineRefs = extractRefs(block);
      if (inlineRefs.length > 0) {
        hasEvidenceLine = true;
        evidenceRefs = evidenceRefs.concat(inlineRefs);
      }
    }

    claims.push({
      index: claims.length + 1,
      confidenceLabel: label ? label[0] : null,
      hasEvidenceLine,
      evidenceRefs,
    });
  }

  const declaredLinks = frontmatterList(frontmatter, "links");
  const allRefs = [...new Set(claims.flatMap((c) => c.evidenceRefs).concat(declaredLinks))];
  const resolutions = resolve
    ? Object.fromEntries(allRefs.map((ref) => [ref, resolve(ref)]))
    : null;

  return {
    id,
    kind: "knowledge-note",
    type: frontmatterValue(frontmatter, "type"),
    status: frontmatterValue(frontmatter, "status"),
    claims,
    declaredLinks,
    resolutions,
    hasPurposeSection: /(?:^##\s+(Decision Supported|Purpose|Why this matters)|^\s*\*\*(?:Decision this note supports|Purpose|Decision Supported):\*\*)/im.test(body),
    placeholderHits: (body.match(PLACEHOLDER) || []).slice(0, 3),
    bodyLength: body.trim().length,
  };
}

export const NOTE_PROMOTION_BAR = defineBar({
  id: "note-promotion",
  version: "0.1.0",
  description:
    "Bar for promoting a 10_knowledge synthesis note to status: stable. " +
    "Recommendation only — ADR-019 puts status: stable in Tier C (operator-applied).",
  requiresHumanApproval: true,
  criteria: [
    {
      id: "has-claims",
      description: "The note states at least one identifiable claim.",
      severity: SEVERITY.BLOCKING,
      evaluate: (item) => ({
        outcome: item.claims.length > 0 ? OUTCOME.PASS : OUTCOME.FAIL,
        observed: { claimCount: item.claims.length },
        note: item.claims.length === 0 ? "no labelled or numbered claims found" : null,
      }),
    },
    {
      id: "every-claim-labelled",
      description: "Every claim carries a [kind / confidence] label.",
      severity: SEVERITY.BLOCKING,
      evaluate: (item) => {
        if (item.claims.length === 0) return { outcome: OUTCOME.UNKNOWN, observed: null };
        const unlabelled = item.claims.filter((c) => !c.confidenceLabel);
        return {
          outcome: unlabelled.length === 0 ? OUTCOME.PASS : OUTCOME.FAIL,
          observed: { unlabelled: unlabelled.length, total: item.claims.length },
        };
      },
    },
    {
      id: "every-claim-cites-evidence",
      description: "Every claim points at a source.",
      severity: SEVERITY.BLOCKING,
      evaluate: (item) => {
        if (item.claims.length === 0) return { outcome: OUTCOME.UNKNOWN, observed: null };
        const uncited = item.claims.filter((c) => !c.hasEvidenceLine);
        return {
          outcome: uncited.length === 0 ? OUTCOME.PASS : OUTCOME.FAIL,
          observed: { uncited: uncited.length, total: item.claims.length },
        };
      },
    },
    {
      id: "evidence-resolves",
      description: "Every cited reference points at a file that exists.",
      severity: SEVERITY.BLOCKING,
      evaluate: (item) => {
        if (!item.resolutions) {
          return { outcome: OUTCOME.UNKNOWN, observed: null, note: "no resolver supplied" };
        }
        const refs = Object.entries(item.resolutions);
        if (refs.length === 0) return { outcome: OUTCOME.UNKNOWN, observed: null };
        const dangling = refs.filter(([, r]) => r && r.exists === false).map(([ref]) => ref);
        return {
          outcome: dangling.length === 0 ? OUTCOME.PASS : OUTCOME.FAIL,
          observed: { dangling: dangling.slice(0, 5), checked: refs.length },
        };
      },
    },
    {
      id: "no-quarantined-sources",
      description: "No cited source is itself quarantined.",
      severity: SEVERITY.BLOCKING,
      evaluate: (item) => {
        if (!item.resolutions) {
          return { outcome: OUTCOME.UNKNOWN, observed: null, note: "no resolver supplied" };
        }
        const refs = Object.entries(item.resolutions);
        if (refs.length === 0) return { outcome: OUTCOME.UNKNOWN, observed: null };
        const tainted = refs.filter(([, r]) => r && r.quarantined === true).map(([ref]) => ref);
        return {
          outcome: tainted.length === 0 ? OUTCOME.PASS : OUTCOME.FAIL,
          observed: { quarantinedSources: tainted.slice(0, 5), checked: refs.length },
        };
      },
    },
    {
      id: "links-declared",
      description: "Frontmatter declares the sources this note synthesises.",
      severity: SEVERITY.ADVISORY,
      evaluate: (item) => ({
        outcome: item.declaredLinks.length > 0 ? OUTCOME.PASS : OUTCOME.FAIL,
        observed: { declaredLinks: item.declaredLinks.length },
      }),
    },
    {
      id: "states-its-purpose",
      description: "The note says what decision it supports.",
      severity: SEVERITY.ADVISORY,
      evaluate: (item) => ({
        outcome: item.hasPurposeSection ? OUTCOME.PASS : OUTCOME.FAIL,
        observed: { hasPurposeSection: item.hasPurposeSection },
      }),
    },
    {
      id: "no-placeholders",
      description: "No TODO/TBD/FIXME left in the body.",
      severity: SEVERITY.ADVISORY,
      evaluate: (item) => ({
        outcome: item.placeholderHits.length === 0 ? OUTCOME.PASS : OUTCOME.FAIL,
        observed: { hits: item.placeholderHits },
      }),
    },
  ],
});
