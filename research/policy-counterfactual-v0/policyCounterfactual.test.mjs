import test from "node:test";
import assert from "node:assert/strict";

import { DECISION, OUTCOME, SEVERITY, defineBar } from "../../src/gate/gateHead.js";
import { NOTE_PROMOTION_BAR, parseNoteToGateItem } from "../../src/gate/notePromotionBar.js";
import {
  classifyGateUnknownCandidate,
  classifyGateUnknowns,
  evaluateGatePolicyCounterfactual,
} from "./policyCounterfactual.mjs";

const outcomeFor = (value) => {
  if (value === "pass") return OUTCOME.PASS;
  if (value === "fail") return OUTCOME.FAIL;
  return OUTCOME.UNKNOWN;
};

const BAR = defineBar({
  id: "research.policy-counterfactual.demo",
  version: "0.1.0",
  requiresHumanApproval: true,
  criteria: [
    {
      id: "evidence-ready",
      description: "Required evidence is ready.",
      severity: SEVERITY.BLOCKING,
      evaluate: (item) => ({ outcome: outcomeFor(item.evidenceStatus), observed: item.evidenceStatus }),
    },
    {
      id: "authority-known",
      description: "Required authority condition is known.",
      severity: SEVERITY.BLOCKING,
      evaluate: (item) => ({ outcome: outcomeFor(item.authorityStatus), observed: item.authorityStatus }),
    },
    {
      id: "documentation-note",
      description: "Documentation note is present.",
      severity: SEVERITY.ADVISORY,
      evaluate: (item) => ({ outcome: outcomeFor(item.documentationStatus), observed: item.documentationStatus }),
    },
    {
      id: "retention-recorded",
      description: "Retention metadata is recorded.",
      severity: SEVERITY.ADVISORY,
      evaluate: (item) => ({ outcome: outcomeFor(item.retentionStatus), observed: item.retentionStatus }),
    },
  ],
});

const ITEM = Object.freeze({
  id: "case-001",
  evidenceStatus: "unknown",
  authorityStatus: "pass",
  documentationStatus: "unknown",
  retentionStatus: "unknown",
});

