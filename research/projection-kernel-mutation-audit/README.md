# Projection Kernel Mutation Audit

## Classification

Stacked Draft Research experiment over PR #58. Decision Engine only. No maintained `src/**`, `scripts/**`, `tests/**`, contract amendment, Authorization, execution, release, tag, promotion, or production-default change.

## Exact subject

- PR #58 terminal record head: `00251c6d01a45f6cb14fc3d8ac4c7a4fb566f57c`
- PR #58 science head: `33f39e88f0f94a13afe740d087e4896247695f79`
- projection kernel SHA-256 from decisive run: `sha256:e12d53020b3a6a046f4ee7688db0a5ea5c5e0a63e758b1c1e5711e7b227759e3`
- exact Contract D authority: `298a1a0f7b7b6d7712e11200d04faec3e1ca169b`

## Question

Do the current tests around the proposed post-admission, post-target-resolution projection seam actually kill faults in the responsibilities we are claiming are generic?

This audit tests only the proposed generic layer. It does not retest Contract-C admission, Contract-B binding, CAL semantics, release-qualification semantics, or task-result semantics.

## Claimed generic responsibilities under pressure

1. exact policy identity/version dispatch;
2. strict policy-result normalization;
3. FAILED cannot carry an effect;
4. completed CLEAR/HOLD must carry a typed effect;
5. exact already-established input-authority identity is preserved into Contract D;
6. exact already-resolved target is preserved into Contract D;
7. metadata remains descriptive and cannot silently become decision authority inside the kernel;
8. output is validated/canonicalized under exact released Contract D authority;
9. the kernel remains free of domain vocabulary.

## Preregistered mutants

- M1 unknown policy silently falls back to an available evaluator;
- M2 FAILED policy result carrying an effect is accepted;
- M3 completed CLEAR/HOLD without an effect is accepted;
- M4 policy metadata silently flips a CLEAR result to HOLD;
- M5 kernel substitutes the bound input-authority immutable identity while preserving a structurally valid Decision;
- M6 kernel substitutes the resolved target content hash while preserving a structurally valid Decision;
- M7 exact Contract-D canonical/authority validation is bypassed and raw JSON bytes are emitted;
- M8 malformed completed disposition is coerced to HOLD rather than failing;
- M9 generic kernel gains an explicit domain branch token and must fail the static neutrality guard.

## Primary falsifier

If any mutant survives without a demonstrated redundant downstream control, the seam is not yet sufficiently supported for maintained extraction.

A mutation that is caught only because exact Contract D independently rejects the malformed output may be classified as `SURVIVED_KERNEL_REDUNDANT_DOWNSTREAM` rather than counted as unexplained, but the distinction must be explicit.

## Alternative explanations

A clean mutation score does not prove the seam is the right abstraction. The tests could still be overfit to the tiny synthetic admitted authority used here. That is why the next independent discriminator, if this audit passes, is a third materially heterogeneous authority domain that does not reuse the existing assessment-authority envelope.

## Stop rule

Do not edit the subject kernel to make mutants easier to kill. Preserve unexplained survivors. A green run is evidence about test discrimination only, not production authorization.
