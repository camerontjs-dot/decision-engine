# Result — Agent-Result Assessment-Authority Kernel

## Disposition

**SUPPORTED FOR CROSS-DOMAIN KERNEL HYPOTHESIS; NOT PROMOTED.**

The exact byte-identical research Decision kernel from the release-qualification experiment consumed a second non-CAL assessment domain, task-result verification, without a kernel edit. The task-result verifier independently assessed the exact frozen PR #52 patch, scope, required regression behavior, and candidate-bound CI/conformance receipts before Decision policy evaluation.

This materially strengthens the hypothesis that the reusable Decision primitive is domain-neutral policy projection over an already-established assessment authority. It does not establish a production generic ingress, producer trust root, or generic assessment contract.

## Exact science identity

- Decision Engine protected-main lineage base: `358c2bb20f490bf25e808434394b26a70a16a123`
- stacked PR #55 result base: `a6328085fc3e634e57133c5e6c5fe4d345fb4d82`
- science head: `d83bd81ae6047b2375828b7b532c738ba243d277`
- decisive push run `34436397236`: **SUCCESS**
- job `102742236343`: **SUCCESS**
- PR-event reproduction `34436409234`: **SUCCESS**
- exact Contract D release: `298a1a0f7b7b6d7712e11200d04faec3e1ca169b`
- artifact `agent-result-assessment-authority-kernel-34436397236`
- artifact ID `10136304579`
- artifact wrapper ZIP SHA-256 `d9331082defdf838d25936390f161fdb87ca98487654d7af2336e8bdbf0509c7`
- packaged evidence TGZ SHA-256 `0d68a381e3a8d4c46a15ea9e2fbe67b99cda4afd43547f081d2c253503ce7bd6`

## Cross-domain kernel identity

The required first-domain kernel identity was:

`sha256:a8bbc96c2c01e4e6ca3bb66f4ce7e4d89b3d0be4098d65cdf71c5b60bf200abb`

The second-domain run observed exactly:

`sha256:a8bbc96c2c01e4e6ca3bb66f4ce7e4d89b3d0be4098d65cdf71c5b60bf200abb`

The workflow independently asserted the file SHA. No kernel change was permitted or observed.

## Frozen task-result specimen

Task ID:

`decision-engine-maintenance-contract-c-authority-regression`

Candidate:

`ff4783aa55e63f3ca098d2f54884b43b96fee31f`

Exact frozen GitHub patch SHA-256:

`sha256:e38ad95df378fb0c368a7ea44d31197cd66e79930d176d969d852bf3f2ac7f1a`

Changed-file scope:

- `tests/decisionEvaluateCli.integration.mjs`

Candidate-bound verification runs:

- repository CI `34430551382`
- contract-first CLI conformance `34430551350`

No autonomous-agent authorship is claimed for this historical candidate. The experiment concerns the semantics of independently verifying a task result, regardless of who authored it.

## Baseline assessment

Assessment authority SHA-256:

`sha256:c846e5b5e8542bfa6f90f03789bf2877aa17bd58f1dbb0398d32902282a317a1`

Outcome:

`task_result_verified`

The producer established this from:

- exact patch identity;
- allowlisted changed-file scope;
- no forbidden runtime-path mutation;
- presence of the required regression-control behavior markers;
- candidate-bound CI success;
- candidate-bound contract-first conformance success.

## Policy discrimination

### Policy A — verified-result continuation

Observed:

- `completed / clear`
- effect `task.dispatch@1`
- reason `verified_task_result_allows_continuation_candidate`
- Contract D SHA-256 `sha256:7421c5b6eeca7f5d340a9a685686eca6650281d330788ac42e92d9bbed48e033`
- exact released Contract-D consumer outcome `candidate_for_authorization`

### Policy B — independently-reviewed-result continuation

Same exact assessment authority and target:

- `completed / hold`
- effect `task.dispatch@1`
- reason `independent_review_not_established`
- Contract D SHA-256 `sha256:2e45f428c836283bf1f64c682f437e3b01e52a624f92149bc987cfdea47748b9`
- exact released Contract-D consumer outcome `hold`

A synthetic independent-review receipt flipped Policy B to CLEAR while Policy A remained CLEAR. The synthetic review is only a sensitivity control, not historical evidence about PR #52.

## Semantic falsifiers

### Required behavior removed while patch identity remains self-consistent

