# Decision Engine v1.0.0 Pressure Test RC0

## Classification

Research Infrastructure / post-release pressure test.

This branch starts from the exact released Decision Engine `v1.0.0` commit:

`7be709b2141c767c5da89b8b94cf90233c4238fe`

The release object is immutable. This experiment must not modify maintained `src/**`, `scripts/**`, release metadata, Contract C/D, Authorization, or execution behavior.

Keep the research PR Draft regardless of outcome. A finding may justify a later bounded maintenance or policy experiment, but this PR is an evidence record, not promotion authority.

## Question

How does the released Decision Engine v1.0.0 behave under a broader pressure campaign that combines:

1. exact released-artifact execution;
2. both maintained policies and every reachable disposition;
3. domain-shaped claim contexts spanning MainFrame knowledge, SOP/controlled-process text, source literature, quality/compliance evidence, and unsupported/ambiguous material;
4. cross-object and cross-domain binding attacks;
5. metamorphic and determinism checks;
6. exact Contract D downstream applicability;
7. explicit capability-gap analysis for decision requirements v1.0.0 cannot express.

## Exact released surface under test

Decision Engine v1.0.0 contains exactly two maintained Contract C policies:

- `decision-engine.contract-c.supported-claim-verification@1.0.0`
  - target: `claim`
  - effect: `knowledge.add_verified_tag@1(scope=claim)`
- `decision-engine.contract-c.causal-basis-citation@1.0.0`
  - target: `claim-evidence-link`
  - effect: `knowledge.cite_as_evidence@1`

Both consume exact Contract C 1.0.0 and emit exact Contract D 1.0.0. A CLEAR is only a candidate for later Authorization.

## Frozen external authorities

- Decision Engine release: `7be709b2141c767c5da89b8b94cf90233c4238fe`
- Contract C 1.0.0 release: `5fe55f9ed5d0ee9f026ca1b077e9d70ce0487ea1`
- Contract C tag object: `6bd135a948e407212b2e77ec18ac5c402f93565e`
- Contract C validator blob: `9c75ccfbf2223578a8d1a7bf0c39673b394fbea4`
- Contract D 1.0.0 release: `298a1a0f7b7b6d7712e11200d04faec3e1ca169b`
- Contract D tag object: `6eadd688b482f3c9fce2ce5e7a2841089d852096`
- Claim Audit Lab release used for the real-producer control: `v0.5.0`

CAL v0.5.0 is a legitimate producer control because that release explicitly exports Contract C 1.0.0. This RC0 does not claim the unfinished successor CAL semantics.

## Evidence classes

The campaign distinguishes three evidence classes.

### A. Real released-producer control

Run CAL v0.5.0 from its released source against its own locked minimal Contract-B fixture and export fresh Contract C 1.0.0 bytes. Feed those exact bytes to released Decision Engine v1.0.0.

This is the strongest producer-reachability control in RC0.

### B. Exact-validator-valid consumer pressure cases

Construct domain-shaped Contract C variants from released Contract C authority, recompute canonical whole-object identity, and require the released validator to accept every case before Decision evaluation.

These cases test Decision Engine policy/authority behavior only. They do **not** claim current CAL producer reachability, real-world truth, or independently qualified Contract-B evidence worlds.

### C. Capability-gap probes

Record desired downstream decision questions that are not represented by either maintained v1.0.0 policy. These are not forced through an approximate policy. Unsupported desired decisions remain capability gaps.

## Domain-shaped cases

At minimum exercise:

1. **MainFrame knowledge synthesis**
   - supported atomic note claim;
   - intended current use: candidate verified-tag + deciding citation.
2. **SOP / controlled process requirement**
   - supported requirement statement;
   - desired broader use: approve/reject controlled requirement or document state.
3. **Source literature finding**
   - supported and contradicted proposition variants;
   - citation policy must discriminate exact deciding evidence independently from claim-verification disposition.
4. **Regulated quality/compliance statement**
   - adverse/overstated or unsupported statement;
   - positive verified-tag decision must not leak.
5. **Credential / provenance statement with missing source**
   - HOLD / no invented verification.
6. **Ambiguous or unclassified statement**
   - not-checkable HOLD / no positive citation surface.

The wording is deliberately domain-shaped but synthetic. Semantic/world correctness is not the test oracle.

## Pressure lanes

