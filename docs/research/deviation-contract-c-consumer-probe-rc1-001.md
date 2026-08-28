# Apparatus Deviation — Decision Engine Contract-C Consumer Probe RC1-001

**Date:** 2026-08-27  
**Experiment:** Decision Engine RC1 consumer/runtime probe  
**Classification:** research apparatus correction; first-run failure preserved  
**Production impact:** none

## What changed

The first candidate research runtime aggregated any blocking criterion outcome `not_applicable` into an overall policy state of `not_applicable`.

After the first decisive local test run, the runtime was changed so that:

- criterion-level `not_applicable` defaults to non-blocking/ignored for aggregate state;
- only a criterion explicitly marked `notApplicableEffect: "policy"` makes the overall policy result `not_applicable`;
- policy-scope applicability criteria use the terminal effect;
- conditional criteria such as “aperture completeness when required by this destination” do not.

## Why

The first run produced 9 passing tests and 3 failures.

The failures showed that an optional criterion can be inapplicable while the overall decision remains in scope. Treating the whole policy as not applicable was a semantic error in the experimental runtime.

## When discovered

During the first local execution of `tests/contract-c-consumer-probe-rc1.test.mjs`, before the research files were committed to the RC1 branch.

## Could this affect the scientific conclusion?

Yes, if hidden.

The error concerns exactly the unknown/not-applicable semantics the experiment is intended to test. It therefore cannot be treated as a cosmetic harness fix.

The preserved failure strengthened one conclusion:

> `not_applicable` needs scope. Criterion-level non-applicability and policy-level out-of-scope are behaviorally different.

## Invalidated outputs

The first-run aggregate decisions for:

- MainFrame with its aperture criterion disabled by context;
- publication with aperture not required;
- the separate publication-table comparison for the same case

are invalid as candidate-runtime results.

The fixture bytes, policy questions, falsifiers, and intended destination decisions were not changed.

## Goalpost check

The expected behaviors were not rewritten to match the implementation.

The implementation was corrected to preserve the already intended distinction:

- disabled/non-applicable optional check must not block the policy;
- explicit requirement/policy out-of-scope must remain distinguishable from pass, fail, and unknown.

## Subsequent result

After the correction, the same test suite produced 12 pass / 0 fail locally.

GitHub CI remains the authoritative repository-level execution receipt because it exercises the committed files against the actual production Gate implementation.
