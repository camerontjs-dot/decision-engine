# Decision Engine Generalization Audit — RC1

**Status:** RESEARCH ARCHITECTURE AUDIT, NOT A PRODUCTION REDESIGN  
**Repository baseline:** `55f108c196ead020b5965c7d4d737464c92bc4a0`  
**Contract-C umbrella:** `camerontjs-dot/apparatus-contracts` branch `research/contract-c-information-sufficiency-rc1`  
**Purpose:** preserve the current evidence, gaps, and proposed Decision Engine research direction before Contract-C consumer experiments begin.

---

## 1. Question

The repository is named Decision Engine, but its original production application is a career comparison tool and its newer Gate primitive has only limited research history.

Before making it the canonical Contract-C consumer, ask:

> **What, if anything, is the reusable decision-system kernel in this repository, and what should remain domain-specific rather than being generalized into the CAL pipeline?**

A second question follows:

> **Do we need a bespoke generalized Decision Engine at all, or only a small deterministic policy runtime plus explicit domain policy packs?**

The answer should be determined by consumer experiments, not by the repository name.

---

## 2. Observed repository state

### 2.1 Production select/rank head is career-specific

`src/decisionEngine.js` is not a domain-neutral decision engine. It contains explicit job/career concepts and hard-coded semantics, including:

- base salary, bonus, equity;
- PTO, onsite days, workload;
- career upside, skill compounding, optionality, autonomy;
- five comparison dimensions: compensation, growth, lifestyle, stability, mission fit;
- relative normalization across compared options;
- user weighting;
- career/job-specific caveats;
- calibrated comparison language.

This implementation is a **select/rank application** for one domain.

Its existing test volume is useful evidence that this application has been exercised, but those tests do not validate a general decision runtime.

### 2.2 A separate generic Gate primitive exists on `main`

`src/gate/gateHead.js` defines a much smaller decision primitive:

```text
item + named bar criteria
        ↓
criterion observations
pass | fail | unknown
        ↓
reject | hold | promote
```

Three design properties are explicit in its source:

1. **unknown is not failure**;
2. **no aggregate score is required** because named criteria preserve which check did the work;
3. **recommendation is separate from application**, including `requiresHumanApproval` and `appliedAutomatically: false`.

Decision precedence is deterministic:

```text
any blocking fail    → reject
otherwise any blocking unknown → hold
otherwise            → promote
```

This is a plausible reusable primitive for policy/gate decisions.

### 2.3 Gate tests establish several useful local invariants

Current `tests/gateHead.test.mjs` verifies, among other things:

- blocking unknown holds rather than rejects;
- blocking fail rejects and names the criterion;
- failure outranks simultaneous unknown;
- thrown criterion execution becomes unknown rather than fabricated failure;
- advisory findings remain caveats;
- operator-only promotion remains unapplied;
- malformed bars are rejected;
- missing resolver state holds;
- quarantined source state rejects under the MainFrame note policy.

This is credible unit-level evidence for the primitive's local semantics.

It is **not** evidence that the Gate abstraction is sufficient for all Contract-C consumers.

### 2.4 MainFrame note promotion is one domain policy

`src/gate/notePromotionBar.js` is explicitly the Gate head's first MainFrame application. It shallow-parses MainFrame note conventions and evaluates criteria such as:

- identifiable claims exist;
- every claim carries a label;
- every claim cites evidence;
- evidence references resolve;
- no cited source is quarantined;
- frontmatter links are declared;
- purpose is stated;
- no placeholders remain.

The parser deliberately returns unknown rather than guessing where it cannot tell.

This is a useful policy/adapter experiment, but several of its criteria concern **document hygiene and lifecycle conventions**, not CAL epistemic results.

### 2.5 Contract-C shadow is policy-specific

The parked `research/contract-c-seam-shadow` adds `src/auditDecisionEngine.js`, which:

- defines an RC0 thin Contract-C projection;
- validates a closed set of CAL verdict/flag/citation/confidence fields;
- maps that C state into the generic Gate item;
- defines a MainFrame-specific audited-claim promotion bar;
- hard-codes such assumptions as full support, high audit confidence, selected citation statuses, no explicit unknowns, and selected blocking/review flags;
- emits a decision receipt with `mainframeStatusMutation: null`.

This is strong evidence that **C state can be separated from downstream policy**.

It is weak evidence that the RC0 C projection or that MainFrame policy is minimal, correct, or general.

---

## 3. What is already solved elsewhere

