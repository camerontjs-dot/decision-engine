# Contract C → Gate Shadow Adapter RC0 — Results

## Status

**Research Infrastructure / downstream-consumer conformance experiment**

**Terminal disposition: `CONFORMANT_WITH_LIMITATIONS`**

This result does **not** authorize production integration, automatic state mutation, a generalized Decision Engine, or any CAL → Select/Rank integration. It establishes only the bounded research claim described below.

## Research question

Can the existing Decision Engine Gate head consume authoritative CAL Contract C state through a minimal deterministic adapter while preserving the distinctions among:

- explicit downstream failure;
- adverse epistemic state;
- evidence insufficiency / abstention;
- epistemic unknown;
- execution failure;
- missing or malformed state;
- operator-only recommendations?

Secondary question: can Gate apply an explicitly frozen downstream bar without acquiring semantic authority that belongs to CAL / Contract C?

## Frozen authority and execution identity

### Decision Engine

- Repository: `camerontjs-dot/decision-engine`
- Exact experiment base: `cd5a471703e6682b7e8281bc954a135996cac58e`
- Machinery-audit PR: `#11`
- Machinery-audit head: `e0d0f0b352a10a8a3441e0195eea2032ec2325e9`
- Current Gate source at experiment base: `src/gate/gateHead.js`
- Current Gate test surface at experiment base: `tests/gateHead.test.mjs`
- Select/Rank implementation inspected only to preserve separation: `src/decisionEngine.js`, blob `bd2f70b6350446a77c8e4911bb11d407191c096e`

The Select/Rank head was not called, adapted, or modified in this experiment. Its comparison-set-relative machinery remains a separate decision problem.

### Contract C authority

- Repository: `camerontjs-dot/apparatus-contracts`
- Exact authority SHA: `00bdf9546a877f9f6c1d7fd227fd959e1d7aa99e`
- Contract C version: `1.0.0`
- Normative specification: `contract-c-v1.0.0.md`
- Normative schema: `schema/contract-c/1.0.0/schema.json`
- Reference validator: `validators/contract_c.py`
- Canonical production fixture: `fixtures/contract-c/1.0.0/valid-canonical.json`
- Canonical fixture whole-object SHA-256: `7a66583e332be4901d13ba9f2d7e12419938c77a41b83223a4b0946ad529b7a1`

The Decision Engine adapter does not define Contract C validity. The hosted research workflow checked out this exact apparatus-contracts SHA and invoked its validator independently.

### Adapter-contract freeze and final implementation evidence

The adapter/bar contract was frozen before the new example fixture families at Decision Engine commit:

`886bafa6fc8ea102f511e1f26d52ec012e86336d`

The final repaired implementation under test was:

- Decision Engine branch head: `3bcf8649ca48e74791c1fc57b93bdba7f137c1dc`
- PR merge-candidate SHA exercised by hosted Actions: `d4845ecb836dea82268e367aae476e62f48fd10c`
- Dedicated workflow run: `33275469007`
- Normal repository CI run: `33275469004`
- Dedicated workflow result: success
- Normal CI result: success
- Adapter implementation SHA-256: `265b728c23cfee6825335b71a3088a96f001483cac9c2c350cea1fc22bb83110`
- Hosted artifact ID: `9721353497`
- Hosted artifact ZIP SHA-256: `deeeb4f4b2b3eeec165950df94eacffb2cf8af11b40c1d88bd2727d34bcffc03`
- `cross-repo-conformance.json` SHA-256: `f12774bfd3d3b853352cf56625f9c30b59090146a87d09b7845365f6dbe10996`
- `shadow-receipt.json` SHA-256: `de9d2083387a7a27cdcd8f5e529b4cfa8625efe26f9b5b0e643bc81e50f7e30a`

## Frozen adapter contract

The adapter is restricted to deterministic typed extraction and table lookup. It does not inspect evidence text, contribution content, or CAL measurements to infer a new epistemic conclusion.

