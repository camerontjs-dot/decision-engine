# Causal Assertion Downstream Jurisdiction RC0 — Preregistration

Date: 2026-09-18

Classification: Draft Research / cross-repository information-sufficiency discriminator.

## Frozen subjects

Decision Engine parent:

`b1bcc33e2b5ef0707b8cbf7dd8e821b2d34d1b55`

Exact C2 authority consumed by that parent:

`camerontjs-dot/apparatus-contracts@b42c827acb0a9fe65353354d709add0e27bab307`

CAL causal-family evidence:

- explicit causal assertion only;
- no causal inference from experiment, statistics, chronology, or observational data;
- Gate-1B exact qualified candidate `3653d4534ba8d6af22a54a593c30cafbd3b75725`.

## Question

Can the current Contract C2 + Decision supported-claim interface preserve the distinction between:

1. an ordinary categorically supported claim; and
2. a claim whose CAL support is bounded to an **explicit source assertion of causality**,

without reopening CAL semantics, parsing proposition text, or relying on producer-private state?

## Frozen evaluator expectation

The current supported-claim policy may legitimately be generic. This experiment does not declare its existing behavior wrong.

Instead, it tests whether a future stronger causal downstream gate has enough normative in-band information to behave differently.

The evaluator requires all of the following observations:

- both structurally supported C2 objects are accepted by exact C2 ingress;
- current supported-claim policy returns CLEAR for both;
- both expose the same terminal/relation/basis grammar;
- exact C2 schema has no proposition-level semantic-jurisdiction field;
- adding such a field is rejected by exact C2 validation;
- current Decision supported-claim context has no semantic-jurisdiction slot and rejects an extra one.

If all are observed, disposition is:

`SUPPORTED_BOUNDED_CAUSAL_JURISDICTION_INFORMATION_GAP`.

That means the distinction is not reconstructable from current normative inputs without a new typed input or a semantic re-audit.

## Falsifiers

The gap is falsified if any current normative field already lets the consumer distinguish the two cases by semantic jurisdiction without relying on opaque IDs, content hashes, raw-text interpretation, or producer-private conventions.

## Non-claims

This does not select a Contract C schema change, a Decision policy change, an external sidecar, or a production field name.

Possible later responses include:

- keep explicit-causal-assertion results out of generic supported-claim Decision flow;
- add a typed jurisdiction/basis marker to a future Contract C profile;
- provide an independently bound external policy/jurisdiction manifest;
- define another fail-closed downstream gate.

No merge, release, production mutation, Authorization, or execution is authorized.
