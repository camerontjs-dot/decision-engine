# Parent-bound policy dispatch hardening successor

**Status:** preregistered successor subject. This file does not record the successor result.

## Prior falsification

The frozen PR #87 subject at `816374379ba7eb23f5bfdadaf203b7e287c052db`, dispatch blob `9948b0dba9f77d2ad7c71d74b27d2684985ecc70`, was falsified by hosted run `36920884928` under preserved research PR #89.

Observed failures:

1. validation/materialization drift emitted target `attacker-substituted-target` after the legitimate target had passed validation;
2. inherited registry lookup accepted policy id `constructor` and emitted caller-controlled effect `caller.smuggled_operation@1`.

The prior failed subject and apparatus are not rewritten.

## Successor claim

A minimal successor can close both fail-closed defects without changing the frozen PR #86 parent-bound Decision path or the semantics of either maintained policy.

## Successor subject

- parent: `816374379ba7eb23f5bfdadaf203b7e287c052db`
- candidate dispatch blob: `d711f05000eb46ed4b0763c1c0bd73056d3d3073`
- repair surface: `src/parentBoundPolicyDispatch.js` only
- protected parent-bound ingress: `83ab34bce30f874111500ed91f2c01421be9f9a0`
- protected V1 policy: `2225f73eb6eefd83609f0ba19e4786d1267dd527`
- protected V1 materializer: `1562fb29da6679a0cf894e478cbdd4ae16e21a18`

The repair makes exactly two semantic-boundary changes:

1. snapshot the caller decision context once before validation and later use, mapping non-cloneable context to `invalid_context`;
2. select maintained policies by exact id/version comparisons instead of prototype-visible object indexing.

## Frozen falsifiers

The successor must fail if:

- a stateful accessor can cause the emitted target to differ from the target that was validated;
- an inherited registry name can emit an unmaintained policy/effect;
- direct caller `effect` or `requested_operation` reaches Decision;
- unknown or wrong-version policies reach Decision;
- `__proto__` or another prototype name is treated as maintained;
- a non-cloneable policy context escapes as accepted Decision input.

## Compatibility requirement

On PIPE01, PIPE02, and PIPE03:

- the supported-claim policy must remain deep-equal to the frozen PR #86 parent-bound Decision output;
- ERS staging must remain supported→clear, contradicted→hold, not_checkable→hold;
- policy id/version/effect must remain exactly reconstructable from maintained policy identity.

Ordinary Decision Engine regression must pass after the adversarial apparatus passes.

## Boundary

This successor does not modify or qualify PR #86, Contract D, Contract E, ERS, Authorization, execution, release, or promotion state.

Allowed terminal states:

- `SUPPORTED_FAIL_CLOSED_DISPATCH_BOUNDARY`
- `FALSIFIED_CANDIDATE_BOUNDARY`
- `INCONCLUSIVE_APPARATUS`
