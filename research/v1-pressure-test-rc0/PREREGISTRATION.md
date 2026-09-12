# Decision Engine v1.0.0 Pressure Test RC0 — Preregistration

## Subject

Published Decision Engine `v1.0.0` only.

Exact release commit:

`7be709b2141c767c5da89b8b94cf90233c4238fe`

The research harness must consume the published deterministic release tarball and verify it byte-for-byte against an independently rebuilt archive from the exact release commit before evaluating Decision behavior.

## Primary hypothesis

Within its declared bounded compatibility surface, Decision Engine v1.0.0 will preserve exact authority/target/policy bindings, deterministic Decision materialization, and Contract D applicability across fresh CAL-produced input, domain-shaped valid Contract C states, stale/cross-case replay, CLI/library invocation, and downstream consumption.

## Primary falsifiers

The hypothesis is weakened or falsified if any tested case shows:

1. cross-case or stale target state reaches CLEAR;
2. unknown policy identity reaches a maintained evaluator;
3. wrong Contract C whole-object identity, expected Contract B binding, or Contract C authority root is accepted;
4. caller-supplied evaluator/registry state affects maintained policy behavior;
5. repeated exact input or context-key reordering changes canonical Contract D bytes;
6. a policy-critical verdict or causal-basis mutation fails to change the policy that declares that field load-bearing;
7. released CLI and library runtime disagree for equivalent exact input;
8. exact Contract D consumption upgrades HOLD or FAILED into candidate-for-authorization;
9. the published tarball differs from the deterministic archive rebuilt from exact v1.0.0 release authority.

## Known bounds that are controls, not new discoveries

The campaign deliberately reproduces rather than rediscovers these previously established V1 boundaries:

- top-level Contract B identity is bound, but internal C→B proposition/evidence references are not independently re-established by maintained DE ingress without the optional exact B index;
- generic Contract C assessment-stage values are outside the maintained Policy A core after completed/assessed/supported predicates hold;
- valid Contract C producer semantic/policy identities are not separately allowlisted;
- research `non_deciding` successor semantics are outside released Contract C 1.0 / DE v1.0.0;
- no operational Authorization or execution exists.

A reproduced known bound is not to be relabelled a newly discovered runtime defect unless the new evidence materially changes its scope.

## Domain pressure

Use synthetic domain-shaped Contract C cases only after exact released Contract C validation. They are consumer pressure cases, not producer-reachability or world-truth claims.

Domains:

- MainFrame knowledge synthesis;
- SOP / controlled procedure requirement;
- source literature;
- regulated quality/compliance;
- credential/provenance;
- ambiguous/unclassified material.

The campaign must include supported, contradicted, unsupported, overstated, needs-source, and not-checkable shapes where Contract C permits them, plus causal-basis and residual/non-deciding contribution selection.

## Real-producer control

Generate fresh Contract C using exact released CAL `v0.5.0` commit:

`5533bbcf27a3ee3a7d901f7dfc44c241bc558e2c`

from CAL's own locked minimal Contract-B fixture, then consume those exact bytes through the published Decision Engine v1.0.0 artifact.

## Capability-gap hypothesis

V1.0.0 is expected to have no maintained decision policy/effect for broader workflow outcomes such as document approval, note lifecycle promotion, publication approval, human-review requests, remediation requests, task dispatch, release approval, multi-claim aggregate approval, conditional approval, or explicit negative actions.

Absence is to be recorded as `CAPABILITY_GAP`, not papered over by reusing either maintained policy.

## Evaluation discipline

Every domain-shaped C object must first pass exact released Contract C validation through maintained ingress. Every emitted Decision must pass exact Contract D validation/canonicalization. Exact Contract D consumer behavior must be checked separately.

Classify findings as:

- `CONFORMS`
- `RUNTIME_DEFECT`
- `AUTHORITY_OR_BINDING_DEFECT`
- `EVALUATOR_OR_HARNESS_DEFECT`
- `CAPABILITY_GAP`
- `UPSTREAM_REACHABILITY_GAP`
- `INCONCLUSIVE`

Do not tune V1 runtime to the cohort. Preserve failures and harness defects.

## Governance boundary

Research evidence only. Keep Draft regardless of result.

No merge, release, tag, production promotion, Contract mutation, Authorization, execution, or maintained runtime change is authorized by this experiment.
