# Decision Engine Contract C policy surface

**Status:** promotion candidate; this document describes the maintained surface proposed by the accompanying PR and does not itself authorize release or downstream execution.

## Boundary

The Decision Engine consumes exact validated Contract C epistemic/result authority, applies one explicit Decision policy to one exact target, and emits Contract D Decision authority.

```text
validated Contract C epistemic authority
        ↓
explicit Decision Engine policy
        ↓
policy conclusion about an exact target
        ↓
canonical Contract D Decision
        ↓
separate future Authorization
```

A Contract D CLEAR result can become only `candidate_for_authorization` when Contract D applicability is exact. It is not permission to act.

## Frozen contract authority

Contract C:

- version: `1.0.0`
- release commit: `5fe55f9ed5d0ee9f026ca1b077e9d70ce0487ea1`
- tag: `contract-c-v1.0.0`
- tag object: `6bd135a948e407212b2e77ec18ac5c402f93565e`
- canonical validator blob: `9c75ccfbf2223578a8d1a7bf0c39673b394fbea4`

Contract D:

- version: `1.0.0`
- release commit: `298a1a0f7b7b6d7712e11200d04faec3e1ca169b`
- tag: `contract-d-v1.0.0`
- tag object: `6eadd688b482f3c9fce2ce5e7a2841089d852096`

The contracts remain immutable external authority. Decision Engine does not reinterpret them to accommodate current producers.

## Common Contract C ingress

Every maintained Contract-C Decision policy crosses the same ingress boundary before policy semantics are read:

1. the caller supplies exact Contract C bytes and an external `sha256:<64 lowercase hex>` whole-object digest;
2. the bytes must match that exact digest;
3. the supplied Contract C authority checkout must be the exact released commit and release tag, with the pinned canonical validator blob;
4. the exact released Contract C validator must accept the bytes;
5. the Contract C `input.contract_b` binding must exactly match the caller's expected Contract B version, bundle ID, and bundle hash.

Failure at this boundary emits no Decision authority.

This ingress helper is intentionally narrow. It does not contain policy dispatch, target semantics, CAL interpretation, effect selection, or Authorization.

## Policy 1: supported-claim verification

- ID: `decision-engine.contract-c.supported-claim-verification`
- version: `1.0.0`
- target kind: `claim`
- effect: `knowledge.add_verified_tag@1` with `scope=claim`

Question:

> Does exact Contract C establish a completed, assessed proposition whose CAL-attributable `reported_verdict` is exactly `supported` for this exact claim target?

The policy requires exact result/proposition completion and exact proposition ID/content binding. Other valid verdicts or unresolved execution states HOLD. A requested proposition that cannot be identified is evaluation failure.

The policy does not claim that Contract C itself defines a downstream verification action. The Decision Engine policy supplies that decision meaning explicitly.

## Policy 2: causal-basis citation

- ID: `decision-engine.contract-c.causal-basis-citation`
- version: `1.0.0`
- target kind: `claim-evidence-link`
- effect: `knowledge.cite_as_evidence@1`

Question:

> Does exact Contract C establish that this exact retained contribution is a causal-basis contribution for this exact completed assessed proposition?

The exact target logical ID is:

`claim-evidence-link:<proposition_id>:<contribution_id>`

Its `content_sha256` binds a deterministic projection containing:

- exact proposition ID;
- exact proposition text hash;
- exact contribution ID;
- exact contribution channel;
- exact evidence source ID, passage ID, and passage hash.

The projection is recursively key-sorted compact JSON encoded as UTF-8 with one trailing LF before SHA-256.

CLEAR requires:

- completed Contract C result-set execution;
- the exact proposition exists;
- proposition execution is completed with `completion=assessed`;
- the exact retained contribution exists;
- target logical and immutable content binding matches;
- the contribution appears in `conclusion.basis_members` with namespace `contribution`.

HOLD applies when the exact link is identified but result/proposition completion does not satisfy the policy or the retained contribution is residual/non-deciding rather than causal-basis state.

An unidentifiable requested proposition or contribution is evaluation failure and carries no effect.

For disposition this policy deliberately does not inspect:

- headline `reported_verdict`;
- terminal branch;
- causal-form label beyond the validator-established basis representation;
- measurement value or threshold meaning;
- generic assessment-stage values;
- rule/state basis members.

Those fields remain Contract C authority; they simply do not answer this Decision policy's question.

### Non-claims

CLEAR under this policy does not establish that:

- the source or passage is true or trustworthy;
- the corpus is complete;
- the contribution is independently sufficient;
- CAL's semantic judgment is correct;
- citation assessment or publication completeness was performed;
- the link applies to another claim;
- any actor may mutate a knowledge system.

## What is common and what is not

Demonstrated common machinery across the two policies is limited to:

- exact Contract C authority ingress;
- exact whole-object and Contract B binding;
- explicit policy identity;
- exact target binding as a requirement;
- Contract D input-authority construction;
- Contract D emission;
- fail-closed behavior.

Policy-specific code retains:

- selector/context shape;
- target derivation;
- Contract C fields inspected for disposition;
- CLEAR/HOLD logic;
- effect choice;
- policy-specific reason codes.

No policy DSL, plugin system, class hierarchy, generic rule engine, configuration language, or open-ended registry is justified by the two-policy evidence.

## Invocation and downstream use

These library policies produce Contract D objects only. Consumers must still validate Contract D and establish exact applicability for the expected upstream authority, policy, target, requested operation, and any requested machine-semantic parameters.

No maintained path in this surface performs Authorization, execution, actor selection, approval, delegation, network mutation, or outcome verification.

## Evidence boundary

The causal-basis citation policy was first tested as a bounded research specimen in Decision Engine Draft PR #35 and dispositioned `SUPPORTED FOR PROMOTION` after exact Contract C/D validation, substitution controls, weak-evaluator controls, and specimen-1 regression.

Direct Contract C fixtures are legitimate Decision Engine contract tests. They do not establish current CAL reachability or upstream producer correctness.
