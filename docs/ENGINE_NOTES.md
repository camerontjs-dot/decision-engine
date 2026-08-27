# Engine notes

These notes describe the decision logic behind the Career Decision Engine. The goal is traceable decision support, not a claim that the tool can identify the objectively correct job or career path.

## Evaluation contract

The main entry point is `evaluateDecision` in `src/decisionEngine.js`.

It accepts:

- `mode`: `job-offers` or `career-paths`
- `options`: compared offers or paths
- `weights`: user-selected or preset dimension weights
- `editedFields`: optional provenance markers for fields changed in the UI

It returns:

- sanitized inputs
- raw dimension values
- relative dimension scores
- weighted contributions
- caveats
- ranking
- confidence label
- verdict copy
- validation warnings
- methodology notes

The UI renders from this returned object. It does not recalculate the decision result.

## Guided intake layer

The guided workflow lives above the engine. It does not introduce a second scoring system.

Relevant files:

- `src/intakeModel.js`: mode copy, option defaults, field order, user-option construction, and intake warnings
- `src/weightCalibration.js`: tradeoff questions and derived starting weights
- `src/app.js`: workflow state and rendering

Workflow:

1. User chooses `job-offers` or `career-paths`.
2. User names two or three options.
3. User enters guided inputs for each option.
4. User answers tradeoff questions.
5. The calibration helper derives normalized weights.
6. The review step shows derived weights, assumptions, and cannot-verify items.
7. The app calls `evaluateDecision` with the user-entered options and derived weights.

The result still uses the same relative scoring, rule checks, caveats, confidence policy, and engine trace as the built-in demo scenarios.

The app does not store or transmit entered data. The workflow is local to the browser session.

## Scoring pipeline

1. Clamp inputs to defined ranges.
2. Normalize weights to 100.
3. Convert each option into raw dimension values.
4. Convert raw values into relative scores within the current comparison set.
5. Calculate weighted contribution per dimension.
6. Sum weighted contributions into the final weighted score.
7. Sort options by weighted score.
8. Run rule checks.
9. Assign confidence based on margin and caveats.
10. Generate calibrated explanation copy.

## Dimensions

Every option is expressed as five dimensions:

- compensation
- growth
- lifestyle
- stability
- mission fit

Scores are relative, not absolute. A dimension score of `100` means strongest among the compared options on that dimension. It does not mean objectively excellent.

## Job-offer formulas

```text
total cash = base salary + target bonus
equity cap = total cash * 0.25
capped equity = min(annualized equity estimate, equity cap)

compensation raw = total cash + capped equity
growth raw = scope * 0.40 + mentorship * 0.35 + brand signal * 0.25
lifestyle raw = PTO days * 0.20 + remote flexibility * 4 + (5 - onsite days) * 6 + (10 - workload intensity) * 4
stability raw = stability
mission raw = mission fit
```

Equity is capped so an uncertain equity number cannot dominate the compensation score without a visible caveat.

## Career-path formulas

```text
compensation raw = near-term earnings * 0.55 + upside potential * 0.45
growth raw = skill compounding * 0.45 + optionality * 0.35 + network/brand * 0.20
lifestyle raw = autonomy * 0.45 + lifestyle sustainability * 0.55
stability raw = stability - downside risk * 0.45
mission raw = mission fit
```

Downside risk reduces stability. It does not directly reduce growth or compensation because the tool separates upside claims from risk checks.

## Relative scoring

```text
relative score = (value - set minimum) / (set maximum - set minimum) * 100
```

If every option has the same raw value, the relative score is `50`. This avoids fake separation when the inputs do not distinguish the options.

For lower-is-better fields, the raw formulas reverse the burden before relative scoring.

## Weighted score

```text
weighted score =
  compensation relative score * compensation weight +
  growth relative score * growth weight +
  lifestyle relative score * lifestyle weight +
  stability relative score * stability weight +
  mission relative score * mission weight
```

Weights are normalized to 100 before scoring. If all weights are zero, the engine falls back to the Balance First preset and returns a validation warning.

## Rule checks

Rule checks are explicit caveats. They do not silently rewrite the weighted score.

Job-offer rule checks include:

- low cash tradeoff
- equity concentration
- commute drag
- burnout risk
- thin upside

Career-path rule checks include:

- low cash tradeoff
- burnout risk
- thin upside
- fragile stability
- autonomy tradeoff

Each caveat has:

- id
- label
- severity
- dimension
- message

## Confidence policy

The engine labels the result as `Clear lead`, `Slight edge`, or `Close call`.

Policy order:

1. `Close call` if the top-two margin is below 5 points.
2. `Close call` if the top option has two or more major caveats.
3. `Close call` if the comparison has three or more major caveats and the margin is below 10 points.
4. `Slight edge` if the top-two margin is 5-10 points.
5. `Slight edge` if the top option has one major caveat.
6. `Clear lead` if the margin is above 10 points and the top option has no major caveats.

Close-call output must say that the tool cannot cleanly separate the top options under the current weighting.

## Validation posture

The tests focus on decision-system behavior:

- score ranges stay bounded
- weighted contributions add back to the final score
- ranking is sorted
- zero weights fall back safely
- out-of-range inputs are clamped
- caveats trigger under expected conditions
- close calls avoid fake certainty
- generated explanations avoid missing or undefined values
- guided user options can be evaluated by the same engine
- derived weights normalize to 100
- preference answers shift the intended dimensions
- broad job-offer and career-path matrices preserve calibrated output across preset and derived weights

The point is not perfect modeling. The point is a small system that makes its assumptions, limits, and failure modes inspectable.
