import { FIELD_HINTS, FIELD_LABELS } from "./demoScenarios.js";
import { fieldMetaForMode } from "./decisionEngine.js";

export const MODE_COPY = {
  "job-offers": {
    label: "Specific job offers",
    description: "Compare concrete offers, a current role, or a negotiated alternative.",
    optionPlaceholder: "Offer A",
    optionSubtitle: "User-entered job offer",
  },
  "career-paths": {
    label: "Career paths",
    description: "Compare broader paths when the inputs are directional rather than contract-specific.",
    optionPlaceholder: "AI systems track",
    optionSubtitle: "User-entered career path",
  },
};

const JOB_FIELD_ORDER = [
  "baseSalary",
  "targetBonus",
  "annualizedEquityEstimate",
  "ptoDays",
  "remoteFlexibility",
  "onsiteDays",
  "scope",
  "mentorship",
  "brandSignal",
  "stability",
  "missionFit",
  "workloadIntensity",
];

const CAREER_FIELD_ORDER = [
  "nearTermEarnings",
  "upsidePotential",
  "skillCompounding",
  "optionality",
  "autonomy",
  "lifestyleSustainability",
  "stability",
  "networkBrand",
  "missionFit",
  "downsideRisk",
];

export const INTAKE_FIELD_ORDER = {
  "job-offers": JOB_FIELD_ORDER,
  "career-paths": CAREER_FIELD_ORDER,
};

export const DEFAULT_OPTION_NAMES = {
  "job-offers": ["Current role", "Offer A", "Offer B"],
  "career-paths": ["Current path", "Path A", "Path B"],
};

export function defaultInputsForMode(mode) {
  const meta = fieldMetaForMode(mode);
  return Object.fromEntries(Object.entries(meta).map(([field, config]) => [field, config.fallback]));
}

export function buildUserOptions({ mode, optionNames, inputValues }) {
  const names = optionNames
    .map((name) => name.trim())
    .filter(Boolean)
    .slice(0, 3);

  return names.map((name, index) => ({
    id: `user-option-${index + 1}`,
    title: name,
    subtitle: MODE_COPY[mode].optionSubtitle,
    mode,
    inputs: {
      ...defaultInputsForMode(mode),
      ...(inputValues[`user-option-${index + 1}`] || {}),
    },
  }));
}

export function fieldQuestion(field) {
  const label = FIELD_LABELS[field] || field;
  const hint = FIELD_HINTS[field] || "";
  return {
    field,
    label,
    hint,
  };
}

export function inputCompletenessWarnings({ mode, options }) {
  const meta = fieldMetaForMode(mode);
  const warnings = [];

  if (options.length < 2) {
    warnings.push("Add at least two options before running the comparison.");
  }

  options.forEach((option) => {
    Object.entries(meta).forEach(([field, config]) => {
      const value = option.inputs[field];
      if (value === "" || value === null || value === undefined) {
        warnings.push(`${option.title}: ${FIELD_LABELS[field] || field} is missing and will use ${config.fallback}.`);
      }
    });
  });

  return warnings;
}
