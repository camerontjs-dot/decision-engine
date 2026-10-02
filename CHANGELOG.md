# Changelog

## 1.1.0 — release candidate

Backward-compatible Decision Engine capability release built on the released 1.0.0 surface.

### Added

- maintained parent-bound Contract C ingress qualified against frozen parent/child/whole-object authorities;
- maintained parent-bound policy dispatch with exact id/version selection and policy-owned effects;
- `decision-engine.contract-c.epistemic-audit-stage-pending-review@1.0.0`, owning `epistemic_audit.stage_pending_review@1`;
- fail-closed caller-context snapshotting before validation/use;
- exact rejection of inherited/prototype policy names and caller-supplied effect/requested-operation state;
- parent-bound file CLI and frozen promotion qualification.

### Preserved compatibility

- released 1.0.0 Contract C 1.0.0 → Decision → Contract D 1.0.0 surfaces remain unchanged;
- V1 supported-claim policy and Decision materializer bytes remain unchanged;
- parent-bound supported claims CLEAR, while contradicted and `not_checkable` parents HOLD;
- Decision remains separate from operational Authorization and execution.

### Explicit limit

Released Contract D 1.0.0 does **not** register `epistemic_audit.stage_pending_review@1`; it rejects that effect as `unknown_effect_type`. The new ERS-oriented policy is therefore a native Decision capability, not a released Decision → Contract D → Authorization → ERS execution path.

### Evidence lineage

- parent-bound ingress promotion: PR #86;
- falsified first dispatch candidate: PR #87 / pressure PR #88;
- hardened dispatch research disposition: PR #90, `SUPPORTED FOR PROMOTION`;
- hardened dispatch production promotion: PR #91.

### Release state

This entry remains a release candidate until exact release qualification passes and the immutable `v1.1.0` tag and GitHub Release are created from the same qualified release commit.

This changelog records Decision Engine repository releases. A listed version is not an official release until its immutable Git tag and GitHub Release exist for the same release commit.

## 1.0.0 — released 2026-09-11

Proposed first normal repository release. The stable public compatibility promise is deliberately limited to the maintained bounded Contract C 1.0.0 → Decision Engine policy → Contract D 1.0.0 surface and its exact-authority invocation API/CLI.

### Public compatibility surface

- exact Contract C 1.0.0 admission with external whole-object and expected Contract B binding;
- `evaluateContractCDecision(options)` with fixed dispatch over exactly two maintained policy IDs/versions;
- `decision-engine.contract-c.supported-claim-verification@1.0.0`;
- `decision-engine.contract-c.causal-basis-citation@1.0.0`;
- `scripts/decision-engine-evaluate.mjs` success/failure and canonical Contract D output behavior;
- exact Contract D 1.0.0 validation/canonicalization and the Decision/Authorization firewall.

### Included convergence

- binding-preserving internal Decision materialization;
- preserved rejection of caller-controlled evaluator substitution and detached policy-result reassociation;
- preserved fail-closed authority, target, policy, and effect binding;
- maintained production promotion recorded in PR #68 and `docs/DECISION_ENGINE_V1_PROMOTION.md`.

### Explicitly outside the 1.0.0 compatibility promise

- the career select/rank head as a general decision engine;
- the Gate head as a universal policy vocabulary;
- research authority domains such as release qualification, task-result verification, artifact-manifest authority, or Contract C research `non_deciding`;
- a generic policy registry, DSL, plugin system, or caller-supplied evaluator;
- operational Authorization, actor authority, approval/delegation, execution, mutation, rollback, or outcome verification.

### Known limitations

- maintained Contract C ingress binds expected Contract B top-level identity but does not independently authenticate a complete Contract B evidence index;
- `knowledge.add_verified_tag@1` has a broader name than the bounded policy meaning and remains a later vocabulary question;
- the Contract C `non_deciding` successor/sidecar choice remains unresolved upstream;
- no Authorization or execution surface is included.

### Release state

Release published on 2026-09-11 as immutable tag `v1.0.0` with a GitHub Release and deterministic source archive.