| Gate source kind | Exact Contract C / boundary source | Allowed source states | Missing / malformed behavior |
| --- | --- | --- | --- |
| `contract_conformance` | pinned validator receipt validity + exact authority identity | `valid`, `invalid`, `unverified` | `UNKNOWN` |
| `result_set_execution` | `execution.state` | `completed`, `failed`, `incomplete` | `UNKNOWN` |
| `proposition_execution` | target proposition `execution.state` + `execution.completion` | `completed:assessed`, `completed:not_checkable`, `failed`, `incomplete` | `UNKNOWN` |
| `assessment` | target proposition stage `state` + conditional `value` | `not_performed`, `performed:unknown`, `performed:adverse`, `not_applicable`, `failed` | `UNKNOWN` |
| `reported_verdict` | target proposition `conclusion.reported_verdict` | exact bar-declared strings | `UNKNOWN` |

### Conformance firewall

A non-conformance source mapping is applied only after a pinned authoritative validator receipt establishes exact Contract C conformance. If the receipt is missing, malformed, from a different authority/version, or reports invalidity:

- source fields may still be extracted for provenance;
- their downstream PASS/FAIL mapping is not applied;
- their criterion outcome is `UNKNOWN`;
- the Gate therefore fails closed to HOLD rather than accepting semantic-looking data from an unvalidated object.

This firewall is an implementation of the pre-frozen contract rule `invalid_contract_behavior = unknown_hold`; it is not a new policy interpretation.

## Frozen Gate bars

### `cal-contract-c-shadow-strict-v1@1.0.0-rc0`

Canonical bar SHA-256:

`527a044b3ba58cc48f3bbeb229e745c0464b866b72d78bcbea36778d0806a3cb`

All criteria are blocking and operator-only. Automatic application is disabled.

| Criterion | Mapping |
| --- | --- |
| Contract conformance | `valid → PASS`; `invalid/unverified → UNKNOWN` |
| Result-set execution | `completed → PASS`; `failed/incomplete → UNKNOWN` |
| Proposition execution | `completed:assessed → PASS`; `completed:not_checkable/failed/incomplete → UNKNOWN` |
| Each Contract C assessment stage | `not_applicable → PASS`; `performed:adverse → FAIL`; `not_performed/performed:unknown/failed → UNKNOWN` |
| Reported verdict | `supported → PASS`; `contradicted → FAIL`; `partially_supported/unsupported/not_checkable → UNKNOWN` |

Those mappings are downstream policy declared by the bar. The adapter does not assert that those source states intrinsically mean promote/reject.

### Policy-mutation control

`cal-contract-c-shadow-contradiction-hold-v1@1.0.0-rc0`

Canonical bar SHA-256:

`5beb92c4e3bf91b680c38b52c7a3f85d0dca4d19fb824c5e9283649ee0aaf587`

It is identical to the strict research bar except `reported_verdict = contradicted` maps to `UNKNOWN` instead of `FAIL`.

## Fixture identities and cross-repository conformance

All synthetic objects are explicitly **synthetic conformance fixtures**. Their exact identities were frozen by canonical SHA-256 and then independently checked with the pinned authoritative Contract C validator.

