# CAL Pipeline V1 Decision Engine Candidate Freeze

Date: 2026-09-14

Classification: Integration evidence / candidate identity freeze. Documentation only. This record does not modify maintained Decision Engine runtime, policy, Contract C/D authority, Authorization, execution, release state, or production defaults.

## Frozen candidate

The CAL Pipeline V1 Decision Engine candidate is the already released Decision Engine v1.0.0 object. No newer research head is substituted for it.

- repository: `camerontjs-dot/decision-engine`
- release: `v1.0.0`
- release commit: `7be709b2141c767c5da89b8b94cf90233c4238fe`
- release tree: `4e92703e781024de62c77f2f14e9164aceb16815`
- annotated tag object: `7835f2f53267843113212abfa0cac6e726242409`
- deterministic release source archive SHA-256: `c440d5de2a3853db9f4ccc2ba37d273e29ce8d9e71e0d646fc0c20eee0cd5902`
- published release receipt asset SHA-256: `ae2de0d5cf143c7118e54be387e8bd430b73e5cfa249ffc73183768a281a670a`
- release metadata blob: `27df4569334ac402a1e48baeeccc3a1c1233a172`

The maintained V1 compatibility surface remains:

`exact Contract C 1.0 admission -> exact target resolution -> fixed maintained policy implementation -> binding-preserving Decision materialization -> exact Contract D 1.0 output`

Exact released authorities encoded by V1 release qualification:

- Contract C 1.0.0 release commit: `5fe55f9ed5d0ee9f026ca1b077e9d70ce0487ea1`
- Contract D 1.0.0 release commit: `298a1a0f7b7b6d7712e11200d04faec3e1ca169b`

## Why this is the candidate

V1 has already been converged, promoted, release-qualified, tagged, and published. Current research PRs are evidence about successor Contract C consumption and pressure testing; they are not stronger maintained production identities than the released V1 object.

Therefore pipeline testing starts from the released V1 object rather than creating another Decision Engine implementation candidate.

## Pipeline-readiness boundary

The frozen V1 candidate is ready for pipeline testing when the incoming authority is exact released Contract C 1.0.0.

The CAL Pipeline is separately converging on Contract C 2.0.0 Candidate A RC2. At freeze time, Apparatus promotion PR #98 remains Draft at exact head:

`b42c827acb0a9fe65353354d709add0e27bab307`

That PR explicitly permits Decision Engine production work against a frozen locally green exact promotion head, restricted to the smallest justified ingress/conformance change. The maintained V1 release does not natively accept C2.

Consequently:

1. do not reinterpret C2 as C1;
2. do not build or authorize a C2 -> C1 semantic downgrade adapter;
3. do not mutate the frozen V1 candidate identity;
4. if the first integrated pipeline emits C2, prepare and qualify a separate narrow Decision Engine C2 ingress candidate against exact Apparatus head `b42c827...` while preserving existing policy ownership and exact Contract D output;
5. keep that C2 ingress candidate distinct from this frozen V1 identity until its own evidence supports promotion.

## Local pipeline-test preparation objective

The local preparation task should establish which of these two paths is actually required by the first pipeline smoke:

- **Path A:** exact C1 enters released V1 unchanged, then run the maintained CLI/library boundary and capture exact Contract D receipts;
- **Path B:** exact C2 is the actual handoff, so build only the smallest separately governed C2 ingress/conformance slice needed to feed the existing Decision runtime without semantic laundering.

In either path, preserve exact input authority, Contract B binding, policy identity, target identity, emitted Contract D bytes/hash, command, environment, warnings, failures, and repository SHAs.

## Freeze rule

For the first CAL Pipeline baseline, do not tune Decision policy semantics, introduce a generic policy registry, broaden Decision authority families, add Authorization/execution, or alter the released V1 runtime merely to make a smoke test pass.

The frozen candidate remains `v1.0.0` / `7be709b2141c767c5da89b8b94cf90233c4238fe` until explicit evidence justifies a successor.
