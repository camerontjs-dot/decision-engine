import { DIMENSIONS, WEIGHT_PRESETS } from "./demoScenarios.js";

export const JOB_FIELD_META = {
  baseSalary: { min: 0, max: 300000, fallback: 0 },
  targetBonus: { min: 0, max: 100000, fallback: 0 },
  annualizedEquityEstimate: { min: 0, max: 200000, fallback: 0 },
  ptoDays: { min: 0, max: 40, fallback: 15 },
  remoteFlexibility: { min: 1, max: 10, fallback: 5 },
  onsiteDays: { min: 0, max: 5, fallback: 2 },
  scope: { min: 1, max: 10, fallback: 5 },
  mentorship: { min: 1, max: 10, fallback: 5 },
  brandSignal: { min: 1, max: 10, fallback: 5 },
  stability: { min: 1, max: 10, fallback: 5 },
  missionFit: { min: 1, max: 10, fallback: 5 },
  workloadIntensity: { min: 1, max: 10, fallback: 5 },
};

export const CAREER_FIELD_META = {
  nearTermEarnings: { min: 1, max: 10, fallback: 5 },
  upsidePotential: { min: 1, max: 10, fallback: 5 },
  skillCompounding: { min: 1, max: 10, fallback: 5 },
  optionality: { min: 1, max: 10, fallback: 5 },
  autonomy: { min: 1, max: 10, fallback: 5 },
  lifestyleSustainability: { min: 1, max: 10, fallback: 5 },
  stability: { min: 1, max: 10, fallback: 5 },
  networkBrand: { min: 1, max: 10, fallback: 5 },
  missionFit: { min: 1, max: 10, fallback: 5 },
  downsideRisk: { min: 1, max: 10, fallback: 5 },
};

const DIMENSION_LABELS = {
  compensation: "compensation",
  growth: "growth",
  lifestyle: "lifestyle",
  stability: "stability",
  mission: "mission fit",
};

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeWeights(weights = {}) {
  const next = Object.fromEntries(DIMENSIONS.map((dimension) => [dimension, Number(weights[dimension]) || 0]));
  const total = DIMENSIONS.reduce((sum, dimension) => sum + next[dimension], 0);

  if (total <= 0) {
    return {
      weights: { ...WEIGHT_PRESETS["Balance First"] },
      warning: "All custom weights were zero, so Balance First was used.",
    };
  }

  return {
    weights: Object.fromEntries(DIMENSIONS.map((dimension) => [dimension, (next[dimension] / total) * 100])),
    warning: null,
  };
}

export function relativeScore(value, minValue, maxValue, higherIsBetter = true) {
  if (maxValue === minValue) return 50;
  const raw = ((value - minValue) / (maxValue - minValue)) * 100;
  const score = higherIsBetter ? raw : 100 - raw;
  return clamp(score, 0, 100);
}

export function fieldMetaForMode(mode) {
  return mode === "career-paths" ? CAREER_FIELD_META : JOB_FIELD_META;
}

function sanitizeInputs(mode, inputs = {}) {
  const meta = fieldMetaForMode(mode);
  const warnings = [];
  const sanitized = {};

  Object.entries(meta).forEach(([field, config]) => {
    const raw = inputs[field];
    const numeric = raw === "" || raw === null || raw === undefined ? config.fallback : Number(raw);
    const safe = Number.isFinite(numeric) ? numeric : config.fallback;
    const clamped = clamp(safe, config.min, config.max);

    if (clamped !== safe) {
      warnings.push(`${field} was clamped to ${clamped}.`);
    }

    sanitized[field] = clamped;
  });

  return { inputs: sanitized, warnings };
}

function totalCash(inputs) {
  return inputs.baseSalary + inputs.targetBonus;
}

function buildJobRawDimensions(inputs) {
  const cash = totalCash(inputs);
  const cappedEquity = Math.min(inputs.annualizedEquityEstimate, cash * 0.25);

  return {
    compensation: cash + cappedEquity,
    growth: inputs.scope * 0.4 + inputs.mentorship * 0.35 + inputs.brandSignal * 0.25,
    lifestyle: inputs.ptoDays * 0.2 + inputs.remoteFlexibility * 4 + (5 - inputs.onsiteDays) * 6 + (10 - inputs.workloadIntensity) * 4,
    stability: inputs.stability,
    mission: inputs.missionFit,
  };
}

function buildCareerRawDimensions(inputs) {
  return {
    compensation: inputs.nearTermEarnings * 0.55 + inputs.upsidePotential * 0.45,
    growth: inputs.skillCompounding * 0.45 + inputs.optionality * 0.35 + inputs.networkBrand * 0.2,
    lifestyle: inputs.autonomy * 0.45 + inputs.lifestyleSustainability * 0.55,
    stability: inputs.stability - inputs.downsideRisk * 0.45,
    mission: inputs.missionFit,
  };
}

