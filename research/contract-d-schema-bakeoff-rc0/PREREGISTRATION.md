# Contract D Schema Bake-off RC0 — Preregistration

Status: frozen before candidate execution

Base: `ff7a0f63e5f7075b192dff04064b950bf7255ffa`

Cross-repository research registry: apparatus-contracts issue #22.

## Question

What is the smallest stable Decision output interface that independent consumers can use without reinterpreting upstream epistemic authority or importing Authorization/Execution semantics?

## Frozen semantic corpus

The candidate representations must encode the same meanings:

1. **source audit / clear** — policy conclusion applies to the exact knowledge target and concerns the operation class for adding the audited/verified state; this does not itself authorize an actor to mutate the target.
2. **citation use / clear** — policy conclusion applies to the exact knowledge target and concerns citation/evidence-use eligibility; it does not authorize unrelated operations.
3. **task dispatch / clear** — policy conclusion applies to the exact task target and concerns dispatch eligibility; it does not itself establish actor approval.
4. **completed HOLD** — policy evaluation completed but did not establish clearance for the effect.
5. **evaluation failure** — no policy conclusion was established because Decision evaluation failed.

These meanings are frozen independently of JSON shape.

## Candidates

### A — flat envelope

Common identity fields plus flat `evaluation_state`, `disposition`, `effect`, and `reason_codes`.

### B — structured envelope + typed effect

Common input/policy/target identity plus a `decision` object containing evaluation state, disposition, typed effect, and basis.

### C — common envelope + policy-specific typed payload

Common input/policy/target identity plus a decision state/disposition and a typed policy-output payload whose schema is identified independently.

## Required common semantics

A candidate must make these independently recoverable:

- exact upstream authority;
- exact target;
- exact decision policy/version;
- whether evaluation established a policy conclusion;
- disposition if established;
- policy-specific effect/action class if established;
- bounded machine-readable basis sufficient to distinguish tested unknown/failure reasons.

## Forbidden authority leakage

A candidate must not require these inside Decision:

- actor;
- requested operation;
- human approval state;
- delegation/autonomy profile;
- automatic application permission;
- actual execution/application state;
- idempotency/execution receipt.

Injected forms of these must not acquire semantic authority.

## Tests

### Independent-consumer tasks

Consumers receive only candidate spec + object. They must recover:

- input authority identity;
- target identity;
- policy identity;
- evaluation state;
- disposition;
- effect/action class;
- reason/basis codes.

No Decision Engine implementation access is required for interpretation.

### Field ablation

Remove each semantic field/family in turn and test whether required meaning, substitution safety, or failure distinction is lost.

### Mutations

- target identity/hash substitution;
- policy/version substitution;
- effect substitution;
- cross-use-case replay;
- unknown future disposition;
- unknown future effect/payload type;
- malformed basis;
- additional unknown fields;
- authorization-field injection;
- execution-field injection;
- completed-HOLD ↔ evaluation-failure substitution;
- stale/superseded marker/context where represented externally.

### Metamorphic invariants

- authorization-only context changes MUST NOT change frozen Decision bytes;
- changing Decision policy or its conclusion MAY/MUST change D as semantically appropriate;
- human-readable explanation changes MUST NOT silently alter machine decision semantics;
- canonicalization must be deterministic.

## Negative controls

1. generic `eligible` with no effect/action binding;
2. schema that embeds authorization posture inside Decision;
3. schema that collapses completed HOLD and evaluation failure.

A negative control that passes the same safety/consumer requirements weakens the corresponding claimed requirement.

## Ranking rule

Do not choose by aesthetics or byte count alone.

Prefer the candidate with the smallest **semantic surface** that passes all required consumers and mutations.

If multiple candidates are semantically equivalent and no discriminating test separates them, disposition is `MULTIPLE_SHAPES_EQUIVALENT`, not an arbitrary winner.

## Terminal outcomes

- `CONTRACT_D_SHAPE_SUPPORTED_FOR_PROMOTION`
- `MULTIPLE_SHAPES_EQUIVALENT`
- `CONSUMER_REQUIREMENTS_INSUFFICIENT`
- `SEMANTIC_GAP`
- `FALSIFIED`
- `INCONCLUSIVE`

## Promotion boundary

Even a successful RC0 authorizes only a Contract D shape proposal and successor independent-conformance work.

It does not authorize:

- production Authorization;
- automatic mutation;
- Contract D release;
- apparatus-contracts schema promotion without independent validation/reproduction.
