# Decision Engine v1.0.0 Pressure Test RC0 — Test Matrix

## Subject and execution form

Subject under test: the published `decision-engine-v1.0.0-source.tar.gz` asset from GitHub Release `v1.0.0`, SHA-256:

`c440d5de2a3853db9f4ccc2ba37d273e29ce8d9e71e0d646fc0c20eee0cd5902`

The workflow independently rebuilds the deterministic source archive from exact release commit `7be709b2141c767c5da89b8b94cf90233c4238fe`, requires byte equality with the published asset, extracts the published asset, and runs all Decision policy pressure against the extracted release tree.

## Maintained policy coverage

### Policy A

`decision-engine.contract-c.supported-claim-verification@1.0.0`

Required observations:

- supported assessed proposition -> CLEAR;
- contradicted -> HOLD;
- unsupported -> HOLD;
- overstated -> HOLD;
- needs_source -> HOLD;
- not_checkable completion -> HOLD;
- missing proposition -> FAILED;
- wrong whole-object C digest -> reject;
- wrong expected B binding -> reject;
- wrong C authority root -> reject;
- unknown policy version -> reject;
- stale same-ID changed-content target -> reject.

### Policy B

`decision-engine.contract-c.causal-basis-citation@1.0.0`

Required observations:

- causal-basis support contribution -> CLEAR;
- causal-basis counterevidence contribution -> CLEAR even when Policy A HOLDs a contradicted claim;
- joint/independent basis contributions -> each exact basis link CLEAR;
- residual contribution -> HOLD;
- not_checkable proposition -> HOLD before basis promotion;
- missing contribution -> FAILED;
- stale same-ID changed-passage target -> reject;
- cross-case citation replay -> non-positive.

## Domain-shaped valid-C cases

| Case | Domain | C headline/completion | Expected Policy A | Expected Policy B |
|---|---|---|---|---|
| mainframe-supported-single | MainFrame synthesis | supported / assessed | CLEAR | deciding citation CLEAR |
| sop-supported-joint | SOP / controlled requirement | supported / assessed, joint basis | CLEAR | both basis links CLEAR |
| literature-supported-alternatives | source literature | supported / assessed, independent alternatives | CLEAR | both basis links CLEAR |
| literature-contradicted | source literature | contradicted / assessed | HOLD | exact deciding counterevidence CLEAR |
| quality-unsupported | regulated quality | unsupported / assessed | HOLD | exact causal contribution CLEAR if basis-declared |
| sop-overstated-residual | SOP / controlled requirement | overstated / assessed | HOLD | retained residual link HOLD |
| credential-needs-source | credential/provenance | needs_source / assessed | HOLD | no citation target |
| ambiguous-not-checkable | ambiguous/unclassified | not_checkable | HOLD | no positive citation surface |
| mainframe-supported-redundant | MainFrame synthesis | supported / assessed, residual only | CLEAR | residual citation HOLD |

These are exact-validator-valid consumer pressure objects, not claims of CAL reachability or real-world truth.

## Fresh released-producer control

Exact CAL `v0.5.0` at `5533bbcf27a3ee3a7d901f7dfc44c241bc558e2c` runs against its own minimal locked Contract-B fixture and freshly exports Contract C 1.0.0. Every resulting proposition/contribution is then evaluated through the published Decision Engine artifact according to the two maintained V1 predicates.

## Binding and stale-replay pressure

- C A + claim target from B;
- C A + citation target from B;
- same proposition ID with changed immutable text hash and stale target;
- same contribution ID with changed immutable passage hash and stale target;
- caller-supplied `policyRegistry`/`evaluatorCallback` objects must be behaviorally inert;
- unknown policy identity must not fall through.

## Metamorphic pressure

- repeat exact inputs five times;
- reorder context object-key insertion order;
- supported -> contradicted must flip Policy A CLEAR -> HOLD;
- basis -> residual must flip Policy B CLEAR -> HOLD while Policy A remains CLEAR;
- adverse/failed generic assessment slots intentionally reproduce the already-documented V1 invariance rather than being misreported as a new finding.

## Contract D downstream pressure

Every ordinary and FAILED Decision is independently validated/canonicalized by released Contract D and consumed under exact applicability expectation.

Required:

- CLEAR -> `candidate_for_authorization` only;
- HOLD -> `hold`;
- FAILED -> `evaluation_failed`;
- wrong target -> `not_applicable`;
- wrong input authority -> `not_applicable`;
- wrong operation on completed Decision -> `not_applicable`;
- effect substitution cannot satisfy the original request;
- metadata mutation does not change semantic identity;
- no Authorization or execution occurs.

## Known Contract-B authority aperture replay

Replay the exact prior real-CAL object and Contract-B index from Decision Engine PR #49 evidence head `570104216ef104ea8d3ba00f9383402b9c2e3154` through the published v1.0.0 artifact.

For each coherent C-internal substitution while top-level B bundle identity remains fixed:

- exact indexed Contract C validation must reject;
- released V1 bundle-level ingress is expected to retain its documented behavior and may CLEAR if the mutated C is otherwise valid and fresh-targeted;
- changed C whole-object identity must propagate into Contract D.

This is a regression/limitation replay. It is not preregistered as a new defect.

## Capability pressure

Confirm absence rather than emulate:

- MainFrame note lifecycle promotion;
- controlled-document approval;
- regulated publication/use approval;
- typed human-review requirement;
- evidence remediation/retrieval request;
- task dispatch;
- release/qualification approval;
- aggregate multi-claim approval;
- conditional approval;
- explicit negative action such as reject/retract/remove.

A later experiment may select one of these. RC0 does not broaden V1 policy semantics.
