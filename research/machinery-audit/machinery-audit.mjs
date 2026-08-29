import assert from "node:assert/strict";

import {
  DECISION,
  OUTCOME,
  SEVERITY,
  defineBar,
  evaluateGate,
} from "../../src/gate/gateHead.js";
import { evaluateDecision } from "../../src/decisionEngine.js";

const outcomes = [OUTCOME.PASS, OUTCOME.FAIL, OUTCOME.UNKNOWN];

function criterion(id, outcome) {
  return {
    id,
    description: id,
    severity: SEVERITY.BLOCKING,
    evaluate: () => ({ outcome, observed: { outcome } }),
  };
}

function expectedDecision(values) {
  if (values.includes(OUTCOME.FAIL)) return DECISION.REJECT;
  if (values.includes(OUTCOME.UNKNOWN)) return DECISION.HOLD;
  return DECISION.PROMOTE;
}

const gateMatrix = [];
for (const a of outcomes) {
  for (const b of outcomes) {
    for (const c of outcomes) {
      const values = [a, b, c];
      const bar = defineBar({
        id: "audit-matrix",
        version: "1",
        criteria: [
          criterion("a", a),
          criterion("b", b),
          criterion("c", c),
        ],
      });
      const result = evaluateGate({ id: "item" }, bar);
      const expected = expectedDecision(values);
      assert.equal(result.decision, expected);
      gateMatrix.push({ values, decision: result.decision });
    }
  }
}

const throwingBar = defineBar({
  id: "throwing",
  version: "1",
  criteria: [
    {
      id: "throws",
      description: "throws",
      severity: SEVERITY.BLOCKING,
      evaluate: () => {
        throw new Error("probe failure");
      },
    },
  ],
});
const throwingResult = evaluateGate({ id: "item" }, throwingBar);
assert.equal(throwingResult.decision, DECISION.HOLD);
assert.deepEqual(throwingResult.blockingUnknowns, ["throws"]);

const jobA = {
  id: "a",
  title: "A",
  mode: "job-offers",
  inputs: {
    baseSalary: 130000,
    targetBonus: 10000,
    annualizedEquityEstimate: 10000,
    ptoDays: 20,
    remoteFlexibility: 9,
    onsiteDays: 1,
    scope: 8,
    mentorship: 8,
    brandSignal: 7,
    stability: 8,
    missionFit: 8,
    workloadIntensity: 5,
  },
};
const jobB = {
  id: "b",
  title: "B",
  mode: "job-offers",
  inputs: {
    baseSalary: 105000,
    targetBonus: 5000,
    annualizedEquityEstimate: 0,
    ptoDays: 15,
    remoteFlexibility: 5,
    onsiteDays: 3,
    scope: 5,
    mentorship: 5,
    brandSignal: 5,
    stability: 6,
    missionFit: 6,
    workloadIntensity: 7,
  },
};
const jobC = {
  id: "c",
  title: "C",
  mode: "job-offers",
  inputs: {
    baseSalary: 90000,
    targetBonus: 0,
    annualizedEquityEstimate: 0,
    ptoDays: 10,
    remoteFlexibility: 2,
    onsiteDays: 5,
    scope: 3,
    mentorship: 3,
    brandSignal: 3,
    stability: 4,
    missionFit: 4,
    workloadIntensity: 9,
  },
};

const weights = {
  compensation: 30,
  growth: 25,
  lifestyle: 20,
  stability: 15,
  mission: 10,
};

function ranking(options) {
  return evaluateDecision({ mode: "job-offers", options, weights }).ranking.map((x) => x.id);
}

const permutations = [
  [jobA, jobB, jobC],
  [jobA, jobC, jobB],
  [jobB, jobA, jobC],
  [jobB, jobC, jobA],
  [jobC, jobA, jobB],
  [jobC, jobB, jobA],
];
const rankings = permutations.map(ranking);
for (const observed of rankings) {
  assert.deepEqual(observed, rankings[0], "non-tied ranking must be invariant to option order");
}

const pair = evaluateDecision({ mode: "job-offers", options: [jobA, jobB], weights });
const triple = evaluateDecision({ mode: "job-offers", options: [jobA, jobB, jobC], weights });
const pairScores = Object.fromEntries(pair.options.map((x) => [x.id, x.weightedScore]));
const tripleScores = Object.fromEntries(triple.options.map((x) => [x.id, x.weightedScore]));

const contextSensitivity = {
  pairRanking: pair.ranking.map((x) => x.id),
  tripleRanking: triple.ranking.map((x) => x.id),
  pairScores,
  tripleScores: {
    a: tripleScores.a,
    b: tripleScores.b,
  },
  scoreChangedWhenDominatedOptionAdded:
    pairScores.a !== tripleScores.a || pairScores.b !== tripleScores.b,
};

const receipt = {
  scope: "research-only machinery audit; not a production-policy calibration",
  gateExhaustiveCases: gateMatrix.length,
  gateDecisionCounts: gateMatrix.reduce(
    (acc, row) => {
      acc[row.decision] = (acc[row.decision] ?? 0) + 1;
      return acc;
    },
    {},
  ),
  thrownCriterion: {
    decision: throwingResult.decision,
    blockingUnknowns: throwingResult.blockingUnknowns,
  },
  optionPermutationRankings: rankings,
  contextSensitivity,
};

console.log(JSON.stringify(receipt, null, 2));
