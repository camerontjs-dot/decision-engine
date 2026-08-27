/**
 * Gate head — judge ONE item against a stated bar.
 *
 * The Select/Rank head (v1, `decisionEngine.js`) answers "which of these?".
 * The Gate head answers "does this one clear the bar?" — the more common
 * primitive, and the one the apparatus needs to promote a note, admit a
 * source, or let an agent loop continue.
 *
 * Three properties are deliberate:
 *
 * 1. **Unknown is not failure.** A criterion whose evidence was never supplied
 *    records `unknown`, never `fail`. Unknowns can hold an item but can never
 *    reject it. Treating "we did not check" as "it failed" manufactures adverse
 *    findings, which is the same error the audit side guards against.
 *
 * 2. **No score.** The decision is derived from named criteria, and every
 *    criterion carries what was observed. A single number would hide which
 *    check did the work.
 *
 * 3. **Recommendation, not application.** Some transitions are operator-only
 *    (MainFrame routing policy, ADR-019: `status: stable` is Tier C — never
 *    auto-applied regardless of rule match). The bar declares that, and the
 *    decision carries `requiresHumanApproval` so a caller cannot lose it.
 *
 * The engine is pure: it performs no IO and resolves nothing. Callers supply
 * observations; an adapter is responsible for gathering them.
 */

export const SEVERITY = Object.freeze({
  BLOCKING: "blocking",
  ADVISORY: "advisory",
});

export const OUTCOME = Object.freeze({
  PASS: "pass",
  FAIL: "fail",
  UNKNOWN: "unknown",
});

export const DECISION = Object.freeze({
  PROMOTE: "promote",
  HOLD: "hold",
  REJECT: "reject",
});

/**
 * Build a bar. `criteria` is an ordered list of
 * `{ id, description, severity, evaluate(item) -> {outcome, observed, note} }`.
 */
export function defineBar({ id, version, description, criteria, requiresHumanApproval = false }) {
  if (!id) throw new Error("a bar needs an id");
  if (!Array.isArray(criteria) || criteria.length === 0) {
    throw new Error(`bar ${id} needs at least one criterion`);
  }
  const seen = new Set();
  for (const criterion of criteria) {
    if (!criterion.id) throw new Error(`bar ${id} has a criterion with no id`);
    if (seen.has(criterion.id)) {
      throw new Error(`bar ${id} has duplicate criterion id ${criterion.id}`);
    }
    seen.add(criterion.id);
    if (typeof criterion.evaluate !== "function") {
      throw new Error(`criterion ${criterion.id} has no evaluate()`);
    }
    if (![SEVERITY.BLOCKING, SEVERITY.ADVISORY].includes(criterion.severity)) {
      throw new Error(`criterion ${criterion.id} has unknown severity ${criterion.severity}`);
    }
  }
  return Object.freeze({ id, version, description, criteria, requiresHumanApproval });
}

function runCriterion(criterion, item) {
  let result;
  try {
    result = criterion.evaluate(item);
  } catch (error) {
    // A criterion that throws has not observed a failure — it failed to look.
    return {
      id: criterion.id,
      description: criterion.description,
      severity: criterion.severity,
      outcome: OUTCOME.UNKNOWN,
      observed: null,
      note: `criterion threw: ${error.message}`,
    };
  }
  const outcome = result?.outcome ?? OUTCOME.UNKNOWN;
  if (!Object.values(OUTCOME).includes(outcome)) {
    return {
      id: criterion.id,
      description: criterion.description,
      severity: criterion.severity,
      outcome: OUTCOME.UNKNOWN,
      observed: result?.observed ?? null,
      note: `criterion returned unknown outcome ${JSON.stringify(outcome)}`,
    };
  }
  return {
    id: criterion.id,
    description: criterion.description,
    severity: criterion.severity,
    outcome,
    observed: result?.observed ?? null,
    note: result?.note ?? null,
  };
}

