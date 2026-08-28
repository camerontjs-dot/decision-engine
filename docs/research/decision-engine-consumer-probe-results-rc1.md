# Decision Engine Contract-C Consumer Probe — RC1 Results

**Status:** executed research result; production unchanged  
**Decision Engine production baseline:** `55f108c196ead020b5965c7d4d737464c92bc4a0`  
**Decision Engine RC1 starting head:** `2ade117f35bcbae8ca1ce1a85790afa493f8694d`  
**Apparatus #11 head used:** `eb7017710866997a2d4ceb1ed5a71cbdfebe2428`  
**CAL #15 head used:** `a1f8b216e3f163bce55867ded07eee0d5b0ebeb7`  
**Career lineage reference:** `camerontjs-dot/career-decision-engine@dbcce7389ebe561daa79bff8bfdbf0ca67b8c832`  
**Production impact:** none

## 1. Decision under study

Determine whether the repository contains a reusable decision-system kernel for Contract-C consumers, whether the current `Gate` is sufficient as that kernel, and whether a bespoke generalized Decision Engine is justified.

The experiment did **not** alter `src/decisionEngine.js`, the production career Select/Rank behavior, CAL semantics, Contract B, or any external lifecycle state.

## 2. Frozen apparatus

The experiment uses research-only Contract-C-like semantic fixtures shaped around the RC1 field families already preregistered in Apparatus #11 and CAL #15:

- exact input/result identity and Contract-B/CAL lineage;
- execution state;
- eligibility, semantic validity, aperture, and applicability;
- headline CAL disposition/verdict;
- counterevidence and blocking-unknown state;
- deliberately irrelevant implementation telemetry.

Four destination policies are frozen in `research/contract-c-consumer-probe-rc1/policies.json`:

1. MainFrame durable-knowledge audit posture;
2. publication / website claim disposition;
3. SOP / controlled-requirement conformance;
4. deviation / investigation readiness.

The policies consume only structured C-like state plus destination context. They do not inspect raw passages, call a model, re-run CAL semantics, or apply external state.

## 3. Experiment implementation

Research-only files:

- `policyRuntime.mjs` — neutral deterministic criterion evaluator and receipt builder;
- `gateAdapter.mjs` — adapter that drives the current production `Gate` from the same policy specs;
- `independentPublicationTable.mjs` — separately represented publication policy implementation;
- `fixtures.json` — frozen semantic fixtures and contexts;
- `policies.json` — frozen policy packs;
- `tests/contract-c-consumer-probe-rc1.test.mjs` — executable assertions.

The candidate research runtime uses criterion outcomes:

`pass | fail | unknown | not_applicable`

and an evaluation envelope:

`completed | invalid_input | invalid_policy | system_error`.

This is an experimental vocabulary, not a proposed Contract-C or production Decision Engine version.

## 4. Preserved first-run failure

The first local run produced **9 pass / 3 fail**.

All three failures had the same cause: the first candidate runtime treated **any** blocking `not_applicable` criterion as making the entire decision `not_applicable`. That was wrong for conditional criteria such as “aperture completeness when this destination requires it.” A criterion can be inapplicable without the whole decision being out of scope.

The apparatus was changed explicitly:

- criterion-level `not_applicable` now defaults to `ignore` for state aggregation;
- only criteria explicitly marked `notApplicableEffect: "policy"` terminate the whole decision as `not_applicable`;
- policy-scope applicability criteria use that terminal effect;
- conditional convenience criteria do not.

The corrected local run produced **12 pass / 0 fail**.

See the companion deviation record. The first failure is retained because it supplied evidence that “not applicable” needs at least two scopes: criterion-level and policy-level.

## 5. Results by required experiment

### 5.1 Career Select/Rank remained separate

Observed:

- no RC1 runtime or policy implementation imports `src/decisionEngine.js` or `weightCalibration`;
- no weighted score is used by any gate/conformance policy;
- the existing career repository remains separately identifiable as lineage/prior implementation.

Inference:

The career engine is a valid separate **compare/select/rank** head. No evidence from this probe supports generalizing its weighted geometry into Contract-C gate decisions.

### 5.2 Gate consumer diversity

The same C-like semantic fixture was evaluated under all four policy packs.

All four were evaluable with named criteria and explicit pass/fail/unknown semantics. The exact same input hash produced four different destination recommendations:

- MainFrame: `eligible_for_operator_review`;
- publication: `publishable_as_written`;
- SOP: `conformance_supported`;
- deviation: `decision_ready`.

Inference:

The reusable kernel is small: structured input + named criteria + explicit unresolved state + policy identity + deterministic receipt. The repository does not need the career scorer to support these consumers.

### 5.3 Fixed C, changed policy/context

Holding C bytes constant while changing only destination context changed publication behavior legitimately:

- internal-draft policy context did not require complete aperture and allowed the supported result to remain publishable under that bounded policy;
- public-website policy context required complete aperture and held the same C result for review when aperture was unknown.

The input artifact hash remained identical; policy/context identity changed.

Inference:

Contract-C semantic state and destination policy are separable in the tested cases.

### 5.4 Same verdict, different residual epistemic state

