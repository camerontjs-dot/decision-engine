# Contract E Participant Binding / Adapter Truthfulness RC1 — Results

## Primary disposition

**SUPPORTED FOR PROMOTION, WITH REQUIRED PARTICIPANT-DOMAIN BOUNDARY**

Promotion scope is narrow:

> For the seven tested authority-sensitive boundaries, a Contract E-style participant interface can declare responsibility, exact actor/operation/target bindings, and participant-specific accepted effect domains while the frozen authority/jurisdiction evaluator remains ignorant of retrieval, epistemic, Decision-rationale, and outcome semantics.

The test also supports the stronger cross-stage claim that standing authority is required independently at each tested boundary. The semantic/transport artifact processed by a stage does not self-authorize that stage.

This supports a successor producer-native / cross-repository conformance experiment and a minimal Contract E research specification. It does **not** define Contract E 1.0.0, authorize production mutation, or establish a production Authority Control Plane.

## Live starting authority

- Evidence Bundler `main`: `6011789957f3294f97bff260069cfb5bb1c5772f`
- Claim Audit Lab `main`: `53f0885b111676794d1bd20e10b91aa58b07e9d4`
- Decision Engine `main`: `ff7a0f63e5f7075b192dff04064b950bf7255ffa`
- Apparatus Contracts `main`: `00bdf9546a877f9f6c1d7fd227fd959e1d7aa99e`
- predecessor Authority RC0 result: Decision Engine PR #20 / `ae44fc001d1157b0ad5af4312833f1d39a41356c`

## Freeze / execution lineage

- primary preregistration: `b366fcf11d8bdc6375e5ef3a7ddebc34e1518897`
- frozen real-artifact projection commit: `61e92ab745052a1ad17bf35655794b09b8da1e47`
- frozen real-artifact projection SHA-256 observed in hosted execution: `a702fe310d92f2bcadec639f151f7bbc6ed001d6e71abf11eed46f16faf0c15f`
- first participant declarations: `efc0f5e5878eda2901051dcba2e490a29771ff04`
- frozen authority profile: `c305224f88a88a0842d71c87d96f570d56ba13ee`
- adapter implementation: `e3e69eeefa234cb0a23b8596f140d011b8c6dccf`
- first binding validator: `eef2b40e93ef4fbd4587addfd826610001e2424f`
- first hosted implementation/workflow head: `77cd49e51947738e0f423443f82a0c035249639d`
- preserved failure record: `25b02636dabf9cd2f973f0d5c5301bc3cd825933`
- participant-domain declaration repair: `2f4d56db2fe0ecd1a5d093ea13c0afd84653dad7`
- participant-domain validator repair / first repaired PASS head: `ba4a52481cac692c333ea3a7232f46e936afdefd`
- hardening preregistration: `4a1d55a37cc324d4a6e6a0437aae5f16ac96af2b`
- hardening implementation: `05f2f82d98aa8c04a87f128d1f0166b7238454c4`
- final hosted workflow head before this result-only commit: `df500434f31258969a9b5e7926de80ff97487a43`

## Frozen evaluator identity

The RC1 jurisdiction evaluator was an exact Git-blob copy of the RC0 target evaluator.

- RC0 evaluator Git blob: `5012f6398f6953e458de87179a318bc45d1df456`
- RC1 frozen evaluator Git blob: `5012f6398f6953e458de87179a318bc45d1df456`

The jurisdiction algorithm was therefore not tuned around RC1 adapter/declaration failures.

## Artifact aperture

RC1 used exact checked-in artifact identities and projected only fields required for the experiment:

- CAL checked-in Contract B consumer fixture:
  - manifest blob `87b4b19a94e977d2aaf9fdb3ee1612ee253ace8e`
  - claim blob `988a59d12a5dbf05081fed94dcc50f409b2686db`
  - passage blob `5b371ad53c218db84d2a116f23be69cb5484b331`
- CAL live Contract B adapter blob `7fde574c4ea9af71b4e2abc8efed61e20bd55e92`
- Contract C 1.0.0 canonical schema blob `b0369de9b5c156322d6787261bbc7658a3b33781`
- Contract C canonical fixture blob `38b2271fc31ffa7683c09a486a8919572fc2f1a4`
- CAL Contract C exporter blob `d6b32a44ef11109fe0ee91efa212d3904badf58c`
- frozen Decision Engine citation Decision blob `656e942bfe015a1672f0806852e5fd1886d25859`
- frozen Decision Engine task-dispatch Decision blob `cc3534990267499c1c38334a320b6730e38d1f7b`

