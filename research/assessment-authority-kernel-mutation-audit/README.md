# Assessment-Authority Kernel Mutation Audit

## Classification

Stacked Draft Research experiment over PR #55. No maintained `src/**`, `scripts/**`, `tests/**`, contract, Authorization, execution, release, tag, promotion, or production-default change.

## Dependency

This experiment depends on the research-only release-qualification kernel introduced by Draft PR #55. The starting head is the PR #55 result-record head:

`a6328085fc3e634e57133c5e6c5fe4d345fb4d82`

The underlying first-experiment science head remains:

`f73b24eaff7c71f19615b6ff2c090306b1f92c96`

## Question

Do the controls built around the candidate authority-bound Decision kernel actually kill load-bearing implementation faults, and which apparent release-policy predicates are genuinely decision-bearing once the upstream assessment producer is allowed to own assessment semantics?

This audits both the implementation **and the evaluator**. A surviving mutant is evidence that either:

1. the control suite has a blind spot;
2. the mutated behavior is redundant/non-load-bearing under the natural producer contract; or
3. the boundary between assessment and Decision has been drawn incorrectly.

Do not automatically interpret a survivor as a bug.

## Kernel mutants

Preregistered faults:

- **K1 authority-digest bypass:** remove exact whole-object SHA comparison. Wrong external authority digest must no longer be rejected; the negative control should kill the mutant.
- **K2 target-binding bypass:** remove exact subject/target comparison. Wrong target content must reach a Decision; the target-substitution control should kill the mutant.
- **K3 unknown-policy fallback:** silently dispatch an available policy when exact policy identity/version is unknown. Unknown-version control should kill the mutant.
- **K4 noncanonical-authority acceptance:** remove exact canonical-byte equality check. Semantically equivalent but noncanonical authority bytes with a correctly recomputed external digest should be accepted; a new canonical-ingress negative control should kill the mutant.
- **K5 Contract-D authority bypass:** bypass `canonicalizeContractDWithAuthority` in favor of raw JSON output. Exact released Contract-D independent validation/canonical byte comparison should kill the mutant.

K5 is intentionally framed as an output-authority mutation rather than a claim that raw JSON is always invalid. The control must demonstrate loss of exact released Contract-D canonical/authority enforcement, not merely formatting preference.

## Policy mutants

- **P1 remove headline outcome blocker** from the common qualification predicate.
- **P2 remove direct required-CI evidence check**.
- **P3 remove direct contract-first-conformance evidence check**.
- **P4 remove independent-reproduction requirement** from the stricter production-review policy.
- **P5 make irrelevant residual evidence decision-bearing** by HOLDing when any residual evidence exists.

### Important preregistered ambiguity

P2 and P3 may **survive natural producer-generated adverse cases** because the producer itself derives `bounded_qualification_not_supported` when required CI or conformance is adverse/missing. If so, that is not automatically an evaluator failure. It would indicate the policy-level raw-evidence checks are redundant under the current assessment-producer semantics.

The audit will therefore report two layers separately:

1. **natural producer controls**, where the producer must keep the authority internally coherent;
2. **inconsistent-authority probes**, where the authority is deliberately edited to claim a supported outcome while a required evidence item is adverse.

The inconsistent probes test defense-in-depth only. They do not establish that such an authority is validly producible or that Decision should own consistency repair.

This distinction is central to the architecture question: if P2/P3 are only killed by inconsistent-authority probes, the stronger interpretation may be that raw CI/conformance semantics belong upstream and should eventually disappear from the downstream policy rather than be duplicated.

## Falsifiers

The candidate apparatus is weakened if:

- K1-K4 survive their exact negative controls;
- K5 can bypass exact Contract-D authority/canonicalization without the independent D check noticing;
- P4 survives baseline Policy-B HOLD;
- P5 survives the irrelevant-residual invariance control;
- the audit must change the original research kernel/policies to make mutants testable;
- evaluator bookkeeping conflates a naturally redundant predicate with an untested predicate.

## Evidence interpretation

For each mutant record:

- mutation description;
- exact source replacement count;
- natural-control outcome;
- inconsistent-probe outcome when relevant;
- `KILLED`, `SURVIVED_NATURAL_REDUNDANT`, or `SURVIVED_UNEXPLAINED` classification;
- which observation or assertion detected it.

## Promotion boundary

Keep Draft. A strong mutation score supports a second non-CAL domain test and mechanical comparison with maintained Contract-C machinery. It does not authorize extracting the research kernel into maintained source.
