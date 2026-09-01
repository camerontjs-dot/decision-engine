# Decision Engine

Decision Engine is a decision-support research repository for turning explicit inputs and policy into inspectable recommendations without hiding uncertainty or silently acquiring authority to act.

The repository currently contains **two pre-existing decision heads with different scopes**, plus one maintained bounded Contract C 1.0.0 → Contract D 1.0.0 production path. They should not be collapsed into one maturity claim.

## Current implemented surfaces

### 1. Select / rank head: career comparison

The original application is a browser-based career comparison tool in [`src/decisionEngine.js`](src/decisionEngine.js), with the UI in [`index.html`](index.html) and [`src/app.js`](src/app.js).

It compares fictional job offers or career paths across explicit dimensions, weights, caveats, and confidence rules. The engine is deterministic and separate from the UI. Its tests cover scoring invariants, output quality, and a broad combination matrix.

This head is **domain-specific**. It is not evidence that the weighted career scorer is a general-purpose decision kernel.

A separate public repository, [`career-decision-engine`](https://github.com/camerontjs-dot/career-decision-engine), owns the standalone career-project presentation. This repository retains the implementation as a working baseline and regression surface while broader decision primitives are researched.

### 2. Gate head: one item against a stated bar

[`src/gate/gateHead.js`](src/gate/gateHead.js) implements a smaller reusable primitive for a different question:

> Does this one item clear this explicitly stated bar?

The Gate evaluates named criteria with three outcomes:

- `pass`
- `fail`
- `unknown`

The decision rule is deterministic:

```text
any blocking fail     -> reject
any blocking unknown  -> hold
otherwise             -> promote
```

`unknown` is deliberately distinct from `fail`. A missing or unobserved condition may hold a decision, but it does not manufacture an adverse finding.

The Gate does not use a combined score. It records which criteria passed, failed, or remained unknown, and advisory findings remain visible as caveats.

The implementation is pure: it performs no I/O and resolves no missing evidence. Callers supply observations. Positive outputs are recommendations, not mutations; the returned record carries `requiresHumanApproval` where the policy demands it and always records `appliedAutomatically: false`.

[`src/gate/notePromotionBar.js`](src/gate/notePromotionBar.js) is one concrete MainFrame note-promotion policy built on that primitive. It is an application of the Gate, not proof that its vocabulary is the final general Decision Engine policy model.

### 3. Bounded Contract C → Contract D policy path

[`src/contractCDecision.js`](src/contractCDecision.js) is the maintained production consumer for one explicit policy:

`decision-engine.contract-c.supported-claim-verification@1.0.0`

It accepts exact Contract C 1.0.0 bytes, verifies the released Contract C authority and canonical validator, requires the caller-supplied whole-object SHA-256 and expected Contract B binding, binds an exact proposition target, evaluates the policy, and emits Contract D 1.0.0 through [`src/contractD.js`](src/contractD.js).

The policy question is intentionally narrow:

> May this exact audited claim become a candidate for downstream Authorization of `knowledge.add_verified_tag@1(scope=claim)`?

For that policy only:

```text
result set completed
+ proposition completed:assessed
+ reported_verdict == supported
    -> Contract D completed / clear

any other valid Contract C epistemic state
    -> Contract D completed / hold

valid input + well-formed target context that identifies no proposition
    -> Contract D evaluation.failed
```

Malformed, wrong-version, wrong-whole-object, wrong-Contract-B, target-substituted, or unsupported-policy input does not acquire Decision authority.

A `clear` Decision is **not Authorization**. Under exact Contract D applicability it can become only `candidate_for_authorization`. This repository does not implement the downstream actor/approval/delegation/execution machinery that would be required to apply the effect.

The production path deliberately does **not** route through the Gate head. Contract D 1.0.0 owns `clear | hold | evaluation.failed`; the existing Gate owns `promote | hold | reject`. For this one policy, the smaller supported primitive is a deterministic policy function after exact Contract C conformance. This does not establish that Gate is obsolete or that future policies should use the same shape.

See [`docs/CONTRACT_C_TO_D_PRODUCTION_SLICE.md`](docs/CONTRACT_C_TO_D_PRODUCTION_SLICE.md) for the exact promoted boundary, authority pins, evidence basis, rollback, and reconsideration triggers.

## Contract C and Contract D authority

**Contract C 1.0.0 and Contract D 1.0.0 are canonical and released by [`apparatus-contracts`](https://github.com/camerontjs-dot/apparatus-contracts).**

The maintained path is pinned to the released Contract C authority and emits through the already-promoted Contract D producer. Cross-repository CI rechecks the immutable release identities, released validators/consumers, a frozen independent Contract C consumer, frozen real-current-CAL Contract C evidence, and a frozen independent Contract D consumer.

Relevant records:

- [Contract C 1.0.0 release](https://github.com/camerontjs-dot/apparatus-contracts/releases/tag/contract-c-v1.0.0)
- [Contract D 1.0.0 release](https://github.com/camerontjs-dot/apparatus-contracts/releases/tag/contract-d-v1.0.0)
- [Decision Engine #1: Contract C consumer boundary](https://github.com/camerontjs-dot/decision-engine/issues/1)
- [Decision Engine #13: real-producer Gate shadow research](https://github.com/camerontjs-dot/decision-engine/pull/13)
- [Decision Engine #29: bounded Contract C → Contract D production promotion](https://github.com/camerontjs-dot/decision-engine/pull/29)

The committed [`research/contract-c-seam-shadow/`](research/contract-c-seam-shadow/) and later research records remain evidence, not production interfaces. They preserve the path by which the maintained boundary was tested and narrowed.

The research fixtures and validators do not independently establish CAL entailment or citation truth. They test downstream consumption and policy behavior against supplied, validated epistemic state.

### Preserved upstream reachability limitation

The real-producer RC1 research demonstrated a current-CAL `partially_supported` / `numeric_mismatch` semantic state that could not be exported through Contract C 1.0.0 because the corresponding rule attribution was not promoted.

That remains an **upstream production-reachability limitation**. Decision Engine does not inspect CAL-private state, reconstruct the missing result downstream, or widen Contract C interpretation. The maintained path is therefore narrower than every theoretically possible CAL semantic state.

## Promoted architecture boundary

Research PRs #14 and #15 support one bounded architecture decision:

**Decision and operational Authorization are separate interfaces.**

A Decision is an inspectable policy conclusion about an exact target. Authorization separately combines that Decision with actor, requested operation, approval/delegation context, and operational restrictions.

A generic `eligible` or `clear` disposition is not sufficient operational authority. The requested operation must bind to a typed Decision effect or equivalent policy-specific output. Execution remains downstream and should be recorded separately.

This boundary is preserved by Contract D 1.0.0 consumption: exact `clear` plus exact applicability establishes only `candidate_for_authorization`. See [the Decision / Authorization EDR](docs/DECISION_AUTHORIZATION_BOUNDARY.md).

## Run the current surfaces

### Browser career head

Open:

```text
index.html
```

The browser test page is:

```text
tests/decisionEngine.test.html
```

### Node checks

```bash
node tests/engine.sweep.mjs
node tests/output-quality.sweep.mjs
node tests/combination-matrix.sweep.mjs
node --test tests/gateHead.test.mjs
```

### Contract C shadow fixture check

```bash
node research/contract-c-seam-shadow/validate-fixtures.mjs
```

### Contract C → Contract D conformance

The production integration test is exercised by `.github/workflows/contract-c-to-d-1.0.0-conformance.yml` because it requires exact checkouts of the released Apparatus authorities and frozen external consumers/evidence.

## Repository map

```text
src/decisionEngine.js                    career select/rank engine
src/app.js                               career browser UI
src/gate/gateHead.js                     generic named-criterion Gate primitive
src/gate/notePromotionBar.js             MainFrame-specific Gate policy
src/contractCDecision.js                 bounded Contract C 1.0.0 policy consumer
src/contractD.js                         canonical Contract D 1.0.0 producer

tests/                                   career, Gate, Contract C→D checks
research/contract-c-seam-shadow/         preserved Contract C / Gate research fixtures
docs/CONTRACT_C_TO_D_PRODUCTION_SLICE.md promoted bounded policy/contract EDR
docs/DECISION_AUTHORIZATION_BOUNDARY.md  Decision / Authorization boundary EDR
docs/ENGINE_NOTES.md                     career engine formulas and behavior notes
```

## Boundaries

This repository does **not** currently establish that:

- the career select/rank engine is a general decision engine;
- `promote | hold | reject` is the correct universal action vocabulary;
- `supported` universally maps to `clear` outside `decision-engine.contract-c.supported-claim-verification@1.0.0`;
- every theoretically reachable CAL semantic state is production-reachable through Contract C 1.0.0;
- CAL conclusions directly authorize downstream action;
- Decision Engine implements actor authority, approval, delegation, Authorization, execution, or automatic mutation;
- synthetic or real-producer Contract C fixtures validate CAL semantic correctness;
- a new generalized policy runtime has been established as necessary.

The current useful separation is narrower:

```text
canonical Contract C state
      +
explicit Decision Engine policy + exact target context
      ↓
canonical Contract D Decision
      ↓
separate Authorization authority
      ↓
separate execution
```

## License

MIT.