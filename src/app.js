import {
  DEMO_SCENARIOS,
  DIMENSIONS,
  FIELD_HINTS,
  FIELD_LABELS,
  WEIGHT_PRESETS,
} from "./demoScenarios.js";
import { evaluateDecision, fieldMetaForMode } from "./decisionEngine.js";
import {
  DEFAULT_OPTION_NAMES,
  INTAKE_FIELD_ORDER,
  MODE_COPY,
  buildUserOptions,
  defaultInputsForMode,
  fieldQuestion,
  inputCompletenessWarnings,
} from "./intakeModel.js";
import {
  CALIBRATION_QUESTIONS,
  DEFAULT_CALIBRATION_ANSWERS,
  deriveWeights,
} from "./weightCalibration.js";

const app = document.getElementById("app");
const CUSTOM_PRESET = "Custom";

const state = {
  view: "demo",
  scenarioId: DEMO_SCENARIOS[0].id,
  preset: "Balance First",
  customWeights: { ...WEIGHT_PRESETS["Balance First"] },
  options: cloneOptions(DEMO_SCENARIOS[0].options),
  editedFields: {},
  intake: {
    step: "type",
    mode: "job-offers",
    optionCount: 2,
    optionNames: [...DEFAULT_OPTION_NAMES["job-offers"]],
    inputValues: {},
    calibrationAnswers: { ...DEFAULT_CALIBRATION_ANSWERS },
    derivedWeightNotes: [],
  },
};

function cloneOptions(options) {
  return JSON.parse(JSON.stringify(options));
}

function currentScenario() {
  return DEMO_SCENARIOS.find((scenario) => scenario.id === state.scenarioId) || DEMO_SCENARIOS[0];
}

function currentWeights() {
  return state.preset === CUSTOM_PRESET ? state.customWeights : WEIGHT_PRESETS[state.preset];
}

function currentMode() {
  return state.view === "build" ? state.intake.mode : currentScenario().mode;
}

function formatScore(score) {
  return Math.round(score);
}

function formatMoney(value) {
  return `$${Number(value).toLocaleString()}`;
}

function formatInputValue(field, value) {
  return ["baseSalary", "targetBonus", "annualizedEquityEstimate"].includes(field) ? formatMoney(value) : value;
}

