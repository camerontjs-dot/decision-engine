# Contract E Participant Binding / Adapter Truthfulness RC1 — Preregistration

Status: frozen before implementation

## Primary research question

Can real frozen stage artifacts from the CAL Pipeline satisfy common Contract E-style participant responsibility and binding declarations while the authority/jurisdiction evaluator remains ignorant of domain semantics?

The target is not to define Contract E 1.0.0. The target is to test the hardest current Contract E hypothesis:

> a common authority interface can define what each stage owns, what authority-sensitive operation it is exercising, and how that operation/target binds to authoritative upstream artifacts without Contract E deciding retrieval relevance, epistemic support, Decision policy correctness, citation correctness, or execution outcome truth.

## Live starting authority

- Evidence Bundler `main`: `6011789957f3294f97bff260069cfb5bb1c5772f`
- Claim Audit Lab `main`: `53f0885b111676794d1bd20e10b91aa58b07e9d4`
- Decision Engine `main`: `ff7a0f63e5f7075b192dff04064b950bf7255ffa`
- Apparatus Contracts `main`: `00bdf9546a877f9f6c1d7fd227fd959e1d7aa99e`
- frozen Authority RC0 result/evaluator source: Decision Engine PR #20 result commit `ae44fc001d1157b0ad5af4312833f1d39a41356c`
- Contract E brainstorm/evidence correspondence: Apparatus Contracts PR #23

## Real/frozen artifact surfaces

RC1 will use exact field identities from the following live/frozen artifacts rather than inventing stage semantics:

1. Contract B canonical handoff spec plus CAL's checked-in Contract B consumer fixture:
   - `bundle_manifest.yaml` blob `87b4b19a94e977d2aaf9fdb3ee1612ee253ace8e`
   - `claims/clm-001.yaml` blob `988a59d12a5dbf05081fed94dcc50f409b2686db`
   - `evidence/src-001/passages/pass-001.yaml` blob `5b371ad53c218db84d2a116f23be69cb5484b331`
2. CAL live Contract B adapter:
   - `src/claim_audit_lab/contracts/adapter.py` blob `7fde574c4ea9af71b4e2abc8efed61e20bd55e92`
3. Contract C 1.0.0 canonical schema and canonical fixture:
   - schema blob `b0369de9b5c156322d6787261bbc7658a3b33781`
   - fixture blob `38b2271fc31ffa7683c09a486a8919572fc2f1a4`
4. CAL live Contract C exporter:
   - `src/claim_audit_lab/contracts/contract_c.py` blob `d6b32a44ef11109fe0ee91efa212d3904badf58c`
5. Decision Engine frozen cross-use-case Decisions:
   - citation Decision blob `656e942bfe015a1672f0806852e5fd1886d25859`
   - task-dispatch Decision blob `cc3534990267499c1c38334a320b6730e38d1f7b`

The Contract B fixture is a synthetic checked-in consumer fixture, not a real scientific producer run. That limitation must remain explicit.

## Candidate participant boundaries under test

Research operation names only, not proposed canonical vocabulary:

1. source access/acquisition
2. evidence passage admission / bundle sealing
3. CAL assessment issuance over exact Contract B authority
4. Decision Engine Decision issuance over exact Contract C authority
5. citation/use permission bound to an exact typed Decision effect
6. task execution permission bound to an exact typed Decision effect
7. outcome verification authority

## Required participant declaration properties

Each participant declaration must be able to state without semantic interpretation:

- participant identity;
- responsibilities owned;
- responsibilities explicitly excluded;
- authoritative artifact types consumed;
- authority-sensitive operation exposed;
- actor binding source;
- operation binding source;
- target binding source;
- currentness/integrity fields where available;
- semantic fields that are forbidden as jurisdiction inputs;
- enforcement/escalation obligation;
- output receipt/record class if applicable.

## Key separation to test upstream of Evidence Bundler

`authorized for use` is not a sufficient primitive.

RC1 must distinguish at least:

- authority to access/read a source;
- authority to admit an exact source/passage into a frozen evidence set;
- semantic relevance/support/contradiction of that passage;
- authority for CAL to assess the exact admitted set;
- downstream authority to cite/use a result.

Access/admission authority must not manufacture relevance or support.

