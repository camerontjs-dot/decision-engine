import { DIMENSIONS, WEIGHT_PRESETS } from "../src/demoScenarios.js";
import { evaluateDecision } from "../src/decisionEngine.js";
import { deriveWeights } from "../src/weightCalibration.js";

const checks = [];
const observations = {
  resultCount: 0,
  closeCalls: 0,
  slightEdges: 0,
  clearLeads: 0,
  caveatIds: new Set(),
  topByProfile: new Map(),
};

function check(name, condition, detail = "") {
  checks.push({ name, condition, detail });
}

function nearlyEqual(a, b, tolerance = 0.001) {
  return Math.abs(a - b) <= tolerance;
}

function option(id, title, inputs, mode) {
  return {
    id,
    title,
    subtitle: `${title} matrix option`,
    mode,
    inputs,
  };
}

function combinations(items, size) {
  if (size === 0) return [[]];
  if (items.length < size) return [];

  const [head, ...tail] = items;
  return [
    ...combinations(tail, size - 1).map((combo) => [head, ...combo]),
    ...combinations(tail, size),
  ];
}

function weightedContributionsMatch(option) {
  const total = DIMENSIONS.reduce((sum, dimension) => {
    return sum + option.weightedContributions[dimension];
  }, 0);
  return nearlyEqual(total, option.weightedScore);
}

function scoresStayBounded(result) {
  return result.options.every((candidate) => {
    return candidate.weightedScore >= 0 &&
      candidate.weightedScore <= 100 &&
      DIMENSIONS.every((dimension) => (
        candidate.dimensionScores[dimension] >= 0 &&
        candidate.dimensionScores[dimension] <= 100
      ));
  });
}

function rankingIsSorted(result) {
  return result.ranking.every((candidate, index, ranking) => {
    return index === 0 || ranking[index - 1].weightedScore >= candidate.weightedScore;
  });
}

function normalizedWeightsSumTo100(result) {
  const total = DIMENSIONS.reduce((sum, dimension) => {
    return sum + result.normalizedWeights[dimension];
  }, 0);
  return nearlyEqual(total, 100);
}

function verdictText(result) {
  return [
    result.verdict.headline,
    ...result.verdict.reasonsForTop,
    ...result.verdict.tradeoffsForTop,
    result.verdict.runnerUpCase,
    result.verdict.whyWeightsFavorTop,
    ...result.verdict.flipFactors,
    ...result.verdict.cannotVerify,
  ].join(" ");
}

function textIsCalibrated(text) {
  return /given these inputs|under this weighting|cannot cleanly separate|relative|tool cannot verify|rule checks|heuristics|could|tradeoff/i.test(text);
}

const jobArchetypes = [
  option("cash-max", "Cash-Max Offer", {
    baseSalary: 210000,
    targetBonus: 45000,
    annualizedEquityEstimate: 10000,
    ptoDays: 12,
    remoteFlexibility: 4,
    onsiteDays: 4,
    scope: 5,
    mentorship: 5,
    brandSignal: 6,
    stability: 6,
    missionFit: 4,
    workloadIntensity: 7,
  }, "job-offers"),
  option("equity-risk", "Equity-Risk Offer", {
    baseSalary: 90000,
    targetBonus: 0,
    annualizedEquityEstimate: 140000,
    ptoDays: 12,
    remoteFlexibility: 4,
    onsiteDays: 5,
    scope: 9,
    mentorship: 4,
    brandSignal: 6,
    stability: 3,
    missionFit: 8,
    workloadIntensity: 10,
  }, "job-offers"),
  option("growth-brand", "Growth-Brand Offer", {
    baseSalary: 128000,
    targetBonus: 8000,
    annualizedEquityEstimate: 28000,
    ptoDays: 17,
    remoteFlexibility: 7,
    onsiteDays: 2,
    scope: 10,
    mentorship: 9,
    brandSignal: 9,
    stability: 6,
    missionFit: 7,
    workloadIntensity: 7,
  }, "job-offers"),
  option("lifestyle-steady", "Lifestyle-Steady Offer", {
    baseSalary: 132000,
    targetBonus: 10000,
    annualizedEquityEstimate: 8000,
    ptoDays: 32,
    remoteFlexibility: 10,
    onsiteDays: 0,
    scope: 6,
    mentorship: 7,
    brandSignal: 6,
    stability: 9,
    missionFit: 7,
    workloadIntensity: 2,
  }, "job-offers"),
  option("mission-role", "Mission-Heavy Offer", {
    baseSalary: 118000,
    targetBonus: 6000,
    annualizedEquityEstimate: 12000,
    ptoDays: 22,
    remoteFlexibility: 8,
    onsiteDays: 1,
    scope: 7,
    mentorship: 7,
    brandSignal: 5,
    stability: 7,
    missionFit: 10,
    workloadIntensity: 5,
  }, "job-offers"),
  option("thin-option", "Thin Option", {
    baseSalary: 78000,
    targetBonus: 0,
    annualizedEquityEstimate: 0,
    ptoDays: 10,
    remoteFlexibility: 2,
    onsiteDays: 5,
    scope: 3,
    mentorship: 4,
    brandSignal: 3,
    stability: 4,
    missionFit: 3,
    workloadIntensity: 9,
  }, "job-offers"),
];

