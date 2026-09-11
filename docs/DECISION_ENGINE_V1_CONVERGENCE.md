# Decision Engine V1 convergence record

Status: bounded V1 candidate. This record does not authorize merge, release, tag, Contract D mutation, Authorization, or execution.

## Live authority at convergence start

Decision Engine protected `main`:

- `358c2bb20f490bf25e808434394b26a70a16a123`

Released Contract C authority:

- version: `1.0.0`
- release commit: `5fe55f9ed5d0ee9f026ca1b077e9d70ce0487ea1`
- tag object: `6bd135a948e407212b2e77ec18ac5c402f93565e`
- validator blob: `9c75ccfbf2223578a8d1a7bf0c39673b394fbea4`

Released Contract D authority:

- version: `1.0.0`
- release commit: `298a1a0f7b7b6d7712e11200d04faec3e1ca169b`
- tag object: `6eadd688b482f3c9fce2ce5e7a2841089d852096`
- core validator blob: `564dcde5677df5ac8f86f21dc0ffd1692f44c9f0`
- effect registry blob: `a40f4f4447470654bdc16d852f5927189ae30cc5`

## V1 capability statement

Decision Engine V1 accepts exact released Contract C 1.0 authority through the maintained Contract C adapter, verifies the exact whole-object digest and released validator authority, verifies the independently supplied expected Contract B top-level binding, resolves an exact policy-owned target, dispatches only to fixed maintained policy implementations, and materializes a Contract D 1.0 Decision while preserving authority, policy, target, evaluation, effect, and allowed metadata bindings.

It does not establish upstream evidence truth, CAL correctness, source legitimacy, corpus completeness, current Authorization, execution, exactly-once effects, rollback, or outcome verification.

The maintained boundary remains:

```text
exact released Contract C admission
        -> exact policy-owned target resolution
        -> fixed maintained policy implementation
        -> immediate bound Decision materialization
        -> exact Contract D validation/canonicalization at the operator boundary
```

## Supported authority domains

| Domain | V1 disposition | Reason |
| --- | --- | --- |
| Released Contract C 1.0 | `ADOPT_IN_V1` / `MAINTAINED_ALREADY` | Current maintained consumer, exact released authority, cross-repository conformance and real-CAL fixtures exist. |
| Release qualification | `DEFER_V1_X` | Useful heterogeneous-domain research, but no required V1 product consumer. |
| Task-result verification | `DEFER_V1_X` | Useful heterogeneous-domain research, but no required V1 product consumer. |
| Artifact-manifest authority | `DEFER_V1_X` | Useful heterogeneous-domain research, but no required V1 product consumer. |
| Contract C research `non_deciding` shadow | `DEFER_V1_X` | Cross-repository consumer succeeded, but no canonical successor version or production authority has been selected. |

V1 has one raw authority family: exact released Contract C 1.0. Similar JSON shapes do not create cross-domain compatibility.

## Maintained policies

### `decision-engine.contract-c.supported-claim-verification@1.0.0`

Exact target kind: `claim`.

Policy question: does exact admitted Contract C establish a completed, assessed proposition whose `reported_verdict` is exactly `supported` for the exact proposition target?

- supported -> `CLEAR`, reason `contract_c_supported`
- contradicted -> `HOLD`, reason `contract_c_reported_verdict_not_supported`
- not-checkable -> `HOLD`, proposition completion reason
- mixed/unresolved -> `HOLD`, proposition completion reason
- unidentifiable requested proposition -> `FAILED`
- malformed/unbound authority or target -> fail closed before Decision authority

Associated Contract D effect descriptor: `knowledge.add_verified_tag@1(scope=claim)`.

This effect name must be read narrowly. Under V1 it means only that this exact Decision policy produced CLEAR for this exact Contract C authority and exact claim target. It does not mean permanently true, globally verified, or authorized to mutate a knowledge system. A Contract D consumer must still establish exact applicability and yields only `candidate_for_authorization` for a matching CLEAR Decision.

A completed HOLD may still carry the policy-associated effect descriptor because Contract D binds the contemplated operation to the Decision. HOLD itself is non-executable and the released Contract D consumer returns `hold`, not `candidate_for_authorization`.

### `decision-engine.contract-c.causal-basis-citation@1.0.0`

Exact target kind: `claim-evidence-link`.

Policy question: is the exact retained contribution a causal-basis contribution for the exact completed assessed proposition?

- exact causal-basis contribution -> `CLEAR`
- residual/non-deciding contribution -> `HOLD`
- unidentifiable proposition/contribution -> `FAILED`
- malformed/unbound authority or target -> fail closed

Associated effect descriptor: `knowledge.cite_as_evidence@1`.

This policy does not establish source truth, source trustworthiness, independent sufficiency, or publication completeness.

## Trusted implementation boundary

Policy identity is not evaluator authentication. V1 therefore keeps the maintained internal switch in `src/contractCDecisionRuntime.js` and does not expose caller-controlled policy registries, evaluator callbacks, arbitrary policy modules, or a policy DSL.

