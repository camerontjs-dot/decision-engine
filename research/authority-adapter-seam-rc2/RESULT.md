# Decision Engine authority-adapter seam RC2 result

## Disposition

**`SUPPORTED_TRUSTED_AUTHORITY_ADAPTER_SEAM` — research evidence only; not promoted.**

The tested evidence supports a common **post-admission** Decision seam for multiple trusted authority domains while preserving domain-specific authority admission, target resolution, and policy semantics.

It does **not** support arbitrary plugins, caller-installed adapters, caller-installed policy implementations, a universal raw-ingress schema, or production readiness.

## Exact decisive execution

- stacked parent / RC1 terminal: `97727a7d2f61c46b4e7ef3e11279fb0af7b915cd`
- decisive executed head: `360dc46d6b6e510d8ce36fa06f2fb0de5ff47372`
- hosted workflow run: `35232698263`
- job: `105240629694`
- workflow conclusion: `success`
- artifact ID: `10501967992`
- artifact ZIP digest: `sha256:745346b1dc7530d9f362b89daeea52edfbe6c20dfe44cdf59f6f2187d8c91169`
- packaged evidence TGZ SHA-256: `74dee690eab4841a5f363d6538dc6d5ecee93051d60b4eaa3bab60a64fa98f49`
- exact frozen projection-kernel SHA-256: `e12d53020b3a6a046f4ee7688db0a5ea5c5e0a63e758b1c1e5711e7b227759e3`

Exact external authorities:

- Contract C2 authority: `b42c827acb0a9fe65353354d709add0e27bab307`
- frozen Contract-B mechanism control: `d03d0e960ad82d889e6763fd4fb53cd24babd187`
- CAL resolver authority: `1d33e0612befcf8016816197c90c062373796df9`
- resolver blob: `1a408246fd3bef0758a958ae716b44ea74bc0689`
- exact Contract D authority: `298a1a0f7b7b6d7712e11200d04faec3e1ca169b`
- frozen heterogeneous-manifest research head: `41c348fc7f1816df8827f9e37b9d90bd7a148624`
- exact heterogeneous specimen: `33f39e88f0f94a13afe740d087e4896247695f79`

The branch changed no maintained `src/**`, `scripts/**`, or `tests/**` bytes relative to the stacked parent. The hosted scope guard passed before and after the scientific run.

## Phase A — CAL / C2 shadow seam

The strong CAL adapter independently derived the exact Contract-B evidence world and immutable CAL resolver authority before applying canonical C2 external-authority verification.

Legitimate baseline:

- maintained/current C2 path: `CLEAR`
- authority-adapter seam path: `CLEAR`
- exact Decision object equality: **PASS**
- exact canonical Contract-D byte equality: **PASS**

Fresh canonically resealed substitutions:

| Mutation | Current C2 ingress | Trusted authority-adapter seam |
| --- | --- | --- |
| evidence source ID | `CLEAR` | rejected before policy |
| evidence passage ID | `CLEAR` | rejected before policy |
| producer resolver commit | `CLEAR` | rejected before policy |
| semantic implementation | `CLEAR` | rejected before policy |
| producer policy digest | `CLEAR` | rejected before policy |

Rejections were the intended authority discriminators: absent exact Contract-B participant reference, wrong immutable resolver authority, or unknown/ambiguous implementation-policy binding.

The RC1 weak/colluding controls were also rerun and preserved: when verifier authority was deliberately allowed to move with the mutation, the malicious objects could pass. That remains evidence that validation alone is insufficient if the caller can select the trust anchor.

## Phase B — frozen Git-bound artifact-manifest replay

The earlier heterogeneous authority experiment reran successfully against the exact same frozen projection-kernel identity.

All prior controls remained true, including:

- wrong whole-object identity rejected;
- stale nested entry hash rejected after outer rebinding;
- fully rebound internal tamper rejected by exact external Git-source binding;
- source identity relabel rejected;
- nested target substitution rejected;
- assessment bytes rejected by the manifest adapter;
- Contract C bytes rejected by the manifest adapter;
- manifest bytes rejected by the Contract C adapter.

The prior valid-incompleteness distinction was preserved: valid authority can carry an unfavorable/incomplete fact into policy rather than being collapsed into ingress failure.

## Phase C — signed content-addressed authority

A materially different research-only Ed25519 authority adapter used a fixed trusted public key and exact trusted authority version.

Positive and legitimate-negative cases:

