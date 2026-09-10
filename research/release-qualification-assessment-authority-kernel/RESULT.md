# Result — Release Qualification Assessment-Authority Kernel

## Disposition

**SUPPORTED FOR BOUNDED SUCCESSOR PRESSURE; NOT PROMOTED.**

A research-only authority-bound Decision kernel successfully consumed a genuinely non-CAL, non-claim-audit release-qualification assessment authority, applied two distinct policies to the same exact authority and target, and emitted exact canonical Contract D 1.0.0 without domain-specific vocabulary in the shared kernel.

This supports further pressure on the candidate primitive. It does not establish a production generic kernel, a generalized assessment contract, or a Contract C successor.

## Exact science identity

- Decision Engine base: `358c2bb20f490bf25e808434394b26a70a16a123`
- science head: `f73b24eaff7c71f19615b6ff2c090306b1f92c96`
- push research run: `34435642771` — **SUCCESS**
- job: `102740010688` — **SUCCESS**
- PR-event research reproduction on same head: **SUCCESS**
- ordinary repository CI on same head: **SUCCESS**
- exact Contract D release: `298a1a0f7b7b6d7712e11200d04faec3e1ca169b`
- artifact: `release-qualification-assessment-authority-kernel-34435642771`
- artifact ID: `10136054841`
- artifact wrapper ZIP SHA-256: `5e52cb206f6cd88c7a6a8bdc16a228993611f02d3f2f164e93a15a5a0b1afd7c`
- packaged evidence TGZ SHA-256: `2bf79381ef60e91853080ec8485d1c65a650ba308ab5c02dd5753563ed4e8a16`

Research implementation identities from the decisive run:

- kernel SHA-256: `sha256:a8bbc96c2c01e4e6ca3bb66f4ce7e4d89b3d0be4098d65cdf71c5b60bf200abb`
- producer SHA-256: `sha256:8204dd46eb7a2dfc78dea7aa7d83d42826db6935dc37169221d1ffd9225227f5`

## Frozen real baseline evidence

Candidate:

- repository: `camerontjs-dot/decision-engine`
- commit: `ff4783aa55e63f3ca098d2f54884b43b96fee31f`
- base: `a4425f8eb47449ff6c683222921bbea9483742e2`
- tree: `e4c80a4e2b4d5730cc108690d0d319e1094bace1`

Observed qualification evidence:

- CI run `34430551382` passed;
- contract-first Decision evaluate CLI conformance run `34430551350` passed;
- independent reproduction was **not** present in the baseline packet and was not inferred.

Baseline assessment authority SHA-256:

`sha256:249efd981242fac6938893cde7d34e234953bf03fc4f600bd9fa8d13d3a0cf2f`

## Baseline policy discrimination

### Policy A — regression-maintenance review

Observed:

- evaluation: `completed / clear`
- effect: `task.dispatch@1`
- reason: `bounded_qualification_satisfies_regression_review_policy`
- Contract D SHA-256: `sha256:fee869e69b055c1f6dd5dbc39620885f806a191f94d2a3e21cfb70c4952c4dd5`
- exact released Contract D consumer: `candidate_for_authorization`

### Policy B — production-promotion review

Same exact assessment authority and target, stricter policy:

- evaluation: `completed / hold`
- effect: `task.dispatch@1`
- reason: `independent_reproduction_not_established`
- Contract D SHA-256: `sha256:afee96664b435a83423e547f8ab2bc40dd134425adf662344415967de550bfa2`
- exact released Contract D consumer: `hold`

The two policies therefore reached different correct dispositions without changing the upstream assessment authority.

## Sensitivity controls

All preregistered sensitivity controls passed:

- required CI changed to adverse -> Policy A HOLD;
- required CI removed -> Policy A HOLD;
- contract-first conformance changed to adverse -> Policy A HOLD;
- contract-first conformance removed -> Policy A HOLD;
- synthetic independent-reproduction evidence added -> Policy B CLEAR;
- the same synthetic reproduction control left Policy A CLEAR.

The synthetic independent-reproduction row is only a policy-sensitivity control. It is not evidence that PR #52 actually had independent reproduction.

## Invariance control

Adding an irrelevant residual evidence record:

- changed the assessment-authority immutable identity;
- consequently changed exact Contract D bytes through the input-authority binding;
- did **not** change Policy A's decision core;
- did **not** change Policy B's decision core.

Thus semantic policy invariance and immutable authority identity remained distinct.

## Fail-closed controls

Passed:

- wrong external authority digest -> rejected before policy evaluation;
- wrong target content hash -> rejected before policy evaluation;
- unknown policy version -> rejected before policy evaluation;
- repeated identical Policy A input -> byte-identical Contract D;
- repeated identical Policy B input -> byte-identical Contract D.

## HOLD / effect boundary

The experiment also exercised the previously open downstream-facing question about completed HOLD Decisions carrying an effect.

Observed under the exact released Contract D consumer:

- Policy B HOLD validly contains `task.dispatch@1`;
- exact applicability returns `hold`, **not** `candidate_for_authorization`;
- requesting a different operation against that HOLD returns `not_applicable` due to requested-operation mismatch.

Therefore, within Contract D 1.0.0's released consumer semantics, effect presence on HOLD does not by itself confer candidate-for-authorization status.

## Domain-leak falsifier

The shared research kernel was statically checked for domain vocabulary and passed. It contains no branching on CAL, Contract C, release qualification, GitHub workflow names, CI, or conformance semantics. Those meanings remain in the assessment producer and policy implementations.

This is evidence against the alternative explanation that the apparent generic kernel is merely a domain switchboard.

## Interpretation

### Observed

One genuinely non-CAL assessment domain can use the candidate machinery:

`exact immutable assessment authority -> exact target -> exact policy -> FAILED/HOLD/CLEAR -> typed effect -> canonical Contract D`.

The same upstream authority can legitimately yield different downstream policy conclusions. Policy semantics remain outside the generic kernel.

### Inference

This strengthens the hypothesis that the shared Decision primitive is an **authority-bound policy projection**, not a CAL- or Contract-C-specific evaluator.

### Alternative explanations still open

- Release qualification may be unusually easy to fit because its evidence is already discrete and receipt-shaped.
- The research authority schema may be too tailored to this domain despite the kernel itself being domain-neutral.
- `task.dispatch@1` may be sufficient only because both policies were framed as review-dispatch decisions.
- A second non-CAL domain may require richer typed findings and expose that the proposed authority shape is too thin.

### Load-bearing assumption

The experiment assumes assessment semantics are established upstream and that Decision policies should not reconstruct the domain evaluator. If realistic downstream policy repeatedly needs to reinterpret raw evidence rather than consume the assessment state, this boundary is wrong or the assessment authority is underspecified.

## Next smallest discriminating test

Mutation-test the research kernel and both policies as systems under test before extracting anything into maintained code. At minimum, deliberately remove authority binding, target binding, exact policy dispatch, required CI/conformance predicates, and independent-reproduction discrimination and require the existing controls to kill those mutants.

Only after the mutation audit should the candidate kernel be compared mechanically with maintained Contract-C Decision machinery. A second non-CAL domain, preferably agent-result verification, is then the stronger generalization test.

## Explicit non-claims

This result does not:

- create or release a generic Assessment Authority contract;
- change or reinterpret Contract C 1.0.0;
- promote the research kernel or either policy into maintained `src/**`;
- authorize release, merge, task dispatch, or any operational action;
- establish that current Contract D effect vocabulary is sufficient for all assessment-driven decisions;
- establish production release qualification semantics.

Keep the PR Draft.
