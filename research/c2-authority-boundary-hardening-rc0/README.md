# Contract C2 authority-boundary hardening RC0

## Objective / decision

Determine whether the exact Contract C2 path used by the successful CAL Pipeline smoke still permits internally coherent Contract-B reference or producer-policy substitutions that survive Decision Engine's current C2 ingress, and whether canonical Contract C2 `verify_candidate(...)` would discriminate those substitutions before Decision policy execution.

This is a Decision Engine hardening experiment, not a CAL semantic experiment and not a production promotion.

## Authority

Decision Engine subject:

- stacked base: `b1bcc33e2b5ef0707b8cbf7dd8e821b2d34d1b55` (Draft PR #75 C2 ingress/conformance)
- protected released V1 ancestor: `7be709b2141c767c5da89b8b94cf90233c4238fe`

Contract C2 authority:

- repository: `camerontjs-dot/apparatus-contracts`
- exact promotion head: `b42c827acb0a9fe65353354d709add0e27bab307`
- public candidate version: `2.0.0`
- wire profile: `contract-c-successor-candidate-a-rc2-research`

The experiment uses the exact C2 authority's `verify_candidate(...)` as an evaluator. It does not modify that evaluator after observing results.

## Boundary

In scope:

- current C2 ingress behavior on validator-valid, freshly resealed substitutions;
- exact Contract-B participant-reference verification;
- immutable producer-policy resolver verification;
- whether independently fixed authority inputs discriminate substitutions;
- whether caller-colluding authority inputs can defeat the same canonical verifier.

Protected:

- no changes to `src/**`, `scripts/**`, maintained tests, Contract C2, Contract D, CAL, Authorization, or execution;
- no semantic widening;
- no production merge/release/tag.

## Frozen controls

The synthetic object is deliberately simple and validator-valid. It uses one supported proposition with one causal participant.

Independently fixed research authority inputs:

- exact Contract-B object: version `1.2.0`, bundle ID `bundle-c2-authority-hardening-001`, bundle hash `sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`;
- exact evidence index: `[('src-S1', 'S1')]`;
- exact resolver commit: `43b571464734325277374ee81098553fb7c1b944`;
- exact resolver row: semantic implementation `a902621e8baea3063dddd7f92ba975aade305464`, policy digest `44ecc33519fa8911079595d322f5f0decbf0389af42e153ac32214931798e42c`.

These constants are frozen before execution. They are a research control, not a claim that Decision Engine currently possesses an independent production source for them.

## Preregistered mutations

1. Change the participant and basis-group source ID together, reseal C2, and use a fresh whole-object digest.
2. Change the participant and basis-group passage ID together, reseal C2, and use a fresh whole-object digest.
3. Change the producer resolver commit to another well-formed SHA, reseal C2, and use a fresh whole-object digest.
4. Change the producer semantic implementation SHA to another well-formed SHA, reseal C2, and use a fresh whole-object digest.

For each mutation, the current C2 ingress is expected to remain structurally valid because the object is freshly sealed and retains the same top-level Contract-B identity. The strict verifier is expected to reject the mutation against the independently fixed research authority inputs.

## Main falsifier / collusion control

The same canonical verifier is also run with attacker-colluding authority inputs:

- the mutated evidence index is allowed to name the mutated evidence reference; or
- the independently selected resolver commit / resolver row is replaced to match the mutated producer state.

If these colluding controls pass, that is expected evidence that `verify_candidate(...)` is only as authoritative as the independently established inputs supplied to it. A production hardening change must therefore bind those inputs from an independent upstream authority or derive them from exact Contract-B / resolver artifacts. Merely adding more caller-supplied fields is not sufficient.

## Acceptance / falsification

`SUPPORTED_WITH_BOUNDARY` requires all of:

- baseline current Decision behavior remains CLEAR;
- baseline canonical strict verification passes;
- all four freshly resealed substitutions still pass current structural ingress strongly enough to reach the maintained policy path;
- all four substitutions are rejected by canonical strict verification against fixed authority inputs;
- at least one colluding-authority control passes, demonstrating why input provenance remains load-bearing.

`FALSIFIED` if the strict verifier does not discriminate a preregistered substitution it is supposed to bind.

`INCONCLUSIVE` if a mutation is killed only by an incidental shape/canonicalization defect before the intended authority discriminator.

## Stop

Do not repair the subject or evaluator after the decisive run. Preserve a red result. Any production change requires a separate minimal promotion candidate after this research disposition is recorded.