function confidenceClass(confidence) {
  if (confidence === "Clear lead") return "clear";
  if (confidence === "Close call") return "close";
  return "";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function dimensionLabel(dimension) {
  return dimension === "mission" ? "mission fit" : dimension;
}

function dimensionRows(option) {
  return DIMENSIONS.map((dimension) => {
    const value = formatScore(option.dimensionScores[dimension]);
    const contribution = option.weightedContributions[dimension].toFixed(1);
    return `
      <div class="dimension-row">
        <span>${dimensionLabel(dimension)}</span>
        <span class="bar-track"><span class="bar-fill" style="width: ${value}%"></span></span>
        <span>${value}</span>
        <span>${contribution}</span>
      </div>
    `;
  }).join("");
}

function caveatPills(caveats) {
  if (!caveats.length) {
    return `<span class="pill">No rule checks triggered</span>`;
  }

  return caveats.map((item) => (
    `<span class="pill ${item.severity === "major" ? "major" : ""}">${item.label}</span>`
  )).join("");
}

function caveatDetails(caveats) {
  if (!caveats.length) {
    return `<p class="quiet">No caveats triggered by the current rule checks.</p>`;
  }

  return caveats.map((item) => `
    <li>
      <strong>${item.label} (${item.severity})</strong>
      <span>${item.message}</span>
    </li>
  `).join("");
}

function inputControls(option, mode) {
  const meta = fieldMetaForMode(mode);

  return Object.entries(meta).map(([field, config]) => {
    const step = config.max > 100 ? 1000 : 1;
    const provenance = option.provenance[field];
    return `
      <label class="input-row" title="${escapeHtml(FIELD_HINTS[field] || "")}">
        <span>
          <strong>${FIELD_LABELS[field] || field}</strong>
          <em>${provenance}</em>
        </span>
        <input
          data-option-id="${option.id}"
          data-field="${field}"
          type="number"
          min="${config.min}"
          max="${config.max}"
          step="${step}"
          value="${option.inputs[field]}"
          aria-label="${option.title} ${FIELD_LABELS[field] || field}"
        />
      </label>
    `;
  }).join("");
}

function rawDimensionRows(option) {
  return DIMENSIONS.map((dimension) => `
    <div class="raw-row">
      <span>${dimensionLabel(dimension)}</span>
      <span>${Number(option.rawDimensions[dimension]).toFixed(1)}</span>
    </div>
  `).join("");
}

function renderOption(option, mode) {
  return `
    <article class="option-card">
      <div class="option-head">
        <div>
          <h3 class="option-title">${escapeHtml(option.title)}</h3>
          <p class="subtitle">${escapeHtml(option.subtitle)}</p>
        </div>
        <div class="score-block">
          <span>score</span>
          <strong>${formatScore(option.weightedScore)}</strong>
        </div>
      </div>

      <div class="dimension-list">
        <div class="dimension-row dimension-head">
          <span>dimension</span>
          <span>relative score</span>
          <span>score</span>
          <span>weighted</span>
        </div>
        ${dimensionRows(option)}
      </div>

      <details class="option-details">
        <summary>Editable inputs and raw scoring</summary>
        <div class="input-grid">
          ${inputControls(option, mode)}
        </div>
        <div class="raw-grid" aria-label="Raw dimension values">
          ${rawDimensionRows(option)}
        </div>
      </details>

      <div class="caveats">
        ${caveatPills(option.caveats)}
      </div>
    </article>
  `;
}

function renderRanking(result) {
  return result.ranking.map((option, index) => `
    <div class="rank-row">
      <span class="rank-number">${index + 1}</span>
      <span>${escapeHtml(option.title)}</span>
      <strong>${formatScore(option.weightedScore)}</strong>
    </div>
  `).join("");
}

function listItems(items) {
  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function renderWeightControls(result) {
  return DIMENSIONS.map((dimension) => `
    <label class="weight-row">
      <span>
        <strong>${dimensionLabel(dimension)}</strong>
        <em>${result.normalizedWeights[dimension].toFixed(0)}%</em>
      </span>
      <input
        data-weight="${dimension}"
        type="range"
        min="0"
        max="50"
        step="1"
        value="${state.customWeights[dimension]}"
        ${state.preset === CUSTOM_PRESET ? "" : "disabled"}
        aria-label="${dimensionLabel(dimension)} weight"
      />
    </label>
  `).join("");
}

function optionInputValue(optionId, field) {
  const defaults = defaultInputsForMode(state.intake.mode);
  return state.intake.inputValues[optionId]?.[field] ?? defaults[field];
}

function activeIntakeOptionNames() {
  return state.intake.optionNames.slice(0, state.intake.optionCount);
}

function buildIntakeOptions() {
  return buildUserOptions({
    mode: state.intake.mode,
    optionNames: activeIntakeOptionNames(),
    inputValues: state.intake.inputValues,
  });
}

function intakeEditedFields() {
  return Object.fromEntries(buildIntakeOptions().map((option) => [
    option.id,
    Object.keys(option.inputs),
  ]));
}

function applyDerivedWeights() {
  const derived = deriveWeights(state.intake.calibrationAnswers);
  state.customWeights = derived.weights;
  state.preset = CUSTOM_PRESET;
  state.intake.derivedWeightNotes = derived.applied;
}

function setIntakeMode(mode) {
  state.intake.mode = mode;
  state.intake.optionNames = [...DEFAULT_OPTION_NAMES[mode]];
  state.intake.inputValues = {};
  state.intake.step = "names";
}

function renderPathSwitcher() {
  return `
    <div class="path-switcher" aria-label="Workflow choice">
      <button type="button" data-view="demo" class="${state.view === "demo" ? "active" : ""}">Explore demos</button>
      <button type="button" data-view="build" class="${state.view === "build" ? "active" : ""}">Build a comparison</button>
    </div>
  `;
}

function renderCaveatPanel(result) {
  return result.options.map((option) => `
    <details class="rule-check">
      <summary>${escapeHtml(option.title)} rule checks</summary>
      <ul class="caveat-list">${caveatDetails(option.caveats)}</ul>
    </details>
  `).join("");
}

function renderPossibilityEnvelope(result) {
  if (!result.possibilityEnvelope) return "";

  return `
    <section class="panel compact-panel">
      <p class="panel-title">Possibility envelope</p>
      <p><strong>Downside:</strong> ${escapeHtml(result.possibilityEnvelope.downside)}</p>
      <p><strong>Base case:</strong> ${escapeHtml(result.possibilityEnvelope.base)}</p>
      <p><strong>Upside:</strong> ${escapeHtml(result.possibilityEnvelope.upside)}</p>
    </section>
  `;
}

function renderValidationWarnings(result) {
  if (!result.validationWarnings.length) return "";

  return `
    <section class="panel compact-panel warning-panel">
      <p class="panel-title">Validation warnings</p>
      <ul class="mini-list">${listItems(result.validationWarnings)}</ul>
    </section>
  `;
}

function renderIntakeProgress() {
  const steps = [
    ["type", "Type"],
    ["names", "Choices"],
    ["inputs", "Inputs"],
    ["weights", "Weights"],
    ["review", "Review"],
    ["results", "Results"],
  ];

  return `
    <div class="intake-progress">
      ${steps.map(([id, label]) => `
        <span class="${state.intake.step === id ? "active" : ""}">${label}</span>
      `).join("")}
    </div>
  `;
}

function renderBuildTypeStep() {
  return `
    <section class="panel build-panel">
      <p class="panel-title">Build a comparison</p>
      <p class="quiet">Choose the kind of decision you want to structure. The tool keeps everything local in the browser and uses fictional defaults until you change them.</p>
      ${renderIntakeProgress()}
      <div class="choice-grid">
        ${Object.entries(MODE_COPY).map(([mode, copy]) => `
          <button type="button" class="choice-card" data-intake-mode="${mode}">
            <strong>${copy.label}</strong>
            <span>${copy.description}</span>
          </button>
        `).join("")}
      </div>
    </section>
  `;
}

function renderOptionNameStep() {
  return `
    <section class="panel build-panel">
      <p class="panel-title">Name the choices</p>
      <p class="quiet">Use two or three options. You can compare a current role against offers, or compare broader paths.</p>
      ${renderIntakeProgress()}
      <label class="inline-control">
        <span>Number of choices</span>
        <select id="option-count" class="control">
          <option value="2" ${state.intake.optionCount === 2 ? "selected" : ""}>2</option>
          <option value="3" ${state.intake.optionCount === 3 ? "selected" : ""}>3</option>
        </select>
      </label>
      <div class="name-grid">
        ${state.intake.optionNames.slice(0, state.intake.optionCount).map((name, index) => `
          <label class="input-row">
            <span><strong>Choice ${index + 1}</strong><em>You entered</em></span>
            <input data-option-name-index="${index}" value="${escapeHtml(name)}" aria-label="Choice ${index + 1} name" />
          </label>
        `).join("")}
      </div>
      <div class="workflow-actions">
        <button type="button" class="secondary-button" data-intake-back="type">Back</button>
        <button type="button" data-intake-next="inputs">Next: enter inputs</button>
      </div>
    </section>
  `;
}

function renderGuidedInputsStep() {
  const options = buildIntakeOptions();
  const fields = INTAKE_FIELD_ORDER[state.intake.mode];
  const meta = fieldMetaForMode(state.intake.mode);

  return `
    <section class="panel build-panel">
      <p class="panel-title">Enter decision inputs</p>
      <p class="quiet">Use estimates where needed. The engine will clamp out-of-range values and show validation warnings before the result.</p>
      ${renderIntakeProgress()}
      <div class="guided-options">
        ${options.map((option) => `
          <article class="guided-option">
            <h3 class="option-title">${escapeHtml(option.title)}</h3>
            <div class="input-grid">
              ${fields.map((field) => {
                const question = fieldQuestion(field);
                const config = meta[field];
                const step = config.max > 100 ? 1000 : 1;
                return `
                  <label class="input-row" title="${escapeHtml(question.hint)}">
                    <span><strong>${question.label}</strong><em>${config.min}-${config.max}</em></span>
                    <input
                      data-intake-option-id="${option.id}"
                      data-intake-field="${field}"
                      type="number"
                      min="${config.min}"
                      max="${config.max}"
                      step="${step}"
                      value="${optionInputValue(option.id, field)}"
                      aria-label="${option.title} ${question.label}"
                    />
                  </label>
                `;
              }).join("")}
            </div>
          </article>
        `).join("")}
      </div>
      <div class="workflow-actions">
        <button type="button" class="secondary-button" data-intake-back="names">Back</button>
        <button type="button" data-intake-next="weights">Next: calibrate weights</button>
      </div>
    </section>
  `;
}

function renderCalibrationStep() {
  return `
    <section class="panel build-panel">
      <p class="panel-title">Calibrate weights</p>
      <p class="quiet">These answers derive a starting weighting. You can still adjust the sliders in the result view.</p>
      ${renderIntakeProgress()}
      <div class="calibration-grid">
        ${CALIBRATION_QUESTIONS.map((question) => `
          <fieldset class="calibration-card">
            <legend>${question.label}</legend>
            ${question.options.map((option) => `
              <label>
                <input
                  type="radio"
                  name="${question.id}"
                  value="${option.value}"
                  ${state.intake.calibrationAnswers[question.id] === option.value ? "checked" : ""}
                  data-calibration="${question.id}"
                />
                <span>${option.label}</span>
              </label>
            `).join("")}
          </fieldset>
        `).join("")}
      </div>
      <div class="workflow-actions">
        <button type="button" class="secondary-button" data-intake-back="inputs">Back</button>
        <button type="button" data-intake-next="review">Review assumptions</button>
      </div>
    </section>
  `;
}

function renderReviewStep() {
  const options = buildIntakeOptions();
  const warnings = inputCompletenessWarnings({ mode: state.intake.mode, options });

  return `
    <section class="panel build-panel">
      <p class="panel-title">Review assumptions</p>
      <p class="quiet">This is the checkpoint before running the engine. The comparison depends on these inputs and derived weights.</p>
      ${renderIntakeProgress()}
      <div class="review-grid">
        <article>
          <h3 class="option-title">Derived weights</h3>
          <div class="weight-grid">
            ${DIMENSIONS.map((dimension) => `
              <div class="review-row">
                <span>${dimensionLabel(dimension)}</span>
                <strong>${state.customWeights[dimension].toFixed(0)}%</strong>
              </div>
            `).join("")}
          </div>
          <ul class="mini-list">${listItems(state.intake.derivedWeightNotes)}</ul>
        </article>
        <article>
          <h3 class="option-title">What this cannot verify</h3>
          <ul class="mini-list">
            <li>Manager quality, team culture, or actual workload.</li>
            <li>Future market demand or negotiation room.</li>
            <li>Whether subjective ratings will still feel accurate later.</li>
          </ul>
        </article>
      </div>
      ${warnings.length ? `<div class="warning-strip">${listItems(warnings)}</div>` : ""}
      <div class="workflow-actions">
        <button type="button" class="secondary-button" data-intake-back="weights">Back</button>
        <button type="button" data-run-custom="true">Run comparison</button>
      </div>
    </section>
  `;
}

function renderBuildWorkflow() {
  if (state.intake.step === "type") return renderBuildTypeStep();
  if (state.intake.step === "names") return renderOptionNameStep();
  if (state.intake.step === "inputs") return renderGuidedInputsStep();
  if (state.intake.step === "weights") return renderCalibrationStep();
  if (state.intake.step === "review") return renderReviewStep();
  return "";
}

function confidenceRule(result) {
  const topMajorFlags = result.topOption?.caveats.filter((item) => item.severity === "major").length || 0;
  const allMajorFlags = result.options.reduce((sum, option) => {
    return sum + option.caveats.filter((item) => item.severity === "major").length;
  }, 0);

  if (result.margin < 5) return "Close call because the top-two margin is below 5 points.";
  if (topMajorFlags >= 2) return "Close call because the top option has two or more major caveats.";
  if (allMajorFlags >= 3 && result.margin < 10) return "Close call because the comparison has several major caveats and a modest margin.";
  if (result.margin <= 10) return "Slight edge because the top-two margin is 5-10 points.";
  if (topMajorFlags === 1) return "Slight edge because the top option has one major caveat.";
  return "Clear lead because the margin is above 10 points and the top option has no major caveats.";
}

function traceInputRows(option) {
  return Object.entries(option.inputs).map(([field, value]) => `
    <div class="trace-input-row">
      <span>${FIELD_LABELS[field] || field}</span>
      <strong>${formatInputValue(field, value)}</strong>
      <em>${option.provenance[field]}</em>
    </div>
  `).join("");
}

function traceDimensionRows(option, result) {
  return DIMENSIONS.map((dimension) => `
    <div class="trace-score-row">
      <span>${dimensionLabel(dimension)}</span>
      <strong>${Number(option.rawDimensions[dimension]).toFixed(1)}</strong>
      <strong>${option.dimensionScores[dimension].toFixed(1)}</strong>
      <strong>${result.normalizedWeights[dimension].toFixed(1)}%</strong>
      <strong>${option.weightedContributions[dimension].toFixed(1)}</strong>
    </div>
  `).join("");
}

function renderEngineTrace(result) {
  const option = result.topOption;
  if (!option) return "";

  return `
    <section class="panel trace-panel">
      <div class="section-head">
        <div>
          <p class="panel-title">Engine trace</p>
          <p class="quiet">The trace shows how the top option moved from inputs to final confidence. It uses the same engine output as the verdict.</p>
        </div>
      </div>

      <div class="trace-steps" aria-label="Decision engine pipeline">
        <span>Inputs</span>
        <span>Sanitize</span>
        <span>Raw dimensions</span>
        <span>Relative scoring</span>
        <span>Weighted result</span>
        <span>Rule checks</span>
        <span>Confidence</span>
      </div>

      <details class="trace-details" open>
        <summary>${escapeHtml(option.title)} input provenance</summary>
        <div class="trace-input-grid">${traceInputRows(option)}</div>
      </details>

      <details class="trace-details" open>
        <summary>Score construction</summary>
        <div class="trace-score-grid">
          <div class="trace-score-row trace-score-head">
            <span>dimension</span>
            <span>raw</span>
            <span>relative</span>
            <span>weight</span>
            <span>weighted</span>
          </div>
          ${traceDimensionRows(option, result)}
        </div>
        <p class="trace-total">Total weighted score: <strong>${option.weightedScore.toFixed(1)}</strong></p>
      </details>

      <details class="trace-details" open>
        <summary>Rule checks and confidence policy</summary>
        <ul class="mini-list">${listItems(option.caveats.length ? option.caveats.map((item) => `${item.label}: ${item.message}`) : ["No caveats triggered for the top option."])}</ul>
        <p class="trace-total">${escapeHtml(confidenceRule(result))}</p>
      </details>
    </section>
  `;
}

function syncInputHandlers() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", (event) => {
      state.view = event.currentTarget.dataset.view;
      render();
    });
  });

  document.querySelectorAll("[data-intake-mode]").forEach((button) => {
    button.addEventListener("click", (event) => {
      setIntakeMode(event.currentTarget.dataset.intakeMode);
      render();
    });
  });

  document.querySelectorAll("[data-intake-next]").forEach((button) => {
    button.addEventListener("click", (event) => {
      state.intake.step = event.currentTarget.dataset.intakeNext;
      if (state.intake.step === "review") applyDerivedWeights();
      render();
    });
  });

  document.querySelectorAll("[data-intake-back]").forEach((button) => {
    button.addEventListener("click", (event) => {
      state.intake.step = event.currentTarget.dataset.intakeBack;
      render();
    });
  });

  document.querySelectorAll("[data-run-custom]").forEach((button) => {
    button.addEventListener("click", () => {
      state.options = buildIntakeOptions();
      state.editedFields = intakeEditedFields();
      state.intake.step = "results";
      state.view = "build";
      render();
    });
  });

  document.getElementById("option-count")?.addEventListener("change", (event) => {
    state.intake.optionCount = Number(event.target.value);
    render();
  });

  document.querySelectorAll("[data-option-name-index]").forEach((input) => {
    input.addEventListener("change", (event) => {
      state.intake.optionNames[Number(event.target.dataset.optionNameIndex)] = event.target.value;
      render();
    });
  });

  document.querySelectorAll("[data-intake-field]").forEach((input) => {
    input.addEventListener("change", (event) => {
      const { intakeOptionId, intakeField } = event.target.dataset;
      state.intake.inputValues[intakeOptionId] = state.intake.inputValues[intakeOptionId] || {};
      state.intake.inputValues[intakeOptionId][intakeField] = event.target.value;
      render();
    });
  });

  document.querySelectorAll("[data-calibration]").forEach((input) => {
    input.addEventListener("change", (event) => {
      state.intake.calibrationAnswers[event.target.dataset.calibration] = event.target.value;
      applyDerivedWeights();
      render();
    });
  });

  document.getElementById("scenario")?.addEventListener("change", (event) => {
    const scenario = DEMO_SCENARIOS.find((item) => item.id === event.target.value) || DEMO_SCENARIOS[0];
    state.scenarioId = scenario.id;
    state.options = cloneOptions(scenario.options);
    state.editedFields = {};
    render();
  });

  document.getElementById("preset")?.addEventListener("change", (event) => {
    state.preset = event.target.value;
    render();
  });

  document.querySelectorAll("[data-field]").forEach((input) => {
    input.addEventListener("change", (event) => {
      const { optionId, field } = event.target.dataset;
      const option = state.options.find((candidate) => candidate.id === optionId);
      if (!option) return;

      option.inputs[field] = event.target.value;
      state.editedFields[optionId] = state.editedFields[optionId] || [];
      if (!state.editedFields[optionId].includes(field)) {
        state.editedFields[optionId].push(field);
      }
      render();
    });
  });

  document.querySelectorAll("[data-weight]").forEach((input) => {
    input.addEventListener("input", (event) => {
      state.customWeights[event.target.dataset.weight] = Number(event.target.value);
      state.preset = CUSTOM_PRESET;
      render();
    });
  });

  document.getElementById("reset")?.addEventListener("click", () => {
    const scenario = currentScenario();
    state.options = cloneOptions(scenario.options);
    state.editedFields = {};
    state.customWeights = { ...WEIGHT_PRESETS["Balance First"] };
    state.preset = "Balance First";
    render();
  });
}

