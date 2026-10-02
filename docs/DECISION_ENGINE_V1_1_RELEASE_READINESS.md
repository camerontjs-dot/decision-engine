# Decision Engine 1.1.0 release-readiness record

Status: release candidate. Release authority remains withheld until exact release qualification completes. This record does not itself create a tag, GitHub Release, Contract D change, Contract E authorization, ERS write, Authorization, or execution.

## Production base

The release candidate descends from exact production `main`:

- `72fd9cb92b0c9a0a8eadaa578b23c17d67d89675`

That production object contains:

- PR #86 parent-bound ingress promotion;
- PR #91 hardened parent-bound policy-dispatch promotion;
- the released 1.0.0 policy/materializer bytes unchanged.

## Version decision

Proposed repository release: `1.1.0`.

The change is a backward-compatible public capability addition after 1.0.0, so MINOR is the supported Semantic Versioning class.

The stable 1.0.0 surfaces remain supported. 1.1.0 adds a bounded parent-bound Contract C → Decision surface; it does not widen Contract D 1.0.0.

## Added compatibility surface

1. maintained parent-bound Contract C ingress;
2. exact parent target binding;
3. exact maintained parent-bound policy selection;
4. policy-owned effects;
5. caller decision-context snapshot before validation/use;
6. fail-closed inherited/prototype policy-name handling;
7. parent-bound file CLI;
8. `decision-engine.contract-c.epistemic-audit-stage-pending-review@1.0.0` with owned effect `epistemic_audit.stage_pending_review@1`.

The existing parent-bound supported-claim policy remains `decision-engine.contract-c.supported-claim-verification@1.0.0`.

## Exact promoted semantic identities

- parent-bound ingress: `83ab34bce30f874111500ed91f2c01421be9f9a0`
- supported-claim V1 policy: `2225f73eb6eefd83609f0ba19e4786d1267dd527`
- Decision materializer: `1562fb29da6679a0cf894e478cbdd4ae16e21a18`
- hardened parent-bound dispatch: `d711f05000eb46ed4b0763c1c0bd73056d3d3073`
- parent-bound policy CLI: `c628eaaf4f55b890f7fe0a6750f7265bf407d92e`
- frozen pressure apparatus: `30490f91e77c3cc7cda86cecde650878a26ef80a`

## Evidence basis

Parent-bound ingress:
- PR #86 qualified head `6cdb59c2ba41779ac954af56dd077574ba090013`;
- production merge `a39a7db3f2b6138a0a7e64b9075f49454dd55f17`;
- qualified head and production merge are tree-equivalent.

Policy dispatch:
- PR #87 exact first candidate was falsified by PR #88;
- PR #90 hardened semantic repair `fa6039567d543ef8c9009e0a4ffdfdc1dd97281f`;
- PR #90 disposition `SUPPORTED FOR PROMOTION`;
- PR #91 production promotion merge `72fd9cb92b0c9a0a8eadaa578b23c17d67d89675`.

The preserved falsifiers were validation/materialization target drift and prototype-visible policy lookup. The hardened candidate closed both under the frozen pressure apparatus and rejected a deliberately weak same-policy effect mutation.

## Contract D boundary

Released Contract D remains 1.0.0.

It accepts the existing registered Decision effects but rejects `epistemic_audit.stage_pending_review@1` as `unknown_effect_type`. This is intentional release scope, not a hidden adapter.

Therefore 1.1.0 would establish:

`parent-bound Contract C -> Decision Engine policy/effect`

for the ERS-oriented policy, but not:

`Decision -> Contract D -> Contract E -> Authorization -> ERS execution`.

Contract D effect registration and compatibility/version classification require their own cross-repository promotion evidence.

## Release qualification requirements

The exact intended 1.1.0 tree must demonstrate:

- ordinary repository CI and hygiene;
- release-only delta from production base;
- exact 1.1.0 metadata and changelog;
- exact promoted semantic blobs unchanged;
- released v1.0.0 tag ancestry;
- exact Contract C and Contract D 1.0.0 authorities;
- existing V1 materializer/policy/CLI conformance;
- parent-bound dispatch promotion qualification on the release candidate;
- deterministic source archive rebuilt twice byte-identically;
- smoke execution from the extracted release artifact;
- release receipt explicitly recording that tag/GitHub Release creation has not yet happened.

## Non-claims

1. no Contract D registration of the ERS staging effect;
2. no Contract E production qualification;
3. no ERS production/write readiness;
4. no Authorization or execution;
5. no universal policy registry or generic rule engine;
6. no claim that every future policy belongs in Decision Engine.

## Release decision boundary

After exact release qualification, the allowed next decision is to publish the exact qualified release commit as `v1.1.0`, or withhold release. The tag and GitHub Release must identify that exact object.
