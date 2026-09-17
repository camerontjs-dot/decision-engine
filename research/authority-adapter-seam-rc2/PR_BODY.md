## Classification

Draft Research only. **Do not merge as a maintained runtime change, tag, release, or infer production readiness from this PR.**

This successor is stacked on Draft Research PR #77 / terminal `97727a7d2f61c46b4e7ef3e11279fb0af7b915cd`. It changes no maintained `src/**`, `scripts/**`, or `tests/**` bytes.

## Question

Can materially different trusted authority domains converge on one unchanged post-admission Decision seam without making the projection kernel domain-aware or allowing callers to move the trust anchor?

## Terminal disposition

`SUPPORTED_TRUSTED_AUTHORITY_ADAPTER_SEAM`

Decisive execution:

- executed science head: `360dc46d6b6e510d8ce36fa06f2fb0de5ff47372`
- workflow run: `35232698263`
- job: `105240629694`
- artifact ID: `10501967992`
- artifact ZIP digest: `sha256:745346b1dc7530d9f362b89daeea52edfbe6c20dfe44cdf59f6f2187d8c91169`
- packaged evidence TGZ: `74dee690eab4841a5f363d6538dc6d5ecee93051d60b4eaa3bab60a64fa98f49`
- frozen projection-kernel SHA-256: `e12d53020b3a6a046f4ee7688db0a5ea5c5e0a63e758b1c1e5711e7b227759e3`

## Observed result

All four preregistered phases passed:

1. CAL/C2 shadow seam reproduced the maintained legitimate Decision and exact canonical Contract-D bytes. The five RC1 authority substitutions were rejected before policy.
2. The frozen Git-bound artifact-manifest authority replay passed unchanged against the exact same projection-kernel identity.
3. A materially different Ed25519 signed content-addressed authority used the same post-admission seam. A legitimate favorable fact produced CLEAR; a legitimate unfavorable fact was admitted and produced policy HOLD.
4. Cross-adapter laundering, wrong signer/digest/version/target, caller adapter injection, and caller policy implementation injection were rejected at the trusted runtime boundary.

The deliberately weak controls remained unsafe as expected: direct caller control of the raw kernel policy registry changed a Decision under the same policy ID/version, and caller selection of the signature verification key accepted an attacker signature. This is causal evidence that adapter/policy implementation and trust-root selection must remain trusted machinery.

## Supported boundary

```text
raw external authority
        ↓
trusted domain authority adapter
        ↓
trusted domain target resolver
        ↓
trusted domain policy semantics
        ↓
unchanged domain-neutral Decision projection
        ↓
exact Contract D
```

The common seam begins after authority admission. This PR does not establish a universal raw-ingress schema or plugin system.

## Preserved failure

The first hosted run `35232390053` / job `105239555259` is preserved as `APPARATUS_LEGACY_DIGEST_PREFIX_ASSERTION_DEFECT`. The frozen manifest scientific runner printed PASS, but a wrapper compared prefixed and bare SHA representations and stopped before the new Phase C/D harness. The decisive successor changed only that mechanical representation check via a preserved-harness wrapper/workflow correction.

## Remaining boundaries

- real-runtime CAL Contract-B artifact location remains unresolved;
- mutable API freshness/revocation/key rotation is untested;
- trusted adapter and policy implementation binding needs maintained-runtime design and independent conformance before extraction;
- no arbitrary plugin/caller-installed adapter support is established.

See `research/authority-adapter-seam-rc2/RESULT.md` for the complete terminal record.
