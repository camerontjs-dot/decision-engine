# Authority Control Plane Cross-Stage RC0 — Results

## Primary disposition

**SUPPORTED FOR PROMOTION**

Promotion scope is narrow:

> For the tested authority profiles and stage classes, one standing authority model plus a common jurisdiction evaluator is sufficient to govern assessment, bounded Decision-making, execution requests, and outcome verification without reading domain semantic payloads. The model can reduce human escalation through explicit delegation while preserving the tested protected boundaries.

This supports a successor real-consumer / cross-repository authority-control-plane experiment. It does **not** establish a production Authority Control Plane, Contract E, universal stage coverage, or automatic production mutation.

## Live starting authority

- Decision Engine base: `ff7a0f63e5f7075b192dff04064b950bf7255ffa`
- promoted Decision / Authorization boundary already on that base
- apparatus-contracts Contract E brainstorm: PR #23
- thought-process capture: `80977b72a63ddd70667ac3270af6cdb8d6fdb802`

## Freeze / implementation lineage

- primary preregistration: `0973ca9df18f182480352cb0012876c1f62bb093`
- frozen fixture commit: `f1b918a571d4c50fbf61f0f2f200b519d67b72e4`
- frozen fixture SHA-256: `d576ecb9ef3686b32a8563369c4d34b1d56fce7140016e6d2f7ec3426df0237e`
- first hosted implementation head: `5c7be040883ddb5fb0c5995d0877d0224a84d4e9`
- hardening preregistration: `d755960e4d14598c2aad4536c8ffb5b74bb0f110`
- final hardening implementation head before this result-only commit: `15127d6502e2ed9551f5684ef6a971149793eb5d`

## Hosted evidence

### First frozen cut

Hosted research run `33317433586`: success.

Ordinary repository CI run `33317433484`: success.

Artifact:

- ID `9733878771`
- uploaded summary ZIP SHA-256 `656230bc0f135010d74f79745dc20bee03bedcfaf6806b02a1e77350111512a8`

### Hardening cut

Hosted push research run `33317559498`: success.

Hosted PR research run `33317561672`: success.

Ordinary repository CI run `33317561692`: success.

The ordinary CI run retained:

- Path & Secret Leak Audit: success;
- JavaScript Tests: success;
- existing engine invariant sweep: success;
- output-quality sweep: success;
- combination-matrix sweep: success;
- Gate tests: success;
- Contract C seam fixture check: success.

Hardening artifact:

- ID `9733915768`
- uploaded summary ZIP SHA-256 `dc6bdf828f704184ec8f9fd3eab3febac84b22042ecf62a0b4259207f532acaf`

## Observed results

### 1. One profile/evaluator governed all tested stages

The same frozen profile representation and the same `evaluateJurisdiction` function governed:

- `assessment.issue`;
- `decision.make`;
- `repository.write.docs` / `repository.write.runtime`;
- `outcome.verify`.

No separate stage-specific authorization evaluator was needed by the target design.

### 2. Delegation reduced human escalation without protected false permits

For the frozen seven-request workflow:

| Profile | Automatic | Higher-authority escalations | Denials | Protected false permits |
|---|---:|---:|---:|---:|
| manual | 1 | 5 | 1 | 0 |
| supervised | 4 | 2 | 1 | 0 |
| delegated-research | 5 | 1 | 1 | 0 |

The reduction in escalation came from explicit scope changes, not from changing Decision or epistemic semantic payloads.

### 3. Substitution/currentness controls failed closed

Observed target behavior:

- actor substitution -> blocked;
- operation substitution from docs write to runtime write -> not permitted, requiring higher authority;
- target substitution from research repo to protected repo -> blocked;
- batch widening beyond delegated scope -> escalated;
- unknown operation -> `INDETERMINATE`;
- missing actor -> `INDETERMINATE`;
- revoked authority -> blocked;
- expired authority -> blocked;
- verifier attempting to verify its own execution where independence was required -> blocked;
- malformed authority time -> `INDETERMINATE`;
- unknown target class -> blocked.

### 4. Delegation did not amplify authority

A valid child delegation narrowed the parent's documentation-write authority.

The following attempted child delegations were rejected:

- runtime-write authority not possessed by the parent;
- protected-repository target scope not possessed by the parent;
- batch scope greater than the parent grant;
- expiry extending beyond the parent authority window.

### 5. Semantic payloads were non-authoritative for jurisdiction

The target evaluator produced identical jurisdiction results when opaque semantic payloads were changed while actor/operation/target/context remained fixed.

The hardening sweep generated:

- 1,680 authority-relevant request descriptors;
- 3 materially different opaque semantic payloads per descriptor;
- 5,040 semantic-payload comparisons.

Observed:

- target evaluator semantic invariance failures: 0;
- protected false permits in the generated grid: 0.

A static guard also established that the `evaluateJurisdiction` implementation body does not read `semantic_payload`.

### 6. Alternate implementation reproduced the jurisdiction surface

A second evaluator using a different internal construction was compared against the target across the same generated grid.

- alternate-evaluator comparisons: 5,040;
- disagreements: 0.

Important limitation: the alternate evaluator was produced in the same research context. It is an alternate implementation cross-check, **not an independently isolated consumer**.

### 7. Prior real Decision specimens remained opaque

Exact preserved RC1 Decision specimens were inserted as opaque semantic payloads while authority-relevant request descriptors were held fixed:

- source-audit Decision -> `IN_JURISDICTION`;
- citation Decision -> `IN_JURISDICTION`;
- task-dispatch Decision -> `IN_JURISDICTION`.

