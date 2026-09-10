# Release Qualification Assessment-Authority Kernel Experiment

## Classification

Draft Research PR. Decision Engine only. No maintained `src/**`, `scripts/**`, contract, Authorization, execution, release, tag, promotion, or production-default change is authorized by this experiment.

## Exact live base

`camerontjs-dot/decision-engine@358c2bb20f490bf25e808434394b26a70a16a123`

The base was re-read from protected `main` before branch creation.

## Research question

Can the smallest authority-bound Decision machinery inferred from the Contract-C policy dependency work operate over a genuinely non-claim-audit assessment authority, without importing Contract C/CAL vocabulary or adding domain branches to the shared kernel?

The non-CAL domain is bounded **release qualification**. The assessment producer consumes frozen GitHub CI/conformance evidence for the already-completed PR #52 candidate head and emits a research-only assessment-authority value. A generic research kernel then binds exact authority bytes and an exact subject target, dispatches one of two release-qualification policies, and emits canonical Contract D 1.0.0.

This is not a proposal to reinterpret Contract C 1.0.0. Contract C remains normatively CAL-specific.

## Frozen real evidence input

Subject candidate:

- repository `camerontjs-dot/decision-engine`
- candidate head `ff4783aa55e63f3ca098d2f54884b43b96fee31f`
- base `a4425f8eb47449ff6c683222921bbea9483742e2`
- tree `e4c80a4e2b4d5730cc108690d0d319e1094bace1`

Observed GitHub evidence already recorded by merged maintenance PR #52:

- CI run `34430551382`: success; `JavaScript Tests` and `Path & Secret Leak Audit` both success.
- Contract-first CLI conformance run `34430551350`: success; `evaluate-cli-conformance` success, including exact Contract C/D checkout, both maintained policy reruns, fail-closed CLI controls, independent Contract-D consumption, and no-tracked-mutation check.

The experiment does **not** reinterpret the later merge as prerelease evidence and does not invent an independent reproduction that did not exist in this packet.

## Candidate research-only assessment authority

The smallest shape under test contains:

- exact authority version and producer identity;
- exact subject descriptor plus content digest;
- assessment execution and completion state;
- a bounded outcome;
- explicit evidence records;
- explicit causal/basis evidence IDs;
- residual evidence IDs;
- explicit unknowns.

The authority's immutable identity is SHA-256 of its canonical research bytes and is supplied to Contract D as `input_authority.immutable_id`.

This is experimental vocabulary, not a new apparatus contract.

## Two downstream policies

### Policy A: regression-maintenance review dispatch

The policy should CLEAR `task.dispatch@1` only when:

- assessment execution completed;
- assessment completion is assessed;
- outcome is `bounded_qualification_supported`;
- required repository CI passed;
- contract-first CLI conformance passed.

Otherwise it HOLDs with explicit reason codes.

### Policy B: production-promotion review dispatch

The policy requires everything in Policy A **plus independent reproduction evidence**. The frozen baseline packet does not contain such evidence, so this policy is preregistered to HOLD on baseline. A synthetic counterfactual that adds independently identified `passed` reproduction evidence should CLEAR Policy B. That counterfactual is only a sensitivity control and is not a claim that PR #52 had such reproduction evidence.

Both use the already-released `task.dispatch@1` Contract-D effect. Policy identity is required to distinguish which dispatch decision was made. No dispatch or Authorization occurs.

## Candidate shared kernel

The research-only shared kernel may own only:

1. exact canonical assessment-authority byte parsing and external SHA binding;
2. generic authority-shape validation;
3. exact subject-target binding;
4. explicit policy identity/version dispatch;
5. conversion of the policy result into Decision state;
6. canonical Contract-D validation/output under the exact released D authority.

The kernel must **not** know release-qualification evidence IDs, CAL, Contract C, verdict semantics, or what qualifies a release candidate.

## Preregistered falsifiers

The primitive hypothesis is weakened or falsified if any of the following is required:

1. shared-kernel branching on `CAL`, `contract-c`, `release`, `qualification`, GitHub-run names, or another domain identity;
2. claim-audit vocabulary must be used to represent the release assessment faithfully;
3. policy-specific evidence semantics leak into authority/target binding or Contract-D packaging;
4. the two policies cannot produce distinct correct dispositions from the same exact assessment authority without mutating the authority;
5. exact authority or target substitution can still produce an authority-bearing Decision;
6. an irrelevant residual-evidence mutation changes policy disposition/effect/reasons when the policy does not consume that evidence;
7. removing a required CI/conformance basis item fails to change Policy A from CLEAR;
8. adding the preregistered independent-reproduction control fails to change Policy B from HOLD to CLEAR;
9. Contract D 1.0.0 cannot faithfully carry the resulting Decision without inventing a new effect or domain-specific contract behavior.

## Controls

At minimum the hosted run must exercise:

- baseline Policy A CLEAR;
- baseline Policy B HOLD;
- required CI adverse/missing -> Policy A HOLD;
- conformance adverse/missing -> Policy A HOLD;
- synthetic independent reproduction added -> Policy B CLEAR;
- irrelevant residual evidence added -> same policy core, different authority immutable identity;
- wrong authority whole-object SHA -> reject before policy;
- wrong target content hash -> reject before policy;
- unknown policy/version -> reject before policy;
- repeated identical inputs -> byte-identical canonical Contract D;
- exact Contract D authority/canonical validation;
- no maintained source mutation;
- static negative check that the shared kernel contains no domain-specific tokens.

## Alternative explanations to guard against

A PASS could otherwise be explained by a vacuous generic wrapper around domain-specific code. Separating `kernel.mjs` from `releasePolicies.mjs` and scanning the kernel for domain vocabulary is therefore part of the evidence.

A PASS could also be explained by weak or invented release evidence. The baseline uses exact already-observed GitHub run identities and deliberately keeps independent reproduction absent.

A PASS does not establish that this research assessment-authority shape is the right production successor to Contract C, nor that release qualification is fully captured by two CI receipts.

## Load-bearing assumption

The largest assumption is that **assessment semantics should be established upstream**, and Decision should consume the resulting bounded state rather than re-run or reinterpret the domain evaluator. If a useful release policy needs to reconstruct CI semantics inside the shared kernel, this architecture is wrong at this boundary.

## Smaller discriminating test

This experiment is intentionally smaller than proposing a generalized contract. It asks only whether one genuinely non-CAL domain can use the candidate machinery with two policies while preserving exact authority, target, policy, and Contract-D boundaries.

## Promotion boundary

Keep Draft. Even a clean PASS authorizes at most a successor experiment or a narrowly scoped research-kernel extraction study. It does not authorize maintained refactoring, a Contract-C successor, effect-registry expansion, Authorization integration, or release machinery.
