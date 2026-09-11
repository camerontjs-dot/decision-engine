# Contract C execution, assessment, and determinism pressure

## Classification

Draft Research Infrastructure / bounded Decision Engine consumer experiment. No maintained source changes, production promotion, Authorization, or execution.

## Exact authorities

- Decision Engine base: `a4425f8eb47449ff6c683222921bbea9483742e2`
- Contract C release: `5fe55f9ed5d0ee9f026ca1b077e9d70ce0487ea1`
- Contract D release: `298a1a0f7b7b6d7712e11200d04faec3e1ca169b`

The released canonical Contract C fixture is used as the source object. This experiment tests consumer semantics only and does not claim current CAL producer reachability for the constructed valid variants.

## Questions

1. Do schema-valid `failed`, `incomplete`, and `not_checkable` execution states dominate headline verdict and contribution state so no positive Decision leaks through?
2. Are identical exact inputs deterministic through maintained Decision evaluation and exact Contract D canonicalization?
3. Does stale target replay against a changed exact Contract C authority recompute the Decision rather than reusing the prior positive disposition?
4. What happens when Contract C remains `completed / assessed / supported` while one or more generic assessment stages are validly `adverse` or `failed`?

## Pre-registered expectations

### Execution precedence

For both maintained policies, result-set `failed` or `incomplete` must HOLD before proposition semantics. Proposition `failed` or `incomplete` must HOLD before completion/verdict/basis semantics. `completed / not_checkable` must HOLD before headline verdict or basis membership.

A previously CLEAR citation target replayed against an exact result-incomplete Contract C object may retain the same logical target projection, but must become HOLD and the emitted Contract D must bind the new Contract C immutable identity.

### Determinism

Repeated evaluation of identical exact Contract C bytes, expected digest, expected Contract B binding, policy context, and exact Contract C/D authorities must yield byte-identical canonical Contract D.

Reordering JavaScript object insertion order in an otherwise identical decision context must not change canonical Contract D bytes.

Pretty-printed/noncanonical Contract C JSON must fail exact Contract C validation even if the caller supplies the new whole-object digest.

### Assessment-state discriminator

Policy B explicitly documents that assessment-stage values are outside its causal-basis citation predicate, so a basis citation is expected to remain invariant to those fields when all policy preconditions still hold.

Policy A's maintained rule is narrower than Contract C's state vocabulary: `result completed + proposition completed:assessed + reported_verdict == supported -> CLEAR`. This experiment does not assume whether allowing CLEAR when eligibility/semantic/aperture/temporal assessment is adverse is desirable. It records the observed behavior as a policy-scope result requiring governance interpretation rather than silently treating it as either a bug or a success.

## Falsifiers

- failed/incomplete/not-checkable execution reaches CLEAR;
- stale exact target replay preserves CLEAR across an execution-authority change;
- identical exact inputs yield different Contract D bytes;
- noncanonical Contract C bytes pass exact canonical ingress;
- observed assessment-state behavior differs across identical repeats or is hidden by the receipt.
