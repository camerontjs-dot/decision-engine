# Contract C → Gate shadow adapter contract RC0

## Scope

Research Infrastructure only. This adapter may translate exact Contract C state into Gate criterion outcomes under a separately frozen Gate bar. It does not reinterpret evidence, calibrate policy, route through Select/Rank, or authorize automatic production mutation.

Pinned Decision Engine base: `cd5a471703e6682b7e8281bc954a135996cac58e`.

Pinned Contract C authority: `camerontjs-dot/apparatus-contracts@00bdf9546a877f9f6c1d7fd227fd959e1d7aa99e`, Contract C `1.0.0`, normative schema `schema/contract-c/1.0.0/schema.json`, reference validator `validators/contract_c.py`.

The authoritative canonical fixture is `fixtures/contract-c/1.0.0/valid-canonical.json`, whole-object SHA-256 `7a66583e332be4901d13ba9f2d7e12419938c77a41b83223a4b0946ad529b7a1`.

## Authority split

- Contract C owns factual/epistemic/result representation.
- The pinned Contract C validator owns exact Contract C conformance.
- The Gate bar owns the downstream acceptance policy.
- The adapter owns only deterministic typed extraction and translation.
- Shadow mode owns no operational authority. `automaticApplicationPermitted` is always false.

A validator failure is not adverse subject-matter evidence. It is a consumption failure and therefore produces Gate `unknown`/`hold` through the conformance criterion.

## Deterministic source kinds

| Source kind | Exact source fields | Allowed source states | Missing | Malformed |
| --- | --- | --- | --- | --- |
| `contract_conformance` | validation receipt validity + pinned authority identity | `valid`, `invalid`, `unverified` | `unknown` | `unknown` |
| `result_set_execution` | `execution.state` | `completed`, `failed`, `incomplete` | `unknown` | `unknown` |
| `proposition_execution` | target proposition `execution.state` + `execution.completion` | `completed:assessed`, `completed:not_checkable`, `failed`, `incomplete` | `unknown` | `unknown` |
| `assessment` | target proposition assessment stage `state` + conditional `value` | `not_performed`, `performed:unknown`, `performed:adverse`, `not_applicable`, `failed` | `unknown` | `unknown` |
| `reported_verdict` | target proposition `conclusion.reported_verdict` | exact bar-declared strings only | `unknown` | `unknown` |

No criterion may infer a missing value from an adjacent field. No string coercion is permitted. Unmapped but well-formed source states produce `unknown` rather than an invented default.

## Frozen strict research bar

`cal-contract-c-shadow-strict-v1@1.0.0-rc0` is operator-only and blocking on every criterion.

| Criterion | Contract C / boundary source | Mapping | Policy authority | Auto action |
| --- | --- | --- | --- | --- |
| `contract-c-conformance` | authoritative validator receipt | `valid→pass`; `invalid/unverified→unknown` | Contract C validator + bar | never |
| `result-set-execution` | `execution.state` | `completed→pass`; `failed/incomplete→unknown` | Gate bar | never |
| `proposition-execution` | proposition execution | `completed:assessed→pass`; `completed:not_checkable/failed/incomplete→unknown` | Gate bar | never |
| four assessment criteria | exact Contract C stage state | `not_applicable→pass`; `performed:adverse→fail`; `not_performed/performed:unknown/failed→unknown` | Gate bar | never |
| `reported-verdict` | exact CAL `reported_verdict` | `supported→pass`; `contradicted→fail`; `partially_supported/unsupported/not_checkable→unknown` | Gate bar | never |

The adapter does not define those policy meanings. It mechanically applies the frozen table.

## Policy-mutation control

`cal-contract-c-shadow-contradiction-hold-v1@1.0.0-rc0` is identical except `reported_verdict=contradicted` maps to `unknown` rather than `fail`. Holding the Contract C object fixed while switching only this bar must change any affected Gate result solely through the bar identity/hash and the `reported-verdict` criterion.

## Provenance envelope

Every shadow result must record:

- Contract C version, `result_set_id`, and canonical whole-object SHA-256;
- validator receipt authority and validity;
- target proposition ID;
- Gate bar ID, version, and canonical spec SHA-256;
- adapter ID, version, and implementation SHA-256;
- criteria evaluated;
- exact source fields consumed;
- source status and normalized source state for each criterion;
- criterion outcomes;
- blocking failures and blocking unknowns;
- final Gate decision;
- `requiresHumanApproval`;
- `automaticApplicationPermitted: false`;
- `appliedAutomatically: false`.

Missing and explicit unknown states may both safely yield `hold`, but their provenance must remain distinguishable.

## Explicit non-interpretation rules

The adapter must not:

- inspect contribution text or evidence payloads;
- infer a verdict from support/counterevidence contribution channels;
- derive a Gate result from CAL measurements unless a future frozen bar explicitly adds a typed measurement source kind;
- treat `unsupported` as contradiction;
- treat `not_checkable` as rejection;
- treat execution failure as epistemic contradiction;
- infer assessment values from other assessment slots;
- route Contract C through Select/Rank;
- auto-apply any decision.

## Falsifiers

RC0 is falsified if any tested path:

- turns a missing/malformed/unknown/execution-failed state into Gate `fail` without an explicit frozen mapping;
- rejects the authoritative canonical Contract C fixture solely because it contains `unsupported` or `not_performed` states when the bar maps those states to unknown;
- changes decision when only a non-consumed valid field or JSON field order changes;
- ignores authoritative v1 schema rejection of an unknown field;
- changes a contradiction/adverse decision without an attributable bar-policy change;
- inspects contribution channels to manufacture a different epistemic conclusion;
- permits automatic application in shadow mode.