- correctly signed favorable fact: `CLEAR`
- correctly signed unfavorable fact: admitted successfully, then policy `HOLD`

Hostile controls all rejected before policy or target use:

- attacker signature under the trusted producer label;
- changed artifact bytes with stale digest;
- recomputed digest with stale signature;
- unexpected trusted-authority version;
- authority-type relabel;
- target substitution.

This is evidence that a third authority domain can reach the same post-admission projection seam without requiring CAL or Git vocabulary in the frozen projection kernel.

## Phase D — cross-adapter and implementation-substitution audit

Observed controls:

- C2 bytes through signed-authority adapter: rejected;
- signed-authority bytes through C2 adapter: rejected;
- caller-supplied policy implementation/registry injection at the trusted runtime boundary: rejected;
- caller-supplied adapter implementation injection at the trusted runtime boundary: rejected.

Two deliberately weak controls remained unsafe, as preregistered:

1. Direct access to the raw projection kernel with a caller-controlled policy registry changed the legitimate baseline from `CLEAR` to `HOLD` under the same policy ID/version.
2. A signed-authority verifier that accepted a caller-selected public key accepted the attacker's signature.

These controls sharpen the boundary: the reusable projection kernel is **not itself an external trust boundary**. Adapter selection, adapter implementation, policy dispatch, and trust roots must remain trusted/bound machinery.

## Supported architecture

For the tested domains, the evidence supports:

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

The tested domains were:

1. CAL / Contract C2 with independently reconstructed Contract-B and producer-resolver authority;
2. externally Git-bound artifact manifest;
3. signed content-addressed authority with fixed trusted signer/version.

The common seam is therefore **after authority admission and target resolution**, not at raw ingress.

## What else could explain the PASS?

1. All three domains are deterministic research specimens. This does not establish behavior for mutable remote APIs, databases, or distributed trust stores.
2. The signed authority used one fixed Ed25519 signer/version rather than key rotation, revocation, delegation, or multi-party trust.
3. The CAL path still used the frozen Contract-B fixture as an authority-mechanism control. It does not solve how a production CAL run independently locates its exact real Contract-B artifact.
4. The trusted runtime used a fixed internal adapter dispatch and fixed policy registry. That is a tested safety property here, not evidence that dynamic plugin loading is safe.
5. Exact C2 reproduction used the current tested supported-claim policy path. It does not prove every future DE policy will fit the same seam.

## Load-bearing assumptions

The strongest remaining assumptions are:

- trusted adapter selection/implementation can be operationally bound outside caller control;
- trusted policy dispatch/implementation can likewise remain bound;
- each real external system exposes enough independently verifiable authority to support its adapter;
- mutable authorities will need explicit freshness/version/revocation semantics rather than being treated as immutable content-addressed objects.

## Preserved apparatus failure

Run `35232390053`'s predecessor execution `35232390053`? No. The preserved predecessor is run `35232390053`'s earlier branch execution `35232390053` is the decisive successor and should not be conflated with it.

The actual preserved first hosted failure was:

- run `35232390053` predecessor family: see `PRESERVED_FAILURES.md` for exact run `35232390053` predecessor record and artifact evidence.

**Correction:** because the decisive run itself is `35232698263`, the exact preserved first failure is run `35232390053`, job `105239555259`, executed head `6b8e858506951924c24218f7f9d01f9e5f8f33a3`.

It is classified `APPARATUS_LEGACY_DIGEST_PREFIX_ASSERTION_DEFECT`: the frozen manifest science printed PASS, then a wrapper compared prefixed versus bare SHA-256 representations and failed. The original harness remains preserved; the successor applied only that mechanical representation correction.

## Promotion boundary

This result justifies treating a **trusted authority-adapter / target-resolver / policy → frozen Decision projection** seam as a supported research architecture for the tested domains.

It does not by itself justify changing maintained Decision Engine runtime. A maintained extraction should be separately reviewed against:

- exact adapter and policy implementation binding;
- operational trust-root configuration;
- the unresolved real-runtime CAL Contract-B locator problem;
- at least one independent consumer/conformance reproduction of the proposed maintained seam.

## Non-claims

- no arbitrary plugin framework;
- no caller-installed adapters or policies;
- no universal authority interoperability;
- no universal raw-ingress contract;
- no claim that signatures alone establish semantic truth;
- no solution yet for mutable API freshness/revocation;
- no Contract C2, Contract D, CAL, Contract B, Authorization, or execution promotion;
- no tag, release, merge, or production-default change.
