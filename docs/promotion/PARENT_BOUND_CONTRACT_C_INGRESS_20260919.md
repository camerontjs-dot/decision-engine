# Decision Engine successor — frozen parent-bound Contract C ingress qualification

## Classification

Production / Promotion candidate built from exact released Decision Engine V1
commit `7be709b2141c767c5da89b8b94cf90233c4238fe`.

The frozen V1 release is not modified. No successor SemVer is assigned by this
experiment.

## Objective

Determine whether the exact parent-bound Contract C consumer path qualified in
Decision PR #85 can become one additive maintained ingress while preserving the
frozen Decision policy/materialization core and exact Contract D 1.0.0 output.

## Exact authorities

Decision V1:
- release commit: `7be709b2141c767c5da89b8b94cf90233c4238fe`
- supported-claim policy module blob: `2225f73eb6eefd83609f0ba19e4786d1267dd527`
- Decision materializer blob: `1562fb29da6679a0cf894e478cbdd4ae16e21a18`
- maintained C1 ingress blob: `f57a8067dadc04afb459f1d0342b2b786ec775e6`

Parent-bound Contract C:
- frozen candidate: `c5b1d757f3a0ad4f6e2c3f6dbdc2dd2d3c1403ec`
- candidate blob: `df6b6ed410f52cafaeadfe1578d770f480a34b09`
- independently qualified consumer freeze: `12e7e640b229619501960b1b89cf4716d8d985b3`
- consumer blob: `662e94c4445d2be9034e786711429394f217c0a6`
- consumer test blob: `50f3104650a946b834c3ff6415bafb347863e836`
- freeze-receipt blob: `cb99cd2ee29d38e19c845771654898561b91552f`

Contract D:
- exact released 1.0.0 authority: `298a1a0f7b7b6d7712e11200d04faec3e1ca169b`

Research evidence:
- Decision PR #85
- science head: `ae2162d983820cc5fc0e90f24b0d728a1a7bc546`
- decisive run: `35469243798`
- terminal disposition:
  `SUPPORTED_FROZEN_DECISION_CORE_WITH_ADDITIVE_PARENT_BOUND_INGRESS`

## Allowed change

Only:
- promote the already-qualified parent-bound ingress into a maintained `src/`
  module;
- add a file-oriented CLI that supplies the exact already-qualified inputs;
- add qualification/packaging evidence.

Protected:
- `src/contractCDecision.js`;
- `src/decisionMaterializer.js`;
- existing `src/contractCIngress.js`;
- Contract D implementation/authority;
- supported-claim policy id/version/effect and CLEAR/HOLD mapping.

## Acceptance evidence

The exact successor candidate must establish:

1. protected V1 core blobs remain byte-identical;
2. production parent-bound ingress produces Decision objects exactly equal to the
   qualified PR #85 ingress for PIPE01–PIPE04;
3. expected mappings remain:
   - supported → CLEAR
   - contradicted → HOLD
   - not_checkable → HOLD;
4. exact canonical Contract D 1.0.0 validation passes for every case;
5. raw-byte/whole-object mismatch rejects;
6. missing native child rejects;
7. child substitution/cross-run replay rejects;
8. frozen consumer authority substitution rejects;
9. root target substitution rejects;
10. expected authority substitution and coherent reseal attempts do not enter the
    policy/materialization core;
11. file CLI emits canonical Contract D bytes and performs no Authorization;
12. ordinary Decision repository CI remains green.

## Falsifiers / stop rule

Stop and preserve the counterexample if direct support requires:
- changing the V1 supported-claim policy or Decision materializer;
- weakening parent/child/whole-object authority verification;
- changing Contract D;
- interpreting any parent state beyond the already-qualified
  supported / contradicted / not_checkable mapping;
- silently adapting invalid Contract C into accepted state.

Harness/environment defects may be corrected only if the subject, external
authorities, expected behavior, and negative controls stay frozen. The failed
run remains part of the record.

## Allowed terminal states

- `QUALIFIED_ADDITIVE_PARENT_BOUND_INGRESS_FOR_CONTROLLED_LOCAL_PIPELINE_RUNS`
- `FALSIFIED_PRODUCTION_INGRESS`
- `INCONCLUSIVE_QUALIFICATION`
- `BLOCKED_AUTHORITY_OR_ENVIRONMENT`
