# Decision Engine RC1 — Build versus Adopt Comparison

**Purpose:** compare the smallest justified decision-policy mechanism with existing decision/policy infrastructure.  
**Status:** research comparison, not a framework-selection decision.

## 1. The actual requirement exposed by RC1

The four consumer probes do not require a large “decision engine” application.

The demonstrated common requirements are:

- consume structured Contract-C-like result state plus destination context;
- bind exact input and policy identity;
- evaluate named criteria deterministically;
- preserve fail, unresolved, and not-applicable semantics;
- distinguish malformed/system execution from substantive findings;
- retain criterion-level observations/reasons;
- emit a replayable decision receipt;
- carry human/agent approval requirements;
- never apply external state.

Everything else should justify itself separately.

## 2. Existing tiny Gate

### What it already does well

Production `src/gate/gateHead.js` already provides:

- named criteria;
- `pass | fail | unknown`;
- blocking versus advisory severity;
- deterministic precedence;
- no aggregate score;
- explicit human-approval metadata;
- `appliedAutomatically: false`;
- a pure no-I/O evaluation function.

This is real reusable code.

### What RC1 found missing for a universal Contract-C runtime

- no criterion-level or policy-level `not_applicable`;
- fixed `promote | hold | reject` vocabulary;
- a thrown evaluator criterion becomes ordinary `unknown`, obscuring system failure;
- no exact input artifact hash;
- no policy content hash;
- no canonical receipt hash;
- no explicit invalid-input / invalid-policy / system-error envelope;
- no policy-specific action vocabulary beyond an external adapter.

### Assessment

**Partially reusable, not sufficient unchanged.**

The valuable kernel is its explicit named-criterion/no-score/fail-versus-unknown behavior, not the lifecycle-specific action labels.

## 3. Research thin runtime

The RC1 research runtime adds only what was needed to test the gaps:

- neutral criterion outcomes plus scoped `not_applicable`;
- typed execution envelope;
- declarative research policies;
- input/policy/context hashing;
- deterministic decision receipt;
- destination-specific recommendation mapping;
- action separation.

It is intentionally dependency-free and research-only.

### Assessment

Useful as an **experimental reference implementation**, but its existence is not evidence that the project should maintain a bespoke production policy engine.

## 4. DMN-style decision tables

OMG DMN 1.5 is a formal standard for decision models and includes machine-readable normative artifacts. DMN is specifically intended to represent decision logic and decision tables in a form that can be discussed, validated, and executed by conforming tooling.

### Fit

Strong when:

- policy owners want explicit tables/decision models;
- human review of business logic is central;
- policy has stable tabular conditions and outputs;
- interoperability with DMN tooling matters.

### Gaps the CAL pipeline would still need to profile

DMN by itself does not establish the CAL-specific receipt semantics required here:

- exact Contract-C input hash/binding;
- CAL policy/result lineage;
- explicit distinction between runtime failure and adverse finding;
- required unknown/not-applicable conventions;
- canonical receipt hashing;
- human/agent action authorization boundary.

Those could be represented in a DMN profile/wrapper, but that is additional project work.

### RC1 assessment

**Plausible adoption path if policy authorship becomes table-centric. Not yet justified as a dependency.**

## 5. OPA / Rego-style policy evaluation

OPA is a mature general-purpose policy engine for structured input. Its documented architecture explicitly separates policy decision-making from enforcement. OPA supports multiple evaluation/integration modes, policy/data bundles, and decision logs.

Decision logs can carry decision IDs, input, result, policy path, and bundle revision metadata, which overlaps materially with the lineage/receipt problem this project would otherwise need to build.

### Fit

Strong when:

- policies become numerous or shared across services;
- policy distribution/versioning matters;
- policy needs declarative structured-data logic beyond simple tables;
- independent enforcement points need the same policy;
- policy decision logging is operationally valuable.

### Gaps the CAL pipeline would still need to define

OPA does not automatically supply the epistemic semantics of this project. A CAL profile would still need:

- C/result schema and exact input binding;
- explicit fail/unknown/not-applicable rules;
- strict non-laundering of system errors into subject findings;
- deterministic semantic receipt projection/hash;
- approval/action state;
- model-assessment receipts where nondeterministic judgment is unavoidable.

OPA decision logs are useful evidence infrastructure, but they are not automatically the same thing as the canonical decision receipt defined by this research.

### RC1 assessment

**The strongest existing candidate if the project later needs a real shared policy runtime.** The current four policies do not yet justify paying the operational/dependency cost.

## 6. Small prototype comparison

RC1 effectively tested three representations of the same publication policy:

1. the current Gate via an adapter;
2. a tiny declarative runtime;
3. a direct table-oriented implementation.

The table and declarative runtime reproduced the same semantic decisions on the frozen cases. The current Gate reproduced the common pass/fail/unknown kernel but lost policy-level `not_applicable` and system-error distinctions without a wrapper.

This result reduces the architecture question:

> the hard requirement is the semantic profile and receipt, not a proprietary evaluation algorithm.

## 7. Decision

### Observed

- a small deterministic kernel is enough for all four synthetic consumer policies;
- the current Gate needs wrapper/new semantics for not-applicable and system failures;
- a second table representation reproduces the publication policy;
- mature external systems already cover general policy/decision mechanics.

### Inference

A substantial bespoke generalized Decision Engine is currently unjustified.

### Current preference, bounded

- keep career Select/Rank separate;
- retain the Gate as a useful local primitive;
- keep RC1's richer runtime research-only;
- define the semantic decision/receipt profile before selecting an engine;
- if shared policy infrastructure becomes necessary, prototype OPA first;
- if human-owned tabular policy becomes dominant, prototype DMN tooling.

### Falsifier for this preference

Reconsider building more bespoke machinery only if a required CAL-pipeline semantic cannot be represented transparently and reproducibly with a small wrapper/profile around mature policy infrastructure or a tiny local evaluator.

## References checked for RC1

- OMG DMN 1.5: https://www.omg.org/spec/DMN/1.5
- OMG DMN overview: https://www.omg.org/dmn/
- OPA documentation: https://www.openpolicyagent.org/docs
- OPA integration/evaluation modes: https://www.openpolicyagent.org/docs/integration
- OPA decision logs: https://www.openpolicyagent.org/docs/management-decision-logs
- OPA bundles: https://www.openpolicyagent.org/docs/management-bundles
