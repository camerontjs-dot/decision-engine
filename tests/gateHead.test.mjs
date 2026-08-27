/**
 * Gate head tests. Node-runnable, dependency-free:
 *     node --test tests/gateHead.test.mjs
 *
 * The load-bearing property is the first group: an unchecked criterion must
 * hold, never reject. A gate that turns "we did not look" into "it failed"
 * manufactures adverse findings, and adverse findings are the expensive kind.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  DECISION,
  OUTCOME,
  SEVERITY,
  defineBar,
  evaluateGate,
  summarizeDecisions,
} from "../src/gate/gateHead.js";
import { NOTE_PROMOTION_BAR, parseNoteToGateItem } from "../src/gate/notePromotionBar.js";

const criterion = (id, severity, outcome) => ({
  id,
  description: id,
  severity,
  evaluate: () => ({ outcome, observed: { id } }),
});

const barWith = (...criteria) =>
  defineBar({ id: "test-bar", version: "0.0.0", criteria });

test("unknown blocking criteria hold, they never reject", () => {
  const bar = barWith(criterion("checked", SEVERITY.BLOCKING, OUTCOME.PASS),
                      criterion("unchecked", SEVERITY.BLOCKING, OUTCOME.UNKNOWN));
  const decision = evaluateGate({ id: "x" }, bar);
  assert.equal(decision.decision, DECISION.HOLD);
  assert.deepEqual(decision.blockingUnknowns, ["unchecked"]);
  assert.deepEqual(decision.blockingFailures, []);
});

test("a blocking failure rejects, and names which criterion did it", () => {
  const bar = barWith(criterion("ok", SEVERITY.BLOCKING, OUTCOME.PASS),
                      criterion("bad", SEVERITY.BLOCKING, OUTCOME.FAIL));
  const decision = evaluateGate({ id: "x" }, bar);
  assert.equal(decision.decision, DECISION.REJECT);
  assert.deepEqual(decision.blockingFailures, ["bad"]);
  assert.match(decision.rationale, /bad/);
});

test("a real failure outranks an unchecked criterion", () => {
  const bar = barWith(criterion("bad", SEVERITY.BLOCKING, OUTCOME.FAIL),
                      criterion("unchecked", SEVERITY.BLOCKING, OUTCOME.UNKNOWN));
  assert.equal(evaluateGate({ id: "x" }, bar).decision, DECISION.REJECT);
});

test("the rationale pluralises criterion/criteria, and agrees with the count it states", () => {
  const failing = (n) =>
    barWith(...Array.from({ length: n }, (_, i) => criterion(`bad${i}`, SEVERITY.BLOCKING, OUTCOME.FAIL)));
  const unchecked = (n) =>
    barWith(...Array.from({ length: n }, (_, i) => criterion(`gap${i}`, SEVERITY.BLOCKING, OUTCOME.UNKNOWN)));

  const rationaleOf = (bar) => evaluateGate({ id: "x" }, bar).rationale;

  assert.match(rationaleOf(failing(1)), /^1 blocking criterion failed: /);
  assert.match(rationaleOf(failing(2)), /^2 blocking criteria failed: /);
  assert.match(rationaleOf(unchecked(1)), /\b1 blocking criterion was not checked: /);
  assert.match(rationaleOf(unchecked(2)), /\b2 blocking criteria were not checked: /);

  // The plural was once built as `"criterion" + (n === 1 ? "" : "a")`, which printed
  // "2 blocking criteriona failed" into every sealed record of the 2026-08-20 backtest.
  for (const bar of [failing(1), failing(2), unchecked(1), unchecked(2)]) {
    assert.doesNotMatch(rationaleOf(bar), /criteriona/);
  }
});

test("a criterion that throws records unknown, not failure", () => {
  const bar = barWith({
    id: "explodes",
    description: "explodes",
    severity: SEVERITY.BLOCKING,
    evaluate: () => {
      throw new Error("resolver offline");
    },
  });
  const decision = evaluateGate({ id: "x" }, bar);
  assert.equal(decision.decision, DECISION.HOLD);
  assert.match(decision.criteria[0].note, /resolver offline/);
});

test("advisory findings become caveats and do not block promotion", () => {
  const bar = barWith(criterion("blocking-ok", SEVERITY.BLOCKING, OUTCOME.PASS),
                      criterion("nice-to-have", SEVERITY.ADVISORY, OUTCOME.FAIL));
  const decision = evaluateGate({ id: "x" }, bar);
  assert.equal(decision.decision, DECISION.PROMOTE);
  assert.equal(decision.caveats.length, 1);
  assert.equal(decision.caveats[0].id, "nice-to-have");
  assert.equal(decision.closeCall, true);
});

test("a promote from an operator-only bar is a recommendation, never applied", () => {
  const bar = defineBar({
    id: "tier-c",
    version: "1",
    requiresHumanApproval: true,
    criteria: [criterion("ok", SEVERITY.BLOCKING, OUTCOME.PASS)],
  });
  const decision = evaluateGate({ id: "x" }, bar);
  assert.equal(decision.decision, DECISION.PROMOTE);
  assert.equal(decision.requiresHumanApproval, true);
  assert.equal(decision.appliedAutomatically, false);
});

test("the note-promotion bar is operator-only (ADR-019 Tier C)", () => {
  assert.equal(NOTE_PROMOTION_BAR.requiresHumanApproval, true);
});

test("malformed bars are rejected at definition time", () => {
  assert.throws(() => defineBar({ id: "b", criteria: [] }), /at least one criterion/);
  assert.throws(
    () => defineBar({ id: "b", criteria: [{ id: "a", severity: "blocking" }] }),
    /no evaluate/,
  );
  assert.throws(
    () =>
      defineBar({
        id: "b",
        criteria: [criterion("dup", SEVERITY.BLOCKING, OUTCOME.PASS),
                   criterion("dup", SEVERITY.BLOCKING, OUTCOME.PASS)],
      }),
    /duplicate criterion/,
  );
});

// --- the note adapter -------------------------------------------------------

const STABLE_NOTE = `---
type: "note"
domain: "ui-design"
status: "stable"
links:
  - 10_knowledge/ui-design/raw-a.md
  - 10_knowledge/ui-design/raw-b.md
---

# A Title

## Decision Supported
Pick a menu paradigm.

**1. First point**
[source-claim / high-confidence] Menus can be categorised by diegesis.
*Evidence:* \`raw-a.md\`

**2. Second point**
[source-claim / medium-confidence] Inventories map to three paradigms.
*Evidence:* \`raw-b.md\`
`;

test("the adapter reads claims, labels, evidence and links off a real stable note", () => {
  const item = parseNoteToGateItem("stable-note", STABLE_NOTE, () => ({
    exists: true,
    quarantined: false,
  }));
  assert.equal(item.claims.length, 2);
  assert.ok(item.claims.every((c) => c.confidenceLabel));
  assert.ok(item.claims.every((c) => c.hasEvidenceLine));
  assert.equal(item.declaredLinks.length, 2);
  assert.equal(item.hasPurposeSection, true);
  assert.equal(evaluateGate(item, NOTE_PROMOTION_BAR).decision, DECISION.PROMOTE);
});

test("without a resolver the note gate holds rather than promoting on faith", () => {
  const item = parseNoteToGateItem("stable-note", STABLE_NOTE); // no resolver
  const decision = evaluateGate(item, NOTE_PROMOTION_BAR);
  assert.equal(decision.decision, DECISION.HOLD);
  assert.ok(decision.blockingUnknowns.includes("evidence-resolves"));
});

test("a quarantined source rejects the note that cites it", () => {
  const item = parseNoteToGateItem("cites-quarantined", STABLE_NOTE, (ref) => ({
    exists: true,
    quarantined: ref.includes("raw-b"),
  }));
  const decision = evaluateGate(item, NOTE_PROMOTION_BAR);
  assert.equal(decision.decision, DECISION.REJECT);
  assert.ok(decision.blockingFailures.includes("no-quarantined-sources"));
});

test("an unlabelled claim blocks promotion", () => {
  const note = STABLE_NOTE.replace("[source-claim / medium-confidence] ", "");
  const item = parseNoteToGateItem("mixed", note, () => ({ exists: true, quarantined: false }));
  const decision = evaluateGate(item, NOTE_PROMOTION_BAR);
  assert.equal(decision.decision, DECISION.REJECT);
  assert.ok(decision.blockingFailures.includes("every-claim-labelled"));
});

test("summarizeDecisions counts decisions and per-criterion outcomes", () => {
  const bar = barWith(criterion("a", SEVERITY.BLOCKING, OUTCOME.PASS));
  const summary = summarizeDecisions([evaluateGate({ id: "1" }, bar), evaluateGate({ id: "2" }, bar)]);
  assert.equal(summary.total, 2);
  assert.equal(summary.counts.promote, 2);
  assert.equal(summary.byCriterion.a.pass, 2);
});
