import { DEMO_SCENARIOS, DIMENSIONS, WEIGHT_PRESETS } from "../src/demoScenarios.js";
import { evaluateDecision, fieldMetaForMode } from "../src/decisionEngine.js";

const checks = [];

function check(name, condition, detail = "") {
  checks.push({ name, condition, detail });
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function nearlyEqual(a, b, tolerance = 0.001) {
  return Math.abs(a - b) <= tolerance;
}

function allScoresInRange(result) {
  return result.options.every((option) => (
    option.weightedScore >= 0 &&
    option.weightedScore <= 100 &&
    DIMENSIONS.every((dimension) => (
      option.dimensionScores[dimension] >= 0 &&
      option.dimensionScores[dimension] <= 100
    ))
  ));
}

function rankingIsSorted(result) {
  return result.ranking.every((option, index, ranking) => {
    return index === 0 || ranking[index - 1].weightedScore >= option.weightedScore;
  });
}

function contributionsMatchWeightedScore(result) {
  return result.options.every((option) => {
    const total = DIMENSIONS.reduce((sum, dimension) => {
      return sum + option.weightedContributions[dimension];
    }, 0);
    return nearlyEqual(total, option.weightedScore);
  });
}

function normalizedWeightsSumTo100(result) {
  const total = DIMENSIONS.reduce((sum, dimension) => sum + result.normalizedWeights[dimension], 0);
  return nearlyEqual(total, 100);
}

Object.values(WEIGHT_PRESETS).forEach((weights) => {
  DEMO_SCENARIOS.forEach((scenario) => {
    const result = evaluateDecision({
      mode: scenario.mode,
      options: scenario.options,
      weights,
    });

    check(`${scenario.id}: scores remain in range`, allScoresInRange(result));
    check(`${scenario.id}: ranking is sorted`, rankingIsSorted(result));
    check(`${scenario.id}: weighted contributions match total`, contributionsMatchWeightedScore(result));
    check(`${scenario.id}: normalized weights sum to 100`, normalizedWeightsSumTo100(result));
    check(`${scenario.id}: confidence label is valid`, ["Clear lead", "Slight edge", "Close call"].includes(result.confidence));
    check(`${scenario.id}: cannot-verify list is populated`, result.verdict.cannotVerify.length >= 3);
  });
});

const offerScenario = DEMO_SCENARIOS.find((scenario) => scenario.id === "offers-core");
const clampedOffers = clone(offerScenario.options);
clampedOffers[0].inputs.baseSalary = 999999;
clampedOffers[0].inputs.remoteFlexibility = -5;
const clampedResult = evaluateDecision({
  mode: offerScenario.mode,
  options: clampedOffers,
  weights: WEIGHT_PRESETS["Balance First"],
});
check("out-of-range high salary is clamped", clampedResult.options[0].inputs.baseSalary === fieldMetaForMode("job-offers").baseSalary.max);
check("out-of-range low rating is clamped", clampedResult.options[0].inputs.remoteFlexibility === fieldMetaForMode("job-offers").remoteFlexibility.min);
check("clamping produces validation warnings", clampedResult.validationWarnings.length >= 2);

const identicalOffers = clone(offerScenario.options).map((option, index) => ({
  ...option,
  id: `identical-${index}`,
  title: `Identical ${index + 1}`,
  inputs: { ...offerScenario.options[0].inputs },
}));
const identicalResult = evaluateDecision({
  mode: "job-offers",
  options: identicalOffers,
  weights: WEIGHT_PRESETS["Balance First"],
});
check("identical options produce neutral dimension scores", identicalResult.options.every((option) => (
  DIMENSIONS.every((dimension) => option.dimensionScores[dimension] === 50)
)));
check("identical options produce a close call", identicalResult.confidence === "Close call");

const careerScenario = DEMO_SCENARIOS.find((scenario) => scenario.id === "paths-core");
const customZeroResult = evaluateDecision({
  mode: careerScenario.mode,
  options: careerScenario.options,
  weights: Object.fromEntries(DIMENSIONS.map((dimension) => [dimension, 0])),
});
check("all-zero weights fall back to Balance First", customZeroResult.normalizedWeights.lifestyle === WEIGHT_PRESETS["Balance First"].lifestyle);
check("all-zero weights produce a warning", customZeroResult.validationWarnings.some((warning) => warning.includes("Balance First")));

const oneOptionResult = evaluateDecision({
  mode: "job-offers",
  options: [offerScenario.options[0]],
  weights: WEIGHT_PRESETS["Balance First"],
});
check("single-option comparison warns that two options are needed", oneOptionResult.validationWarnings.some((warning) => warning.includes("At least two options")));
check("single-option comparison does not crash", oneOptionResult.ranking.length === 1);

const failed = checks.filter((item) => !item.condition);

checks.forEach((item) => {
  const status = item.condition ? "PASS" : "FAIL";
  console.log(`${status} ${item.name}${item.detail ? ` - ${item.detail}` : ""}`);
});

console.log(`\n${checks.length - failed.length}/${checks.length} passed${failed.length ? `, ${failed.length} failed` : ""}.`);

if (failed.length) {
  process.exitCode = 1;
}
