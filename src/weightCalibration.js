import { DIMENSIONS, WEIGHT_PRESETS } from "./demoScenarios.js";

export const CALIBRATION_QUESTIONS = [
  {
    id: "moneyGrowth",
    label: "Near-term money or long-term growth?",
    options: [
      { value: "compensation", label: "Near-term money matters more" },
      { value: "growth", label: "Long-term growth matters more" },
      { value: "balanced", label: "Keep them balanced" },
    ],
  },
  {
    id: "riskGrowth",
    label: "Growth or downside protection?",
    options: [
      { value: "growth", label: "I can accept more risk for growth" },
      { value: "stability", label: "I want downside protection" },
      { value: "balanced", label: "Keep them balanced" },
    ],
  },
  {
    id: "lifestyleMoney",
    label: "Lifestyle or compensation?",
    options: [
      { value: "lifestyle", label: "Sustainability matters more" },
      { value: "compensation", label: "Compensation matters more" },
      { value: "balanced", label: "Keep them balanced" },
    ],
  },
  {
    id: "mission",
    label: "How should mission fit behave?",
    options: [
      { value: "priority", label: "It can decide the result" },
      { value: "tiebreaker", label: "It is a tie-breaker" },
      { value: "low", label: "It matters less than practical factors" },
    ],
  },
  {
    id: "riskTolerance",
    label: "What is your risk tolerance right now?",
    options: [
      { value: "low", label: "Low risk tolerance" },
      { value: "medium", label: "Moderate risk tolerance" },
      { value: "high", label: "High risk tolerance" },
    ],
  },
];

export const DEFAULT_CALIBRATION_ANSWERS = {
  moneyGrowth: "balanced",
  riskGrowth: "balanced",
  lifestyleMoney: "balanced",
  mission: "tiebreaker",
  riskTolerance: "medium",
};

function add(weights, dimension, value) {
  return {
    ...weights,
    [dimension]: Math.max(0, weights[dimension] + value),
  };
}

export function deriveWeights(answers = DEFAULT_CALIBRATION_ANSWERS) {
  let weights = { ...WEIGHT_PRESETS["Balance First"] };
  const applied = [];

  if (answers.moneyGrowth === "compensation") {
    weights = add(add(weights, "compensation", 10), "growth", -5);
    applied.push("Near-term money increased compensation weight.");
  } else if (answers.moneyGrowth === "growth") {
    weights = add(add(weights, "growth", 10), "compensation", -5);
    applied.push("Long-term growth increased growth weight.");
  }

  if (answers.riskGrowth === "growth") {
    weights = add(add(weights, "growth", 8), "stability", -5);
    applied.push("Risk tolerance for growth increased growth weight.");
  } else if (answers.riskGrowth === "stability") {
    weights = add(add(weights, "stability", 10), "growth", -5);
    applied.push("Downside protection increased stability weight.");
  }

  if (answers.lifestyleMoney === "lifestyle") {
    weights = add(add(weights, "lifestyle", 10), "compensation", -5);
    applied.push("Sustainability increased lifestyle weight.");
  } else if (answers.lifestyleMoney === "compensation") {
    weights = add(add(weights, "compensation", 8), "lifestyle", -5);
    applied.push("Compensation priority increased compensation weight.");
  }

  if (answers.mission === "priority") {
    weights = add(weights, "mission", 8);
    applied.push("Mission fit increased mission weight.");
  } else if (answers.mission === "low") {
    weights = add(weights, "mission", -6);
    applied.push("Mission fit decreased to a smaller practical factor.");
  }

  if (answers.riskTolerance === "low") {
    weights = add(add(weights, "stability", 10), "growth", -4);
    applied.push("Low risk tolerance increased stability weight.");
  } else if (answers.riskTolerance === "high") {
    weights = add(add(weights, "growth", 6), "stability", -4);
    applied.push("High risk tolerance increased growth weight.");
  }

  const total = DIMENSIONS.reduce((sum, dimension) => sum + weights[dimension], 0);
  const normalized = Object.fromEntries(DIMENSIONS.map((dimension) => [
    dimension,
    (weights[dimension] / total) * 100,
  ]));

  return {
    weights: normalized,
    applied: applied.length ? applied : ["Balanced answers kept the default weighting."],
  };
}
