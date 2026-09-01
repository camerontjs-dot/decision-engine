# EDR — Bounded Contract C 1.0.0 → Decision → Contract D 1.0.0 production slice

Status: effective only if Decision Engine PR #28 is merged.

## Decision

Maintain one production path from exact Contract C 1.0.0 bytes to Contract D 1.0.0 for one explicit Decision Engine-owned policy:

`decision-engine.contract-c.supported-claim-verification@1.0.0`

The policy question is intentionally narrow:

> May the exact audited claim become a candidate for downstream Authorization of `knowledge.add_verified_tag@1(scope=claim)`?

The policy returns Contract D `completed/clear` only when all of the following are true:

1. the exact Contract C bytes pass the released canonical Contract C 1.0.0 validator;
2. the caller-supplied whole-object SHA-256 matches those exact bytes;
3. the Contract C object binds the exact expected Contract B authority;
4. the exact target proposition exists and the Decision target binds its proposition ID and text SHA-256;
5. the Contract C result-set execution state is `completed`;
6. the target proposition execution is `completed:assessed`;
7. the target proposition `reported_verdict` is exactly `supported`.

Every other **valid** Contract C epistemic state produces Contract D `completed/hold`. The hold reason preserves whether the blocking state was result execution, proposition execution/completion, or a non-`supported` reported verdict.

A valid Contract C object plus a well-formed decision context that names no existing proposition produces Contract D `evaluation.failed`.

Malformed, wrong-version, wrong-whole-object, wrong-Contract-B, target-substituted, or unsupported-policy inputs produce no Decision.

## Authority boundary

The production consumer pins the released Contract C authority:

- repository: `camerontjs-dot/apparatus-contracts`;
- tag: `contract-c-v1.0.0`;
- tag object: `6bd135a948e407212b2e77ec18ac5c402f93565e`;
- release commit: `5fe55f9ed5d0ee9f026ca1b077e9d70ce0487ea1`;
- canonical validator blob: `9c75ccfbf2223578a8d1a7bf0c39673b394fbea4`.

The output is emitted only through the already-promoted `src/contractD.js` producer and is tested against released Contract D authority:

- tag: `contract-d-v1.0.0`;
- tag object: `6eadd688b482f3c9fce2ce5e7a2841089d852096`;
- release commit: `298a1a0f7b7b6d7712e11200d04faec3e1ca169b`.

## Context representation

Contract D 1.0.0 has no separate authority-bearing `context` field. Therefore this production slice does not place decision-semantic context in `metadata` or another unbound payload.

The explicit Decision Engine context for this policy is limited to fields already bound by Contract D:

- exact `policy.id/version`;
- exact target proposition identity;
- exact target proposition content SHA-256.

The expected Contract B binding is an ingress applicability check. It is already bound inside the immutable Contract C object and therefore is not duplicated into Contract D.

Context that would change Decision semantics but cannot be represented through an existing Contract D authority-bearing field is outside this slice. Adding such context would require a separate contract/architecture decision rather than metadata smuggling.

## Why Gate is not on this path

The existing Gate head remains valid for its current use cases and is unchanged.

Gate owns the decision vocabulary `promote | hold | reject`. Contract D 1.0.0 owns `clear | hold` plus `evaluation.failed`. For this single supported-claim verification policy, Gate's extra abstraction and `reject` vocabulary do not add evidence-backed capability.

The smaller production primitive is therefore a deterministic policy function after exact Contract C conformance. This is not a claim that Gate is obsolete or that future Decision policies should avoid Gate.

## Policy semantics are local, not epistemic reinterpretation

This policy deliberately consumes only:

- Contract C result-set execution state;
- target proposition execution/completion;
- target proposition `reported_verdict`.

It does not parse free text, inspect CAL-private traces, reconstruct missing CAL states, or reinterpret contributions, measurements, assessments, terminal branches, or diagnostics.

`CAL supported` does **not** universally mean `clear`. It means `clear` only for the exact policy question above.

`unsupported`, `partially_supported`, `overstated`, `needs_source`, `not_checkable`, future verdict strings, and other valid non-`supported` states remain valid Contract C epistemic inputs and produce `hold` under this policy rather than being treated as malformed input.

## Decision / Authorization firewall

A positive Contract D Decision can establish only `candidate_for_authorization` when consumed under exact applicability.

It does not establish:

- actor authority;
- approval;
- delegation;
- autonomy/trust posture;
- execution permission;
- execution occurrence;
- automatic external mutation.

`knowledge.add_verified_tag@1` is the typed Decision effect being considered by this policy. Applying that effect requires a separate downstream Authorization decision and later execution machinery, neither of which is implemented here.

## Evidence basis

This promotion is supported by existing evidence rather than a new broad research program:

- Decision Engine PR #12: exact Contract C conformance firewall; first green run exposed and then repaired a validation-bypass defect;
- Decision Engine PR #13: frozen real-current-CAL Contract C corpus and adversarial exact-object binding; terminal `CONFORMANT_WITH_LIMITATIONS`;
- Decision Engine PRs #14/#15: Decision/Authorization separation and typed-effect cross-use protection;
- promoted Decision/Authorization EDR;
- Decision Engine PR #26: maintained Contract D 1.0.0 producer;
- released Contract C and D validators/consumers, frozen clean Contract C consumer, and frozen independent Contract D consumer.

PR #28 adds a production-specific cross-repository conformance gate over that evidence.

## Preserved limitation

PR #13 demonstrated a current-CAL `partially_supported` / `numeric_mismatch` state that could not be exported through Contract C 1.0.0 because the corresponding rule attribution was not promoted.

That remains an upstream production-reachability limitation. This slice does not repair it, inspect CAL-private state, synthesize the missing authority, or widen Contract C interpretation.

## Compatibility and rollback

No Contract C or Contract D semantics change. No existing Gate, Select/Rank, career UI, or Contract D producer interface changes.

Rollback is a revert of PR #28. The pre-existing production surfaces remain intact.

## Version decision

No contract or repository version bump is required for this bounded path. The policy itself is explicitly versioned `1.0.0`. Any semantic change to its mapping requires a new policy version rather than a hidden default or metadata change.

## Reconsideration triggers

Open a new bounded work unit if evidence requires any of the following:

1. a Decision policy that depends on authority-bearing context not representable through Contract D 1.0.0 bindings;
2. a second materially different Contract C policy family;
3. policy use of Contract C contributions, measurements, assessments, or other currently ignored fields;
4. a `reject`-like Decision distinction not representable by Contract D 1.0.0;
5. a new registered effect;
6. Authorization, actor, approval, delegation, execution, or mutation semantics;
7. downstream recovery of a CAL state that Contract C 1.0.0 cannot export.
