# Parent-bound policy dispatch adversarial qualification

**Status:** preregistered test apparatus. This file does not record a result.

## Decision

Determine whether Decision Engine research PR #87's parent-bound maintained-policy dispatch is fail-closed and reconstructable enough to remain a viable research candidate without caller-controlled effect or target substitution.

## Frozen subject

- Decision Engine PR #87 head: `816374379ba7eb23f5bfdadaf203b7e287c052db`
- subject tree: `08a34359d4a177bc17c8de1521d60255bf6ebf82`
- `src/parentBoundPolicyDispatch.js`: `9948b0dba9f77d2ad7c71d74b27d2684985ecc70`
- frozen parent-bound ingress: `83ab34bce30f874111500ed91f2c01421be9f9a0`
- frozen V1 decision policy: `2225f73eb6eefd83609f0ba19e4786d1267dd527`
- frozen V1 materializer: `1562fb29da6679a0cf894e478cbdd4ae16e21a18`
- PR #86 qualified baseline commit: `6cdb59c2ba41779ac954af56dd077574ba090013`

PR #86 and the released V1 policy/materializer are protected. This apparatus must not modify them.

## Exact external authorities

The workflow reuses the exact frozen authorities already used by the PR #86 qualification path:

- PR #85 research record: `679bc619d87b88015730ffce1acadd3d3d6cf1f3`
- parent-bound Contract C: `c5b1d757f3a0ad4f6e2c3f6dbdc2dd2d3c1403ec`
- Contract C RC2 authority: `b42c827acb0a9fe65353354d709add0e27bab307`
- current-CAL resolver: `1d33e0612befcf8016816197c90c062373796df9`
- CAL V1: `e24e405f5336ee024674f39dba97255bb58a2dd9`
- Evidence Bundler: `4e1f6fe00e7c350b28f52bfea14f1f8988847884`
- independent Contract C consumer: `12e7e640b229619501960b1b89cf4716d8d985b3`

## Acceptance evidence

The candidate remains viable only if all of the following are observed:

1. the supported-claim maintained policy remains byte/structure-equivalent to the frozen PR #86 decision path on PIPE01, PIPE02, and PIPE03;
2. the ERS staging policy reconstructs to its exact maintained policy id/version/effect and preserves CLEAR/HOLD behavior from the parent conclusion;
3. direct caller-supplied `effect` and `requested_operation` material fail before Decision emission;
4. unknown policy/version selection fails before Decision emission;
5. a stateful accessor cannot change a validated target before materialization;
6. inherited/prototype registry names cannot select a non-maintained policy or inject an effect.

## Falsifiers

The frozen PR #87 subject is falsified for this boundary if either of these attacks emits a Decision:

- **validation/materialization drift:** the same target object exposes the legitimate root id during validation and an attacker id during later materialization;
- **inherited registry injection:** a policy id such as `constructor` resolves through the registry prototype and emits caller-controlled effect state.

A failure caused only by fixture generation, authority checkout, dependency setup, or test harness malfunction is `INCONCLUSIVE_APPARATUS`, not a subject falsification.

## Boundary

This experiment does not modify or qualify:

- PR #86;
- released Contract D;
- Contract E;
- ERS;
- Authorization;
- execution;
- release or promotion state.

If the frozen subject is falsified, repair belongs in a separately identified successor subject. The adversarial apparatus and first failing run remain unchanged and preserved.
