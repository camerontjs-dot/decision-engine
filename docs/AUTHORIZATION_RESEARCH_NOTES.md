# Authorization Research Notes

Status: research handoff notes, not architecture authority

Canonical promoted architecture boundary: `docs/DECISION_AUTHORIZATION_BOUNDARY.md`

## What is already supported

Decision and Authorization are separate interfaces.

A Decision records a deterministic policy conclusion about an exact target under an exact input authority and policy identity.

Authorization separately evaluates whether a particular actor may perform a particular operation in a particular context.

The same Decision may legitimately produce different authorization results under different delegation or approval postures without changing Decision semantics.

The requested action must bind to a typed Decision effect or equivalent policy-specific output. Generic `eligible` / `clear` is not sufficient operational authority.

Execution remains downstream of both and should produce its own receipt.

Evidence:

- Decision Engine PR #14 — one-use-case seam RC0
- Decision Engine PR #15 — cross-use-case RC1
- architecture promotion PR #17
- promoted main commit `f7c3759dfac7ee4be45879b8266b5eb1440530ee`

## Working authorization hypothesis

Authorization is likely the right place for a human/operator-controlled delegation posture.

That posture may determine how much operational freedom a valid Decision buys without changing what the Decision means.

Candidate postures include:

- manual: every consequential operation requires explicit approval;
- supervised: some bounded low-risk operations may proceed automatically, others require approval;
- delegated: pre-approved operation classes may proceed within explicit scope;
- broader bounded autonomy: additional operation classes may proceed under budgets, validity windows, rollback requirements, or independent-verification rules.

These labels are examples, not a promoted vocabulary.

A numeric trust/confidence slider is not currently supported. The stronger working model is explicit delegated-authority controls such as:

- actor class;
- operation class;
- target scope;
- domain/risk restrictions;
- approval requirements;
- independent-verification requirements;
- batch or rate limits;
- validity/expiry;
- revocation;
- rollback requirement;
- permitted side effects.

## Candidate authorization inputs

These are plausible inputs for a successor experiment:

- exact Decision identity/hash;
- actor identity or role;
- requested operation;
- target identity and current hash;
- delegation profile;
- human approval receipt/state;
- operational environment;
- risk/domain classification if this genuinely belongs here;
- validity/currentness of Decision;
- applicable revocation/supersession state.

## Candidate authorization outputs

Do not freeze yet.

Potential minimal outcomes:

- `PERMIT`
- `DENY`
- `REQUIRE_APPROVAL`

Possible accompanying machine-readable reasons:

- actor out of scope;
- requested operation does not match Decision effect;
- target mismatch;
- Decision stale/superseded;
- approval missing;
- delegation profile too narrow;
- domain/risk restriction;
- authorization policy not applicable.

## Open representation question

Do not assume authorization should become another durable contract.

Candidate implementations to compare:

1. persisted immutable authorization contract;
2. policy query / policy-decision-point result;
3. scoped capability or token;
4. human approval record consumed by an enforcement point;
5. combination of transient authorization decision plus durable execution receipt.

The key evaluation question is not which representation is elegant. It is which representation preserves replayability, revocation, scope, human control, and independent verification with the least machinery.

## Load-bearing invariants for future authorization work

1. Changing authorization posture must not rewrite Decision semantics.
2. Authorization may narrow or refuse a Decision but may not silently strengthen its policy conclusion.
3. Actor, operation, and target substitution must fail closed.
4. A weakened or superseded Decision must invalidate or narrow authorization.
5. Authorization-looking fields injected into Decision must not acquire authority.
6. Human approval may grant operational permission without changing the Decision.
7. Execution occurrence is not authorization truth.
8. Replaying an authorization outside its actor/action/target/currentness scope must fail.
9. Any automatic application must be explicitly authorized by the authorization layer, not inferred from Decision success.

## MainFrame use cases worth testing

- source-audit verified/stable state mutation;
- citation use of retrieved knowledge;
- real-task dispatch;
- protected repository mutation;
- research/experiment promotion;
- durable-memory admission;
- tool-use or external side-effect permission.

The first three already supplied cross-use-case evidence for the Decision/Authorization seam.

## Falsifiers / reconsideration triggers

Revisit the promoted seam if future experiments show that:

- actor/delegation semantics are genuinely part of the policy Decision rather than operational authorization;
- authorization cannot be replayed or independently verified without duplicating Decision semantics;
- a separate authorization layer creates an authority ambiguity that cannot be resolved by exact identity binding;
- a capability/enforcement architecture removes the need for a separate authorization decision object entirely.

## Next authorization experiment

Run a representation comparison using one frozen Decision and one real operation class.

Hold the Decision byte-identical and compare at least:

- persisted authorization record;
- transient policy query;
- capability/token.

Test:

- replay;
- revocation;
- target mutation;
- actor substitution;
- approval addition/removal;
- delegation-profile change;
- stale Decision;
- executor restart;
- audit reconstruction.

Promote only the smallest representation that is actually required by those tests.