Important limitation: the Contract B object is a synthetic checked-in CAL consumer fixture, not a fresh real Evidence Bundler scientific producer run. The source-access receipt used by RC1 is also a research sidecar invented solely to test authority separation.

## Tested participant boundaries

Research operation vocabulary only:

1. source access: `source.read`
2. evidence passage admission: `evidence.admit_passage`
3. CAL assessment issuance: `assessment.issue`
4. Decision issuance: `decision.make`
5. citation/use: `citation.use`
6. task execution: `task.dispatch`
7. outcome verification: `outcome.verify`

One standing authority profile and the same frozen jurisdiction evaluator governed all seven normalized requests.

## Preserved failure — field truthfulness was insufficient

The first hosted RC1 cut intentionally froze participant declarations before implementation.

Hosted research run `33320187907` failed with exactly two preregistered responsibility substitutions:

- `citation-use` accepted the task-dispatch Decision and truthfully derived `task.dispatch`;
- `task-execution` accepted the citation Decision and truthfully derived `citation.use`.

The global effect map was correct. The defect was that the participant declarations did not constrain **which typed effects that participant was responsible for consuming**.

At that same cut, all seven intended baselines, semantic-separation probes, identity substitutions, receipt checks, negative controls, unknown-effect handling, and self-verification checks behaved as intended.

Hosted failure evidence:

- head: `77cd49e51947738e0f423443f82a0c035249639d`
- research run: `33320187907` — failure
- ordinary repository CI at same head — success
- artifact ID: `9734652234`
- artifact ZIP SHA-256: `306d84d11c11f4ddf700e99b4797011d5264b29c0b4462ff65118397edd877c1`
- frozen declaration SHA-256: `521c19e0634ae3a87ac235048b37121251ff573c56e5bb09257107310fc3c48e`

This failure is preserved in `FAILURE-01-PARTICIPANT-EFFECT-DOMAIN.md`.

### Smallest repair

Only the participant responsibility surface changed:

- `citation-use` accepts only `cite_as_evidence`;
- `task-execution` accepts only `dispatch_task`;
- the declaration validator rejects effects outside the participant-specific accepted-effect set before applying the global effect map.

The authority evaluator, artifacts, authority profile, adapters, baseline semantics, and negative controls were not changed for this repair.

The repaired declaration SHA-256 is:

`42f3020b04a1e499d5f69ee1fd2f08842c8aa9af07be9261d9362fd82d21bd83`

## Repaired participant-binding results

Hosted repaired run `33320277572` succeeded.

Observed across all seven intended participants:

- declaration/binding validation: valid;
- jurisdiction under the standing delegated profile: `IN_JURISDICTION`;
- semantic projection mutations did not change actor/operation/target bindings;
- source hash substitution: rejected;
- passage ID substitution: rejected;
- Contract B bundle substitution: rejected;
- Contract C result-set substitution: rejected;
- citation operation substitution: rejected;
- task target-class substitution: rejected;
- outcome verification execution-ID substitution: rejected;
- unknown Decision effect: failed closed;
- self-verification where independence was required: rejected.

Participant-domain substitution after the repair:

- task Decision presented to citation participant -> `participant_effect_out_of_scope`;
- citation Decision presented to task participant -> `participant_effect_out_of_scope`.

Hosted repaired evidence:

- repaired head: `ba4a52481cac692c333ea3a7232f46e936afdefd`
- research run `33320277572`: success
- artifact ID `9734677324`
- artifact ZIP SHA-256 `c043ebc4dffc4041682bc0d838e73946cbd168eb2fec3c9431d88b74066fbdf3`

## Negative controls demonstrate why Contract E-style binding is necessary

### Generic `eligible` laundering

A deliberately weak adapter treated a generic eligible Decision as sufficient and let the caller choose the downstream operation/target class.

With the binding validator bypassed:

- direct standing-authority jurisdiction -> `IN_JURISDICTION`.

With participant binding validation:

- result -> `adapter_binding_mismatch`.

Therefore the standing authority evaluator by itself is not enough to establish that a request truthfully represents the authoritative upstream artifact.

### Semantics-leaking evidence admission

A deliberately weak evidence-admission adapter treated positive-looking `primary` / `sourced` labels as authority to admit the passage and ignored the access/admission receipt.

With receipt/binding validation bypassed:

- direct standing-authority jurisdiction -> `IN_JURISDICTION`.

With participant binding validation:

- result -> `access_receipt_revoked_or_missing` or `access_operation_not_granted` in the relevant mutations.