## Frozen evaluator constraint

The jurisdiction evaluator used by RC1 must be byte-identical in behavior to the Authority RC0 target evaluator or a mechanically verified exact copy. RC1 may add operation/target classes and participant adapters, but must not tune jurisdiction logic around observed adapter failures.

## Adapter-truthfulness design

For each real/frozen artifact, RC1 will implement:

1. a stage adapter that emits a normalized authority request; and
2. a separate declaration-driven binding validator that independently reconstructs the expected actor/operation/target binding from exact fields and compares it to the adapter output before jurisdiction evaluation.

The validator may know field locations and exact enumerated effect mappings. It may not decide domain semantic meaning.

## Primary falsifiers

Falsify or narrow the participant-interface hypothesis if any tested stage requires the Contract E layer to interpret any of the following merely to establish jurisdiction:

- passage text or retrieval relevance;
- source trust level as epistemic truth;
- scaffold support labels;
- CAL claim classification;
- CAL measurement value;
- CAL reported verdict, causal form, terminal branch, or rule roles;
- Decision reason codes or generic `eligible` disposition as sufficient authority;
- executor success report as outcome truth.

## Binding falsifiers

A participant adapter must fail validation if it performs any of these substitutions while the underlying authoritative artifact is unchanged:

- source identity/content-hash substitution;
- passage ID/hash substitution;
- Contract B bundle ID/hash substitution;
- Contract C result-set/Contract B binding substitution;
- Decision effect substitution;
- Decision target kind/object/hash substitution;
- citation Decision relabeled as task dispatch;
- task-dispatch Decision relabeled as citation;
- protected/runtime-like operation relabeled as a less sensitive operation;
- stale/current target identity substituted where currentness is represented.

## Semantic non-authority metamorphic tests

Where integrity permits, mutate non-binding semantic labels/values and require the participant operation binding to remain unchanged, including examples such as:

- Contract B scaffold support status;
- source trust classification;
- CAL measurement/verdict fields when using a separately identified Contract C artifact variant;
- Decision reason codes while typed effect and target remain fixed.

If a semantic mutation necessarily changes the canonical artifact identity, the test must preserve that identity change rather than forge a stale hash. Jurisdiction may remain the same by class/scope, but exact artifact-binding receipts must not be silently reused.

## Citation/use requirement

Citation authority must require an exact typed-effect binding (research fixture: `cite_as_evidence`) or an explicit citation policy. Generic `eligible`, `supported`, or source `primary` must never be sufficient.

## Outcome requirement

Execution authorization, execution occurrence, executor report, observed post-state, and authoritative verification must remain distinct as established in RC0.

## Success criteria

Support the bounded hypothesis only if:

1. one unchanged jurisdiction evaluator accepts normalized requests from all tested participant adapters;
2. all adapter outputs pass an independently constructed declaration/binding validator;
3. all preregistered relabeling/substitution attacks are detected before or at jurisdiction;
4. semantic fields forbidden by declarations are not read by the authority evaluator and do not manufacture authority;
5. source access/admission authority can be represented without changing CAL semantic verdict machinery;
6. citation/use and task execution are distinguished by exact effect/target binding;
7. unknown/unmapped effects fail closed or indeterminate rather than inheriting nearby authority;
8. existing Decision Engine CI remains green;
9. failures/deviations are recorded exactly rather than repaired away.

## Negative controls

At least two controls are required:

1. weak generic-eligibility adapter: permits downstream use based only on `decision.disposition == eligible`;
2. semantics-leaking admission adapter: treats source trust/support-like fields as authority to admit/use evidence.

They should be allowed to fail visibly.

## Strongest expected residual risk if RC1 succeeds

Even a declaration-driven adapter validator is not equivalent to an independently isolated cross-repository consumer. The next residual risk would be whether producer repositories can emit the binding descriptors/receipts directly and independently, without a central research harness reconstructing them after the fact.

## Non-claims

RC1 does not:

- define Contract E 1.0.0;
- modify Contracts A/B/C;
- promote Contract D;
- change CAL semantics;
- change Evidence Bundler retrieval/admission semantics;
- define production data-access rules;
- authorize automatic MainFrame mutation;
- define production citation policy;
- establish universal stage coverage;
- authorize a production Authority Control Plane.
