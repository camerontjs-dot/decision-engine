# Artifact-Manifest Authority Projection R2 Result

## Disposition

**SUPPORTED FOR HETEROGENEOUS AUTHORITY / PROJECTION SEAM; NOT PROMOTED.**

Keep this as a Draft Research evidence record. The result strengthens the post-admission/post-target-resolution seam but does not establish generic raw ingress and does not authorize maintained extraction.

## Exact execution

- PR #58 projection-kernel SHA-256: `e12d53020b3a6a046f4ee7688db0a5ea5c5e0a63e758b1c1e5711e7b227759e3`
- exact specimen commit: `33f39e88f0f94a13afe740d087e4896247695f79`
- exact Contract C authority: `5fe55f9ed5d0ee9f026ca1b077e9d70ce0487ea1`
- exact Contract D authority: `298a1a0f7b7b6d7712e11200d04faec3e1ca169b`
- R2 science head: `41c348fc7f1816df8827f9e37b9d90bd7a148624`
- hosted run: `34506631322`
- job: `102970309075`
- artifact: `artifact-manifest-authority-projection-r2-34506631322`
- artifact ID: `10164078849`
- artifact ZIP SHA-256: `8ec5572a7059e9aa157cebf29bd1249f77cd8599e51be3e118f23380e5113e4c`
- packaged evidence TGZ SHA-256: `b5651d8661c27a2b3395becc6b78c1c9092b4b9b3cfdd5ef48b4d50ef676ac74`

All R2 workflow stages passed: exact authority/kernel verification, heterogeneous authority pressure test, research-only mutation guard, evidence packaging, and artifact upload.

## Heterogeneous authority

The new raw authority was an `artifact_manifest`, not the earlier assessment-authority envelope. It recorded exact nested file bytes/hashes, roles, a declared required set, deterministic entry root, manifest identity, and frozen Git source identity.

The domain adapter additionally checked every admitted entry byte-for-byte against the exact frozen Git checkout. The projection kernel was unchanged.

Baseline manifest SHA-256: `13ac9a52190cbaaed0e77c4cb815994565d6dee852dfcb70a895015346c25821`.

## Policy discrimination

Two domain policies consumed the same admitted manifest and exact nested target:

- bound-entry policy: baseline `completed / clear`, reason `manifest_entry_integrity_admitted`, Contract D SHA-256 `aa8bd7634231b784e29aee5da31a38903905f900bc3f6fdac89baed80aba36bc`;
- complete-set policy: baseline `completed / clear`, reason `manifest_required_set_complete`, Contract D SHA-256 `29c9ccabeaced199636ef0f741b295d5718943e520f0587fc982014f27774720`.

A valid self-consistent manifest omitting only `research/contract-c-adapter-projection-kernel/contractCPolicies.mjs` preserved the exact target entry. The bound-entry policy remained CLEAR while the complete-set policy became HOLD with `manifest_required_set_incomplete`.

This establishes that valid domain incompleteness can remain an admitted authority fact and become policy-specific HOLD rather than being collapsed into ingress failure.

## Controls

All preregistered controls passed:

- irrelevant optional entry changed authority identity but preserved both policy cores;
- wrong whole-object SHA rejected;
- stale internal entry hash rejected even after the outer manifest SHA was recomputed;
- stronger fully rebound tamper, with every manifest-local identity recomputed around altered bytes, passed local manifest consistency but was rejected by exact frozen Git source binding;
- source identity relabel rejected;
- nested target substitution rejected by the domain resolver;
- prior release-assessment bytes rejected by manifest adapter;
- Contract C bytes rejected by manifest adapter;
- manifest bytes rejected by exact Contract C adapter.

The cross-adapter controls are evidence against authority-type laundering by schema reinterpretation.

## Preserved predecessor failure

The first hosted experiment on head `66ce579ba98ed1c93a2556f3418d25f20a9bb31e` reached the scientific runner after exact authority/kernel checks but rejected its own baseline manifest with `manifest_noncanonical_order`.

Cause: the producer used locale-sensitive `localeCompare` while the validator used JavaScript default code-unit ordering. R2 changed only the producer comparator to explicit code-unit order. Projection-kernel bytes, policies, source binding, target resolution, scientific cases, and expected outcomes were unchanged.

The predecessor remains an apparatus/evaluator failure, not a Decision result.

## Supported inference

The exact PR #58 projection kernel handled a third materially heterogeneous raw authority without modification. Domain-specific authority admission, target resolution, and policy semantics remained outside the generic projection layer.

Current evidence therefore supports, for the tested domains:

`trusted domain authority adapter -> trusted domain target resolver -> trusted domain policy semantics -> domain-neutral Decision projection -> exact Contract D`

## What else could explain the PASS?

1. Artifact manifests are deterministic and structurally simpler than semantic assessment authorities. Their success does not prove arbitrary semantic domains will fit.
2. The experiment supplied a truthful external Git source to the adapter. It demonstrates a strong adapter pattern, not a universal method for proving adapter truthfulness.
3. The generic projection kernel accepts a `policyRegistry` object. A caller able to rebind the same policy ID/version to different evaluator code may still change a valid Decision without changing the recorded policy identity. That is the next important trust-boundary test.
4. Contract D validates the resulting Decision shape and effect vocabulary but does not, by itself, prove which evaluator implementation produced the result.

## Load-bearing assumption now

The strongest remaining assumption is no longer that heterogeneous authorities can cross the seam. It is that **authority adapters and policy implementations are themselves trusted, correctly bound machinery rather than caller-controlled interpretation**.

## Next discriminator

Hold authority, target, and policy ID/version fixed while substituting only the evaluator implementation behind that policy identity. Determine whether the resulting altered Decision still validates under exact Contract D and changes downstream applicability.

If it does, record policy implementation provenance/dispatch as a trusted Decision Engine boundary. Do not automatically add evaluator hashes to Contract D; first determine whether maintained executable identity/hardwired dispatch already provides the correct authority boundary.

## Non-claims

- no universal Decision authority interoperability;
- no generic raw ingress contract;
- no maintained projection-kernel extraction;
- no Contract C or Contract D revision;
- no operational Authorization or execution.