| Fixture | Family | Contract C conformance | Strict Gate | Canonical SHA-256 |
| --- | --- | ---: | --- | --- |
| authority canonical `clm-txt` | external production fixture | valid | HOLD | `7a66583e332be4901d13ba9f2d7e12419938c77a41b83223a4b0946ad529b7a1` |
| `clear-positive` | A | valid | PROMOTE | `0871ceaee1f3142b6846ec9978fd484f084603b5a6b52b4c47da6661601b4903` |
| `explicit-adverse` | B | valid | REJECT | `0bb82b2ad79f9e1d8beb778ecf87d42c526112d7b9d3faf7c5d3141b7eec2130` |
| `epistemic-unknown` | C | valid | HOLD | `484551307ed8e350dba650957ea7acf129d9e0f7cd992549e0f2047a45765fd2` |
| `evidence-insufficiency` | D | valid | HOLD | `fc8c0cb79c25a0362be2f9cf81a66802d19ab0a1e772b26af2fac603730d5e4b` |
| `execution-failure` | E | valid | HOLD | `f957bc1227f759392e250f781492641ad2b6faf3ba2ce9f1956d87eef8c9183f` |
| `missing-required-field` | F | invalid | HOLD | `fdc52ca9e84cde11b189017504310b0afcb10e2e3916bfd285340acca1f99737` |
| `malformed-field` | G | invalid | HOLD | `fdb83494f9a425544e4e52ed7c6f5d43623e0ac718119cfcfa3b63483bcebe71` |
| `mixed-support-refutation` | H | valid | PROMOTE | `65d4287ec5a2b0239db4fe7ad81d462ebb543343f19d5e8d5a8222a2643aa024` |
| `extra-field` | metamorphic | invalid | HOLD | `2eaea856e4d149d4e267f3c67b70af5a8db7a74f68b02ff7dbb99491132700d7` |
| `invalid-adverse` | conformance-firewall falsifier | invalid | HOLD | `512ce9ef200af24d03a9ea7705cdb34b823fc797bb139622ab9fcc01e442e1fd` |
| `contradicted` | policy mutation | valid | REJECT | `601b733513ab623956aa6df6898dd1bee936b0484a2c5988157ca41a20847dc3` |
| `irrelevant-producer-identity-mutation` | metamorphic | valid | PROMOTE | `2d291dc031c2751dc92ad44256d4c12b9c4df8bf62401056277ad4e2123b82ad` |

Cross-repository conformance result:

- authoritative canonical fixture validated: yes;
- synthetic fixtures checked: 12;
- expected/observed conformance disagreements: **0**.

The adapter therefore did not become the de facto Contract C validator in this experiment.

## Required fixture-family results

### A. Clear positive

**OBSERVED:** schema-valid synthetic object, completed result/proposition execution, four `not_applicable` assessment stages, `reported_verdict = supported`.

**Gate:** PROMOTE.

**Boundary:** `requiresHumanApproval = true`, `automaticApplicationPermitted = false`, `appliedAutomatically = false`.

### B. Explicit adverse

**OBSERVED:** schema-valid synthetic object with `semantic_validity = performed:adverse`.

**Gate:** REJECT.

**Blocking failure:** `semantic-validity-state`.

The failure is attributable to the frozen Gate bar's explicit `performed:adverse → FAIL` mapping.

### C. Epistemic unknown

**OBSERVED:** schema-valid object with `semantic_validity = performed:unknown`.

**Gate:** HOLD.

No blocking failure was invented.

### D. Evidence insufficiency / abstention

**OBSERVED:** schema-valid object with proposition execution `completed:not_checkable`, no contributions/measurement, and `reported_verdict = not_checkable`.

**Gate:** HOLD.

Blocking unknowns were proposition execution and reported verdict. No rejection was invented.

### E. Execution failure

**OBSERVED:** schema-valid proposition execution `failed`, no conclusion.

**Gate:** HOLD.

Execution inability remained distinct from epistemic contradiction.

### F. Missing required field

**OBSERVED:** authoritative validator rejected the synthetic object.

**Gate:** HOLD.

The missing stage remained explicitly `sourceStatus = missing`; no adjacent-field inference was used. Because conformance was not established, all non-conformance mappings were firewalled to `UNKNOWN`.

### G. Malformed field

**OBSERVED:** authoritative validator rejected the object containing an invalid assessment value.

**Gate:** HOLD.

No string coercion or accidental rejection/promotion occurred.

### H. Mixed support/refutation

**OBSERVED:** schema-valid object added a counterevidence contribution while leaving all fields consumed by the Gate bar unchanged.

**Gate:** PROMOTE, identical criterion outcomes to the clear-positive control.

This is evidence that the adapter did not inspect contribution channels and manufacture a different epistemic interpretation.

### I. Operator-only bar

**OBSERVED:** even a PROMOTE result retained `requiresHumanApproval = true`, `automaticApplicationPermitted = false`, and `appliedAutomatically = false`.