A generalized Decision Engine should not reinvent mature infrastructure unless the CAL pipeline demonstrates a specific unmet need.

### DMN

OMG Decision Model and Notation already standardizes explicit decision models and decision tables.

Reference: <https://www.omg.org/dmn/>

### OPA / policy-as-code

Open Policy Agent already provides a general structured-input policy evaluator, separates policy decision from enforcement, versions policy/data via bundles, and records decision logs with decision/input/policy identity.

References:

- <https://www.openpolicyagent.org/docs>
- <https://www.openpolicyagent.org/docs/management-decision-logs>
- <https://www.openpolicyagent.org/docs/management-bundles>

### Consequence

Do not claim novelty for:

- named rules/criteria;
- decision tables;
- structured policy input;
- versioned policy;
- policy/evaluation separation;
- auditable decision receipts/logs.

The CAL-specific research value is more likely to be **what trustworthy epistemic state reaches the decision system and how unknown/evidence-relative state is preserved**, not the existence of a rule engine itself.

---

## 4. Leading architectural hypothesis

Do **not** generalize the career scorer into the common runtime.

Instead, test a small head-based architecture:

```text
Decision Runtime
├── canonical input validation
├── policy identity + version/hash
├── deterministic evaluation
├── explicit unknown semantics
├── criterion-level observations
├── decision receipt
├── replay/canonical serialization
└── no external mutation

Decision heads / strategies
├── Gate            ← first candidate common primitive
├── Select/Rank      ← existing career application, separate
└── future heads only if evidence requires them

Adapters
├── Contract-C → MainFrame gate input
├── Contract-C → publication-claim gate input
├── Contract-C → SOP-conformance gate input
└── Contract-C → deviation-readiness gate input

Policy packs
├── mainframe-knowledge
├── publication-claim
├── sop-conformance
└── deviation-readiness
```

Key separation:

```text
Contract C semantic result
        ≠
consumer adapter/projection
        ≠
destination policy
        ≠
decision receipt
        ≠
external state mutation
```

---

## 5. What should probably remain separate

### 5.1 Career Select/Rank

The existing career engine uses relative scoring and preferences across alternatives. That is a legitimate decision class:

> Which option ranks highest under these stated weights and caveats?

It should remain a separate head/application unless another domain genuinely needs the same primitive.

Do not force Contract-C gate decisions into weighted comparison geometry merely to reuse code.

### 5.2 MainFrame document parsing

`parseNoteToGateItem` reads MainFrame Markdown conventions. That belongs in a MainFrame adapter or policy-support package, not in the generic runtime.

### 5.3 CAL semantics

The runtime must not:

- re-run NLI;
- reinterpret evidence passages;
- repair claims;
- infer missing CAL assessments;
- decide evidence eligibility/validity that CAL was supposed to assess;
- convert a CAL abstention into falsity.

If a destination requires a new epistemic assessment, route back to CAL or an explicitly named assessment service rather than silently adding a second audit engine.

### 5.4 External mutation

The runtime should recommend/record. Another authority applies side effects.

For MainFrame this preserves the current operator-only lifecycle boundary.

For a regulated workflow it allows approval/e-signature/change-control systems to remain the authority.

---

## 6. Candidate generic runtime contract

This is a research surface, not an implementation specification.

### Input

```text
decision_request
├── request_id
├── subject identity
├── decision_context
├── evidence/audit input reference(s)
├── policy id/version/hash
└── optional authority / human-review requirement
```

The decision context belongs to the consumer. It may contain facts CAL does not own, such as:

- destination lifecycle state;
- materiality class;
- risk tolerance;
- applicable SOP/process stage;
- cost/time constraints;
- approval authority;
- policy thresholds.

### Criterion result

```text
criterion_result
├── criterion_id
├── policy identity
├── severity / role
├── outcome: pass | fail | unknown
├── observed structured value
├── reason code
└── source/input references
```

Free-form prose may accompany this but should not be the only machine state.

### Decision receipt

At minimum test whether the receipt needs:

- decision ID;
- exact input/C-result identity;
- exact destination policy identity/version/hash;
- decision/outcome;
- criterion results;
- blocking failures;
- blocking unknowns;
- caveats/advisories;
- human-approval requirement;
- execution/runtime version;
- canonical receipt hash;
- `appliedAutomatically: false` or more general authority/application state.

The receipt must not imply that a recommendation was applied.

---

## 7. Important pressure test: is `promote | hold | reject` too specific?