Therefore source trust/support-like semantics cannot substitute for authority.

## Stage-authority hardening

The final hardening cut held the artifact/request fixed and removed only one actor/operation grant at a time from standing authority.

Every tested stage ceased being authorized:

| Stage boundary | Jurisdiction after its grant was removed |
|---|---|
| source access | `OUT_OF_JURISDICTION` |
| evidence admission | `OUT_OF_JURISDICTION` |
| CAL assessment | `OUT_OF_JURISDICTION` |
| Decision issuance | `OUT_OF_JURISDICTION` |
| citation use | `OUT_OF_JURISDICTION` |
| task execution | `OUT_OF_JURISDICTION` |
| outcome verification | `OUT_OF_JURISDICTION` |

The normalized request remained byte-identical under the authority-profile change for all seven stages.

This is evidence that the artifact itself did not self-authorize its stage in the tested design.

## Source access and evidence admission were separable

RC1 explicitly separated two upstream authority relations without reading passage relevance/support semantics.

Research receipt granting only `source.read`:

- source-access binding -> valid;
- evidence-admission binding -> `access_operation_not_granted`.

Research receipt granting only `evidence.admit_passage`:

- source-access binding -> `access_operation_not_granted`;
- evidence-admission binding -> valid.

The second case is a separability probe, not a production recommendation. A production policy could require read/access authority as a prerequisite to admission if that is the intended governance model.

The result establishes only that the two relations need not be collapsed semantically.

## CAL epistemic conclusion did not create citation authority

A negative-control request was constructed directly from Contract C semantic state and made to look like a citation request.

With only the broad standing profile:

- direct jurisdiction -> `IN_JURISDICTION`.

Under the citation participant declaration:

- binding validation -> `adapter_binding_mismatch` because the exact typed citation Decision/effect/target binding was absent.

Therefore a CAL verdict or measurement is not sufficient citation authority in the tested model.

## Typed Decision effect did not create execution authority

For both citation and task execution, the exact typed Decision/effect remained valid while the corresponding actor/operation grant was removed from standing authority.

Result:

- binding remained truthful;
- jurisdiction no longer permitted the operation.

Therefore:

```text
typed effect != standing authority to exercise the effect
```

Both are required by the tested interface.

## Positive semantics did not recover missing admission authority

With evidence-admission authority removed from the research receipt, positive-looking semantic labels were set to:

- scaffold support: `sourced`;
- scaffold claim strength: `0.999`;
- source trust: `primary`.

The proper participant validator still returned:

`access_operation_not_granted`.

The weak semantics-leaking negative control still produced direct `IN_JURISDICTION` when binding/receipt validation was bypassed.

This is direct evidence for the anti-laundering boundary:

```text
access/admission authority != source trust != support/relevance
```

## Final hosted evidence

Final implementation/workflow head before this result-only commit:

`df500434f31258969a9b5e7926de80ff97487a43`

Research PR workflow:

- run `33320398684`: success;
- participant-binding gate: PASS;
- stage-authority hardening gate: PASS;
- artifact ID `9734711387`;
- artifact ZIP SHA-256 `fc7f027a393d90b09f61178a7c237d0b370d41b653ac12f3d7382aaadf293e3e`.

Ordinary repository CI:

- run `33320398712`: success;
- Path & Secret Leak Audit: success;
- JavaScript Tests: success;
- existing engine invariant sweep: success;
- output-quality sweep: success;
- combination-matrix sweep: success;
- Gate tests: success;
- Contract C seam fixture check: success.

## Answer to the primary research question

**Yes, with stronger bounds than RC0 revealed.**

For the seven tested boundaries, Contract E can plausibly be a cross-cutting **Authority Interface Contract** rather than a sequential authorization artifact.

The supported shape now requires at least two distinct things:

### 1. Standing authority / jurisdiction protocol

A common authority evaluator can remain ignorant of domain semantics and answer whether a truthful typed request is within delegated jurisdiction.

### 2. Participant responsibility and binding declaration

Each participant must declare, at minimum:

- participant/actor identity;
- semantic responsibilities it owns;
- semantic responsibilities explicitly outside its authority;
- authoritative upstream artifact type(s) consumed;
- authority-sensitive operation(s) it may expose;
- exact actor/operation/target/currentness binding rules;
- participant-specific accepted effect/operation domain;
- semantic fields forbidden from manufacturing authority;
- required upstream authority receipts/currentness where applicable;
- enforcement/escalation behavior.

The first failed cut demonstrates that global field/effect truthfulness without participant responsibility scoping is insufficient.

