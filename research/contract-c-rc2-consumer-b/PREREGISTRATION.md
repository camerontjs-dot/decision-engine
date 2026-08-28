# Contract C RC2 Consumer B — Clean-Room Preregistration

Status: **FROZEN BEFORE CANDIDATE SEMANTIC INSPECTION**

## Authority and input boundary

This experiment uses only the frozen handoff at:

- repository: `camerontjs-dot/apparatus-contracts`
- commit: `213ed9e912b922bd5c57ef58009eb6b0d7fff398`
- directory: `handoffs/contract-c/rc2-consumer-b/`
- allowed-input authority: that commit's `MANIFEST.json`

At preregistration time, only `MANIFEST.json`, `INTERFACE-NOTES.md`, the exact handoff directory listing, and live Decision Engine `main` routing metadata were read. The Contract-C candidate payload has not been semantically inspected. Apparatus Contracts PR #13, producer implementation/tests/workflow/comments/evaluator/results, CAL RC2-C/RC2-D internals, Claim Audit Lab implementation/traces outside the handoff, historical Consumer-B research artifacts, and expected Consumer-B outputs are forbidden.

### Recorded transport-verification deviation

The task requested transport/identity verification before semantic work. The execution runtime could not resolve `raw.githubusercontent.com`, and the available GitHub content action would expose the candidate bytes directly to the experiment context. To avoid pre-preregistration semantic exposure, preregistration is committed first. Exact transport and identity verification will be completed immediately afterward and before any candidate semantic interpretation. This deviation is part of the evidence record and must be considered when assigning the terminal result.

## Consumer responsibilities

A legitimate downstream consumer must be able to operate from the frozen handoff alone and must:

1. verify and preserve exact result-set identity;
2. preserve Contract-B bundle identity, hash, and contract version;
3. preserve proposition identities and text hashes;
4. preserve evidence/passage identities and hashes through explicit references rather than filenames or array positions;
5. reject unresolved or broken references instead of guessing;
6. distinguish execution state from subject-matter conclusion;
7. preserve `not_performed` as distinct from any completed negative/adverse assessment;
8. preserve necessary, residual, retained, and non-deciding contribution state when explicitly represented;
9. preserve exact decision/measurement-basis references;
10. preserve rule-role or causal-form state only when explicitly represented;
11. preserve unknown/absent state without inventing defaults;
12. produce a deterministic consumer-owned normalized representation without creating new CAL assessments;
13. keep copied identity, candidate-attributable semantic state, consumer-derived presentation, and downstream policy output visibly separate;
14. hold candidate bytes fixed while materially different downstream policies produce their own outputs;
15. fail closed on malformed or semantically uninterpretable mutated copies.

## Explicit failure conditions

The bounded reproducibility claim fails if any legitimate interpretation or use requires one or more of:

- producer-private implementation knowledge or traces;
- an invented assessment, default, causal relation, provenance relation, or execution result;
- treating `not_performed` as a performed negative/adverse judgment;
- silently dropping an explicitly retained/residual/non-deciding contribution;
- inferring references from array order, filenames, or implementation-private naming;
- unresolved material ambiguity that changes downstream meaning and is not resolved by the handoff;
- changing the frozen candidate to accommodate a destination policy;
- accepting broken identities/references by guessing or repair;
- contamination by forbidden producer/CAL/expected-output material.

If the apparatus or isolation boundary cannot discriminate these conditions, the result is `INCONCLUSIVE` rather than `REPRODUCIBLE`.

## Intended output representation

The consumer will emit one deterministic JSON representation with these top-level conceptual partitions:

- `binding`: copied and verified immutable identities/hashes;
- `cal_state`: semantic state explicitly attributable to the Contract-C candidate;
- `consumer_view`: normalized presentation derived deterministically from the candidate without new CAL judgments;
- `policy_results`: outputs of separately preregistered downstream policies;
- `validation`: reference-integrity and fail-closed diagnostics.

Canonicalization will be consumer-owned and deterministic. Ordering will be derived from stable explicit identities, not source array positions. No field may migrate from `policy_results` back into `cal_state` or the frozen candidate.

## Semantic invariants