No tested path auto-applied a Gate decision.

## Mutation / metamorphic results

Hosted adapter/mutation suite: **19/19 passed, 0 failed, 0 skipped**.

### Irrelevant metadata mutation

Changing only `producer.semantic_implementation_sha`, a field not consumed by the Gate bar, changed the Contract C object hash but did not change criterion outcomes or final decision.

**Result:** invariant satisfied.

### Unknown → fail

`semantic_validity: performed:unknown` → `performed:adverse`, holding the other mapped source states fixed.

**Result:** HOLD → REJECT, attributable only to the frozen semantic-validity policy mapping.

### Unknown → pass

`semantic_validity: performed:unknown` → `not_applicable`, holding the other mapped source states fixed.

**Result:** HOLD → PROMOTE, attributable only to the frozen semantic-validity policy mapping.

### Missing → explicit unknown distinction

Both conditions safely produced HOLD, but provenance remained different:

- missing field: `sourceStatus = missing`;
- explicit unknown: `sourceStatus = present`, `sourceState = performed:unknown`.

**Result:** distinction preserved.

### Field-order mutation

Recursive JSON object key reordering did not change canonical object identity, criterion outcomes, or final decision.

**Result:** invariant satisfied.

### Extra-field mutation

The exact Contract C v1 schema rejects unknown extension fields. Adding one changed conformance to invalid.

**Result:** HOLD through the conformance firewall, not an adapter-defined alternate schema.

### Contradiction/adverse policy mutation

The same validated `contradicted` Contract C object, SHA-256 `601b733513ab623956aa6df6898dd1bee936b0484a2c5988157ca41a20847dc3`, was evaluated against two frozen bars:

- strict bar `527a044b...`: REJECT;
- contradiction-hold bar `5beb92c4...`: HOLD.

All other criterion outcomes were unchanged.

**Result:** decision change was attributable to policy, not adapter reinterpretation.

### Invalid-object + adverse-looking state

A deliberately schema-invalid object also contained `reported_verdict = contradicted`.

**Result:** authoritative validator rejected the object; the adapter preserved `sourceState = contradicted` in provenance but marked its mapping `blocked_by_contract_conformance`; final decision HOLD with zero blocking failures.

### Missing validator receipt + adverse state

A schema-shaped object containing `semantic_validity = performed:adverse` was evaluated without a validator receipt.

**Result:** conformance was not established; adverse mapping was blocked; final decision HOLD with zero blocking failures.

## Important preserved deviation: first implementation cut was insufficient

This experiment did not proceed directly from a green run to a success claim.

### OBSERVED

The first hosted implementation head, `81074bd602f62997ab130683ce3b1ddcfaea352b`, completed its then-existing workflow successfully. Its adapter evaluated each non-conformance criterion independently after the conformance criterion. The existing Gate semantics prioritize a blocking FAIL over a blocking UNKNOWN.

A smaller discriminating counterexample was then identified: an **invalid or unverified Contract C object can still carry an adverse-looking mapped field**. Under the first-cut structure, the conformance criterion could be UNKNOWN while another criterion could map to FAIL; Gate's ordinary FAIL precedence could therefore produce REJECT from an object whose Contract C validity had not been established.

This violated the already-frozen adapter contract requirement that invalid/unverified input fail closed to HOLD rather than acquire semantic authority.

### Correction

Commit `be206131b50008ac63c20ed0e35aabba34065f65` added a conformance firewall without changing the frozen bar policy. The implementation now prevents all non-conformance mappings from producing PASS/FAIL unless exact pinned conformance is established.

The regression was then frozen as two explicit tests:

1. invalid Contract C + `contradicted` cannot reject;
2. missing validation receipt + `performed:adverse` cannot reject.

Both passed in hosted execution, and the independently invoked authoritative validator confirmed the `invalid-adverse` fixture is invalid.

This deviation is retained as evidence. The first green workflow was not sufficient evidence for terminal disposition.

