# Causal Jurisdiction Carrier Discriminator RC1 — Preregistration

Date: 2026-09-18

Classification: Draft Research / downstream jurisdiction-carrier discriminator.

## Parent evidence

- Decision C2 integration parent: `b1bcc33e2b5ef0707b8cbf7dd8e821b2d34d1b55`
- exact Contract C2 authority: `camerontjs-dot/apparatus-contracts@b42c827acb0a9fe65353354d709add0e27bab307`
- causal-jurisdiction information-gap result: Decision PR #82, decisive run `35362333971`
- CAL causal semantics remain bounded to explicit source assertion; no causal inference.

## Question

What is the smallest typed downstream input that can prevent explicit-source-causal-assertion support from silently entering the generic supported-claim Decision path?

Compare:

1. **unbound caller routing** — caller supplies a jurisdiction label;
2. **externally bound immutable jurisdiction manifest** — a separately authorized exact manifest is bound to the exact Contract C2 whole-object SHA and exact proposition identity.

No Contract C mutation is tested in RC1.

## Required behavior

For an ordinary supported proposition:

- exact C2 ingress succeeds;
- bound jurisdiction says `ordinary_categorical_support`;
- gate permits the existing generic supported-claim policy;
- maintained generic Decision remains CLEAR.

For an explicit-source-causal-assertion proposition:

- exact C2 ingress succeeds;
- bound jurisdiction says `explicit_source_assertion_only`;
- gate refuses generic supported-claim routing and requires a dedicated causal-jurisdiction policy;
- no generic CLEAR is emitted through the gated path.

## Falsifiers

The evaluator must reject:

- causal assertion relabeled as ordinary;
- ordinary support relabeled as causal;
- changed manifest with self-recomputed digest when the independently expected digest is unchanged;
- wrong Contract C2 whole-object binding;
- wrong proposition ID;
- wrong proposition content hash;
- stale manifest from another exact C2 object;
- missing manifest;
- unknown jurisdiction;
- malformed/extra manifest fields.

The frozen weak strategy that trusts an unbound caller label must be killed by the relabel attack.

## Acceptance

`SUPPORTED_EXTERNALLY_BOUND_CAUSAL_JURISDICTION_CARRIER_RC1` requires:

- weak unbound routing is demonstrably falsified;
- exact bound-manifest strategy satisfies all clean and hostile cases;
- exact maintained Decision and C2 source remain unchanged;
- no raw proposition text interpretation;
- no causal inference;
- no Authorization or execution.

## Interpretation boundary

A pass would establish representation sufficiency for an **externally bound** jurisdiction artifact. It would not establish that such an artifact is the preferred production architecture.

The expected manifest digest is itself an independent authority input. If the same untrusted caller can replace both manifest bytes and expected digest, the protection collapses; that case is outside the candidate's authority assumptions and must be explicit.

A pass therefore weakens, but does not by itself eliminate, the case for an in-band Contract C carrier.

No merge, release, production policy change, Contract C change, Authorization, or execution is authorized.

## Predecessor

RC0 (Decision #83) is preserved as `INCONCLUSIVE_EVALUATOR_INVALID` because its frozen evaluator defined ten hostile controls but asserted nine after candidate exposure. RC1 corrects only that bookkeeping defect before any candidate exists.