The frozen patch was mutated by replacing the required `authority_identity_mismatch` behavior marker. Patch byte length/hash metadata was then recomputed around the mutated patch before assessment.

Observed:

- exact-patch-identity check still passed for the newly identified mutated patch;
- required-regression-behavior check became adverse;
- assessment outcome became `task_result_adverse`;
- Policy A HOLDed.

This removes the alternate explanation that the adverse outcome occurred merely because the patch digest no longer matched its declared bytes.

### Scope violation

Adding `src/contractCIngress.js` to the changed-file set made scope conformance adverse, overall assessment `task_result_adverse`, and Policy A HOLD.

### CI failure

Changing the candidate-bound CI run conclusion to failure made the assessment `task_result_adverse` and Policy A HOLD.

## Invariance, exactness, and fail-closed controls

Passed:

- irrelevant residual observation preserved Policy A decision core;
- irrelevant residual observation preserved Policy B decision core;
- the residual changed the immutable assessment-authority identity;
- wrong authority digest was rejected before policy;
- wrong target content was rejected before policy;
- unknown policy version was rejected before policy;
- identical Policy A inputs emitted byte-identical Contract D;
- identical Policy B inputs emitted byte-identical Contract D.

## Mechanical comparison with maintained Contract-C path

The cross-domain result does **not** mean the research kernel is a drop-in replacement for maintained Contract-C machinery.

The live maintained C path still owns stronger domain-specific responsibilities:

1. `contractCIngress.js` independently verifies the exact released Contract-C authority root, release tag/commit, and validator blob before policy code can inspect C.
2. It validates the C object under that exact released authority and binds C to expected upstream Contract-B authority.
3. The supported-claim policy resolves/binds a nested proposition target from inside C.
4. The causal-basis policy resolves/binds a nested proposition/contribution target derived from C.
5. Missing nested targets can produce explicit failed Decisions, while malformed/substituted target bindings fail ingress/policy context.

By contrast, the research kernel currently binds exact caller-named assessment bytes plus a top-level subject. It does not establish an external producer trust root and does not resolve nested domain targets.

Therefore the evidence currently favors a layered candidate architecture closer to:

```text
domain-specific authority adapter
  -> validated/admitted immutable authority
  -> domain-specific target resolver/binder
  -> authority-bound policy projection kernel
  -> exact Contract D output
```

rather than `generic raw ingress -> generic Decision`.

## Observed versus inferred

### Observed

- Two non-CAL domains now use the exact same kernel bytes: release qualification and task-result verification.
- Both support different policies over the same exact assessment authority.
- Both retain exact authority/target/policy binding and deterministic Contract-D output.
- The shared kernel has survived a separate mutation audit for its load-bearing integrity seams.

### Inference

The strongest current primitive candidate is an **authority-bound policy projection** after domain-specific authority admission and target resolution.

### Unknown

- how a production system independently establishes acceptable producer/assessment-authority roots;
- the correct typed schema for a generic assessment authority;
- whether richer domains require target projections beyond a top-level subject;
- whether current Contract D effect vocabulary is broad enough;
- whether a more heterogeneous third domain, such as model evaluation or data quality, would still reuse the same kernel.

## Alternative explanations

Both non-CAL domains consume GitHub-like receipts, so they may be more structurally similar than their policy questions suggest. Exact kernel reuse therefore demonstrates cross-domain reuse, not broad universality.

The historical task specimen is also unusually clean and deterministic. Real agent-result verification with partial outputs, multiple changed artifacts, conflicting verifiers, or unverifiable environmental side effects could require a richer assessment authority.

## Next smallest discriminating test

Before maintained extraction, the highest-value next step is an **adapter-interface experiment** against the real maintained Contract-C path:

- leave C authority verification and nested target semantics in a C-specific adapter/resolver;
- route only the already-established, policy-independent projection through the research kernel;
- require exact current Contract-D bytes to remain unchanged for the supported, contradicted, not-checkable, and causal/residual cases;
- mutation-test the adapter/kernel seam.

If exact current outputs cannot be reproduced without moving C semantics into the generic kernel, the proposed boundary is wrong.

A third heterogeneous assessment domain can follow after that.

## Explicit non-claims

This result does not:

- create a generic Assessment Authority contract;
- establish a production trust root for arbitrary assessment producers;
- attribute PR #52 to an autonomous agent;
- promote the research kernel into maintained source;
- change Contract C or the maintained Contract-C Decision path;
- authorize task dispatch, merge, release, or any operational action.

Keep Draft.
