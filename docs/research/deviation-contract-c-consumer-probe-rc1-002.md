# Apparatus Deviation — Decision Engine Contract-C Consumer Probe RC1-002

**Date:** 2026-08-27  
**Experiment:** Decision Engine RC1 consumer/runtime probe  
**Classification:** frozen-fixture internal-consistency defect, preserved  
**Production impact:** none

## Observation

After the corrected 12/12 local preflight, review of the frozen synthetic fixtures found an internal duplication mismatch in `contradicted`:

- `conclusion.counterevidence_count` = `2`;
- `evidence.counterevidence_count` = `0`.

The current four policy packs read the conclusion-level count and do not read the duplicated evidence-summary count.

## Why the bytes were not silently repaired

The fixture had already participated in the decisive local preflight. Rewriting it without a deviation record would erase an apparatus defect after observation.

The mismatch is therefore preserved in the committed frozen fixture and recorded explicitly.

## Effect on the current experimental conclusions

No current assertion derives its decision from `evidence.counterevidence_count`.

The publication counterevidence criterion reads `c.conclusion.counterevidence_count`, and the `contradicted` SOP result is driven by `c.conclusion.verdict`.

Accordingly, this mismatch is not expected to change the present policy outcomes or Gate-vocabulary findings.

It does weaken any claim that the synthetic fixture set is a canonical or production-ready Contract-C representation.

## New design pressure exposed

Duplicating the same semantic fact in multiple Contract-C locations creates drift risk.

A later Contract-C profile should prefer one of:

1. a single authoritative representation;
2. a clearly derived redundant field with an enforced consistency invariant; or
3. removal of the redundant convenience field.

This is additional evidence for field-level ablation and against copying report conveniences into the canonical result package.

## Required follow-up

Before using this fixture family for promotion evidence:

- resolve the duplicate-field ownership question in the C1 producer/profile;
- regenerate or explicitly migrate the fixture under the chosen rule;
- rerun the consumer suite on the corrected frozen bytes.

This deviation contributes to the final `NEEDS ITERATION` disposition.