Their different policies, targets, effects, and reason codes did not alter jurisdiction because the authority evaluator did not inspect them.

This is evidence for payload ignorance only. It is not evidence that a real executor may ignore typed Decision-effect binding. Real stage adapters must still construct truthful authority descriptors from the authoritative Decision/output they consume.

### 8. Semantics-aware negative control failed in the intended way

A deliberately weak evaluator read an opaque semantic field and used it to grant runtime-write authority.

For the same runtime request:

- target evaluator -> `REQUIRES_HIGHER_AUTHORITY`;
- semantics-aware weak control -> `IN_JURISDICTION`.

This demonstrates a concrete failure mode if domain semantic conclusions are allowed to manufacture authority.

### 9. Fragmented per-stage control showed coordination drift

A deliberately fragmented control represented posture separately at assessment, decision, execution, and verification.

Changing manual -> delegated posture required four independent stage updates in that representation.

One intentionally omitted update left verification on the manual posture while the other stages were delegated. The stale `verify` behavior was detected immediately.

This does not prove every distributed implementation will drift. It demonstrates that an uncoordinated stage-local authority representation creates a failure mode that the single frozen profile does not require.

### 10. Execution authorization and outcome truth remained separate

The outcome harness preserved the following distinctions:

- authorized execution + observed applied -> verified applied;
- authorized execution + observed not applied -> verified not applied;
- authorized execution + partial post-state -> verified partial;
- executor reports success + observed not applied -> verified not applied;
- unknown observed state -> verified unknown;
- unauthorized execution can still be authoritatively observed as having occurred without becoming retroactively authorized;
- executor self-report without verifier jurisdiction remains unverified.

Therefore:

```text
authorization != execution occurrence
execution occurrence != executor report
executor report != observed outcome
observed outcome != authoritative verification unless verification authority is established
```

## Generated-grid outcome distribution

Across the 1,680 generated descriptors for the target evaluator:

- `IN_JURISDICTION`: 17;
- `OUT_OF_JURISDICTION`: 1,394;
- `REQUIRES_HIGHER_AUTHORITY`: 29;
- `INDETERMINATE`: 240.

The distribution is not a performance metric. It is recorded to make the tested aperture explicit and to show that most generated substitutions did not accidentally inherit authority.

## Answer to the primary research question

**Yes, with bounds.**

For the tested model, authority behaves coherently as cross-cutting standing governance state rather than as a mandatory sequential pipeline stage.

A stage can ask a common jurisdiction question using typed authority-relevant descriptors, while its domain semantics remain local. Human involvement can become an exception path (`REQUIRES_HIGHER_AUTHORITY`) rather than an always-on stage. Moving from manual to supervised to delegated posture reduced escalation without changing semantic payloads or producing protected false permits in the tested surface.

The strongest supported conceptual split is now:

- **Authority** — standing/delegated governance state;
- **Jurisdiction** — whether that authority covers the actor/operation/target/context at hand;
- **Authorization** — runtime application of that authority for a proposed act;
- **Approval / ratification** — a bounded higher-authority act that can change authorization context;
- **Enforcement** — local refusal to exercise a capability without sufficient authority;
- **Execution** — the attempted/performed process;
- **Observation / verification** — separately establishing resulting reality.

## What this does not establish

RC0 does not establish:

1. that one authority schema covers every future CAL Pipeline stage;
2. production actor identities, roles, or delegation profiles;
3. a durable Contract E;
4. whether authority state should be centrally queried, locally distributed, capability-based, or represented another way;
5. cryptographic signing, approval receipts, grant tokens, revocation transport, or policy-distribution machinery;
6. real external side effects;
7. real independent outcome instrumentation;
8. independently isolated consumer reproduction;
9. production latency/availability behavior under an authority-control-plane outage;
10. that Decision Engine should own production authority policy;
11. that semantic stage adapters can construct truthful operation/target descriptors from every real producer;
12. universal human-in-the-loop reduction outside the frozen research posture.

## Residual risk / strongest assumption

The largest remaining assumption is the **adapter truthfulness problem**.

RC0 proves that the common authority evaluator can stay ignorant of domain semantics once it receives truthful typed descriptors. It does not prove that every real stage can map its authoritative semantic output into `actor + operation + target + context` without reinterpretation, loss, or authority laundering.

A dishonest or defective adapter could label a protected runtime action as a permitted documentation action and defeat the authority layer unless the binding is independently verifiable.

This is the next load-bearing falsifier.

## Successor experiment authorized by this result

Run a real-consumer cross-repository RC1 that keeps the common authority evaluator frozen and replaces synthetic request construction with independently checkable adapters from real artifacts.

At minimum include materially different real boundaries such as:

- a real Decision Engine Decision / Contract D candidate effect;
- a protected repository documentation/runtime operation distinction;
- one real or frozen MainFrame task/tool operation;
- an independently observable post-state/verifier boundary.

Required successor controls:

- exact source artifact hashes;
- effect/action/target binding verified independently of the authority evaluator;
- adapter mutation tests that relabel action or target classes;
- stale target/currentness changes;
- authority-profile change with semantic artifacts byte-identical;
- independent consumer where practical;
- preserve any adapter failures rather than tuning the profile to them.

Do not design Contract E or promote a production Authority Control Plane before that adapter-truthfulness test.

## Explicit promotion boundary

`SUPPORTED FOR PROMOTION` means only that the **cross-cutting authority/jurisdiction hypothesis is strong enough for the successor real-consumer experiment and, if useful, a minimal architecture research note**.

It does not authorize production implementation or automatic state mutation.