The current Gate uses:

```text
promote | hold | reject
```

That vocabulary fits admission/promotion gates but may be too lifecycle-flavored as a universal runtime result.

RC1 should test two layers:

### Generic evaluation layer

```text
satisfied | unsatisfied | unresolved
```

or an equivalent neutral representation derived from criterion state.

### Policy-specific action recommendation

Examples:

- MainFrame: eligible-for-review / hold / not-eligible-as-written;
- publication: publishable / review-or-narrow / withhold-as-written;
- SOP: conformance-supported / nonconformance-supported / indeterminate;
- deviation: decision-ready / further-investigation / adverse-condition-established.

If `promote | hold | reject` maps cleanly to every tested policy without semantic distortion, keep it.

If not, preserve the criterion evaluation kernel and move the action vocabulary into policy packs.

---

## 8. Testing gaps before generalization

### G1 — domain diversity

Current Gate evidence is dominated by MainFrame promotion semantics.

Need at least three materially different policies before calling the primitive general.

### G2 — policy sensitivity

Hold identical Contract-C bytes fixed and change only destination policy/context.

The runtime must permit different legitimate decisions without modifying C.

### G3 — unknown taxonomy

Current Gate has one generic `unknown` criterion outcome.

Test whether consumers need typed unknown reasons such as:

- input absent;
- CAL abstained;
- criterion not applicable;
- resolver unavailable;
- policy missing;
- malformed input;
- execution failure.

Do not multiply enums unless downstream behavior actually differs.

### G4 — malformed versus adverse

A malformed Contract-C artifact or runtime failure must not become `reject` as if the subject failed the policy.

System failure and substantive adverse finding are different states.

### G5 — deterministic receipts

Identical canonical input + policy + runtime version must produce byte-stable/canonical semantic receipt content, apart from explicitly excluded execution metadata.

### G6 — policy mutation tests

Independently mutate each policy criterion, threshold, severity, and unknown-handling rule.

Require expected decision changes and receipt identity changes.

### G7 — irrelevant-input invariance

Add C fields the policy does not read.

Decision output must remain unchanged while receipt lineage still identifies the full input C object as appropriate.

### G8 — same verdict, different residual evidence

Feed C results with the same CAL headline verdict but different conflict/unknown/counterevidence state.

A policy that declares those differences material must be able to act on them.

### G9 — no hidden IO/model calls

The evaluation kernel should remain pure/deterministic for a frozen request. Resolvers/adapters gather observations before evaluation or emit explicit unresolved state.

### G10 — independent policy implementation

Implement one preregistered policy twice, ideally in different languages or isolated contexts, from the same policy specification and frozen C fixtures.

Compare semantic receipts.

### G11 — decision-policy ablation

Remove policy criteria one at a time.

Record whether behavior actually changes on the fixture suite. A policy criterion that never discriminates may be dead complexity or require better fixtures.

### G12 — action-authority separation

A positive recommendation must never by itself mutate MainFrame or a regulated workflow. Test that mutation is impossible from the pure runtime path.

---

## 9. Proposed first policy packs

These are experimental probes, not production decisions.

### P1 — MainFrame knowledge

Uses Contract-C state plus MainFrame lifecycle/context to decide whether the claim/note may proceed to operator review, needs evidence, needs human review, or is not eligible as written.

Important: current `NOTE_PROMOTION_BAR` document-hygiene checks and the future CAL-audit gate may be two separate gates in sequence rather than one giant bar.

### P2 — publication claim

Uses the exact audited claim and C state to determine whether publication as written clears a defined evidence standard.

Stresses wording, scope, causality, counterevidence, citation state, and unresolved evidence.

### P3 — SOP / requirement conformance

Uses a requirement, applicability/context facts, and Contract-C audit result over the associated evidence/records.

Must distinguish unsupported conformance from supported nonconformance and from insufficient evidence.

### P4 — deviation / investigation readiness

Uses C results about event facts/causal propositions plus process context to decide whether a procedural next decision is supported or further investigation is required.

Stresses competing explanations, temporal state, unresolved blockers, and evidence requests.

---

## 10. Additional later use cases

Do not add these to the first lock gate unless they reveal a missing information family.

### Release / change-control assurance

Can available verification evidence justify a software/model/configuration release or change approval?

### CAPA effectiveness

Does post-action evidence support the claim that the corrective action was effective, while preserving alternative explanations and the observation window?

### Vendor / supplier qualification

