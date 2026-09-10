# Result — Assessment-Authority Kernel Mutation Audit

## Disposition

**PASS WITH REDUNDANCY FINDING.**

All preregistered shared-kernel faults were killed by the existing bounded controls. Two naturally decision-bearing policy faults were also killed. Three policy predicates survived natural producer-generated adverse cases because the upstream assessment producer already encoded the same adverse conclusion; those mutants were exposed only by deliberately inconsistent authority probes.

This supports the candidate generic kernel while simultaneously arguing **against** carrying duplicated domain-assessment semantics into that kernel.

No maintained Decision source changed.

## Exact science identity

- stacked base / PR #55 result head: `a6328085fc3e634e57133c5e6c5fe4d345fb4d82`
- underlying PR #55 science head: `f73b24eaff7c71f19615b6ff2c090306b1f92c96`
- mutation science head: `c9bf2ed863e71d6aab61114881b5fdbe818f7320`
- push research run: `34435972153` — **SUCCESS**
- job: `102740989838` — **SUCCESS**
- artifact: `assessment-authority-kernel-mutation-audit-34435972153`
- artifact ID: `10136165708`
- artifact wrapper ZIP SHA-256: `76bf95046f29835e7c6c6b26c5cc988ef92e6d15493a5b5cc7971d0257afb827`
- packaged evidence TGZ SHA-256: `e27f4b422a660568aa13f4710df6418142d55dca7d1006ef4e515e68a78c93c1`
- exact Contract D authority: `298a1a0f7b7b6d7712e11200d04faec3e1ca169b`

Baseline assessment authority remained:

`sha256:249efd981242fac6938893cde7d34e234953bf03fc4f600bd9fa8d13d3a0cf2f`

## Counts

- total mutants: **10**
- killed by natural/exact controls: **7**
- survived natural controls for explained redundancy: **3**
- unexplained survivors: **0**

## Shared-kernel mutants

All five were killed.

### K1 — authority digest bypass

Mutation removed exact assessment-authority whole-object digest comparison.

Observed under wrong-digest control: mutant did **not** throw. Therefore the existing negative control detects the broken implementation.

Classification: `KILLED`.

### K2 — target-binding bypass

Mutation removed exact subject/target binding.

Observed under wrong target-content control: mutant did **not** throw and would continue to Decision. The target-substitution control therefore detects it.

Classification: `KILLED`.

### K3 — unknown-policy fallback

Mutation silently selected an available evaluator when exact policy identity/version was unknown.

Observed under unknown-version control: mutant accepted the unknown policy instead of failing closed.

Classification: `KILLED`.

### K4 — noncanonical authority acceptance

Mutation removed the canonical assessment-authority byte check.

Semantically equivalent pretty-printed bytes with a correctly recomputed external digest were accepted by the mutant.

Classification: `KILLED`.

### K5 — Contract-D output authority/canonicalization bypass

Mutation replaced exact `canonicalizeContractDWithAuthority` output with raw JSON bytes.

The independent exact Contract-D canonical byte check returned noncanonical (`status 3`).

Classification: `KILLED`.

## Policy mutants

### P1 — remove headline outcome blocker

Natural producer cases:

- required CI adverse -> still HOLD;
- conformance adverse -> still HOLD.

Deliberately inconsistent probe:

- evidence passed but headline outcome manually changed to unsupported -> mutant CLEAR.

Classification: `SURVIVED_NATURAL_REDUNDANT`.

Interpretation: under the current producer, adverse required evidence already co-varies with the headline outcome, while the downstream policy separately rechecks the raw evidence. The headline and raw-evidence predicates provide overlapping protection.

### P2 — remove direct required-CI evidence check

Natural producer cases:

- required CI adverse -> still HOLD;
- required CI missing -> still HOLD.

Deliberately inconsistent probe:

- headline remains supported while CI status is manually changed to adverse -> mutant CLEAR.

Classification: `SURVIVED_NATURAL_REDUNDANT`.

### P3 — remove direct contract-first conformance check

Natural producer cases:

- conformance adverse -> still HOLD;
- conformance missing -> still HOLD.

Deliberately inconsistent probe:

- headline remains supported while conformance status is manually changed to adverse -> mutant CLEAR.

Classification: `SURVIVED_NATURAL_REDUNDANT`.

### P4 — remove independent-reproduction requirement

Baseline production-review policy changed from expected HOLD to CLEAR.

Classification: `KILLED`.

Independent reproduction is therefore naturally decision-bearing for the stricter policy under this authority shape.

### P5 — make residual evidence decision-bearing

Adding the preregistered irrelevant residual changed the mutant's regression policy from CLEAR to HOLD, violating the established invariance.

Classification: `KILLED`.

## Main architectural finding

The mutation audit separates three layers more clearly than the initial PASS did:

1. **generic integrity machinery is load-bearing**: exact authority identity, exact target binding, exact policy dispatch, canonical ingress, and exact Contract-D output;
2. **policy-specific extra requirements can be load-bearing**: independent reproduction changes the stricter policy without changing the upstream qualification headline;
3. **rechecking assessment semantics downstream can be redundant**: headline qualification plus direct CI/conformance checks overlap for all naturally produced adverse states in this experiment.

The third point matters for the primitive search. A generic Decision kernel should not inherit CI/conformance vocabulary, and a production policy should not automatically reconstruct the assessment producer's internal qualification logic merely as defense in depth. If such consistency guarantees are important, they may belong in the assessment-authority contract/validator rather than repeated ad hoc in each Decision policy.

## Evaluator caveat

The inconsistent-authority probes are intentional defense-in-depth tests only. They are not producer-reachability claims. Their purpose is to prove that P1/P2/P3 code is executable and discriminating, while keeping separate the stronger architectural question of whether that duplication should exist at all.

A `SURVIVED_NATURAL_REDUNDANT` result is therefore not a test-suite failure and not automatically a code defect.

## What this supports

The current evidence supports carrying forward a narrow candidate shared kernel with responsibilities approximately limited to:

- exact immutable input-authority binding;
- canonical authority ingress;
- exact target binding;
- exact policy identity/version dispatch;
- generic FAILED/HOLD/CLEAR packaging;
- exact typed effect binding;
- exact Contract-D authority/canonical output.

It does **not** yet support deciding the generic assessment-authority schema or moving the research kernel into maintained source.

## Next discriminating steps

1. Mechanically compare these responsibilities against the maintained Contract-C Decision path and identify true shared machinery versus domain adapters.
2. Run a second non-CAL assessment domain, preferably independent agent-result verification, against the same research kernel.
3. Pressure the authority schema itself for typed-finding sufficiency. Avoid solving this by adding an untyped `state` bag.

## Explicit non-claims

This result does not:

- authorize maintained kernel extraction;
- create a generic Assessment Authority contract;
- reinterpret Contract C;
- prove release-qualification semantics are complete;
- establish that downstream policies should trust every producer headline without validation;
- establish that `task.dispatch@1` is sufficient effect vocabulary for future domains.

Keep this stacked PR Draft.