function render() {
  const scenario = currentScenario();
  const mode = currentMode();
  const comparisonOptions = state.view === "build" && state.intake.step === "results"
    ? state.options
    : state.view === "demo"
      ? state.options
      : buildIntakeOptions();
  const result = evaluateDecision({
    mode,
    options: comparisonOptions,
    weights: currentWeights(),
    editedFields: state.view === "build" ? intakeEditedFields() : state.editedFields,
  });
  const showResults = state.view === "demo" || state.intake.step === "results";

  app.innerHTML = `
    <div class="page">
      <section class="hero">
        <div class="hero-copy">
          <p class="eyebrow">Decision-support portfolio artifact</p>
          <h1>Career Decision Engine</h1>
          <p class="lede">
            A dependency-free tool for structuring ambiguous job-offer and career-path comparisons.
            Given these inputs and this weighting, it produces relative scores, rule checks, and calibrated confidence labels.
          </p>
          <div class="hero-points" aria-label="Project signals">
            <span>Relative scoring</span>
            <span>Rule checks</span>
            <span>Close-call handling</span>
            <span>Guided intake</span>
          </div>
        </div>

        <aside class="control-panel" aria-label="Scenario controls">
          ${renderPathSwitcher()}
          ${state.view === "demo" ? `
            <label>
              <span>Scenario</span>
              <select id="scenario" class="control">
                ${DEMO_SCENARIOS.map((item) => `
                  <option value="${item.id}" ${item.id === state.scenarioId ? "selected" : ""}>${item.label}</option>
                `).join("")}
              </select>
            </label>
            <label>
              <span>Weighting</span>
              <select id="preset" class="control">
                ${[...Object.keys(WEIGHT_PRESETS), CUSTOM_PRESET].map((preset) => `
                  <option value="${preset}" ${preset === state.preset ? "selected" : ""}>${preset}</option>
                `).join("")}
              </select>
            </label>
            <button id="reset" type="button">Reset demo</button>
          ` : `
            <p class="quiet">Build a comparison with your own options, then inspect the same scoring trace and caveats used for the demos.</p>
          `}
        </aside>
      </section>

      ${state.view === "build" && !showResults ? renderBuildWorkflow() : ""}

      ${showResults ? `
      <section class="layout">
        <div class="stack">
          ${state.view === "build" ? `
            <section class="panel compact-panel">
              <p class="panel-title">Custom comparison</p>
              <p class="quiet">These inputs came from the guided workflow. You can still edit fields below and adjust weights in the result panel.</p>
              <div class="workflow-actions">
                <button type="button" class="secondary-button" data-intake-back="review">Back to review</button>
                <button type="button" data-view="demo">Explore demos</button>
              </div>
            </section>
          ` : ""}
          <section class="panel">
            <div class="section-head">
              <div>
                <p class="panel-title">Compared options</p>
                <p class="quiet">Edit any input to test sensitivity. The engine clamps values to defined ranges and marks edited fields as You entered.</p>
              </div>
            </div>
            <div class="option-grid">
              ${result.options.map((option) => renderOption(option, mode)).join("")}
            </div>
          </section>

          <section class="panel">
            <p class="panel-title">Rule-check detail</p>
            <div class="rule-grid">${renderCaveatPanel(result)}</div>
          </section>

          ${renderEngineTrace(result)}
        </div>

        <aside class="stack">
          <section class="panel verdict">
            <span class="confidence ${confidenceClass(result.confidence)}">${result.confidence}</span>
            <h2>${escapeHtml(result.verdict.headline)}</h2>
            <p>Margin over runner-up: <strong>${result.margin.toFixed(1)} points</strong></p>

            <p class="panel-title">Ranking</p>
            <div class="ranking">${renderRanking(result)}</div>

            <p class="panel-title">Why this scored this way</p>
            <ul class="mini-list">${listItems(result.verdict.reasonsForTop)}</ul>

            <p class="panel-title">Tradeoffs</p>
            <ul class="mini-list">${listItems(result.verdict.tradeoffsForTop)}</ul>

            <p class="panel-title">Runner-up case</p>
            <p>${escapeHtml(result.verdict.runnerUpCase)}</p>

            <p class="panel-title">What could change the result</p>
            <ul class="mini-list">${listItems(result.verdict.flipFactors)}</ul>

            <p class="panel-title">What this cannot verify</p>
            <ul class="mini-list">${listItems(result.verdict.cannotVerify)}</ul>
          </section>

          <section class="panel">
            <p class="panel-title">Weights</p>
            <div class="weight-grid">${renderWeightControls(result)}</div>
            <p class="quiet">Preset weights are normalized to 100. Custom sliders show sensitivity, not preference truth.</p>
          </section>

          ${renderPossibilityEnvelope(result)}
          ${renderValidationWarnings(result)}
        </aside>
      </section>

      <section class="method-grid">
        <article class="panel compact-panel">
          <p class="panel-title">Methodology</p>
          <p>
            Each option is converted into five dimensions: compensation, growth, lifestyle, stability, and mission fit.
            Dimension scores are relative to the current comparison set. A score of 100 means strongest in this set, not objectively excellent.
          </p>
          <p>
            The weighted score is the sum of each relative dimension score multiplied by the selected weighting.
            Rule checks run separately so caveats can reduce confidence even when a weighted average looks attractive.
          </p>
        </article>

        <article class="panel compact-panel">
          <p class="panel-title">Limitations</p>
          <p>
            The tool cannot verify external facts such as team culture, market demand, equity liquidity, manager quality, or true workload.
            It is designed to make assumptions inspectable, not to choose a job.
          </p>
          <p>
            All scenarios are fictional. The useful behavior is the decision structure: relative scoring, explicit caveats, confidence labels, and close-call handling.
          </p>
        </article>
      </section>
      ` : ""}
    </div>
  `;

  syncInputHandlers();
}

render();
