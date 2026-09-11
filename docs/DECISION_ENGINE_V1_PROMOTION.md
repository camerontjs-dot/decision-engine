# Decision Engine V1 promotion record

Status: maintained production state. This record documents the bounded promotion of the qualified Decision Engine V1 architecture. It does not authorize or record a `v1.0.0` tag, GitHub release, Contract D mutation, Authorization, execution, or downstream operational effect.

## Exact promoted lineage

Protected `main` before promotion:

- `358c2bb20f490bf25e808434394b26a70a16a123`

Qualified V1 candidate:

- PR: `#68` — `V1: converge bounded Decision Engine architecture`
- candidate head: `65aff0d47f450bc99dad5efaf1d2233173a3f350`
- candidate tree: `e4a78cbe9098e27c32dbc35d09c092701472c85b`

Production promotion merge:

- merge commit: `247a8bc5da5dc94358937a32f52241777aadeb34`
- parent 1: `358c2bb20f490bf25e808434394b26a70a16a123`
- parent 2: `65aff0d47f450bc99dad5efaf1d2233173a3f350`
- merge tree: `e4a78cbe9098e27c32dbc35d09c092701472c85b`

The production merge tree is byte-identical to the qualified candidate tree. The merge therefore changed repository history identity without changing the qualified file tree.

The pre-promotion convergence record remains frozen as the evidence/decision record in `docs/DECISION_ENGINE_V1_CONVERGENCE.md`. This promotion record supersedes only its candidate-status statement; it does not rewrite the historical convergence evidence.

## Promoted capability boundary

The maintained V1 architecture is:

```text
exact released Contract C 1.0 admission
        -> exact policy-owned target resolution
        -> fixed maintained policy implementation
        -> immediate binding-preserving Decision materialization
        -> exact Contract D 1.0 validation/canonicalization at the operator boundary
```

V1 maintains one raw authority family: exact released Contract C 1.0. The two maintained policies remain:

- `decision-engine.contract-c.supported-claim-verification@1.0.0`
- `decision-engine.contract-c.causal-basis-citation@1.0.0`

The promotion does not add release-qualification, task-result, artifact-manifest, Contract C `non_deciding`, generic raw-authority, detached-policy-result, caller-controlled evaluator, Authorization, or execution surfaces.

## Exact pre-merge qualification receipts

All qualification below executed against exact candidate head `65aff0d47f450bc99dad5efaf1d2233173a3f350` and passed:

- Decision Engine V1 exact-head qualification: run `34603695181`
- CI & Repository Hygiene Verification: run `34603695102`
- Contract C 1.0.0 to Contract D 1.0.0 conformance: run `34603695163`
- Contract-first two-policy C to D conformance: run `34603695067`

Exact-head qualification artifact:

- artifact ID: `10265202768`
- digest: `sha256:c02155a9efb6d9b69bfc68d31645257cd46b6d695a43f2333c9e566f4775641a`

The qualification covered exact authority identity, expected Contract B binding, target substitution, unknown policy, caller evaluator substitution, binding preservation, supported/contradicted/not-checkable/mixed/FAILED outcomes, deterministic Contract D output, effect applicability, and the Decision-to-Authorization firewall.

## Post-merge production receipt

Automatic repository CI executed against exact production merge commit `247a8bc5da5dc94358937a32f52241777aadeb34`:

- CI & Repository Hygiene Verification: run `34606885554`
- event: `push`
- conclusion: `success`

The C-to-D and two-policy conformance workflows are PR-scoped in the promoted tree and did not automatically run on the merge commit. No separate post-merge conformance run is claimed here. The exact production merge tree is identical to the candidate tree on which both conformance workflows passed. This tree-identity fact supports content equivalence but is kept distinct from an independently executed post-merge conformance receipt.

A future release-readiness pass may choose to add or manually execute an exact-production conformance gate before tagging, without changing the already-promoted V1 architecture.

## Preserved limitations

The following remain bounded limitations rather than promotion blockers:

1. Contract C ingress binds the expected Contract B identity at the maintained boundary but does not independently authenticate a complete Contract B evidence index.
2. `knowledge.add_verified_tag@1` has a broader-sounding name than the narrow V1 epistemic claim and remains a V1.x vocabulary question.
3. The Contract C `non_deciding` successor/sidecar architecture remains unresolved upstream and is not a V1 authority profile.
4. Decision Engine V1 performs no operational Authorization or execution.

## Release boundary

Promotion and release remain separate governance actions.

This record establishes the bounded V1 architecture as maintained production state at merge commit `247a8bc5da5dc94358937a32f52241777aadeb34`.

It does not authorize:

- a `v1.0.0` tag;
- a GitHub release;
- package publication;
- Contract C or Contract D version changes;
- Authorization;
- execution.

The next permitted decision is a release-readiness review against the exact maintained production state.