function buildRawDimensions(mode, inputs) {
  return mode === "career-paths" ? buildCareerRawDimensions(inputs) : buildJobRawDimensions(inputs);
}

function caveat(id, label, severity, dimension, message) {
  return { id, label, severity, dimension, message };
}

function checkJobCaveats(option, allOptions) {
  const { inputs } = option;
  const cash = totalCash(inputs);
  const highestCash = Math.max(...allOptions.map((candidate) => totalCash(candidate.inputs)));
  const cashGap = highestCash > 0 ? (highestCash - cash) / highestCash : 0;
  const equityHeavy = inputs.annualizedEquityEstimate > cash * 0.15;
  const caveats = [];

  if (cashGap > 0.15 && equityHeavy) {
    caveats.push(caveat(
      "low-cash-tradeoff",
      "Low cash tradeoff",
      cashGap > 0.25 ? "major" : "minor",
      "compensation",
      "This option depends more on non-cash value. Given these inputs, near-term cash may be a tradeoff."
    ));
  }

  if (inputs.annualizedEquityEstimate > cash * 0.3) {
    caveats.push(caveat(
      "equity-concentration",
      "Equity concentration",
      inputs.annualizedEquityEstimate > cash * 0.5 ? "major" : "minor",
      "compensation",
      "A large share of the compensation story comes from equity. The tool cannot verify liquidity, vesting risk, or valuation quality."
    ));
  }

  if (inputs.onsiteDays >= 4) {
    caveats.push(caveat(
      "commute-drag",
      "Commute drag",
      inputs.onsiteDays === 5 ? "major" : "minor",
      "lifestyle",
      "Onsite days may create a lifestyle cost that weighted averages can understate."
    ));
  }

  if (inputs.workloadIntensity >= 8) {
    caveats.push(caveat(
      "burnout-risk",
      "Burnout risk",
      inputs.workloadIntensity >= 9 ? "major" : "minor",
      "lifestyle",
      "Workload intensity is high enough to reduce confidence in the option's sustainability."
    ));
  }

  if (inputs.scope <= 4 && inputs.brandSignal <= 5 && inputs.annualizedEquityEstimate <= cash * 0.05) {
    caveats.push(caveat(
      "thin-upside",
      "Thin upside",
      "minor",
      "growth",
      "The inputs do not show much growth, brand, or equity upside relative to the comparison set."
    ));
  }

  return caveats;
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function checkCareerCaveats(option, allOptions) {
  const { inputs } = option;
  const growthMedian = median(allOptions.map((candidate) => candidate.rawDimensions.growth));
  const caveats = [];

  if (inputs.nearTermEarnings <= 4 && inputs.upsidePotential >= 7) {
    caveats.push(caveat(
      "low-cash-tradeoff",
      "Low cash tradeoff",
      inputs.nearTermEarnings <= 3 ? "major" : "minor",
      "compensation",
      "This path leans on future upside while giving up near-term earning power."
    ));
  }

  if (inputs.lifestyleSustainability <= 4) {
    caveats.push(caveat(
      "burnout-risk",
      "Burnout risk",
      inputs.lifestyleSustainability <= 3 ? "major" : "minor",
      "lifestyle",
      "The sustainability input is low enough that the model should not treat the score as fully stable."
    ));
  }

  if (inputs.upsidePotential <= 4 && inputs.skillCompounding <= 5 && inputs.optionality <= 5) {
    const major = inputs.upsidePotential <= 4 && inputs.skillCompounding <= 4 && inputs.optionality <= 4;
    caveats.push(caveat(
      "thin-upside",
      "Thin upside",
      major ? "major" : "minor",
      "growth",
      "The path does not show strong upside, compounding, or optionality under the current inputs."
    ));
  }

  if (inputs.downsideRisk >= 8) {
    caveats.push(caveat(
      "fragile-stability",
      "Fragile stability",
      "major",
      "stability",
      "Downside risk is high enough to reduce confidence even if the weighted score is attractive."
    ));
  }

  if (inputs.autonomy <= 4 && option.rawDimensions.growth > growthMedian) {
    caveats.push(caveat(
      "autonomy-tradeoff",
      "Autonomy tradeoff",
      "minor",
      "lifestyle",
      "This path may offer growth at the cost of autonomy."
    ));
  }

  return caveats;
}

function weightedScore(dimensionScores, weights) {
  return DIMENSIONS.reduce((sum, dimension) => {
    return sum + dimensionScores[dimension] * (weights[dimension] / 100);
  }, 0);
}

function weightedContributions(dimensionScores, weights) {
  return Object.fromEntries(DIMENSIONS.map((dimension) => [
    dimension,
    dimensionScores[dimension] * (weights[dimension] / 100),
  ]));
}

function majorCount(option) {
  return option.caveats.filter((item) => item.severity === "major").length;
}

function determineConfidence(ranking, margin) {
  if (ranking.length < 2) return "Close call";

  const top = ranking[0];
  const allMajorFlags = ranking.reduce((sum, option) => sum + majorCount(option), 0);
  const topMajorFlags = majorCount(top);

  if (margin < 5) return "Close call";
  if (topMajorFlags >= 2) return "Close call";
  if (allMajorFlags >= 3 && margin < 10) return "Close call";
  if (margin <= 10) return "Slight edge";
  if (topMajorFlags === 1) return "Slight edge";
  return "Clear lead";
}

function topDimensions(option, limit = 2) {
  return DIMENSIONS
    .map((dimension) => ({ dimension, score: option.dimensionScores[dimension] }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function weakDimensions(option, limit = 2) {
  return DIMENSIONS
    .map((dimension) => ({ dimension, score: option.dimensionScores[dimension] }))
    .sort((a, b) => a.score - b.score)
    .slice(0, limit);
}

function formatPoints(value) {
  return `${Math.round(value)} pts`;
}

function buildCannotVerify(mode) {
  if (mode === "career-paths") {
    return [
      "actual future openings",
      "market demand at the time of transition",
      "personal energy after several months",
      "quality of network effects",
      "downside severity if the path fails",
    ];
  }

  return [
    "actual team culture",
    "manager quality",
    "equity liquidity or future valuation",
    "true workload after joining",
    "negotiation room",
  ];
}

function buildVerdict({ mode, ranking, confidence, margin, weights }) {
  const top = ranking[0];
  const runnerUp = ranking[1];

  if (!top || !runnerUp) {
    return {
      topOptionId: top?.id,
      confidence,
      headline: "Add at least two options to compare.",
      reasonsForTop: [],
      tradeoffsForTop: [],
      runnerUpCase: "",
      whyWeightsFavorTop: "",
      flipFactors: [],
      cannotVerify: buildCannotVerify(mode),
    };
  }

  const topStrong = topDimensions(top, 3);
  const topWeak = weakDimensions(top, 2);
  const runnerStrong = topDimensions(runnerUp, 2);
  const topCaveats = top.caveats.slice(0, 2).map((item) => item.message);

  const reasonsForTop = topStrong.slice(0, 3).map(({ dimension, score }) => (
    `${top.title} is strongest on ${DIMENSION_LABELS[dimension]} among these options (${formatPoints(score)}).`
  ));

  const tradeoffsForTop = [
    ...topWeak
      .filter(({ score }) => score <= 40)
      .map(({ dimension, score }) => `${DIMENSION_LABELS[dimension]} is a relative weak spot (${formatPoints(score)}).`),
    ...topCaveats,
  ].slice(0, 3);

  const runnerUpCase = `${runnerUp.title} has its strongest case in ${runnerStrong.map(({ dimension }) => DIMENSION_LABELS[dimension]).join(" and ")}.`;
  const weightedDimensions = DIMENSIONS
    .map((dimension) => ({ dimension, weight: weights[dimension], edge: top.dimensionScores[dimension] - runnerUp.dimensionScores[dimension] }))
    .sort((a, b) => Math.abs(b.edge * b.weight) - Math.abs(a.edge * a.weight));
  const mostRelevant = weightedDimensions[0];

  const whyWeightsFavorTop = `Under this weighting, ${DIMENSION_LABELS[mostRelevant.dimension]} contributes most to the separation between the top two options.`;
  const flipFactors = [
    margin < 10 ? "A modest change in weights could change the ranking." : null,
    ...weightedDimensions
      .filter(({ edge }) => edge < -5)
      .slice(0, 2)
      .map(({ dimension }) => `A heavier emphasis on ${DIMENSION_LABELS[dimension]} would help ${runnerUp.title}.`),
    top.caveats.length ? `Discounting ${top.title}'s caveats less heavily would strengthen its case; taking them more seriously would weaken it.` : null,
  ].filter(Boolean);

  const headline = confidence === "Close call"
    ? `The tool cannot cleanly separate ${top.title} from ${runnerUp.title} under this weighting.`
    : `Given these inputs, ${top.title} has the ${confidence.toLowerCase()}.`;

  return {
    topOptionId: top.id,
    confidence,
    headline,
    reasonsForTop,
    tradeoffsForTop: tradeoffsForTop.length ? tradeoffsForTop : ["No major tradeoff is triggered by the current rule checks."],
    runnerUpCase,
    whyWeightsFavorTop,
    flipFactors: flipFactors.length ? flipFactors : ["A different view of the underlying assumptions could still change the result."],
    cannotVerify: buildCannotVerify(mode),
  };
}

function buildPossibilityEnvelope(mode, option) {
  if (mode !== "career-paths") return null;

  return {
    downside: `If downside risk materializes, ${option.title} could feel constrained by stability and sustainability pressure.`,
    base: `Given these inputs, the base case is strongest where ${topDimensions(option, 1)[0].dimension} scores well relative to the other paths.`,
    upside: `The upside case depends most on whether ${option.title}'s growth and optionality inputs prove durable.`,
  };
}

export function evaluateDecision({
  mode,
  options = [],
  weights = WEIGHT_PRESETS["Balance First"],
  editedFields = {},
}) {
  const validationWarnings = [];
  const normalized = normalizeWeights(weights);
  if (normalized.warning) validationWarnings.push(normalized.warning);

  if (options.length < 2) {
    validationWarnings.push("At least two options are needed for a meaningful comparison.");
  }

  const prepared = options.map((option) => {
    if (option.mode && option.mode !== mode) {
      validationWarnings.push(`${option.title} has mode ${option.mode}, but the current engine mode is ${mode}.`);
    }

    const sanitized = sanitizeInputs(mode, option.inputs);
    validationWarnings.push(...sanitized.warnings.map((warning) => `${option.title}: ${warning}`));

    return {
      ...option,
      inputs: sanitized.inputs,
      rawDimensions: buildRawDimensions(mode, sanitized.inputs),
    };
  });

  const ranges = Object.fromEntries(DIMENSIONS.map((dimension) => {
    const values = prepared.map((option) => option.rawDimensions[dimension]);
    return [dimension, { min: Math.min(...values), max: Math.max(...values) }];
  }));

  const scoredWithoutCaveats = prepared.map((option) => {
    const dimensionScores = Object.fromEntries(DIMENSIONS.map((dimension) => {
      const range = ranges[dimension];
      return [dimension, relativeScore(option.rawDimensions[dimension], range.min, range.max)];
    }));

    return {
      ...option,
      dimensionScores,
      weightedScore: weightedScore(dimensionScores, normalized.weights),
      weightedContributions: weightedContributions(dimensionScores, normalized.weights),
      provenance: Object.fromEntries(Object.keys(option.inputs).map((field) => [
        field,
        editedFields[option.id]?.has?.(field) || editedFields[option.id]?.includes?.(field) ? "You entered" : "Demo",
      ])),
    };
  });

  const scored = scoredWithoutCaveats.map((option) => {
    const caveats = mode === "career-paths"
      ? checkCareerCaveats(option, scoredWithoutCaveats)
      : checkJobCaveats(option, scoredWithoutCaveats);

    return {
      ...option,
      caveats,
      strengths: topDimensions(option, 2).map(({ dimension }) => DIMENSION_LABELS[dimension]),
      risks: [
        ...weakDimensions(option, 2).map(({ dimension }) => DIMENSION_LABELS[dimension]),
        ...caveats.map((item) => item.label),
      ].slice(0, 4),
      explanationLines: topDimensions(option, 2).map(({ dimension, score }) => (
        `${DIMENSION_LABELS[dimension]} scored ${Math.round(score)} relative to the current comparison set.`
      )),
    };
  });

  const ranking = [...scored].sort((a, b) => b.weightedScore - a.weightedScore);
  const margin = ranking.length >= 2 ? ranking[0].weightedScore - ranking[1].weightedScore : 0;
  const confidence = determineConfidence(ranking, margin);
  const verdict = buildVerdict({ mode, ranking, confidence, margin, weights: normalized.weights });

  if (ranking.length >= 2 && ranking.every((option) => option.weightedScore === ranking[0].weightedScore)) {
    validationWarnings.push("All weighted scores are identical.");
  }

  return {
    mode,
    weights,
    normalizedWeights: normalized.weights,
    options: scored,
    ranking,
    topOption: ranking[0] || null,
    runnerUp: ranking[1] || null,
    margin,
    confidence,
    verdict,
    possibilityEnvelope: ranking[0] ? buildPossibilityEnvelope(mode, ranking[0]) : null,
    chartData: scored.map((option) => ({
      id: option.id,
      title: option.title,
      scores: option.dimensionScores,
    })),
    methodologyNotes: [
      "Scores are relative to the current comparison set.",
      "Demo data is fictional.",
      "Edited inputs are marked as You entered.",
      "Rule checks are heuristics, not facts.",
      "The output is decision support, not advice.",
    ],
    validationWarnings,
  };
}
