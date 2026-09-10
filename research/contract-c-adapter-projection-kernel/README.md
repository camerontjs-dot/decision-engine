# Contract C Adapter → Policy Projection Kernel Experiment

## Classification

Stacked Draft Research experiment over PR #57. Decision Engine only. No maintained `src/**`, `scripts/**`, `tests/**`, contract, Authorization, execution, release, tag, promotion, or production-default change.

## Question

Can the generic Decision primitive be narrowed to a policy-projection kernel **after** domain-specific authority admission and target resolution, while reproducing the exact maintained Contract-C → Contract-D outputs?

The experiment is motivated by a mismatch exposed by the first two non-CAL experiments:

- the research kernel proved reusable across release qualification and task-result verification;
- maintained Contract-C ingress is stronger because it independently verifies released C authority and upstream Contract-B binding;
- maintained C policies resolve nested proposition/contribution targets rather than only a top-level subject.

Therefore this experiment does not try to make raw ingress generic.

## Candidate layering

```text
raw domain artifact
  -> domain authority adapter
  -> admitted immutable authority
  -> domain target resolver
  -> resolved policy input
  -> generic policy-projection kernel
  -> exact Contract D 1.0.0
```

The generic projection kernel may own only:

1. exact policy identity/version dispatch;
2. generic policy-result normalization (`failed` or `completed/{clear,hold}`);
3. binding already-established input authority, policy, and exact target into Decision state;
4. exact released Contract-D canonical output.

It must not know Contract C, CAL, Contract B, propositions, contributions, release qualification, task-result verification, CI, or GitHub semantics.

## Exact maintained comparison surfaces

Use protected-main Decision Engine lineage `358c2bb20f490bf25e808434394b26a70a16a123`.

Contract C authority:

- release `5fe55f9ed5d0ee9f026ca1b077e9d70ce0487ea1`
- tag `contract-c-v1.0.0`
- tag object `6bd135a948e407212b2e77ec18ac5c402f93565e`
- validator blob `9c75ccfbf2223578a8d1a7bf0c39673b394fbea4`

Contract D authority:

- release `298a1a0f7b7b6d7712e11200d04faec3e1ca169b`
- tag object `6eadd688b482f3c9fce2ce5e7a2841089d852096`

Frozen real-CAL RC1 corpus:

`camerontjs-dot/decision-engine@0e0d14471b0ed24382794244468539a723b8b888`

The experiment compares exact canonical D bytes emitted by maintained policy implementations against research adapter+projection outputs for:

- supported claim → CLEAR;
- unsupported claim → HOLD;
- not-checkable claim → HOLD;
- canonical causal-basis contribution → CLEAR;
- canonical residual contribution → HOLD;
- missing proposition → FAILED;
- missing contribution → FAILED.

## Non-CAL regression controls

The new projection kernel must also reproduce byte-for-byte the prior release-qualification and task-result baseline Decisions when supplied their already-admitted research authorities and policy results. This prevents the adapter refinement from quietly becoming Contract-C-specific.

## Main falsifiers

The boundary hypothesis is weakened/falsified if:

1. projection-kernel code needs Contract C, CAL, proposition, contribution, release, task, CI, or GitHub branches;
2. exact maintained Contract-D bytes cannot be reproduced for the C cases without moving C target/authority semantics into the generic kernel;
3. C-specific adapter fails to preserve exact released C authority-root and expected-B checks;
4. nested target substitution is accepted;
5. missing nested target semantics cannot be represented without generic-kernel domain branching;
6. release/task-result baseline exact D bytes change under the refined kernel;
7. the generic kernel becomes responsible for deciding whether a C proposition is supported or whether a contribution is causal.

## Alternative explanations

A byte-for-byte PASS could still be shallow if the C policy module simply reimplements every maintained policy verbatim. That is acceptable only if the duplication remains **outside** the generic kernel. The experiment is testing architectural boundary placement, not code reduction.

A PASS also does not prove the domain adapters themselves have a common abstraction. Authority admission may legitimately remain contract/domain specific.

## Promotion boundary

Keep Draft. A PASS would support the interface hypothesis `authority adapter -> target resolver -> generic projection kernel`, not maintained extraction. Any production refactor would require a separate minimality/mutation/conformance promotion record.
