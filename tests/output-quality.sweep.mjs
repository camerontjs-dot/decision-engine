import { DIMENSIONS, WEIGHT_PRESETS } from "../src/demoScenarios.js";
import { evaluateDecision } from "../src/decisionEngine.js";

const checks = [];

function check(name, condition, detail = "") {
  checks.push({ name, condition, detail });
}

function option(id, title, inputs, mode = "job-offers") {
  return {
    id,
    title,
    subtitle: `${title} stress-test option`,
    mode,
    inputs,
  };
}

const maxJob = {
  baseSalary: 300000,
  targetBonus: 100000,
  annualizedEquityEstimate: 200000,
  ptoDays: 40,
  remoteFlexibility: 10,
  onsiteDays: 0,
  scope: 10,
  mentorship: 10,
  brandSignal: 10,
  stability: 10,
  missionFit: 10,
  workloadIntensity: 1,
};

const minJob = {
  baseSalary: 0,
  targetBonus: 0,
  annualizedEquityEstimate: 0,
  ptoDays: 0,
  remoteFlexibility: 1,
  onsiteDays: 5,
  scope: 1,
  mentorship: 1,
  brandSignal: 1,
  stability: 1,
  missionFit: 1,
  workloadIntensity: 10,
};

const balancedJob = {
  baseSalary: 135000,
  targetBonus: 15000,
  annualizedEquityEstimate: 12000,
  ptoDays: 20,
  remoteFlexibility: 7,
  onsiteDays: 2,
  scope: 7,
  mentorship: 7,
  brandSignal: 7,
  stability: 7,
  missionFit: 7,
  workloadIntensity: 5,
};

const maxCareer = {
  nearTermEarnings: 10,
  upsidePotential: 10,
  skillCompounding: 10,
  optionality: 10,
  autonomy: 10,
  lifestyleSustainability: 10,
  stability: 10,
  networkBrand: 10,
  missionFit: 10,
  downsideRisk: 1,
};

const minCareer = {
  nearTermEarnings: 1,
  upsidePotential: 1,
  skillCompounding: 1,
  optionality: 1,
  autonomy: 1,
  lifestyleSustainability: 1,
  stability: 1,
  networkBrand: 1,
  missionFit: 1,
  downsideRisk: 10,
};

const qualityScenarios = [
  {
    id: "job-extremes",
    mode: "job-offers",
    weights: WEIGHT_PRESETS["Balance First"],
    expectedConfidence: "Clear lead",
    options: [
      option("max", "Maximum Inputs", maxJob),
      option("min", "Minimum Inputs", minJob),
      option("balanced", "Balanced Middle", balancedJob),
    ],
  },
  {
    id: "equity-burnout-tradeoff",
    mode: "job-offers",
    weights: WEIGHT_PRESETS["Compensation First"],
    options: [
      option("cash", "Cash-Heavy Stable Role", { ...balancedJob, baseSalary: 170000, targetBonus: 30000, annualizedEquityEstimate: 5000, workloadIntensity: 4, stability: 8 }),
      option("equity", "Equity-Heavy Burnout Role", { ...balancedJob, baseSalary: 90000, targetBonus: 0, annualizedEquityEstimate: 120000, workloadIntensity: 10, stability: 3, onsiteDays: 5 }),
      option("middle", "Middle Offer", balancedJob),
    ],
  },
  {
    id: "close-job-call",
    mode: "job-offers",
    weights: WEIGHT_PRESETS["Balance First"],
    expectedConfidence: "Close call",
    options: [
      option("a", "Comparable Offer A", balancedJob),
      option("b", "Comparable Offer B", balancedJob),
      option("c", "Comparable Offer C", { ...balancedJob, baseSalary: 134000 }),
    ],
  },
  {
    id: "career-extremes",
    mode: "career-paths",
    weights: WEIGHT_PRESETS["Growth First"],
    expectedConfidence: "Clear lead",
    options: [
      option("max", "Maximum Path", maxCareer, "career-paths"),
      option("min", "Minimum Path", minCareer, "career-paths"),
      option("middle", "Middle Path", {
        nearTermEarnings: 6,
        upsidePotential: 6,
        skillCompounding: 6,
        optionality: 6,
        autonomy: 6,
        lifestyleSustainability: 6,
        stability: 6,
        networkBrand: 6,
        missionFit: 6,
        downsideRisk: 5,
      }, "career-paths"),
    ],
  },
  {
    id: "career-high-upside-high-risk",
    mode: "career-paths",
    weights: WEIGHT_PRESETS["Growth First"],
    options: [
      option("upside", "High Upside High Risk", { ...maxCareer, nearTermEarnings: 3, lifestyleSustainability: 3, stability: 3, downsideRisk: 10 }, "career-paths"),
      option("steady", "Steady Builder", { ...maxCareer, upsidePotential: 7, skillCompounding: 8, optionality: 8, autonomy: 6, lifestyleSustainability: 8, stability: 9, downsideRisk: 2 }, "career-paths"),
      option("thin", "Thin Upside Path", { ...minCareer, stability: 7, downsideRisk: 2, lifestyleSustainability: 7 }, "career-paths"),
    ],
  },
  {
    id: "invalid-inputs",
    mode: "job-offers",
    weights: { compensation: 0, growth: 0, lifestyle: 0, stability: 0, mission: 0 },
    options: [
      option("invalid-high", "Invalid High Values", {
        ...balancedJob,
        baseSalary: 999999,
        targetBonus: 999999,
        remoteFlexibility: 99,
        onsiteDays: -10,
      }),
      option("invalid-low", "Invalid Low Values", {
        ...balancedJob,
        baseSalary: -200,
        ptoDays: -4,
        missionFit: -10,
        workloadIntensity: 99,
      }),
    ],
  },
];