Six fixtures all carried the same headline CAL verdict `supported` but differed in residual state.

Publication policy outcomes differed as follows:

| Residual state | Decision |
|---|---|
| clean | `publishable_as_written` |
| counterevidence present | `withhold_or_narrow` |
| aperture unknown | `review_or_caveat` |
| evidence ineligible | `withhold_or_narrow` |
| semantic validity invalid | `withhold_or_narrow` |
| applicability not applicable | `not_applicable` |

Inference:

A headline verdict alone is insufficient for at least one legitimate downstream policy. Contract C must preserve the residual CAL state that downstream policy declares material.

### 5.5 Unknown semantics

One generic criterion outcome `unknown` is sufficient for blocking precedence in the tested policies, but **one untyped unknown is not sufficient operationally**.

Observed distinct reasons with distinct next actions:

- `input_absent` — required policy input was not present; fix/complete the input;
- `cal_abstained` — CAL did not reach a decision; return to epistemic work;
- `policy_cannot_decide` — supplied state is legitimate but policy has no decision;
- `resolver_unavailable` — retry/restore a dependency;
- `criterion_not_applicable` — do not block on that criterion;
- `malformed_artifact` — invalid input envelope, not a subject finding;
- `malformed_policy` — invalid policy envelope;
- `runtime_failure` — system-error envelope.

The probe therefore supports a two-level representation:

1. a small criterion outcome vocabulary for decision precedence;
2. typed reason/execution codes for operational handling.

`not_applicable` is behaviorally distinct from `unknown` because it should not automatically hold a decision, and it may terminate the whole policy as out-of-scope when the applicability criterion defines the policy scope.

### 5.6 Malformed/system failure versus adverse finding

Confirmed invariant:

- malformed C-like artifact → `invalid_input`, no recommendation;
- malformed policy → `invalid_policy`, no recommendation;
- injected runtime failure → `system_error`, no recommendation.

None becomes `reject`, `nonconformance_supported`, `withhold_or_narrow`, or another adverse subject finding.

This is a load-bearing result.

### 5.7 Decision receipt

The candidate receipt includes:

- deterministic decision ID;
- subject;
- exact input result ID and SHA-256 of canonical C-like bytes;
- policy ID/version/hash;
- runtime identity;
- criterion observations/outcomes/reasons;
- blocking failures;
- typed blocking unknowns;
- caveats;
- final recommendation;
- approval requirement;
- explicit external action authority;
- `application.status: not_applied`;
- canonical receipt SHA-256.

Identical canonical request bytes replay to an identical receipt and receipt hash.

Changing only policy threshold, severity, unknown handling, criterion logic, or approval requirement changes policy and receipt identity as expected.

### 5.8 Action separation

The runtime takes no action callback and performs no I/O.

Tests confirm:

- the request object is unchanged by evaluation;
- every completed decision says `application.status: not_applied`;
- authority remains external to evaluation.

No MainFrame status, publication state, release state, SOP disposition, or investigation lifecycle state is mutated.

### 5.9 Policy mutation tests

Observed sensitivity:

| Mutation | Expected effect | Observed |
|---|---|---|
| counterevidence threshold `0 → 1` | counterevidence case becomes acceptable | yes |
| counterevidence severity `blocking → advisory` | finding becomes caveat, no longer blocks | yes |
| aperture unknown `unknown → fail` | unresolved becomes adverse policy result | yes |
| supported verdict mapping `pass → fail` | clean supported fixture no longer passes | yes |
| approval requirement `true → false` | same semantic state, different receipt/approval | yes |

No tested mutation was silently ignored.

### 5.10 Criterion ablation

Each criterion was removed one at a time and the frozen synthetic suite re-evaluated.

Result: **no dead criterion was found in the frozen suite**. Every criterion changed at least one tested decision/receipt-relevant outcome when removed.

Bound:

This establishes only that each criterion is live against this synthetic suite. It does not establish that every criterion is necessary in real deployment policy.

### 5.11 Irrelevant-input invariance

Raw telemetry was mutated aggressively while all semantic C-like state remained fixed.

Observed:

- criterion outcomes unchanged;
- neutral state unchanged;
- final recommendation unchanged;
- full input artifact hash changed;
- lineage-bound receipt hash changed.

Inference:

Decision semantics can remain invariant to irrelevant CAL telemetry while receipt lineage still identifies the exact complete input artifact. This supports excluding implementation telemetry from policy semantics without pretending the input bytes were identical.

### 5.12 Separate implementation

The publication policy was implemented twice:

1. through the generic candidate runtime using the frozen declarative policy;
2. as a direct table-oriented implementation that imports neither the candidate runtime nor the Gate adapter.

The two implementations produced matching semantic receipts across the preregistered publication cases.

**Critical limitation:** both implementations were produced in the same supervisory context. This is a **separate implementation**, not contamination-free independent reproduction. The independent-implementation claim therefore remains unestablished.

### 5.13 Gate vocabulary pressure test

The current Gate successfully hosts the common three-state criterion kernel for many cases, but two semantic distortions were observed.

#### A. `not_applicable`

The current Gate supports only `pass | fail | unknown`.