Do submitted validation/performance/security claims clear a buyer/QA evidence bar?

### Model/system validation acceptance

Do test results support the intended-use claim actually being approved, rather than merely showing that a test suite ran?

### Incident/postmortem conclusion gate

Are causal/root-cause statements supported enough to become durable findings, or are they hypotheses pending further investigation?

### Requirement/source authority traceability

Does a proposed policy or requirement actually derive from the authoritative source/version claimed?

### Research-to-knowledge promotion

Can a synthesis claim become durable knowledge given the evidence aperture and unresolved disagreement?

### Procurement / technical due diligence

Which vendor/product assertions survive an evidence-defined procurement bar?

These are evidence that the architecture may generalize, not reasons to build eight policy packs now.

---

## 11. Build-versus-adopt experiment

Before expanding custom runtime code, compare three options on the same frozen policies/fixtures.

### A — existing tiny Gate runtime

Pros:

- transparent;
- dependency-free;
- easy to reason about;
- already preserves fail versus unknown;
- easy to keep pure.

Risks:

- policy language may grow ad hoc;
- versioning/schema/logging features could be re-invented poorly;
- limited external interoperability.

### B — DMN-style explicit decision tables

Test whether the policies can be represented more clearly as decision tables and whether a standard representation improves independent implementation/review.

Do not adopt DMN merely for standards signaling.

### C — OPA/Rego-style policy runtime

Test whether mature policy versioning, structured inputs, and decision logging materially reduce custom machinery.

Do not adopt OPA if it creates more operational surface than the small local use case needs.

### Decision criterion

Prefer the smallest option that preserves:

- policy transparency;
- deterministic replay;
- explicit unresolved state;
- independent reproducibility;
- receipt lineage;
- policy versioning;
- side-effect separation.

The experiment can conclude that **no standalone Decision Engine product/runtime is needed**. That is a valid result.

---

## 12. Recommended repository shape if the hypothesis survives

Do not implement until the experiments support it.

```text
src/
  runtime/
    evaluateGate.js
    canonicalize.js
    receipt.js
    policyValidation.js
  heads/
    gate/
    selectRank/          # existing career behavior migrated only if worthwhile
  adapters/
    contractC/
    mainframe/
  policies/
    research-only until promoted

tests/
  runtime/
  policies/
  integration/
  metamorphic/
```

The current career UI can continue to call its select/rank head independently.

No need to turn career weights/caveats into abstractions unless another consumer demonstrates reuse.

---

## 13. Current epistemic compression

### Observed

- The production select/rank engine is career-specific.
- A much smaller generic Gate primitive exists and has direct tests for fail/unknown/advisory/operator-only semantics.
- MainFrame note-promotion logic is an adapter + policy, not generic decision logic.
- The parked Contract-C shadow demonstrates clean separation of CAL result, Gate policy, decision receipt, and MainFrame mutation authority, but only for one provisional policy.
- Generic decision tables/policy engines and decision logging already have mature prior art.

### Inference

The Gate primitive, not the career scorer, is the strongest candidate reusable kernel.

### Hypothesis

A small deterministic policy runtime with domain policy packs is sufficient for the CAL pipeline. Select/rank remains a separate head/application.

### Competing hypothesis

The common layer is even smaller: Contract C plus ordinary existing policy infrastructure is enough, and this repository should remain primarily a collection of tested decision applications rather than become a generalized runtime.

### Evidence that would change the recommendation

- multiple consumers require common behavior not expressible cleanly as named criteria/decision tables;
- select/rank geometry appears across materially different C consumers;
- policy complexity exceeds what the small Gate runtime can make inspectable;
- a mature policy engine demonstrably reduces assurance burden without introducing disproportionate operational complexity.

### Falsifier for premature generalization

If the first four consumer policies share only input validation, policy identity, criterion evaluation, and receipt generation, then building a broad bespoke Decision Engine abstraction beyond those functions is not justified.

---

## 14. Next action

Do not rewrite production Decision Engine now.

Use `research/contract-c-consumer-probe-rc1` to:

1. freeze P1–P4 policy specifications independently of the C schema;
2. implement the smallest research-only C adapters;
3. exercise the existing Gate primitive first;
4. record where the primitive fails to express a legitimate decision;
5. compare a tiny custom runtime with standard decision-table/policy approaches only if complexity appears;
6. decide architecture after consumer-diversity and ablation evidence exists.

The burden of proof is on adding Decision Engine machinery, not on keeping the kernel small.
