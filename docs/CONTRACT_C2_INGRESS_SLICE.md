# Contract C 2.0.0 (Candidate A RC2) ingress slice — CAL Pipeline integration

**Status:** provisional integration slice. This document does not authorize a repository release, production promotion, operational Authorization, execution, or mutation. It does not modify maintained Contract C 1.0 behavior.

## Purpose

The first CAL Pipeline smoke hands Decision Engine the Contract C 2.0 successor (Apparatus promotion PR #98, exact head `b42c827acb0a9fe65353354d709add0e27bab307`), not released Contract C 1.0. Released Decision V1 natively accepts only C1 and strictly rejects C2. This slice adds the smallest justified C2 ingress/conformance path so the pipeline harness can call one deterministic boundary and capture canonical Contract D 1.0.

Preserved from V1 without change:

- exact Contract C 1.0 admission, target resolution, policy implementation, binding-preserving materialization, exact Contract D 1.0 output;
- CLEAR remains only `candidate_for_authorization`; HOLD remains HOLD; failed evaluation remains distinguishable;
- no Authorization, no execution, no mutation.

## Authority

- C2 candidate: `camerontjs-dot/apparatus-contracts` exact head `b42c827acb0a9fe65353354d709add0e27bab307`
- candidate public compatibility version: `2.0.0`
- frozen wire profile: `contract-c-successor-candidate-a-rc2-research`
- Contract D authority remains exact released 1.0.0 (`298a1a0f7b7b6d7712e11200d04faec3e1ca169b`).

Strict C1 ingress continues to reject C2. Strict C2 ingress rejects C1. No C2 → C1 downgrade exists.

## Invocation

```text
node scripts/decision-engine-evaluate-c2.mjs \
  --contract-c2 <path> \
  --contract-c2-sha256 <sha256:...> \
  --contract-c2-authority <exact C2 checkout at b42c827...> \
  --contract-d-authority <exact Contract D 1.0.0 checkout> \
  --expected-contract-b <JSON path> \
  --policy <id@version> \
  --context <policy-specific JSON path>
```

Policies (same IDs/versions/effects as V1):

- `decision-engine.contract-c.supported-claim-verification@1.0.0`
- `decision-engine.contract-c.causal-basis-citation@1.0.0`

C2 target shapes:

- supported-claim: `{"proposition_id": "...", "target": {"kind": "claim", "id": "...", "content_sha256": "sha256:..."}}` where `content_sha256` equals the exact C2 `proposition.content_sha256`.
- causal-basis: `{"proposition_id": "...", "contribution_id": "evidence:<source_id>:<passage_id>", "target": {"kind": "claim-evidence-link", "id": "claim-evidence-link:<proposition_id>:<contribution_id>", "content_sha256": "sha256:..."}}` where target is derived via `citationTargetForContractC2`.

C2 disposition (same Decision semantics, C2 reads):

- supported-claim: result completed + proposition completed/assessed + terminal supported/categorical_support → CLEAR; otherwise HOLD; missing proposition → failed.
- causal-basis: causal role + member of minimal basis group → CLEAR; residual/non-deciding (including `UNSUPPORTED_SEMANTIC_FAMILY` and `no_deciding_relation`) → HOLD; missing proposition/contribution → failed.

## Files

```text
src/contractC2Ingress.js                    exact C2 authority/binding ingress
src/contractC2Decision.js                   supported-claim over C2
src/contractC2BasisCitationDecision.js      causal-basis citation over C2
src/contractC2DecisionRuntime.js            explicit two-policy C2 dispatch
scripts/decision-engine-evaluate-c2.mjs     thin exact-authority C2 CLI
tests/contractC2Ingress.integration.mjs     focused C2 ingress/conformance
```

No existing V1 source, policy, test, or doc was modified.
