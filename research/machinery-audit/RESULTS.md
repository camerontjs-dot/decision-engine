# Decision Engine machinery audit baseline — 2026-08-29

## Scope

Research Infrastructure machinery audit against production base
`cd5a471703e6682b7e8281bc954a135996cac58e`.

This audit does not calibrate production policy and does not authorize a Contract C production adapter.

## OBSERVED

### Existing machinery

The repository contains two materially different heads:

1. **Select/Rank** in `src/decisionEngine.js`, which normalizes alternatives relative to the current comparison set and produces weighted comparative rankings, caveats, confidence labels, and explanatory text.
2. **Gate** in `src/gate/gateHead.js`, which judges one item against named criteria with explicit `pass`, `fail`, and `unknown` outcomes. Blocking unknowns hold rather than reject, blocking failures reject, and operator-only bars remain recommendations.

The repository has Contract C clean-consumer research fixtures/validators but no production Contract C runtime adapter on `main`.

### Hosted execution

Research machinery workflow run: `33274014999` — **SUCCESS**.

Normal repository CI run on the audit PR: `33274015048` — **SUCCESS**.

Machinery audit artifact:
- artifact id: `9720941040`
- artifact digest: `sha256:1341368e4aa23c11f5d5cd2d723e3f90d8294a867ba618ecaea166aebd58036e`

Observed checks:

- existing engine invariant sweep: **81/81 passed**;
- output-quality sweep: **56/56 passed**;
- combination matrix: **6309/6309 passed** across 700 evaluated comparisons;
- Gate unit tests: **14/14 passed**;
- Contract C seam fixture validation: **165 checks across 8 fixtures passed**;
- exhaustive 3-criterion blocking Gate matrix: **27/27 expected decisions**;
- thrown blocking criterion: converted to `unknown` and therefore `hold`, not `reject`;
- six permutations of a non-tied three-option ranking produced the same A > B > C order.

The exhaustive blocking matrix produced:
- promote: 1
- hold: 7
- reject: 19

### Comparison-set sensitivity

The Select/Rank head is explicitly relative to the comparison set.

For the frozen audit options A and B:
- A score: 100
- B score: 0

After adding a dominated option C:
- A score: 100
- B score: 42.45488721804511

The A > B ordering did not change, but B's numeric score changed substantially solely because another alternative entered the set.

## INFERENCE

The current Gate machinery has a strong executable baseline for its bounded semantics. In particular, the crucial epistemic distinction between failure and unknown is preserved under exhaustive combinations and thrown evaluators.

The Select/Rank machinery is operationally robust under its existing sweeps, but its scores are **context-relative**, not absolute measurements. Numeric scores from different option sets must not be compared as though they were on a stable external scale.

The current repository therefore should not be treated as one generalized Decision Engine. The Gate head and Select/Rank head solve different decision problems and have different invariants.

## HYPOTHESES

- The Gate head is the more natural downstream primitive for CAL/Contract C because its unknown/failure semantics align with the pipeline's epistemic constraints.
- A real Contract C adapter can likely be added without changing Gate semantics, but this remains unproven on production inputs.
- The Select/Rank head may be useful for bounded comparative decisions if comparison-set dependence is intentionally accepted and surfaced.

## UNKNOWNS

This audit does not establish:

- correctness of any future production policy/bar;
- calibration of criteria to real regulated decisions;
- a production Contract C adapter;
- stability of Select/Rank numeric scores across changing comparison sets;
- correctness of decisions on live CAL outputs;
- authorization for automatic state mutation.

## NEXT

Smallest useful successor:

**Research-only real Contract C → Gate shadow adapter.**

Freeze a small set of already-existing Contract C 1.0.0 objects and explicit Gate bars, map them through a minimal adapter, and test:

1. Contract C unknown/incomplete execution maps to Gate unknown/hold rather than failure/reject;
2. adverse observations remain adverse only when the bar explicitly defines them so;
3. missing/malformed required state fails closed;
4. operator-only decisions cannot auto-apply;
5. irrelevant Contract C metadata does not change the Gate decision.

Do not generalize the Select/Rank head into the CAL policy path without a separate use-case-specific requirement.
