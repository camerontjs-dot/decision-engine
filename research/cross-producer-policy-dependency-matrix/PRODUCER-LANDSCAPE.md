# Non-CAL Semantic Authority Producer Landscape

This note is research planning context, not a Contract C amendment or production architecture decision.

## First boundary: Contract C 1.0.0 is not generic today

The released Contract C 1.0.0 specification is explicitly CAL-attributable. A non-CAL system may have the same useful *shape* without being a legitimate Contract C 1.0.0 producer.

The architectural question is therefore broader than “what else can emit C?”:

> What other systems produce an evidence-bound assessment that should remain separate from downstream policy, Authorization, and execution?

Those systems are candidates for a future generalized semantic-authority contract or a sibling contract that preserves the useful C/Decision separation.

## The reusable shape

A strong candidate producer naturally has all or most of these properties:

1. there is an exact subject/assertion/target under assessment;
2. the producer consumes attributable evidence or observations;
3. it may compute typed measurements;
4. it records whether prerequisite assessment stages executed, failed, were adverse, or remained unknown;
5. it emits a bounded conclusion or `not_checkable` rather than an action;
6. it preserves which evidence/state/rules were actually causal versus residual;
7. a separate downstream policy can legitimately make different decisions from the same assessment;
8. Authorization and execution remain later stages.

That last separation is the key. If the producer already decides and executes the action, it is not playing the Contract-C-like role.

## Strongest candidate domains

### 1. Software release / deployment qualification

**Producer:** release qualification evaluator, CI qualification service, software-supply-chain verifier.

**Assessment target:** “candidate build X satisfies qualification profile Y” or a set of typed release assertions.

**Evidence contributions:**

- test-run receipts;
- reproducible-build evidence;
- static/dynamic analysis results;
- signed provenance / build attestations;
- SBOM or dependency evidence;
- migration/conformance results;
- benchmark/regression results.

**Measurement examples:** test pass ratio, performance delta, coverage measure, unresolved finding count, reproducibility agreement.

**Assessment-stage analogues:** artifact eligible for the profile; evidence signatures/semantics valid; qualification aperture complete; evidence current for this build.

**Producer conclusion:** qualified, adverse/contradicted, not-checkable, incomplete, failed.

**Separate Decision examples:** promote to staging, permit release candidacy, require review, hold promotion, require additional qualification evidence.

**Why this is strong:** the same qualification result can legitimately feed different deployment policies. A development branch and a regulated production release can consume the same evidence assessment but impose different decision thresholds and effects.

**CAL Pipeline relevance:** very high. This could use the Pipeline's own frozen experiments and CI receipts as a genuinely non-claim-audit semantic authority domain.

### 2. Model / AI-system evaluation

**Producer:** model evaluation harness, safety evaluator, regression suite, red-team evaluator, benchmark qualification service.

**Assessment target:** “model candidate X satisfies evaluation profile Y for deployment context Z” or individual capability/safety properties.

**Evidence contributions:** eval-case results, adversarial tests, benchmark outputs, calibration tests, robustness checks, policy-violation cases.

**Measurement examples:** task metric, refusal rate, calibration error, regression delta, subgroup metric, failure rate.

**Assessment-stage analogues:** case eligibility, evaluator semantic validity, evaluation-set coverage/aperture, freshness/currentness of model and eval set.

**Producer conclusion:** profile satisfied, profile contradicted, not-checkable, execution incomplete/failed.

**Separate Decision examples:** deploy, shadow, restrict tools, route only low-risk traffic, require human review, reject candidate, roll back.

**Why this is strong:** evaluation and deployment policy are distinct by construction. The same eval result can feed different deployment decisions.

### 3. Data-quality / lineage qualification

**Producer:** dataset quality evaluator, lineage verifier, ingestion qualification service.

**Assessment target:** “dataset snapshot X is fit for declared use/profile Y.”

**Evidence contributions:** schema checks, null/outlier tests, freshness checks, reconciliation records, lineage/provenance attestations, source availability checks.