### 1. Released artifact / exact identity

- checkout exact Decision Engine release commit;
- independently verify `v1.0.0^{}` equals that commit;
- keep `src/**` and `scripts/**` byte-identical to release throughout the experiment.

### 2. Maintained policy exhaustiveness

Exercise both policies across:

- CLEAR;
- HOLD;
- FAILED;
- unsupported policy identity;
- invalid target binding;
- wrong whole-object Contract C identity;
- wrong expected Contract B top-level binding;
- wrong Contract C authority root.

### 3. Cross-object / stale binding

Attack with individually plausible pieces that do not belong together:

- case A Contract C + case B claim target;
- case A Contract C + case B citation target;
- same logical target ID with changed immutable target content;
- stale target replay after Contract C authority changes;
- policy/effect cross-use downstream.

No valid-but-misbound combination may acquire a positive Decision.

### 4. Metamorphic invariance / sensitivity

- metadata-only Decision changes must not change semantic identity downstream;
- policy-ignored Contract C state may remain disposition-invariant only where documented;
- policy-critical verdict/basis/completion changes must change disposition as specified;
- object-key insertion order must not change canonical Contract D bytes;
- exact repeated inputs must produce byte-identical output.

### 5. Downstream Contract D firewall

For exact applicability expectations:

- CLEAR -> `candidate_for_authorization`;
- HOLD -> `hold`;
- FAILED -> `evaluation_failed`;
- wrong operation/effect/target/authority -> `not_applicable` or validation rejection as defined by Contract D;
- no case may produce operational Authorization or execution.

### 6. Library / CLI parity

The released exact-authority CLI and library runtime must agree on at least the real CAL control and one domain-shaped positive claim case.

### 7. Capability-gap map

Explicitly test whether v1.0.0 has a maintained policy/effect for each desired decision below. Absence is recorded, not emulated:

- approve a MainFrame synthesis note for lifecycle promotion;
- approve/reject an SOP or controlled document;
- approve a regulated claim for publication/use;
- require human review as a typed Decision outcome/effect;
- request evidence remediation/retrieval;
- dispatch a task;
- approve a release or qualification artifact;
- express document-level or multi-claim aggregate approval;
- represent conditional approval / approve-with-caveats;
- represent a negative action such as reject/remove/retract independently of HOLD.

The expected starting observation is that v1.0.0 intentionally exposes only verified-tag candidacy and exact evidence-citation candidacy. RC0 must verify rather than broaden that surface.

## Primary falsifiers

RC0 weakens or falsifies the released surface if any tested case demonstrates one of the following:

1. a cross-case, stale, or misbound target acquires CLEAR;
2. a HOLD or FAILED Decision becomes `candidate_for_authorization` under exact Contract D applicability;
3. unknown policy identity falls through to a maintained evaluator;
4. caller-controlled evaluator/registry substitution affects maintained results;
5. exact repeated input is nondeterministic;
6. CLI and library disagree for equivalent exact inputs;
7. released artifact behavior differs from the checked-out released tree;
8. an invalid authority root is accepted;
9. a policy-critical metamorphic change is decision-invariant unexpectedly;
10. a supposedly irrelevant change alters disposition without a declared dependency.

## Known boundaries carried into RC0

Do not relabel these as new discoveries unless new evidence changes them:

- maintained ingress binds Contract B top-level identity but does not independently authenticate the complete Contract B evidence index;
- current supported-claim policy does not treat generic Contract C assessment-stage values as decision-bearing once its declared execution/verdict predicate is satisfied;
- producer semantic/policy identity is not separately allowlisted beyond exact Contract C validity;
- Contract C research `non_deciding` successor semantics are outside v1.0.0;
- no Authorization or execution surface exists.

## Disposition taxonomy

Record each observation as one of:

- `CONFORMS`
- `RUNTIME_DEFECT`
- `AUTHORITY_OR_BINDING_DEFECT`
- `EVALUATOR_OR_HARNESS_DEFECT`
- `CAPABILITY_GAP`
- `UPSTREAM_REACHABILITY_GAP`
- `INCONCLUSIVE`

A capability gap is not automatically a v1.0.0 defect. The release compatibility promise is intentionally narrow.

## Stop boundary

No merge, tag, release, production promotion, Contract amendment, Authorization, execution, or maintained runtime modification is authorized by RC0.