## Authoritative production-fixture control

The pinned canonical Contract C production fixture was evaluated independently after its authoritative hash and schema conformance were verified.

For proposition `clm-txt`:

- `reported_verdict = unsupported`;
- all four assessment slots = `not_performed`;
- strict research Gate result = HOLD;
- blocking failures = none;
- blocking unknowns = all four assessment criteria + reported verdict.

This demonstrates that the adapter did not convert the currently authoritative fixture's `unsupported` or `not_performed` states into adverse rejection under a bar that does not explicitly define them as failures.

## Provenance example

The hosted clear-positive receipt recorded, among other fields:

- Contract C version `1.0.0`;
- Contract C result-set identity;
- Contract C canonical SHA-256 `0871ceaee1f3142b6846ec9978fd484f084603b5a6b52b4c47da6661601b4903`;
- pinned validator authority `camerontjs-dot/apparatus-contracts@00bdf9546a877f9f6c1d7fd227fd959e1d7aa99e`;
- target proposition ID `clm-md`;
- strict bar ID/version/hash;
- adapter ID/version/hash `265b728c23cfee6825335b71a3088a96f001483cac9c2c350cea1fc22bb83110`;
- every criterion evaluated;
- exact source fields consumed;
- source status/state per criterion;
- mapping status per criterion;
- policy-authority text per criterion;
- blocking failures / blocking unknowns;
- final Gate decision;
- human-approval requirement;
- `automaticApplicationPermitted = false`;
- `appliedAutomatically = false`.

The adapter is therefore not a hidden policy layer in the tested surface: the source state, mapping, bar identity, and resulting criterion outcome are inspectable.

## Semantic-leak audit

### OBSERVED

- Gate source fields consumed do not include `contributions`.
- Gate source fields consumed do not include Contract C `measurement`.
- Adding counterevidence contribution data while holding consumed fields fixed did not change the Gate result.
- Contract C `reported_verdict` was passed through as a typed string and mapped only by the bar.
- Invalid/unverified objects cannot activate non-conformance PASS/FAIL mappings after the firewall fix.

### INFERENCE

Within the tested surface, no semantic reinterpretation leaked into the adapter. Epistemic meaning stayed with Contract C; accept/reject policy stayed with the frozen Gate bar.

This inference is bounded to the fields and fixtures exercised here. It is not a claim that every future Contract C field or future Gate bar will preserve that boundary automatically.

## Unknown-to-failure audit

### OBSERVED

In the final hosted run:

- explicit epistemic unknown produced HOLD;
- execution failure produced HOLD;
- evidence insufficiency / not-checkable produced HOLD;
- missing and malformed state produced HOLD;
- invalid/unverified Contract C produced HOLD;
- only source states with explicit frozen `→ FAIL` bar mappings produced REJECT.

### INFERENCE

No tested unknown became a failure without explicit policy authority.

## Operator-control audit

### OBSERVED

All frozen research bars are operator-only. Every result recorded:

- `requiresHumanApproval = true`;
- `automaticApplicationPermitted = false`;
- `appliedAutomatically = false`.

### INFERENCE

No tested adapter path bypassed the operator-control boundary.

## Limitations preventing `CONFORMANT_SHADOW`

1. **The authoritative current production fixture exercises HOLD-like states, not the full decision surface.** The present canonical fixture demonstrates safe handling of `unsupported` and `not_performed`, but the PROMOTE/REJECT/adverse/execution controls are schema-valid synthetic fixtures rather than frozen outputs observed from the live CAL production path.

2. **Contract C v1 has no generic `performed:pass` assessment state.** Its assessment vocabulary distinguishes `not_performed`, `performed:unknown`, `performed:adverse`, `not_applicable`, and `failed`. The synthetic clear-positive control clears the four stage criteria using `not_applicable`. That proves deterministic mapping under this bar; it does not prove that a real policy can infer a successfully performed positive assessment from Contract C v1 where the contract does not encode one.

