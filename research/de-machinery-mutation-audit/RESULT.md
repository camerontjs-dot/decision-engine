# Decision machinery mutation audit result

**Classification:** Draft Research Infrastructure / evaluator-and-regression apparatus audit. No maintained source change, merge, release, tag, promotion, Authorization, or execution is authorized.

## Exact identity

- Decision Engine base: `a4425f8eb47449ff6c683222921bbea9483742e2`
- science head: `b02d175b4566047c05c11a461008b08fcbaf032f`
- Contract C authority: `5fe55f9ed5d0ee9f026ca1b077e9d70ce0487ea1`
- Contract D authority: `298a1a0f7b7b6d7712e11200d04faec3e1ca169b`
- frozen real-CAL evidence: `0e0d14471b0ed24382794244468539a723b8b888`

## Hosted evidence

Push research run `34254493624`: **SUCCESS**.

Job `102156745415`: **SUCCESS**.

Normal repository CI on the same science head, run `34254522194`: **SUCCESS**.

Push artifact:

- `de-machinery-mutation-audit-34254493624`
- artifact ID `10067318223`
- ZIP SHA-256 `22107f20541b6d81fcdde776ab6c72ae71757554ce2e7b2f3b7bf6d8b7d478ad`

## Baseline

Before mutation, the exact unmodified maintained apparatus passed:

- supported-claim Contract C -> D integration;
- causal-basis citation integration;
- exact-authority Decision evaluate CLI integration;
- a supplemental wrong-Contract-C-authority control.

No mutant result is accepted if the unmodified baseline does not first pass.

## Mutation result

Ten load-bearing implementation mutations were injected only into the GitHub runner and restored between cases.

**Maintained integration suite killed 9 / 10 mutants.**

Mutation score for this bounded set: `0.90`.

### Killed by tests already maintained on `main`

1. skip released Contract C validator;
2. skip top-level expected Contract B binding;
3. Policy A ignores result-set execution state;
4. Policy A ignores `reported_verdict`;
5. Policy A ignores exact target content binding;
6. Policy B ignores causal-basis membership and treats residual contribution as deciding;
7. Policy B skips exact claim-evidence-link target binding;
8. runtime lets unknown policy identity fall through to Policy A;
9. canonical-output path skips exact Contract D authority-root verification.

These are not merely documented invariants. For the tested mutants, current maintained tests fail when the implementation violates them.

### Survivor under the maintained integration suite

`M01_skip_contract_c_authority_root_verification`

Mutation: remove `verifyCanonicalAuthorityRoot(contractCAuthorityRoot)` from the shared Contract C ingress.

Observed under the existing maintained tests:

- `tests/contractCToContractD.integration.mjs` -> PASS;
- `tests/contractCBasisCitation.integration.mjs` -> PASS;
- `tests/decisionEvaluateCli.integration.mjs` -> PASS.

Therefore the maintained integration suite did **not** distinguish the correct runtime from one that no longer established exact Contract C checkout/tag/validator identity.

This does not mean the maintained implementation currently lacks the authority check. It does contain the check, and repository workflows also pin/check the exact Contract C authority used during conformance. The result is narrower:

> removing the runtime Contract C authority-root check is not presently caught by the maintained integration tests exercised here.

## Supplemental recent-pressure control

A separate research-only control supplied a non-Git Contract C lookalike root containing copied validator/fixture files.

- baseline maintained implementation -> rejects with `authority_identity_mismatch`;
- M01 with authority-root verification removed -> emits `completed / clear` on the valid supported object.

The supplemental control therefore **kills the surviving mutant**.

This is exactly the distinction between historical/research evidence and maintained regression protection: the missing falsifier is cheap and discriminating, but it is not currently part of the maintained integration suite.

## Interpretation

### Supported

The current maintained CAL Decision apparatus has substantial active regression value. On this bounded mutation set, tests protect:

- released C validation;
- top-level B binding;
- execution-state precedence;
- Policy A headline predicate;
- exact claim target binding;
- Policy B basis discrimination;
- exact citation target binding;
- explicit policy dispatch;
- exact D authority.

### Exposed gap

Contract C **authority-root negative control** is not maintained at the same level. Exact authority is asserted procedurally in conformance workflows, but the runtime fail-closed behavior is not currently regression-tested against a lookalike/wrong C authority root in the maintained suite.

### Not scored as mutants

The following September findings are not counted as surviving mutants because current maintained semantics do not yet claim these requirements:

- C -> B internal-reference index authority from PRs #49/#50;
- producer semantic implementation / producer policy allowlisting from PR #48;
- Policy A generic assessment-stage guard choice from PRs #46/#47.

Those are policy/authority-scope questions, not simple regressions against the current declared implementation.

## Smallest justified follow-up

Before broader DE machinery generalization, the smallest regression hardening supported by this audit is to add one maintained wrong/lookalike Contract C authority-root negative control to the shared Contract C ingress conformance surface.

Separately, PR #50 establishes a candidate for exact B-index-required ingress, but its independent index-identity source remains unresolved and should not be conflated with this regression-only gap.

## Disposition

**APPARATUS SUBSTANTIALLY ACTIVE; ONE CHEAP MAINTAINED FALSIFIER MISSING.**

Do not infer universal mutation adequacy from a 10-mutant sample, and do not promote research-only authority or policy requirements merely to increase a mutation score.
