# Policy A assessment-guard counterfactual

## Classification

Draft Research Infrastructure / policy discrimination experiment. No maintained policy change, merge, release, tag, promotion, Authorization, or execution.

## Exact real CAL baseline

The frozen baseline fixture is the exact child-1 Contract C object generated in Decision Engine Draft PR #41:

- CAL Pipeline integration head: `4b9d69936d8ecdbaac0217561be7a3a821b70522`
- PR #41 decisive workflow run: `34171780593`
- workflow artifact: `cal-de-real-output-pressure-34171780593`
- artifact ID: `10035941867`
- artifact ZIP digest: `sha256:1ed05eb4353405ba6422b3fe410d82de9d5e125c63ff83c5a9d84fb050d208ec`
- exact child-1 Contract C SHA: `sha256:c599e97fd5b4da80ae558d5d57a351fa3b2d37081432013a9dbeaae65a80b5a3`
- proposition: `PIPELINE_SMOKE_001:child:1`
- completion: `assessed`
- reported verdict: `supported`
- all four generic assessment stages: `not_performed`

The fixture bytes are copied verbatim from that artifact and revalidated under exact Contract C 1.0.0 authority in this experiment.

## Why this experiment exists

PR #46 established that maintained Policy A remains CLEAR when a valid `completed / assessed / supported` Contract C object carries explicit generic assessment states including eligibility adverse, semantic validity failed, aperture adverse, temporal adverse, or all four simultaneously.

Contract C 1.0.0 defines no affirmative `performed/favorable` state. Its assessment vocabulary is exactly:

- `not_performed`;
- `performed / unknown`;
- `performed / adverse`;
- `not_applicable`;
- `failed`.

Therefore a policy cannot require a generic affirmative assessment pass without a future contract/producer semantic change.

## Counterfactual policies under test

These are research comparisons only. They are not Contract D policy IDs and do not authorize a maintained change.

### A. Current headline-only policy

Maintain current Policy A semantics:

`result completed + proposition completed/assessed + reported_verdict supported -> CLEAR`

Assessment slots are decision-invariant.

### B. Explicit-negative guard

Preserve the current real CAL `not_performed` baseline as CLEAR, but HOLD if any assessment stage is:

- `performed / adverse`; or
- `failed`.

`performed / unknown` remains CLEAR under this candidate.

### C. Explicit-unresolved-or-negative guard

Preserve current real CAL `not_performed` and explicit `not_applicable` as CLEAR, but HOLD if any assessment stage is:

- `performed / unknown`;
- `performed / adverse`; or
- `failed`.

## Discriminating question

Can either bounded guard close the explicit adverse/failed Policy A surface without changing current real CAL-supported behavior, and is `performed / unknown` the only remaining material policy choice between the two candidates?

## Falsifiers

- the exact real CAL baseline fails Contract C validation;
- either candidate changes the all-`not_performed` real CAL baseline away from CLEAR;
- explicit adverse or failed remains CLEAR under either candidate;
- the two candidates differ on states other than explicit `performed / unknown`;
- maintained Policy A does not reproduce its previously observed assessment invariance.

## Boundary

This experiment does not decide which candidate is normatively correct. It identifies the smallest policy choice and its compatibility with the current real CAL producer shape. Current CAL producer reachability of adverse, failed, unknown, or not-applicable assessment combinations is not claimed.
