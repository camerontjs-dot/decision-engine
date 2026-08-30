# Authority Control Plane Cross-Stage RC0 — Preregistration

Status: frozen before evaluator implementation and example expansion

## Class

Research PR. No production authorization or runtime mutation.

## Live base

Decision Engine `main`: `ff7a0f63e5f7075b192dff04064b950bf7255ffa`

This base already contains the promoted Decision / Authorization boundary and authorization research notes.

Related non-authoritative brainstorm authority inspected:

- `camerontjs-dot/apparatus-contracts` PR #23
- thought-process capture commit `80977b72a63ddd70667ac3270af6cdb8d6fdb802`

## Primary research question

> Can one standing authority model govern heterogeneous pipeline stages through jurisdiction checks while remaining ignorant of their domain semantics and allowing safe autonomy without constant human approval?

## Claim under test

A common authority/jurisdiction evaluator can govern materially different stages using only authority-relevant descriptors:

- actor;
- operation class;
- target class/scope;
- delegation profile;
- currentness/revocation;
- bounded contextual attributes explicitly declared as authority inputs.

The evaluator must not need epistemic scores, evidence-state semantics, Decision reason semantics, or executor outcome semantics to determine jurisdiction.

## Stages

Use four materially different request classes:

1. `assessment.issue` — issue a research assessment;
2. `decision.make` — make a bounded research Decision;
3. `repository.write.docs` / `repository.write.runtime` — execute a repository mutation class;
4. `outcome.verify` — issue an authoritative post-state verification.

These are research operation identifiers, not production vocabulary.

## Frozen authority profiles

Three profiles will be encoded before outcome assertions are tuned:

### manual

All consequential operations require higher authority except explicitly read-like or non-consequential research assessment.

### supervised

Research assessment and bounded research Decisions may proceed; documentation mutation may proceed for an authorized research agent; runtime mutation requires higher authority; independent outcome verification is required for executed writes.

### delegated-research

Research assessment, bounded research Decisions, documentation mutation, and independent outcome verification may proceed automatically within frozen research target scope. Runtime mutation and production-like targets remain outside delegated jurisdiction.

## Required authority outcomes

Illustrative runtime vocabulary for this experiment:

- `IN_JURISDICTION`
- `OUT_OF_JURISDICTION`
- `REQUIRES_HIGHER_AUTHORITY`
- `INDETERMINATE`

Execution is permitted only for `IN_JURISDICTION`.

## Required tests

### Cross-stage reuse

One frozen profile must govern all four stage classes through one common evaluator.

### Mutation/substitution

At minimum:

- actor substitution;
- operation substitution;
- target substitution;
- target class widening from research to protected;
- batch/scope widening;
- expiry;
- revocation;
- unknown operation class;
- unknown actor;
- missing required authority state.

### Independent authority dimensions

Show that the same actor can legitimately be:

- authorized to assess;
- authorized to make a research Decision;
- authorized to write docs;
- unauthorized to mutate runtime;
- unauthorized to verify its own write where independence is required.

### Delegation non-amplification

A delegate may not grant or exercise authority outside the delegator's frozen scope.

### Semantic ignorance

Create paired requests with identical authority-relevant descriptors but different opaque semantic payloads. Jurisdiction result must remain identical.

Create a deliberately semantics-aware negative control that reads an opaque semantic field to permit a protected operation. The negative control must fail the research decision gate.

### Fragmentation negative control

Create deliberately separate per-stage permission tables. Change one standing posture and measure how many independent policy edits are required to obtain the intended cross-stage behavior.

This control should demonstrate duplication/drift pressure, not merely fewer lines of code.

### Human-intervention / bounded-autonomy comparison

Run a fixed workflow suite under manual, supervised, and delegated-research profiles.

Record:

- automatic in-jurisdiction operations;
- higher-authority escalations;
- out-of-jurisdiction denials;
- indeterminate results;
- unauthorized permits.

More permissive profiles are better only if escalation decreases with zero unauthorized permits on the frozen protected cases.

### Outcome verification seam

Model execution and observed post-state separately.

Required cases:

- execution authorized + observed success;
- execution authorized + observed failure;
- execution authorized + partial/unknown post-state;
- executor reports success + independently observed failure;
- executor attempts to verify own write where independent verification is required;
- authorized independent verifier reports the observed state.

Authorization must not manufacture successful outcome truth, and executor self-report must not override observed state.

## Decision gate

Primary disposition may be `SUPPORTED FOR PROMOTION` only if all are true:

1. one common authority profile/evaluator governs all four stage classes;
2. semantic payload mutations do not change jurisdiction when authority descriptors are unchanged;
3. actor/action/target/scope/currentness substitutions do not yield false permits;
4. unknown authority state never becomes an implicit permit;
5. delegation cannot amplify authority;
6. delegated-research reduces higher-authority escalations versus manual while preserving zero false permits on protected cases;
7. outcome verification remains independent of execution authorization and executor self-report in the required controls;
8. the semantics-aware negative control fails;
9. the fragmented control demonstrates materially higher coordination burden or drift susceptibility under the same posture change;
10. ordinary repository CI remains green.

If the common evaluator requires domain semantic interpretation to pass, disposition is `FALSIFIED` for the semantic-ignorance claim.

If results are mixed or the synthetic operation set is insufficient to discriminate the architecture, disposition is `INCONCLUSIVE`.

## Explicit non-claims

This experiment does not establish:

- Contract E 1.0.0;
- that authority must be persisted;
- production authorization vocabulary;
- production actor identities or roles;
- automatic MainFrame mutation;
- a universal permission system;
- that every stage in every future pipeline fits the common evaluator;
- that Decision Engine should own production authority policy;
- correctness of CAL or Contract D semantics;
- that independent human verification is always required.

## Controlled variables

- production source files remain untouched;
- existing Gate and Select/Rank behavior remains untouched;
- Decision semantics are represented only by opaque identifiers/payloads and are not interpreted by the target evaluator;
- no external side effects are executed;
- all execution/outcome behavior is simulated as frozen research state transitions;
- failed controls/deviations will be preserved in results.