const careerArchetypes = [
  option("near-term-cash", "Near-Term Cash Path", {
    nearTermEarnings: 10,
    upsidePotential: 5,
    skillCompounding: 6,
    optionality: 6,
    autonomy: 5,
    lifestyleSustainability: 7,
    stability: 9,
    networkBrand: 7,
    missionFit: 5,
    downsideRisk: 2,
  }, "career-paths"),
  option("startup-upside", "Startup-Upside Path", {
    nearTermEarnings: 4,
    upsidePotential: 10,
    skillCompounding: 10,
    optionality: 9,
    autonomy: 3,
    lifestyleSustainability: 3,
    stability: 3,
    networkBrand: 8,
    missionFit: 8,
    downsideRisk: 10,
  }, "career-paths"),
  option("steady-builder", "Steady Builder Path", {
    nearTermEarnings: 7,
    upsidePotential: 7,
    skillCompounding: 8,
    optionality: 8,
    autonomy: 7,
    lifestyleSustainability: 9,
    stability: 9,
    networkBrand: 8,
    missionFit: 7,
    downsideRisk: 2,
  }, "career-paths"),
  option("independent-risk", "Independent-Risk Path", {
    nearTermEarnings: 5,
    upsidePotential: 9,
    skillCompounding: 9,
    optionality: 10,
    autonomy: 10,
    lifestyleSustainability: 4,
    stability: 3,
    networkBrand: 6,
    missionFit: 9,
    downsideRisk: 8,
  }, "career-paths"),
  option("mission-depth", "Mission-Depth Path", {
    nearTermEarnings: 6,
    upsidePotential: 6,
    skillCompounding: 7,
    optionality: 6,
    autonomy: 7,
    lifestyleSustainability: 8,
    stability: 8,
    networkBrand: 6,
    missionFit: 10,
    downsideRisk: 3,
  }, "career-paths"),
  option("low-signal", "Low-Signal Path", {
    nearTermEarnings: 2,
    upsidePotential: 3,
    skillCompounding: 3,
    optionality: 3,
    autonomy: 4,
    lifestyleSustainability: 4,
    stability: 4,
    networkBrand: 3,
    missionFit: 3,
    downsideRisk: 7,
  }, "career-paths"),
];

const calibrationProfiles = {
  "Derived Balanced": {
    moneyGrowth: "balanced",
    riskGrowth: "balanced",
    lifestyleMoney: "balanced",
    mission: "tiebreaker",
    riskTolerance: "medium",
  },
  "Derived Compensation": {
    moneyGrowth: "compensation",
    riskGrowth: "balanced",
    lifestyleMoney: "compensation",
    mission: "tiebreaker",
    riskTolerance: "medium",
  },
  "Derived Growth": {
    moneyGrowth: "growth",
    riskGrowth: "growth",
    lifestyleMoney: "balanced",
    mission: "tiebreaker",
    riskTolerance: "high",
  },
  "Derived Low Risk": {
    moneyGrowth: "balanced",
    riskGrowth: "stability",
    lifestyleMoney: "lifestyle",
    mission: "tiebreaker",
    riskTolerance: "low",
  },
  "Derived Mission": {
    moneyGrowth: "balanced",
    riskGrowth: "balanced",
    lifestyleMoney: "balanced",
    mission: "priority",
    riskTolerance: "medium",
  },
  "Derived Practical": {
    moneyGrowth: "compensation",
    riskGrowth: "stability",
    lifestyleMoney: "balanced",
    mission: "low",
    riskTolerance: "low",
  },
};

const weightProfiles = [
  ...Object.entries(WEIGHT_PRESETS).map(([name, weights]) => ({ name, weights })),
  ...Object.entries(calibrationProfiles).map(([name, answers]) => ({
    name,
    weights: deriveWeights(answers).weights,
  })),
];

const matrices = [
  { mode: "job-offers", archetypes: jobArchetypes },
  { mode: "career-paths", archetypes: careerArchetypes },
];