1. **Identity preservation:** identities/hashes are copied and checked, not reconstructed from filenames/order.
2. **Execution/conclusion separation:** execution state and subject-matter judgment remain distinct dimensions.
3. **Not-performed preservation:** `not_performed` cannot be normalized into false/fail/adverse/negative.
4. **Contribution preservation:** explicitly represented necessary/residual/non-deciding state survives normalization.
5. **Basis preservation:** decision/measurement basis references remain exact and resolvable.
6. **No default fabrication:** absent or unknown state stays absent/unknown unless the candidate explicitly supplies a value.
7. **Reference closure:** every explicit proposition/evidence/passage/contribution/basis reference must resolve uniquely by explicit ID/hash.
8. **Policy firewall:** downstream policy may read candidate-derived state but cannot rewrite candidate/CAL state.
9. **Byte immutability:** policy execution and mutation controls operate on copies; the frozen candidate hash must remain unchanged.
10. **Order independence:** semantic output must not depend on source array order when explicit identities provide the binding.

## Mutation and metamorphic controls

All controls operate on copies of the frozen candidate only. No repair is allowed.

Targeted fail-closed mutations:

- remove a referenced contribution;
- break a referenced passage identity/hash;
- break a proposition identity/hash;
- remove explicitly required basis state;
- malformed `not_performed` execution state;
- silently remove an explicitly residual/non-deciding contribution;
- alter Contract-B bundle binding/version/hash;
- malformed execution-state value;
- duplicate an explicit ID to create ambiguous reference resolution.

Metamorphic controls:

- reorder candidate arrays while preserving all explicit IDs and values; normalized semantics should remain invariant;
- change only downstream policy selection/parameters; candidate bytes and `cal_state` should remain invariant;
- rename local input/output filenames without changing bytes; semantic result should remain invariant.

## Information expected to be directly derivable

Only if explicitly present in the handoff/candidate, the consumer expects to derive:

- result-set identity;
- Contract-B bundle ID/hash/version binding;
- proposition identities and text hashes;
- evidence/passage identities and hashes;
- execution states;
- subject-matter assessment/conclusion state;
- contribution roles/states, including residual/non-deciding distinctions;
- decision/measurement basis references;
- any explicitly represented rule-role/causal-form state.

The consumer does **not** preregister any expected case-level values or expected policy decisions.

## Ambiguity / missing-information criterion

A field/state is promotion-critical ambiguous when two competent consumers, using only supplied bytes and explicit interface notes, could reasonably map it to materially different downstream meanings and the handoff provides no rule that resolves the difference. For each discovered ambiguity the experiment will record:

- exact field/state;
- competing interpretations;
- whether the handoff resolves it;
- whether producer-private knowledge or a new contract rule would be needed;
- whether it materially changes downstream use.

Missing information is not repaired. If a required consumer responsibility cannot be satisfied without inventing state, the experiment records failure.

## Preregistered downstream policies

These are consumer probes only, not proposed Decision Engine production policy.

### Policy A — conservative review routing

Deterministic intent: route a proposition to `manual_review` whenever the candidate exposes any unperformed/unknown execution state, any unresolved binding, or any explicitly residual/non-deciding contribution that remains relevant to interpretation. Otherwise emit `eligible_for_automated_followup`.

This policy is deliberately risk-averse and treats uncertainty as a routing reason, not as a CAL judgment.

### Policy B — evidence-presence triage

Deterministic intent: produce one of `has_deciding_basis`, `has_only_nondeciding_or_residual_basis`, or `no_completed_basis_available`, solely from explicitly represented completed basis/contribution state. `not_performed` remains non-completion and cannot be treated as adverse evidence.

This policy has a different action vocabulary and objective from Policy A. Neither policy may modify candidate/CAL state.

## Exact contamination boundary

Contamination occurs if the experiment context is exposed to any forbidden producer-side implementation, tests, workflow code, comments, evaluator logic, field-source/justification records, ablations, weak-candidate controls, producer-boundary capture, telemetry/semantic-firewall results, CAL implementation/evaluator internals, historical Consumer-B expected outputs, or prior reasoning that states what Consumer B should produce.

If contamination occurs before the decisive consumer run, the run must not be characterized as clean-room independent reproduction.

## Decision rule

- `REPRODUCIBLE`: the frozen handoff alone supports deterministic legitimate consumption satisfying the preregistered responsibilities, fail-closed controls, policy firewall, and no material unresolved semantic ambiguity.
- `NOT REPRODUCIBLE`: legitimate consumption requires producer-private knowledge, invented state, semantic guessing, or violates a preregistered invariant.
- `INCONCLUSIVE`: the experiment or isolation boundary cannot discriminate reproducibility.

The standard terminal research disposition is assigned separately after the bounded result.