/**
 * Judge `item` against `bar`. Returns a recorded, inspectable decision.
 *
 * Decision rule, in order:
 *   any blocking FAIL     -> reject
 *   any blocking UNKNOWN  -> hold   (we did not check; that is not a failure)
 *   otherwise             -> promote (advisory findings ride along as caveats)
 */
export function evaluateGate(item, bar) {
  if (!item || typeof item !== "object") throw new Error("evaluateGate needs an item");
  if (!bar || !Array.isArray(bar.criteria)) throw new Error("evaluateGate needs a bar");

  const criteria = bar.criteria.map((criterion) => runCriterion(criterion, item));

  const blockingFailures = criteria.filter(
    (c) => c.severity === SEVERITY.BLOCKING && c.outcome === OUTCOME.FAIL,
  );
  const blockingUnknowns = criteria.filter(
    (c) => c.severity === SEVERITY.BLOCKING && c.outcome === OUTCOME.UNKNOWN,
  );
  const advisoryFindings = criteria.filter(
    (c) => c.severity === SEVERITY.ADVISORY && c.outcome !== OUTCOME.PASS,
  );

  let decision;
  let rationale;
  if (blockingFailures.length > 0) {
    decision = DECISION.REJECT;
    rationale =
      `${blockingFailures.length} blocking ` +
      `${blockingFailures.length === 1 ? "criterion" : "criteria"} failed: ` +
      blockingFailures.map((c) => c.id).join(", ");
  } else if (blockingUnknowns.length > 0) {
    decision = DECISION.HOLD;
    rationale =
      `nothing failed, but ${blockingUnknowns.length} blocking ` +
      `${blockingUnknowns.length === 1 ? "criterion was" : "criteria were"} not checked: ` +
      blockingUnknowns.map((c) => c.id).join(", ");
  } else {
    decision = DECISION.PROMOTE;
    rationale = advisoryFindings.length
      ? `every blocking criterion passed; ${advisoryFindings.length} advisory finding${
          advisoryFindings.length === 1 ? "" : "s"
        } recorded as caveats`
      : "every criterion passed";
  }

  // A close call is a promote that only just cleared, or a reject that turned
  // on a single criterion. It marks the decisions worth a human's attention
  // first, and it is a report field — it never changes the decision.
  const closeCall =
    (decision === DECISION.PROMOTE && advisoryFindings.length > 0) ||
    (decision === DECISION.REJECT && blockingFailures.length === 1);

  return {
    itemId: item.id ?? null,
    bar: { id: bar.id, version: bar.version ?? null },
    decision,
    rationale,
    criteria,
    blockingFailures: blockingFailures.map((c) => c.id),
    blockingUnknowns: blockingUnknowns.map((c) => c.id),
    caveats: advisoryFindings.map((c) => ({
      id: c.id,
      outcome: c.outcome,
      observed: c.observed,
      note: c.note,
    })),
    closeCall,
    // Load-bearing: a `promote` from this engine is a recommendation. When the
    // bar is operator-only the caller must not apply it unattended.
    requiresHumanApproval: Boolean(bar.requiresHumanApproval),
    appliedAutomatically: false,
  };
}

/** Aggregate counts over a batch of decisions, for backtests and reports. */
export function summarizeDecisions(decisions) {
  const counts = { promote: 0, hold: 0, reject: 0 };
  const byCriterion = new Map();
  for (const decision of decisions) {
    counts[decision.decision] += 1;
    for (const criterion of decision.criteria) {
      if (!byCriterion.has(criterion.id)) {
        byCriterion.set(criterion.id, { pass: 0, fail: 0, unknown: 0 });
      }
      byCriterion.get(criterion.id)[criterion.outcome] += 1;
    }
  }
  return {
    total: decisions.length,
    counts,
    closeCalls: decisions.filter((d) => d.closeCall).length,
    byCriterion: Object.fromEntries(byCriterion),
  };
}
