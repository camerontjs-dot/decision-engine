# Contract D Minimal Semantic Surface RC2 — Preregistration

Status: frozen before RC2 execution

Parent evidence:

- RC0: A/B/C semantically equivalent on boundary and negative controls.
- RC1: A/B/C semantically equivalent under typed-effect evolution and independent Authorization-consumer tasks.
- RC1 ablation: reason codes were not required for the frozen Authorization task.

## Question

If representation shape is not experimentally discriminated, what is the smallest normative semantic surface justified by the evidence?

## Candidate semantic core

Test this core independent of JSON nesting:

1. `contract_version`
2. `input_authority = {kind, id}`
3. `policy = {id, version}`
4. `target = {kind, id, content_hash}`
5. `evaluation_state = completed | failed`
6. `disposition` present only when evaluation established a conclusion
7. `effect = {type, version, params}` present when the policy conclusion concerns an operation class

Everything else is initially non-normative metadata.

## Discriminators

### D1 Basis/reason codes

Construct two Decisions identical on the core but with different reason codes. If an Authorization consumer changes its result solely from reason codes, it is re-running or extending Decision policy downstream. That is a boundary violation unless the policy explicitly exposes the reason as a machine-semantic effect parameter.

Expected: reason codes are explanatory/audit metadata, not downstream authority.

### D2 Target content hash

Substitute content under the same target id. If D lacks immutable target content identity, an otherwise valid Decision can be replayed against changed content.

Expected: some immutable target-version/content identity is required. The exact mechanism may be hash or an equivalently immutable version id; RC2 tests hash as the candidate.

### D3 Input authority identity

Substitute the upstream authority while preserving the Decision conclusion. Consumer must be able to detect that the Decision is about a different evidence/epistemic input.

Expected: required.

### D4 Policy identity/version

Substitute policy version with identical disposition/effect. Consumer/auditor must retain the policy provenance and Decision identity must change.

Expected: required.

### D5 Evaluation state

Collapse failed evaluation into HOLD. Must fail the established RC0 distinction.

Expected: required.

### D6 Effect parameters versus basis

Move a machine-relevant scope constraint from `effect.params.scope` into `reason_codes`. Authorization consumer must not infer operational scope from reason text/code.

Expected: machine-relevant constraints belong in typed effect semantics.

### D7 Decision id

Test whether a separately stored `decision_id` adds semantic information if canonical object identity/hash already exists.

Expected: a convenience id may exist, but is not part of the minimal semantic core unless an independent consumer requirement falsifies this.

## Selection rule

Because A/B/C survived RC0-RC1, RC2 will not claim nesting as an experimentally supported requirement.

If the semantic core passes and negative controls fail, terminal outcome:

`SEMANTIC_CORE_SUPPORTED_REPRESENTATION_UNDERDETERMINED`

This authorizes a Contract D candidate specification that defines semantics first and chooses a serialization by the smallest conventional representation, while explicitly labeling serialization shape as design choice rather than empirical discovery.

## Promotion remains blocked on

- fresh independent implementation;
- cross-repository consumer conformance;
- canonicalization/validator reproduction;
- apparatus-contracts review.