matrices.forEach(({ mode, archetypes }) => {
  [2, 3].forEach((size) => {
    combinations(archetypes, size).forEach((options) => {
      weightProfiles.forEach(({ name, weights }) => {
        const result = evaluateDecision({ mode, options, weights });
        const label = `${mode} ${size}-way ${options.map((item) => item.id).join("+")} / ${name}`;
        const text = verdictText(result);

        observations.resultCount += 1;
        observations.closeCalls += result.confidence === "Close call" ? 1 : 0;
        observations.slightEdges += result.confidence === "Slight edge" ? 1 : 0;
        observations.clearLeads += result.confidence === "Clear lead" ? 1 : 0;
        result.options.forEach((candidate) => {
          candidate.caveats.forEach((item) => observations.caveatIds.add(item.id));
        });

        const profileKey = `${mode}:${name}`;
        if (!observations.topByProfile.has(profileKey)) {
          observations.topByProfile.set(profileKey, new Set());
        }
        observations.topByProfile.get(profileKey).add(result.topOption.id);

        check(`${label}: scores stay bounded`, scoresStayBounded(result));
        check(`${label}: ranking is sorted`, rankingIsSorted(result));
        check(`${label}: weighted contributions match total`, result.options.every(weightedContributionsMatch));
        check(`${label}: normalized weights sum to 100`, normalizedWeightsSumTo100(result));
        check(`${label}: confidence label is valid`, ["Clear lead", "Slight edge", "Close call"].includes(result.confidence));
        check(`${label}: verdict text has no runtime artifacts`, !/\b(undefined|null|NaN|Infinity)\b/.test(text), text);
        check(`${label}: verdict text stays calibrated`, textIsCalibrated(text), text);
        check(`${label}: cannot-verify list is populated`, result.verdict.cannotVerify.length >= 3);
        check(`${label}: top option matches ranking`, result.topOption.id === result.ranking[0].id);
      });
    });
  });
});

const cashVsThin = evaluateDecision({
  mode: "job-offers",
  options: [
    jobArchetypes.find((item) => item.id === "cash-max"),
    jobArchetypes.find((item) => item.id === "thin-option"),
  ],
  weights: WEIGHT_PRESETS["Compensation First"],
});
check("cash-max beats thin-option under Compensation First", cashVsThin.topOption.id === "cash-max");

const growthVsThin = evaluateDecision({
  mode: "job-offers",
  options: [
    jobArchetypes.find((item) => item.id === "growth-brand"),
    jobArchetypes.find((item) => item.id === "thin-option"),
  ],
  weights: WEIGHT_PRESETS["Growth First"],
});
check("growth-brand beats thin-option under Growth First", growthVsThin.topOption.id === "growth-brand");

const startupVsLowSignal = evaluateDecision({
  mode: "career-paths",
  options: [
    careerArchetypes.find((item) => item.id === "startup-upside"),
    careerArchetypes.find((item) => item.id === "low-signal"),
  ],
  weights: WEIGHT_PRESETS["Growth First"],
});
check("startup-upside beats low-signal under Growth First", startupVsLowSignal.topOption.id === "startup-upside");

const steadyVsRisk = evaluateDecision({
  mode: "career-paths",
  options: [
    careerArchetypes.find((item) => item.id === "steady-builder"),
    careerArchetypes.find((item) => item.id === "startup-upside"),
  ],
  weights: WEIGHT_PRESETS["Low Risk"],
});
check("steady-builder beats startup-upside under Low Risk", steadyVsRisk.topOption.id === "steady-builder");

check("matrix covers at least 700 evaluated comparisons", observations.resultCount >= 700, `${observations.resultCount} evaluated`);
check("matrix observes close-call outputs", observations.closeCalls > 0, `${observations.closeCalls} close calls`);
check("matrix observes slight-edge outputs", observations.slightEdges > 0, `${observations.slightEdges} slight edges`);
check("matrix observes clear-lead outputs", observations.clearLeads > 0, `${observations.clearLeads} clear leads`);
check("matrix observes job and career caveat families", observations.caveatIds.size >= 7, [...observations.caveatIds].join(", "));

const failed = checks.filter((item) => !item.condition);

console.log("Combination matrix sweep");
console.log(`${observations.resultCount} evaluated comparisons`);
console.log(`${observations.closeCalls} close calls, ${observations.slightEdges} slight edges, ${observations.clearLeads} clear leads`);
console.log(`caveats observed: ${[...observations.caveatIds].sort().join(", ")}`);
console.log("");

checks.forEach((item) => {
  if (item.condition && process.env.VERBOSE !== "1") return;

  const status = item.condition ? "PASS" : "FAIL";
  console.log(`${status} ${item.name}${item.condition || !item.detail ? "" : ` - ${item.detail}`}`);
});

console.log(`\n${checks.length - failed.length}/${checks.length} passed${failed.length ? `, ${failed.length} failed` : ""}.`);

if (failed.length) {
  process.exitCode = 1;
}