const STABLE_NOTE = `---
type: "note"
domain: "ui-design"
status: "stable"
links:
  - raw-a.md
  - raw-b.md
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

test("policy counterfactual replays the same bar with one explicit patch", () => {
  const result = evaluateGatePolicyCounterfactual({
    item: ITEM,
    bar: BAR,
    patch: { path: ["evidenceStatus"], value: "pass" },
  });
  assert.equal(result.semantics, "POLICY_COUNTERFACTUAL");
  assert.equal(result.baseline.decision, DECISION.HOLD);
  assert.equal(result.counterfactual.decision, DECISION.PROMOTE);
  assert.equal(result.recommendation_changed, true);
  assert.deepEqual(result.changed_criteria, [
    { id: "evidence-ready", before: OUTCOME.UNKNOWN, after: OUTCOME.PASS },
  ]);
  assert.equal(result.world_causal_claim, false);
});

test("a blocking unknown is decision-critical when an admissible value changes the decision", () => {
  const result = classifyGateUnknownCandidate({
    item: ITEM,
    bar: BAR,
    candidate: {
      id: "evidence-status",
      path: ["evidenceStatus"],
      admissibleValues: ["pass", "fail"],
    },
  });
  assert.equal(result.decision_impact, "critical");
  assert.equal(result.routing_class, "decision-critical");
  assert.deepEqual(result.changing_values.map((x) => [x.value, x.decision]), [
    ["pass", DECISION.PROMOTE],
    ["fail", DECISION.REJECT],
  ]);
});

test("an advisory unknown can be decision-invariant even though its criterion receipt changes", () => {
  const result = classifyGateUnknownCandidate({
    item: ITEM,
    bar: BAR,
    candidate: {
      id: "documentation-status",
      path: ["documentationStatus"],
      admissibleValues: ["pass", "fail"],
    },
  });
  assert.equal(result.decision_impact, "invariant");
  assert.equal(result.routing_class, "decision-invariant");
  assert.deepEqual(result.changing_values, []);
});

test("policy-mandatory remains visible even when the recommendation is invariant", () => {
  const result = classifyGateUnknownCandidate({
    item: ITEM,
    bar: BAR,
    candidate: {
      id: "retention-status",
      path: ["retentionStatus"],
      admissibleValues: ["pass", "fail"],
      policyMandatory: true,
    },
  });
  assert.equal(result.decision_impact, "invariant");
  assert.equal(result.policy_mandatory, true);
  assert.equal(result.routing_class, "policy-mandatory");
});

test("set classification preserves all three routing classes without inventing probabilities", () => {
  const result = classifyGateUnknowns({
    item: ITEM,
    bar: BAR,
    candidates: [
      { id: "evidence", path: ["evidenceStatus"], admissibleValues: ["pass", "fail"] },
      { id: "docs", path: ["documentationStatus"], admissibleValues: ["pass", "fail"] },
      { id: "retention", path: ["retentionStatus"], admissibleValues: ["pass", "fail"], policyMandatory: true },
    ],
  });
  assert.equal(result.baseline_decision, DECISION.HOLD);
  assert.deepEqual(result.candidates.map((x) => x.routing_class), [
    "decision-critical",
    "decision-invariant",
    "policy-mandatory",
  ]);
  assert.equal(result.world_causal_claim, false);
  assert.equal(JSON.stringify(result).includes("probability"), false);
});

test("counterfactual evaluation does not mutate the baseline item", () => {
  const before = JSON.stringify(ITEM);
  evaluateGatePolicyCounterfactual({
    item: ITEM,
    bar: BAR,
    patch: { path: ["evidenceStatus"], value: "pass" },
  });
  assert.equal(JSON.stringify(ITEM), before);
});

test("the same counterfactual is deterministic for the same inputs", () => {
  const args = {
    item: ITEM,
    bar: BAR,
    patch: { path: ["evidenceStatus"], value: "pass" },
  };
  assert.deepEqual(evaluateGatePolicyCounterfactual(args), evaluateGatePolicyCounterfactual(args));
});

test("unknown candidate domains must be explicit", () => {
  assert.throws(
    () => classifyGateUnknownCandidate({
      item: ITEM,
      bar: BAR,
      candidate: { id: "bad", path: ["evidenceStatus"], admissibleValues: [] },
    }),
    /at least one admissible value/,
  );
});

test("patches cannot invent new state paths", () => {
  assert.throws(
    () => evaluateGatePolicyCounterfactual({
      item: ITEM,
      bar: BAR,
      patch: { path: ["notObserved"], value: "pass" },
    }),
    /path does not exist/,
  );
});

test("prototype-pollution paths fail closed", () => {
  assert.throws(
    () => evaluateGatePolicyCounterfactual({
      item: ITEM,
      bar: BAR,
      patch: { path: ["__proto__"], value: { polluted: true } },
    }),
    /unsafe patch path segment/,
  );
  assert.equal({}.polluted, undefined);
});

test("the maintained note-promotion Gate exposes unresolved evidence resolution as decision-critical", () => {
  const item = parseNoteToGateItem("stable-note", STABLE_NOTE);
  assert.equal(item.resolutions, null);

  const result = classifyGateUnknownCandidate({
    item,
    bar: NOTE_PROMOTION_BAR,
    candidate: {
      id: "source-resolution",
      path: ["resolutions"],
      admissibleValues: [
        {
          "raw-a.md": { exists: true, quarantined: false },
          "raw-b.md": { exists: true, quarantined: false },
        },
        {
          "raw-a.md": { exists: true, quarantined: false },
          "raw-b.md": { exists: false, quarantined: false },
        },
      ],
    },
  });

  assert.equal(result.baseline_decision, DECISION.HOLD);
  assert.equal(result.decision_impact, "critical");
  assert.equal(result.routing_class, "decision-critical");
  assert.deepEqual(result.changing_values.map((x) => x.decision), [DECISION.PROMOTE, DECISION.REJECT]);
});

test("the maintained note-promotion Gate keeps an advisory purpose-field patch decision-invariant", () => {
  const item = parseNoteToGateItem("stable-note", STABLE_NOTE, () => ({ exists: true, quarantined: false }));
  const result = evaluateGatePolicyCounterfactual({
    item,
    bar: NOTE_PROMOTION_BAR,
    patch: { path: ["hasPurposeSection"], value: false },
  });

  assert.equal(result.baseline.decision, DECISION.PROMOTE);
  assert.equal(result.counterfactual.decision, DECISION.PROMOTE);
  assert.equal(result.recommendation_changed, false);
  assert.deepEqual(result.changed_criteria, [
    { id: "states-its-purpose", before: OUTCOME.PASS, after: OUTCOME.FAIL },
  ]);
});
