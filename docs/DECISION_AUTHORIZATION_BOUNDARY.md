# EDR — Decision / Authorization Boundary

Status: promoted

## Decision

Treat **Decision** and **Authorization** as separate interfaces.

A Decision records a deterministic policy conclusion about an exact target under an exact input authority and policy identity. It does not, by itself, grant an actor permission to mutate external state.

Authorization consumes an exact Decision plus actor/action/context and determines whether a requested operation is permitted, denied, or requires approval.

The requested operation must bind to a typed Decision effect or an equivalent policy-specific action class. A generic `eligible` / `clear` disposition is not sufficient operational authority.

Execution remains downstream of both Decision and Authorization and should produce its own receipt.

## Effective artifact

This EDR is documentation-only. It changes no runtime behavior.

Promotion PR: created from `cd5a471703e6682b7e8281bc954a135996cac58e`.

## Observed evidence

### RC0 — one-use-case seam

Decision Engine PR #14 froze one source-audit Decision and varied authorization profile, actor, action, target context, and Decision currentness.

Observed:

- authorization changed while Decision bytes remained identical;
- wrong actor/action/target narrowed authority;
- weakening Decision narrowed authority;
- authorization-like fields injected into Decision did not acquire authority;
- a deliberately entangled authorization-inside-Decision control could not represent the required context variation without changing Decision.

Primary result: `SUPPORTED FOR PROMOTION`.

### RC1 — cross-use-case pressure test

Decision Engine PR #15 repeated the seam across three materially different MainFrame policy questions:

- source-audit state transition;
- citation permission;
- real-task dispatch eligibility.

All three used one common Decision envelope without actor, requested action, approval state, or delegation profile inside Decision.

A weak consumer that checked only `disposition=eligible` permitted cross-use-case substitution:

- citation Decision replayed as task dispatch;
- task-dispatch Decision replayed as knowledge-state mutation.

The typed-effect consumer denied both substitutions.

Primary result: `SUPPORTED FOR PROMOTION`.

Tested RC1 implementation head: `97576734578801be63fa0a64f4ad7813c2d26126`.

## Inference

The evidence supports an architectural seam, not a production authorization implementation.

The smallest supported ownership split is:

### Decision

- upstream/input authority identity;
- target identity;
- decision-policy identity/version;
- policy disposition;
- typed policy effect or equivalent;
- machine-readable reason/basis information.

### Authorization

- actor;
- requested operation;
- approval state;
- delegation/autonomy posture;
- operational scope and restrictions;
- current permission validity.

### Execution

- action attempt/application;
- idempotency/replay handling;
- execution outcome;
- durable receipt.

## Alternatives considered

### Authorization embedded in Decision

Rejected for the promoted boundary. RC0 showed that authorization context could vary while the semantic Decision remained fixed; embedding actor/delegation authority in Decision unnecessarily couples two independently varying concerns.

### Generic eligible/clear Decision with no typed effect

Rejected for the promoted boundary. RC1's weak control allowed cross-use-case action substitution.

### Separate bespoke Decision schemas for every use case

Not required by current evidence. Source audit, citation permission, and task dispatch all fit one common envelope. Policy-specific payload design remains open.

### Authorization as a specific implementation type

Not decided. Authorization may later prove best represented as a persisted contract, policy query, capability token, approval record, or another enforcement primitive.

## Decision rationale

The promoted seam preserves a stable policy conclusion while allowing human/operator delegation to vary independently.

It also gives downstream enforcement a machine-checkable binding between what was decided and what operation is being requested.

This is the smallest architecture justified by the two experiments.

## What is not established

This EDR does not establish:

- Contract D 1.0.0 field names or enum vocabulary;
- a canonical `effect` representation;
- a production authorization schema;
- that authorization must be persisted;
- automatic MainFrame mutation;
- a universal Decision Engine;
- that every future policy domain fits the same Decision envelope;
- any production change to Gate or Select/Rank.

## Compatibility / migration consequence

No current runtime behavior changes.

Future Contract D design should not place actor-specific delegation or execution occurrence into Decision semantics merely for convenience. Future authorization consumers should bind requested operations to a typed Decision effect or equivalent.

Existing Gate fields such as `requiresHumanApproval` remain historical/current implementation behavior and are not automatically reclassified or removed by this EDR. Any runtime migration requires separate evidence and a separate promotion.

## Residual uncertainty

- exact Contract D representation;
- whether typed effect is an enum or policy-specific payload;
- authorization persistence/provenance model;
- approval representation;
- expiry/revocation semantics;
- cross-system authorization interoperability.

## Reconsideration trigger

Reopen this decision if a real downstream use case:

1. cannot be expressed without actor/delegation semantics inside Decision;
2. requires a materially different Decision envelope;
3. demonstrates that safe action binding does not require typed/equivalent policy effect;
4. shows that the separation creates an unresolvable authority or replay defect.

## Lineage

- Decision Engine PR #14 — Decision / Authorization Seam RC0
- Decision Engine PR #15 — Decision / Authorization Cross-Use-Case RC1
- MainFrame Live authority inspected for RC1: `cf216d90251586f2b4976e0240a427bc439fe9bf`
- Decision Engine base for both experiments: `cd5a471703e6682b7e8281bc954a135996cac58e`