**Measurement examples:** missingness, drift statistic, freshness age, duplicate fraction, reconciliation delta.

**Assessment-stage analogues:** dataset eligible for profile; validation semantics applicable; required columns/sources checked; snapshot current.

**Producer conclusion:** qualified, adverse, not-checkable, incomplete/failed.

**Separate Decision examples:** publish dataset, quarantine partition, permit training, allow analytics use, request re-ingestion, require steward review.

### 4. Security finding / exploitability assessment

**Producer:** vulnerability verifier, exploitability evaluator, configuration exposure assessor.

**Assessment target:** “finding F is applicable/exploitable in artifact/environment X.”

**Evidence contributions:** scanner observations, dependency graph, runtime reachability, configuration state, VEX-like evidence, exploit tests.

**Measurement examples:** exposure measure or exploitability evidence score only if the producer owns a typed measurement with clear semantics.

**Assessment-stage analogues:** finding applicable to artifact; scanner/finding semantics valid; environment/evidence aperture sufficient; evidence current for deployed version.

**Producer conclusion:** applicable/exploitable, contradicted/not applicable, not-checkable, failed/incomplete.

**Separate Decision examples:** block release, require remediation, open urgent ticket, permit bounded exception, require security review.

**Boundary caution:** severity/risk tolerance and remediation priority are downstream policy, not producer conclusion.

### 5. Compliance / control-effectiveness evaluation

**Producer:** automated control tester, evidence qualification service, compliance assessment engine.

**Assessment target:** “control X operated effectively for scope/period Y” or “evidence package satisfies control test Z.”

**Evidence contributions:** sampled records, logs, approvals, configuration snapshots, attestations, exception records.

**Measurement examples:** exception rate, sample coverage, time-window coverage.

**Assessment-stage analogues:** control/test eligible; evidence semantics valid; sampling/aperture sufficient; evidence period/currentness applicable.

**Producer conclusion:** supported/effective, adverse, not-checkable, incomplete/failed.

**Separate Decision examples:** accept control evidence, open remediation, request more evidence, block regulated release, escalate to human reviewer.

**Why this is strong:** it maps naturally onto assurance work while keeping risk tolerance and organizational action policy downstream.

### 6. Incident diagnosis / causal hypothesis evaluation

**Producer:** diagnostic evaluator over logs, traces, metrics, deploy history and experiments.

**Assessment target:** “deployment/change/component X is the supported cause of incident symptom Y.”

**Evidence contributions:** traces, logs, metric changes, change events, rollback experiments, dependency observations.

**Measurement examples:** temporal/correlation measures or controlled experiment results where warranted.

**Assessment-stage analogues:** hypothesis eligible; diagnostic semantics valid; telemetry aperture sufficient; evidence temporally applicable.

**Producer conclusion:** supported cause, contradicted, unresolved/not-checkable.

**Separate Decision examples:** roll back, isolate service, page owner, gather more evidence, continue diagnosis.

**Boundary caution:** this is a harder domain because causal claims and incomplete observability make producer semantics substantially richer than the current simple Contract C examples.

### 7. Research / experiment qualification

**Producer:** experiment evaluator that assesses whether a frozen experiment establishes a preregistered result.

**Assessment target:** “experiment E supports/falsifies bounded hypothesis H under frozen conditions.”

**Evidence contributions:** test runs, mutation tests, independent reproductions, receipts, falsifiers, conformance checks.

**Measurement examples:** experiment-specific metrics where they are actually causal.

**Assessment-stage analogues:** experiment eligible; evaluator valid; evidence aperture complete; artifacts current and exactly bound.

**Producer conclusion:** supported, falsified/adverse, inconclusive/not-checkable, evaluator failed.

**Separate Decision examples:** open successor experiment, promote smallest implementation change, hold promotion, require reproduction, archive terminal result.

