import { DEMO_SCENARIOS, WEIGHT_PRESETS } from "../src/demoScenarios.js";
import { evaluateDecision, normalizeWeights, relativeScore } from "../src/decisionEngine.js";
import { buildUserOptions, defaultInputsForMode, inputCompletenessWarnings } from "../src/intakeModel.js";
import { DEFAULT_CALIBRATION_ANSWERS, deriveWeights } from "../src/weightCalibration.js";

const output = document.getElementById("output");
const results = [];

function assert(name, condition, detail = "") {
  results.push({ name, condition, detail });
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function runTests() {
  assert("relativeScore returns 50 when all values match", relativeScore(10, 10, 10) === 50);

  const zeroWeights = normalizeWeights({ compensation: 0, growth: 0, lifestyle: 0, stability: 0, mission: 0 });
  assert("zero weights fall back to Balance First", zeroWeights.weights.lifestyle === WEIGHT_PRESETS["Balance First"].lifestyle);
  assert("zero weights produce a warning", Boolean(zeroWeights.warning));

  const offerScenario = DEMO_SCENARIOS.find((scenario) => scenario.id === "offers-core");
  const offerResult = evaluateDecision({
    mode: offerScenario.mode,
    options: offerScenario.options,
    weights: WEIGHT_PRESETS["Balance First"],
  });
  assert("offer scenario returns three ranked options", offerResult.ranking.length === 3);
  assert("offer scenario includes a verdict headline", Boolean(offerResult.verdict.headline));
  assert("offer scenario always includes cannot-verify items", offerResult.verdict.cannotVerify.length >= 3);
  assert("offer scenario returns weighted contributions", Boolean(offerResult.options[0].weightedContributions.compensation >= 0));

  const startup = offerResult.options.find((option) => option.id === "offer-b");
  assert("startup offer triggers a burnout caveat", startup.caveats.some((item) => item.id === "burnout-risk"));
  assert("startup offer triggers equity concentration", startup.caveats.some((item) => item.id === "equity-concentration"));

  const editedResult = evaluateDecision({
    mode: offerScenario.mode,
    options: offerScenario.options,
    weights: WEIGHT_PRESETS["Balance First"],
    editedFields: { "offer-a": ["baseSalary"] },
  });
  const editedOffer = editedResult.options.find((option) => option.id === "offer-a");
  assert("edited fields are marked as You entered", editedOffer.provenance.baseSalary === "You entered");
  assert("unedited fields remain marked as Demo", editedOffer.provenance.targetBonus === "Demo");

  const identical = clone(offerScenario.options).map((option, index) => ({
    ...option,
    id: `same-${index}`,
    title: `Same ${index + 1}`,
    inputs: { ...offerScenario.options[0].inputs },
  }));
  const identicalResult = evaluateDecision({
    mode: "job-offers",
    options: identical,
    weights: WEIGHT_PRESETS["Balance First"],
  });
  assert("identical options produce Close call", identicalResult.confidence === "Close call");
  assert("identical dimension scores are 50", identicalResult.options.every((option) => (
    Object.values(option.dimensionScores).every((score) => score === 50)
  )));

  const careerScenario = DEMO_SCENARIOS.find((scenario) => scenario.id === "paths-core");
  const careerResult = evaluateDecision({
    mode: careerScenario.mode,
    options: careerScenario.options,
    weights: WEIGHT_PRESETS["Growth First"],
  });
  const startupPath = careerResult.options.find((option) => option.id === "startup");
  assert("career path with high downside triggers fragile stability", startupPath.caveats.some((item) => item.id === "fragile-stability"));
  assert("career path result includes possibility envelope", Boolean(careerResult.possibilityEnvelope));

  const closeCallText = identicalResult.verdict.headline.toLowerCase();
  assert("close-call verdict avoids fake certainty", closeCallText.includes("cannot cleanly separate"));

  const defaultJobInputs = defaultInputsForMode("job-offers");
  assert("default job inputs include salary fallback", defaultJobInputs.baseSalary === 0);
  assert("default job inputs include midpoint rating fallback", defaultJobInputs.scope === 5);

  const userOptions = buildUserOptions({
    mode: "job-offers",
    optionNames: ["Current role", "New offer"],
    inputValues: {
      "user-option-1": { baseSalary: 100000, scope: 6 },
      "user-option-2": { baseSalary: 125000, scope: 8 },
    },
  });
  assert("user workflow builds two options", userOptions.length === 2);
  assert("user workflow preserves entered values", userOptions[1].inputs.baseSalary === 125000);
  assert("user workflow fills defaults for missing values", userOptions[0].inputs.targetBonus === 0);

  const customResult = evaluateDecision({
    mode: "job-offers",
    options: userOptions,
    weights: WEIGHT_PRESETS["Balance First"],
    editedFields: { "user-option-1": Object.keys(userOptions[0].inputs) },
  });
  assert("custom user options can be evaluated", customResult.ranking.length === 2);
  assert("custom user provenance marks entered fields", customResult.options[0].provenance.baseSalary === "You entered");

  const missingWarnings = inputCompletenessWarnings({
    mode: "job-offers",
    options: [{ ...userOptions[0], inputs: { ...userOptions[0].inputs, baseSalary: "" } }],
  });
  assert("intake warnings flag missing user values", missingWarnings.some((warning) => warning.includes("Base salary")));

  const balancedWeights = deriveWeights(DEFAULT_CALIBRATION_ANSWERS);
  const balancedTotal = Object.values(balancedWeights.weights).reduce((sum, value) => sum + value, 0);
  assert("default calibration weights normalize to 100", Math.round(balancedTotal) === 100);

  const lowRiskWeights = deriveWeights({
    moneyGrowth: "balanced",
    riskGrowth: "stability",
    lifestyleMoney: "lifestyle",
    mission: "tiebreaker",
    riskTolerance: "low",
  });
  assert("low-risk calibration increases stability", lowRiskWeights.weights.stability > balancedWeights.weights.stability);
  assert("lifestyle calibration increases lifestyle", lowRiskWeights.weights.lifestyle > balancedWeights.weights.lifestyle);
}

runTests();

const passed = results.filter((result) => result.condition).length;
const failed = results.length - passed;

output.innerHTML = results
  .map((result) => {
    const status = result.condition ? "PASS" : "FAIL";
    const className = result.condition ? "pass" : "fail";
    return `<span class="${className}">${status}</span> ${result.name}${result.detail ? ` - ${result.detail}` : ""}`;
  })
  .join("\n") + `\n\n${passed}/${results.length} passed${failed ? `, ${failed} failed` : ""}.`;
