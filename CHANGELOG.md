# Changelog

This changelog records Decision Engine repository releases. A listed version is not an official release until its immutable Git tag and GitHub Release exist for the same release commit.

## 1.0.0 — release candidate

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

This entry remains a release candidate until the dedicated release qualification passes on the exact intended release tree and an explicit operator decision authorizes creation of the immutable `v1.0.0` tag and GitHub Release.
