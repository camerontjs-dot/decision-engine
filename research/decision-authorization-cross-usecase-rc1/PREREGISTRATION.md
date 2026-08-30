# Decision / Authorization Cross-Use-Case RC1 — Preregistration

Status: PREREGISTERED BEFORE IMPLEMENTATION / EXECUTION

## Research question

Does one common Decision envelope support three materially different real MainFrame policy questions while keeping actor, requested action, approval state, and delegation context outside the Decision object?

The three pressure-test cases are:

1. source-audit state transition;
2. citation permission;
3. real-task dispatch eligibility.

## Parent evidence

RC0: Decision Engine PR #14, disposition `SUPPORTED FOR PROMOTION`.

RC0 established only that one source-audit Decision could remain byte-identical while authorization varied. RC1 tests whether that seam generalizes across different policy domains.

## Live authority at freeze

- Decision Engine main: `cd5a471703e6682b7e8281bc954a135996cac58e`
- MainFrame Live main: `cf216d90251586f2b4976e0240a427bc439fe9bf`

MainFrame authority surfaces inspected before freeze:

- `.context/workflows/audit-sweep.md`
- `10_knowledge/AGENTS.md`
- `EPISTEMIC_STANCE.md`
- `mindgraph/src/mindgraph/query.py`
- `workstation/server/task-authority.mjs`
- `workstation/server/control-plane.mjs`
- `workstation/plans/unit-9b-mutation-route-containment-and-fixture-dispatch-qualification.md`
- `workstation/plans/unit-9c-first-real-project-canary.md`

## Observed policy distinctions anchoring the cases

### Source audit

MainFrame distinguishes synthesized knowledge from earned `stable` / `audited` status. The audit-sweep workflow permits proposed verified/audited transitions only through governed review, and current stable-status policy remains operator-controlled.

### Citation permission

MindGraph emits machine-readable `citable | unverified | not_citable`. `unverified` remains a nomination rather than evidence; `not_citable` is separated from usable candidates.

### Task dispatch

A reviewed ready task packet nominates task authority but does not itself authorize execution. Real dispatch uses a later explicit approval step and durable receipt chain.

## Hypotheses

### H1 — Common Decision envelope

All three use cases can use exactly the same structural envelope:

- `decision_envelope_version`
- `input.authority_kind`
- `input.authority_id`
- `policy.id`
- `policy.version`
- `target.kind`
- `target.object_id`
- `target.content_sha256`
- `decision.disposition`
- `decision.effect`
- `decision.reason_codes`

Only field values, especially the policy-specific `effect`, may differ.

### H2 — Authorization remains separate

Operational permission can vary using:

- actor;
- requested action;
- exact target;
- approval state;
- authorization profile / delegation context;

without changing the frozen Decision object.

### H3 — Effect is load-bearing

A generic `disposition=eligible` is insufficient by itself. Authorization must bind the requested action to the Decision's policy-specific `effect`; otherwise a Decision for citation could be replayed to dispatch a task or mutate knowledge state.

## Frozen specimens

| Use case | Raw SHA-256 |
| --- | --- |
| source audit | `599945c366c0dfb806afc3bed5be57d5e5fbff62cc1d220077b7caf56e72fe91` |
| citation permission | `11c5e39e18a27f07d1f7b9f7b0e0cef2950a73e6d1adf8af65c781173fd2b895` |
| task dispatch | `9115ff9868101d9e53c2c721901357a4677051029d1f1621233425a05f3c8e9e` |

These are research Decision specimens, not Contract D fixtures and not production MainFrame records.

## Preregistered authorization behavior

### Source audit specimen

- current-manual + agent + `add_verified_tag`, no approval → `REQUIRE_APPROVAL`
- same Decision + valid human approval → `PERMIT`
- same Decision + wrong action → `DENY`
- same Decision + target mismatch → `DENY`

### Citation specimen

- governed-agent + `cite_as_evidence` → `PERMIT`
- same Decision + `mutate_knowledge_status` → `DENY`
- same Decision + target mismatch → `DENY`
- weakened Decision `hold` → `DENY`

### Task-dispatch specimen

- current-manual + agent + `dispatch_task`, no approval → `REQUIRE_APPROVAL`
- same Decision + valid operator approval → `PERMIT`
- same Decision + wrong actor → `DENY`
- same Decision + target mismatch → `DENY`
- superseded Decision context → `DENY`

## Cross-use-case attacks

1. Feed citation Decision to a dispatch request: must `DENY`.
2. Feed task-dispatch Decision to a verified-tag request: must `DENY`.
3. Inject actor/delegation/auto-application fields into a Decision: they must not alter authorization.
4. Remove `decision.effect` from an otherwise eligible Decision: must `DENY`.
5. A deliberately weak consumer that checks only `disposition=eligible` should fail the cross-use-case action-binding test.

## Falsifiers

H1/H2 are falsified if any use case requires actor, requested action, approval state, or delegation profile to become part of Decision semantics merely to express its authorization behavior.

The common-envelope hypothesis is falsified if a materially different Decision structure is required for one of the three cases.

H3 is falsified if safe action binding can be demonstrated without a policy-specific effect or equivalent typed policy output.

## Promotion criteria

Use `SUPPORTED FOR PROMOTION` only if:

- all three common-envelope specimens pass shape conformance;
- exact Decision bytes remain invariant under their authorization-context variations;
- weakened/superseded Decision state never broadens permission;
- cross-use-case action substitution is denied;
- the weak disposition-only consumer demonstrably fails the same substitution test;
- no production Decision Engine or MainFrame machinery is modified;
- ordinary Decision Engine CI remains green.

A supported result authorizes only a bounded architecture promotion:

> Treat Decision and Authorization as separate interfaces, and treat a typed policy effect (or equivalent) as load-bearing in the Decision→Authorization seam.

It does not authorize Contract D 1.0.0 or production authorization.
