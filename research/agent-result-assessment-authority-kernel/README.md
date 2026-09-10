# Agent-Result Assessment-Authority Kernel Experiment

## Classification

Sibling stacked Draft Research experiment over PR #55. Decision Engine only. No maintained source, contract, Authorization, task execution, release, tag, merge, or production-default change.

## Dependency

The experiment reuses the **exact research kernel bytes** from PR #55 without editing `kernel.mjs`.

Required kernel SHA-256 from the first non-CAL science run:

`sha256:a8bbc96c2c01e4e6ca3bb66f4ce7e4d89b3d0be4098d65cdf71c5b60bf200abb`

If this domain requires a kernel edit, the cross-domain primitive hypothesis is weakened.

## Question

Can the exact same authority-bound Decision kernel consume a second genuinely non-CAL assessment domain: an independently produced **agent/task-result verification authority**?

The verifier asks a different upstream question from release qualification:

> Did the candidate result satisfy the exact assigned maintenance task and its scope constraints, with the required regression behavior and verification receipts?

Decision occurs only afterward.

## Real bounded task specimen

Use maintenance PR #52's pre-merge candidate `ff4783aa55e63f3ca098d2f54884b43b96fee31f`.

Task under verification:

> Add the smallest maintained negative regression control proving a wrong/lookalike Contract C authority root is rejected. Touch only the maintained CLI integration test; do not change Decision runtime or policy semantics.

Observed evidence includes:

- PR #52 changed exactly `tests/decisionEvaluateCli.integration.mjs`;
- the exact GitHub patch adds a caller-selectable Contract C authority root and a negative control using the Contract-D checkout as the wrong C authority;
- the control requires `authority_identity_mismatch`;
- CI run `34430551382` passed;
- contract-first CLI conformance run `34430551350` passed.

The patch text and its SHA-256 are frozen in this branch rather than reduced to an unsupported summary.

## Research assessment producer

The independent verifier must establish all of the following from the frozen packet:

- exact task/result candidate binding;
- changed-file scope conforms to the exact allowlist;
- no forbidden maintained runtime path is changed;
- exact patch hash matches the frozen expected value;
- required regression-control markers are present in the patch;
- CI and contract-first conformance passed on the candidate head.

If all hold, it emits outcome `task_result_verified`. Otherwise it emits `task_result_adverse` and preserves which verification evidence failed.

This is a research assessment authority, not a claim that an LLM agent produced PR #52. The domain under test is **task-result verification**, regardless of who authored the candidate.

## Two policies

### Policy A: continue after verified result

CLEAR `task.dispatch@1` when the assessment is completed, assessed, and `task_result_verified`. Otherwise HOLD.

### Policy B: continue after independently reviewed result

Same as Policy A, plus independently identified review evidence. Baseline is preregistered HOLD because the frozen task-result packet does not contain such a review receipt. A synthetic review receipt is a sensitivity control only and should flip Policy B to CLEAR without changing Policy A.

No task is actually dispatched.

## Falsifiers

- the exact PR #55 kernel bytes have to change;
- kernel domain-vocabulary guard fails;
- task verification requires claim/proposition/evidence-link vocabulary;
- wrong authority/target/policy can still reach an authority-bearing Decision;
- exact patch mutation that removes the regression-control behavior still yields `task_result_verified`;
- adding an irrelevant residual observation changes either policy core;
- synthetic independent-review evidence fails to discriminate Policy B;
- exact Contract D consumer treats baseline HOLD as candidate-for-authorization.

## Alternative explanations

A PASS could be explained by the two non-CAL domains being structurally too similar because both consume GitHub receipts. The experiment therefore proves only **cross-domain reuse of the kernel**, not broad generality. A later model-eval or data-quality domain would be a stronger heterogeneity test.

A PASS also does not solve producer trust-root establishment. Exact assessment bytes are bound, but a production system still needs an independently authoritative way to identify the acceptable producer/assessment authority.

## Promotion boundary

Keep Draft. A PASS would justify refining the candidate interface and perhaps testing a third, more heterogeneous domain. It would not justify merging the generic kernel into maintained `src/**`.