For an SOP result where the requirement is explicitly out of scope:

- the neutral research runtime returns `not_applicable → requirement_not_applicable`;
- the Gate adapter must coerce `not_applicable` to `pass`;
- the current Gate can therefore produce `promote`, which naively maps to `conformance_supported`.

That is unacceptable semantic distortion if `promote | hold | reject` is treated as universal vocabulary.

#### B. evaluator/runtime failure

The current Gate deliberately catches a thrown criterion and records ordinary `unknown`, producing `hold`.

That is safe against fabricated rejection, but it conflates:

- “the subject is epistemically unresolved” with
- “the evaluator failed to run.”

Those states require different operational handling and should not share one undifferentiated receipt state.

Inference:

The current Gate is a useful primitive but is **not sufficient unchanged as a universal Contract-C decision runtime**.

The reusable part is the named-criterion / pass-fail-unresolved / no-score / no-auto-apply kernel. Action vocabulary and execution-failure semantics should sit outside or above the current primitive.

## 6. AI-agent boundary

The tested architecture keeps five authorities separate:

1. **CAL facts/assessments** — supplied through C-like input;
2. **destination policy/context** — supplied to the decision system;
3. **deterministic evaluation** — pure policy execution over structured state;
4. **action authorization** — explicit human/operator/authorized system requirement;
5. **action execution** — outside this runtime.

No model call exists inside the candidate deterministic kernel.

If a future policy genuinely requires model discretion, it should be represented as an explicit assessment criterion with its own receipt containing model identity, instructions/prompt identity, input references, output, uncertainty/confidence where meaningful, and reason. A model judgment must not hide inside a rule that is described as deterministic.

## 7. Observed evidence

- Decision Engine production remained pinned at `55f108c196ead020b5965c7d4d737464c92bc4a0`.
- Four materially different policies consumed one frozen semantic fixture without reopening raw evidence.
- Fixed C bytes produced different legitimate decisions when destination policy/context changed.
- Same headline CAL verdicts produced different downstream decisions when residual epistemic state differed.
- Malformed input/policy and runtime failure remained non-substantive system states.
- Deterministic receipts replay byte-semantically and hash-stably.
- Policy mutation and criterion ablation behaved as expected.
- Irrelevant telemetry did not alter decision semantics.
- A separate table implementation matched the publication-policy semantic receipts.
- The current Gate cannot represent terminal policy `not_applicable` without coercion and does not separate criterion/runtime failure from substantive unresolved state.

## 8. Inference

The likely reusable Decision Engine kernel is **smaller than a generalized Decision Engine application**:

- validate structured input;
- bind exact input and policy identity;
- evaluate named criteria;
- preserve fail vs unresolved and typed reason;
- represent not-applicable without laundering it into pass/unknown;
- separate invalid/system execution from subject findings;
- emit deterministic receipts;
- never apply external state.

Career Select/Rank should remain a separate head.

The action vocabulary should belong to policy packs, not the generic kernel.

## 9. Hypotheses still open

- Whether a production-quality thin library is preferable to adopting OPA for the eventual runtime.
- Whether DMN becomes preferable if policy authorship is primarily human/tabular rather than developer/policy-as-code.
- Whether Contract C will actually expose all fields used by these synthetic policies after producer-side ablation.
- Whether real MainFrame, publication, SOP, and investigation packets reveal new policy primitives.
- Whether the candidate typed reason taxonomy survives real failure histories without unnecessary proliferation.

## 10. Unresolved unknowns

- contamination-free independent implementation;
- real CAL-produced C1 fixture replay rather than C-like synthetic fixtures;
- real preserved MainFrame incident replay;
- policy authoring/version-distribution operational needs;
- cross-language canonicalization requirements;
- security/adversarial policy sandboxing;
- whether canonical receipt hashing should adopt an external canonical JSON standard rather than this research canonicalizer;
- whether evaluation timestamps belong outside the canonical semantic receipt.

## 11. Falsified alternatives

### Falsified: reuse the career scorer as the common Contract-C decision geometry

No tested gate/conformance policy required weighted Select/Rank semantics.

### Falsified: headline CAL verdict is sufficient downstream state

Same-verdict fixtures produced legitimate different decisions.

### Falsified: one undifferentiated `unknown` is enough for the entire runtime envelope

Malformed input, policy error, runtime error, CAL abstention, resolver unavailability, and not-applicable require different operational handling.

### Falsified: `promote | hold | reject` is a clean universal decision vocabulary

The SOP not-applicable case produces semantic distortion unless action vocabulary is policy-specific.

### Not falsified: a small named-criterion kernel is reusable

The common kernel survived all four consumer probes.

## 12. Smallest next evidence-producing step

Do **not** rewrite production.

Next:

1. obtain actual frozen C1 bytes from CAL #15 / Apparatus #11 once the producer projector exists;
2. replay these four policies against that artifact without changing their semantics;
3. run one genuinely isolated consumer implementation from only the policy/C specification;
4. replay at least one preserved pre-RC1 negative-control incident;
5. only then decide whether any production Decision Engine runtime change is justified.

## Final disposition

**NEEDS ITERATION**
