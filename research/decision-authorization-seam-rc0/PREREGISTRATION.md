# Decision–Authorization Seam RC0 — Preregistration

Status: PREREGISTERED BEFORE IMPLEMENTATION / EXECUTION

## Question

Can a downstream authorization layer vary operational permission based on actor, requested action, delegation profile, and target context while consuming one byte-identical frozen decision object?

The experiment tests the architectural hypothesis that a decision object can remain semantically stable while operational authority is assigned separately.

## Hypothesis under test

A Decision object represents the deterministic conclusion of a frozen policy over authoritative inputs. It does **not** itself grant an actor permission to mutate external state.

Authorization is a separate consumer that combines:

- exact Decision object identity;
- actor identity;
- requested action;
- target identity;
- delegation/authorization profile;
- approval state and operational constraints.

## Non-claims

This experiment does not:

- define Contract D 1.0.0;
- establish that the specimen vocabulary is canonical;
- establish a production MainFrame authorization model;
- authorize automatic MainFrame mutation;
- modify Gate semantics;
- depend on Contract C adapter RC1;
- establish that one generic authorization layer fits every Decision Engine use case.

## Live authority

- Decision Engine main: `cd5a471703e6682b7e8281bc954a135996cac58e`
- MainFrame Live main: `cf216d90251586f2b4976e0240a427bc439fe9bf`

MainFrame evidence motivating this experiment:

- `10_knowledge/AGENTS.md`: stable/audited states must be earned.
- `.context/workflows/audit-sweep.md`: needs-audit may become audited/verified/disputed only after governed review.
- `EPISTEMIC_STANCE.md`: stable is never granted from LLM output alone.
- `mindgraph/src/mindgraph/query.py`: citation use distinguishes citable, unverified, and not_citable.
- Decision Engine `src/gate/gateHead.js`: recommendations are separate from application.

## Frozen decision specimen

Path: `research/decision-authorization-seam-rc0/fixtures/decision.json`

Expected raw SHA-256:

`8826c8ab1cde94b9134f137f593032924cc5875cff6099e9ed425e4f1fc6f7a8`

The specimen means only:

> under the frozen source-audit eligibility shadow policy, this exact MainFrame knowledge target is eligible for a verified-state transition.

It is intentionally **not** called a Contract D fixture. It is a research specimen used to test the seam before Contract D semantics are designed.

## Frozen authorization profiles

### manual

No automated mutation is permitted. A matching eligible decision may only produce `REQUIRE_APPROVAL`.

### supervised

For the authorized agent and exact target:

- adding the `verified` tag in a low-risk domain may be `PERMIT`;
- promotion to `status: stable` requires approval;
- high-risk domain mutation requires approval.

### delegated-low-risk

For the authorized agent and exact target:

- adding `verified` in a low-risk domain may be `PERMIT`;
- promotion to stable remains `REQUIRE_APPROVAL`;
- actor mismatch, target mismatch, stale/superseded decision identity, or unrecognized decision semantics are `DENY`.

No profile permits a mutation when the decision disposition is `hold` or `blocked`.

## Preregistered cases

| Case | Decision bytes | Profile/context change | Expected authorization |
| --- | --- | --- | --- |
| A | frozen | manual + add verified | REQUIRE_APPROVAL |
| B | same frozen bytes | supervised + low-risk + add verified | PERMIT |
| C | same frozen bytes | supervised + high-risk + add verified | REQUIRE_APPROVAL |
| D | same frozen bytes | delegated + stable promotion | REQUIRE_APPROVAL |
| E | same frozen bytes | delegated + unauthorized actor | DENY |
| F | same frozen bytes | delegated + target mismatch | DENY |
| G | weakened decision only | supervised otherwise same | DENY |
| H | frozen | decision identity marked superseded | DENY |

## Invariants

1. **Decision invariance:** cases A–F and H must consume the exact same decision bytes and SHA.
2. **Authorization variability:** A, B, and C must differ in authorization outcome without any Decision byte change.
3. **Monotonicity:** weakening the Decision from eligible to hold/blocked must never broaden authorization.
4. **Actor/action scope:** authorization may differ when actor or requested action differs while Decision remains unchanged.
5. **No authority smuggling:** authorization-like extra fields inside the Decision specimen must not acquire authority.
6. **No mutation:** the harness produces authorization records only; it performs no MainFrame write.

## Falsifiers

Primary hypothesis is **FALSIFIED** if any of the following is observed:

- operational permission cannot vary without changing the Decision object;
- authorization logic must reinterpret upstream epistemic evidence to decide permission;
- an actor/target/action mismatch still produces PERMIT;
- a weakened/held Decision produces broader authority than the eligible specimen;
- an authorization-looking field injected into the Decision changes operational permission;
- authorization execution mutates MainFrame or another external state.

## Possible terminal dispositions

Use project research dispositions only:

- SUPPORTED FOR PROMOTION
- FALSIFIED
- INCONCLUSIVE
- SUPERSEDED

A supported result would authorize only a successor Contract-D/authorization-boundary design experiment, not production authorization machinery.