function textQuality(result) {
  const text = [
    result.verdict.headline,
    ...result.verdict.reasonsForTop,
    ...result.verdict.tradeoffsForTop,
    result.verdict.runnerUpCase,
    ...result.verdict.flipFactors,
    ...result.verdict.cannotVerify,
  ].join(" ");

  return {
    text,
    hasNoUndefined: !/\b(undefined|null|NaN|Infinity)\b/.test(text),
    isCalibrated: /given these inputs|under this weighting|cannot cleanly separate|could|cannot verify|relative|tradeoff|caveat/i.test(text),
    hasCannotVerify: result.verdict.cannotVerify.length >= 3,
    hasActionableFlipFactor: result.verdict.flipFactors.some((item) => item.length >= 20),
  };
}

function resultIsUsable(result) {
  return result.ranking.length >= 2 &&
    result.verdict.headline.length >= 20 &&
    result.verdict.reasonsForTop.length >= 1 &&
    result.verdict.tradeoffsForTop.length >= 1 &&
    result.verdict.flipFactors.length >= 1 &&
    result.verdict.cannotVerify.length >= 3;
}

qualityScenarios.forEach((scenario) => {
  const result = evaluateDecision({
    mode: scenario.mode,
    options: scenario.options,
    weights: scenario.weights,
  });
  const quality = textQuality(result);

  check(`${scenario.id}: result is structurally usable`, resultIsUsable(result));
  check(`${scenario.id}: generated text has no undefined values`, quality.hasNoUndefined, quality.text);
  check(`${scenario.id}: generated text is calibrated`, quality.isCalibrated, quality.text);
  check(`${scenario.id}: cannot-verify section is populated`, quality.hasCannotVerify);
  check(`${scenario.id}: flip factors are actionable`, quality.hasActionableFlipFactor);
  check(`${scenario.id}: confidence label is valid`, ["Clear lead", "Slight edge", "Close call"].includes(result.confidence));
  check(`${scenario.id}: weighted scores stay in bounds`, result.options.every((item) => item.weightedScore >= 0 && item.weightedScore <= 100));
  check(`${scenario.id}: dimension scores stay in bounds`, result.options.every((item) => (
    DIMENSIONS.every((dimension) => item.dimensionScores[dimension] >= 0 && item.dimensionScores[dimension] <= 100)
  )));

  if (scenario.expectedConfidence) {
    check(`${scenario.id}: expected confidence behavior`, result.confidence === scenario.expectedConfidence, `expected ${scenario.expectedConfidence}, got ${result.confidence}`);
  }

  if (scenario.id === "equity-burnout-tradeoff") {
    const risky = result.options.find((item) => item.id === "equity");
    check("equity-burnout-tradeoff: risky option triggers multiple caveats", risky.caveats.length >= 3);
    check("equity-burnout-tradeoff: caveats include burnout", risky.caveats.some((item) => item.id === "burnout-risk"));
    check("equity-burnout-tradeoff: caveats include equity concentration", risky.caveats.some((item) => item.id === "equity-concentration"));
  }

  if (scenario.id === "invalid-inputs") {
    check("invalid-inputs: warnings explain clamping or fallback", result.validationWarnings.length >= 2);
    check("invalid-inputs: all-zero weights warn about Balance First", result.validationWarnings.some((warning) => warning.includes("Balance First")));
  }

  console.log(`\n${scenario.id}`);
  console.log(`confidence: ${result.confidence}`);
  console.log(`headline: ${result.verdict.headline}`);
  console.log(`top option: ${result.topOption.title} (${result.topOption.weightedScore.toFixed(1)})`);
  console.log(`tradeoffs: ${result.verdict.tradeoffsForTop.join(" | ")}`);
});

const failed = checks.filter((item) => !item.condition);

console.log("\nQuality checks");
checks.forEach((item) => {
  const status = item.condition ? "PASS" : "FAIL";
  console.log(`${status} ${item.name}${item.condition || !item.detail ? "" : ` - ${item.detail}`}`);
});

console.log(`\n${checks.length - failed.length}/${checks.length} passed${failed.length ? `, ${failed.length} failed` : ""}.`);

if (failed.length) {
  process.exitCode = 1;
}