## Supported cross-stage decomposition

The evidence supports keeping these relations distinct:

1. **source access/acquisition authority** — may this actor read/process this source?
2. **evidence-admission authority** — may this exact source/passage enter the admitted evidence aperture?
3. **semantic evidence eligibility** — is the passage relevant/supportive/contradictory/sufficient? This remains outside Contract E.
4. **CAL assessment mandate** — may this CAL actor/policy issue an epistemic assessment over this exact Contract B authority?
5. **Decision authority** — may this policy actor issue this class of Decision over this exact Contract C/target?
6. **citation/use authority** — may this actor use/cite this exact typed downstream effect/target?
7. **execution authority** — may this actor exercise this exact typed effect now?
8. **verification authority** — may this verifier establish authoritative post-state?

Not every implementation must use separate durable receipts for each relation. The experiment supports their conceptual separability, not a serialization requirement.

## Implication for the user-configurable authority posture

A human/operator-facing settings surface can plausibly define standing scopes such as:

```text
sources/corpora the system may access
evidence-admission scope or policy
which assessment/decision actors are delegated
which Decision effect classes can be used automatically
which citation/use classes are delegated
which execution classes require higher authority
which verifications require independence
```

A coarse dial/profile may compile to these explicit scopes, but the machine-readable authority must remain typed and bounded rather than a generic trust percentage.

## What this does not establish

RC1 does not establish:

1. Contract E 1.0.0 or canonical field names;
2. that Contract E is a single serialized runtime object;
3. that every source requires a human approval receipt;
4. whether source authority should be corpus-level, source-level, passage-level, policy-based, capability-based, or inherited from platform access control;
5. whether Evidence Bundler itself should own evidence admission or merely consume an upstream admission aperture;
6. whether CAL should receive authority fields embedded in Contract B, as sidecar receipts, or through the control plane;
7. production citation policy;
8. production actor identities or delegation profiles;
9. cryptographic proof/signature/token representation;
10. real external side effects;
11. independent producer-native Contract E descriptors;
12. independently isolated reproduction of the participant validator;
13. universal applicability outside the seven tested boundaries;
14. that source trust classification has no role in domain policy, only that it cannot silently become authority or epistemic truth here.

## Strongest residual risk

The largest remaining risk is now **producer-native conformance**.

RC1 reconstructed normalized authority requests and validated them in one Decision Engine research harness from pinned artifacts. That proves the boundary can be expressed without semantic interpretation for the tested fixtures, but it does not prove that Evidence Bundler, CAL, Decision Engine, citation consumers, executors, and verifiers will independently emit and consume the same declarations correctly in their own repositories.

A central harness can still accidentally become the one place that knows everybody's binding rules.

## Successor experiment justified by RC1

Run **Contract E Producer-Native Conformance RC2**.

Freeze:

- the repaired participant-declaration requirements;
- the effect-domain requirement learned from FAILURE-01;
- the RC0 jurisdiction evaluator;
- the tested source/access/admission/assessment/decision/citation/task/verification binding vectors.

Then implement research-only, non-semantic participant descriptor producers/consumers in the repositories that actually own the stages, preferably with independent consumers:

- Evidence Bundler: source/access/admission descriptor or receipt emitter over real frozen source/passage identities;
- CAL: Contract B assessment-authority descriptor derived from exact Contract B identity without using CAL semantic output;
- Decision Engine: Decision/effect/target binding descriptor from the selected Contract D candidate without embedding authorization semantics into D;
- citation/task consumers: independently reject effect-domain substitution;
- verifier consumer: independently bind execution identity/post-state authority.

Required RC2 attacks:

- cross-repository actor substitution;
- operation/effect relabeling;
- target/hash relabeling;
- source/passages authority removal;
- stale authority receipt;
- Contract B/C identity substitution;
- citation/task cross-use substitution;
- semantic-label laundering;
- authority-profile change with semantic artifacts byte-identical;
- independent consumer reconstruction from frozen declarations.

Do not define Contract E 1.0.0 until producer-native conformance demonstrates that the common interface does not depend on a central research adapter that understands every participant.

## Explicit promotion boundary

`SUPPORTED FOR PROMOTION, WITH REQUIRED PARTICIPANT-DOMAIN BOUNDARY` means only:

> the Contract E research hypothesis is strong enough to promote the concept of a cross-cutting Authority Interface Contract composed of standing jurisdiction plus per-participant responsibility/binding declarations, including explicit participant-specific accepted effect domains, and to proceed to producer-native conformance testing.

It is not production authorization.