**Why this is especially interesting for CAL Pipeline:** it would make Decision Engine decide over research evidence without asking CAL to audit a natural-language claim. It is probably the cleanest first domain to test whether the machinery generalizes beyond claim audit.

### 8. Document / record verification

**Producer:** extraction verifier, reconciliation engine, record integrity checker.

**Assessment target:** “extracted/received record R matches authoritative evidence under profile P.”

**Evidence contributions:** source document spans, database records, signatures, cross-system reconciliation entries.

**Producer conclusion:** verified, contradicted/mismatched, not-checkable.

**Separate Decision examples:** auto-post, accept into system of record, route to human review, reject import.

### 9. Vendor / artifact due-diligence assessment

**Producer:** due-diligence evidence evaluator.

**Assessment target:** bounded factual/assurance requirements for a vendor, package, or external service.

**Evidence contributions:** certifications, audit reports, security documentation, test results, contractual evidence, external verification.

**Producer conclusion:** requirement established, contradicted, not established/not-checkable.

**Separate Decision examples:** approve onboarding, require compensating controls, request evidence, reject procurement.

**Boundary caution:** commercial preference and risk appetite are downstream policy and must not leak into the evidence assessment.

## Near-boundary candidates

### Identity / credential verification

A credential verifier can produce evidence that identity/credential assertions are valid and current, after which policy decides whether access is appropriate. This has the right evidence/decision split, but the downstream side quickly becomes Authorization. It may therefore be better treated as semantic authority feeding Contract E or an authorization policy rather than as the first generic Decision experiment.

### Fraud / anomaly assessment

A detector can emit attributable adverse/unknown state that a policy turns into review, restriction, or escalation. The architecture fits, but learned scores and high-stakes operational consequences make it a poor first experiment for isolating the primitive.

### Forecast / capacity assessment

A forecast can be evidence-bound and feed a scale/procurement decision, but a forecast is future-state probabilistic output rather than the current proposition/contribution semantics demonstrated by C 1.0.0. It likely needs a richer contract.

## Poor fits

These should not be forced through a Contract-C-like seam merely because a Decision follows them:

- **task scheduler / workflow runner:** produces work state, not an evidence-backed semantic assessment;
- **raw monitoring/telemetry stream:** observations exist but no bounded conclusion has been formed;
- **planner recommendation:** often mixes evidence, preferences and action selection in one output;
- **authorization engine:** already answers whether an action is permitted, which belongs later in the CAL Pipeline separation;
- **execution receipt:** says what happened, not what should be decided from an epistemic assessment;
- **generic classifier score:** lacks explicit evidence attribution, causal basis, aperture and typed assessment semantics unless wrapped by a stronger evaluation layer.

## Best next external-domain pressure test

The strongest first candidate is **research/release qualification**, with model evaluation second.

A small experiment could take a frozen software candidate plus independent test/conformance/reproduction receipts and have an evaluator emit a generalized C-like semantic authority:

`candidate build -> qualification evidence -> assessment/result authority -> Decision policy -> candidate effect`

Two downstream policies could then consume the same assessment, for example:

- research policy: `PASS + reproduction present -> eligible_for_successor_or_promotion_review`;
- production-release policy: `PASS + stricter aperture/currentness requirements -> release_candidate or HOLD`.

If the same shared Decision kernel handles claim-audit C and release-qualification authority without domain identity branching, that would be much stronger evidence of a real primitive than a second claim evaluator alone.

## Contract implication

If this broader architecture survives testing, do not silently reinterpret Contract C 1.0.0. The likely choices would be:

1. a new major Contract C version whose producer and semantic vocabulary are genuinely producer-neutral; or
2. a sibling generalized **Semantic/Assessment Authority Contract** from which CAL Contract C is one specialized producer-facing profile.

Which is smaller and safer depends on how much of C's current vocabulary (`proposition`, `contribution`, `measurement`, `assessments`, `conclusion`, `basis_members`, execution and exact input binding) survives a real non-claim-audit producer without metaphorical renaming.