A caller cannot select different evaluator behavior under the same maintained policy ID/version through the V1 API.

## Bound Decision materializer

V1 adopts the smallest supported generic seam as maintained internal plumbing in `src/decisionMaterializer.js`.

It accepts only:

- externally established `inputAuthority`;
- externally established `policy`;
- externally established `target`;
- a trusted policy-owned fragment containing `evaluation` plus optional `effect` and `metadata`.

Authority, policy, or target fields injected into the policy fragment are ignored. Domain admission, target semantics, policy dispatch, and policy evaluation stay outside the generic layer.

The materializer does not create a portable detached policy-result protocol. Maintained policies invoke it immediately after evaluation in the same trusted call path.

## Version authority

Contract C 1.0 selection is external to the input object: the maintained Contract C-specific API is pinned to the released 1.0 authority and validator. The object's own `contract_c_version` cannot select a different validator.

Research has shown that a widened `non_deciding` Contract C shadow is not wire-compatible with released 1.0 and that validator-valid downgrades can erase or relabel neutral causal provenance. If a successor is later promoted, V1.x must use parallel exact-version authority with no silent downgrade. No successor version is assigned here.

## Research compression

| Evidence | V1 classification | Convergence consequence |
| --- | --- | --- |
| Maintained Contract C -> Decision policies and exact C/D conformance | `MAINTAINED_ALREADY` | Preserve behavior. |
| PR #58 adapter / projection seam, science `33f39e88f0f94a13afe740d087e4896247695f79` | `ADOPT_IN_V1` | Keep domain admission/resolution separate from generic projection. |
| PR #61 mutation audit, science `b38c384557551e87aa71eb87c6b0b42d35bf10d1` | `DIAGNOSTIC_ONLY` plus qualification method | Retain mutation/falsifier coverage; do not ship its research abstractions. |
| PR #64 policy implementation authority, science `c609260704a947ea9818143a5c439d8bc5ec6f6c` | `ADOPT_IN_V1` | Fixed maintained dispatch is trusted machinery. |
| PR #65 projection minimality, science `829827a657253f030d69782ea25f00433397e044` | `ADOPT_IN_V1` | Generic seam owns binding preservation, not domain semantics or duplicated Contract D validation. |
| PR #66 production-shaped extraction, science `1d18e04e5ea6dcb228878422b4854817a27a330b` | `ADOPT_IN_V1` and `FALSIFIED_DO_NOT_USE` for detached policy results | Extract only internal bound materialization. Do not expose detached policy-result portability. |
| PR #67 `non_deciding` consumer, implementation `cd591c08c56a0336c8c2052c005a935de6ab1140` | `DEFER_V1_X` | Representation is viable, but no canonical Contract C successor exists. |
| Release/task/artifact heterogeneous-domain research | `DIAGNOSTIC_ONLY` / `DEFER_V1_X` | Evidence that the seam can generalize is not a reason to expand the V1 product surface. |

## Preserved falsifications

V1 explicitly preserves these negative results:

1. **Caller-controlled policy implementation is unsafe.** Exact policy ID/version does not bind evaluator behavior. V1 exposes no caller policy registry or evaluator callback.
2. **Detached policy result is not self-binding.** A genuine evaluation from authority A can be reassociated with authority B and still form structurally valid Contract D. V1 materializes immediately in the trusted evaluation path.
3. **Cross-domain shape similarity is not authority.** Domain adapters/resolvers are not interchangeable unless explicitly maintained and qualified.
4. **`non_deciding` cannot be downgraded safely to Contract C 1.0.** No compatibility adapter maps it to support/counterevidence or drops it in V1.

## Known V1 limitations

- Contract C ingress independently establishes exact Contract C bytes, released validator authority, and the expected Contract B top-level binding. It does not independently authenticate a full Contract B index or re-prove every Contract C internal evidence reference. That stronger indexed-ingress research lacks an independently authoritative Contract B index identity source for maintained use.
- `knowledge.add_verified_tag` is existing Contract D vocabulary whose name is broader than the bounded V1 policy claim. V1 narrows its meaning through exact policy/target/authority applicability and documentation rather than inventing an incompatible effect family during convergence.
- V1 has no canonical consumer for the `non_deciding` research shadow.
- V1 has no Authorization or execution surface.

## V1 acceptance focus

Promotion review requires green evidence for:

- exact Contract C authority and whole-object binding;
- exact expected Contract B binding;
- exact target binding;
- exact fixed policy identity and maintained implementation dispatch;
- external binding preservation through materialization;
- supported, contradicted, not-checkable, mixed/unresolved, and FAILED controls;
- unknown policy and target substitution refusal;
- exact Contract D validation/canonicalization;
- CLEAR -> `candidate_for_authorization`, HOLD -> `hold`, FAILED -> `evaluation_failed` under the released Contract D consumer;
- no Authorization or execution in Decision Engine;
- ordinary repository regression suites.

The candidate must remain unmerged until an explicit promotion decision.