3. **Validator-receipt production machinery is not established here.** The research workflow actually invokes the pinned authoritative validator and then constructs the receipt supplied to the adapter. This experiment does not define a production attestation, transport, signature, or trust mechanism for such receipts.

4. **`reported_verdict` is an open non-empty string in Contract C v1.** The adapter safely maps undeclared future values to UNKNOWN, but future production verdict vocabulary can require an explicitly versioned Gate-bar update.

5. **The Gate bars are research controls, not approved production policy.** Their `supported`, `contradicted`, adverse-assessment, and `not_applicable` mappings are useful conformance probes only. This experiment does not establish that those are the correct operational decision rules for any production use case.

6. **Synthetic reachability is not production reachability.** Independent schema validation proves the synthetic states are Contract C-conformant. It does not prove that the current CAL producer can or will emit every tested combination under real execution.

## OBSERVED

- Existing Gate baseline: 14/14 tests passed in the dedicated hosted run.
- Cross-repository Contract C fixture conformance: 12/12 synthetic expectations matched; 0 disagreements.
- Adapter/mutation suite: 19/19 passed; 0 failed; 0 skipped.
- Strict research-bar synthetic decisions: 3 PROMOTE, 2 REJECT, 7 HOLD.
- Authoritative canonical fixture `clm-txt`: HOLD, zero blocking failures.
- Contradiction policy mutation: same Contract C object changed REJECT → HOLD only when the bar changed.
- Mixed contribution mutation did not change Gate output when consumed fields were fixed.
- Invalid Contract C and missing-validator-receipt adverse controls both HOLD after the conformance firewall.
- Automatic application remained disabled on every tested path.
- Normal repository CI and the dedicated research workflow both succeeded on implementation head `3bcf8649ca48e74791c1fc57b93bdba7f137c1dc`.

## INFERENCE

A minimal deterministic Contract C → Gate shadow adapter can preserve the tested distinctions among explicit adverse failure, epistemic unknown, evidence insufficiency, execution failure, missing/malformed state, and downstream policy while leaving semantic authority with Contract C and policy authority with a frozen Gate bar.

The conformance firewall is necessary because ordinary Gate FAIL precedence is correct for validated criteria but unsafe if semantic-looking fields from an unvalidated Contract C object are permitted to participate.

## HYPOTHESIS

A real downstream Gate bar for a bounded production workflow may be expressible over Contract C v1 without semantic reinterpretation, provided that:

- the bar uses only distinctions Contract C actually encodes;
- Contract C validation is established before mappings execute;
- any needed positive stage-completion fact is represented explicitly rather than inferred;
- operator / automation authority remains independently declared.

That hypothesis requires a separately authorized experiment using real frozen CAL-produced Contract C objects and a real preregistered downstream decision bar.

## UNKNOWN

- Whether the current live CAL production path emits every schema-valid synthetic state used here.
- Whether Contract C v1 is sufficient for a real policy that needs affirmative evidence that a particular assessment stage was performed and cleared.
- What production mechanism, if any, should establish and attest Contract C validator receipts for Decision Engine consumption.
- Which `reported_verdict` vocabulary should be frozen for any real downstream bar.
- Whether any future comparative multi-object use case should exist; if so, it requires a separate Select/Rank experiment and is not implied by this result.

## Terminal disposition

**`CONFORMANT_WITH_LIMITATIONS`**

The strongest claim justified by the evidence is:

> A minimal deterministic adapter can consume authoritative Contract C state and drive the existing Gate head while preserving the tested unknown/failure/execution distinctions, provided exact Contract C conformance is established first. Epistemic meaning remains with Contract C, downstream policy remains with the frozen Gate bar, and operator-only results cannot auto-apply.

The stronger `CONFORMANT_SHADOW` disposition is withheld because the full PROMOTE/REJECT surface was established with independently validated synthetic conformance fixtures rather than a frozen set of real CAL-produced Contract C outputs, and because Contract C v1's assessment vocabulary may be insufficient for some affirmative stage-clearance policies.

No result in this PR authorizes production integration by itself.
