# CAL Pipeline V1 Decision Engine Candidate Freeze

Date: 2026-09-18

Classification: Integration evidence / candidate identity freeze. Documentation only. This record does not modify maintained Decision Engine runtime, policy, Contract C/D authority, Authorization, execution, release state, or production defaults.

Terminal local-slice status:

`QUALIFIED_FOR_LOCAL_PIPELINE_RUNS_C1_ONLY`

This status applies only when the incoming authority is exact released Contract C 1.0.0. It does not qualify the released Decision Engine for Contract C 2.x or richer CAL V1 parent/decomposition state.

## Frozen candidate

The CAL Pipeline V1 Decision Engine candidate is the already released Decision Engine v1.0.0 object. No newer research head is substituted for it.

- repository: `camerontjs-dot/decision-engine`
- release: `v1.0.0`
- release commit: `7be709b2141c767c5da89b8b94cf90233c4238fe`
- release tree: `4e92703e781024de62c77f2f14e9164aceb16815`
- annotated tag object: `7835f2f53267843113212abfa0cac6e726242409`
- deterministic release source archive: `decision-engine-v1.0.0-source.tar.gz`
- deterministic release source archive SHA-256: `c440d5de2a3853db9f4ccc2ba37d273e29ce8d9e71e0d646fc0c20eee0cd5902`
- published release receipt asset SHA-256: `ae2de0d5cf143c7118e54be387e8bd430b73e5cfa249ffc73183768a281a670a`
- release metadata blob: `27df4569334ac402a1e48baeeccc3a1c1233a172`

Machine-readable pointer manifest:

- `research/cal-pipeline-v1-decision-freeze-20260914/SLICE_MANIFEST.json`

The manifest is an evidence pointer. It does not become part of the immutable v1.0.0 release object.

## Maintained V1 boundary

`exact Contract C 1.0 admission -> exact target resolution -> fixed maintained policy implementation -> binding-preserving Decision materialization -> exact Contract D 1.0 output`

Exact released authorities encoded by V1 release qualification:

- Contract C 1.0.0 release commit: `5fe55f9ed5d0ee9f026ca1b077e9d70ce0487ea1`
- Contract D 1.0.0 release commit: `298a1a0f7b7b6d7712e11200d04faec3e1ca169b`

Maintained invocation surfaces:

- library: `evaluateContractCDecision(options)`
- CLI: `scripts/decision-engine-evaluate.mjs`
- maintained policies:
  - `decision-engine.contract-c.supported-claim-verification@1.0.0`
  - `decision-engine.contract-c.causal-basis-citation@1.0.0`

## Apparatus #100 authority-freeze ledger

The new pipeline authority-freeze convention says to freeze only state the current apparatus uniquely owns and that a legitimate downstream consumer must be able to verify without reconstructing producer-private behavior.

For the Decision Engine -> Contract D boundary, the frozen V1 slice therefore owns:

| Concept | Frozen authority | Integrity / meaning |
| --- | --- | --- |
| input authority | exact kind, ID, immutable identity | bound into Contract D authority state |
| policy | exact Decision policy ID/version | downstream must not reinterpret policy identity |
| target | exact kind, ID, content hash | substitution must remain detectable |
| evaluation | exact evaluation state | failed evaluation remains distinct from completed policy result |
| disposition | `clear | hold` when completed | Decision conclusion only |
| effect | exact typed/versioned normalized effect + parameters | candidate effect, not execution permission |
| Decision identity | Contract D semantic identity | canonical authority-bearing Decision identity |
| metadata | explicitly non-authoritative | cannot strengthen or change Decision semantics |

This freeze deliberately does **not** move CAL judgment, Contract C participant authority, Authorization, actor/delegation state, or execution occurrence into Decision authority.

## Qualification evidence

The exact released object has already passed stronger evidence than a new documentation-only candidate would add.

Exact release-object qualification:

- workflow: `Decision Engine v1.0.0 release qualification`
- run: `34646511527`
- exact head: `7be709b2141c767c5da89b8b94cf90233c4238fe`
- conclusion: `success`

The successful job verified, among other things:

1. exact candidate identity and release-only delta;
2. exact Contract C and Contract D release authorities;
3. binding-preserving materializer controls;
4. V1 and maintained policy cohorts;
5. exact-authority CLI cohort;
6. independent Contract D consumption of emitted outputs;
7. deterministic source-archive rebuild;
8. smoke execution from the extracted release artifact;
9. exact candidate unchanged after qualification.

Post-merge ordinary CI on the same release commit:

- run: `34611230661`
- conclusion: `success`

The earlier stale-evaluator release-readiness failure remains preserved in repository history. It was classified as evaluator-maintenance evidence and was not erased to obtain the passing exact-head qualification.

## Why this is the local slice

V1 has already been converged, promoted, release-qualified, tagged, published, and smoke-tested from its deterministic source archive. A new Decision Engine implementation candidate would reduce assurance, not increase it.

The portable local slice is therefore the immutable released source archive plus the exact Contract C 1.0.0 and Contract D 1.0.0 authorities it was qualified against.

Do not copy a newer research branch into the local pipeline merely because it contains additional capability.

## Current pipeline boundary

The current CAL V1 local candidate is richer than the released Contract C 1.0.0 boundary in at least one important respect: parent/decomposition state is not yet authoritatively representable through released C1. Apparatus has preserved that incompatibility rather than silently widening C1.

Decision Engine research PRs #75 onward explore C2 ingress and successor authority questions. Those PRs remain research/integration evidence. They are not part of this frozen V1 slice and do not replace `v1.0.0`.

Therefore:

1. exact C1 may enter the released Decision V1 slice unchanged;
2. C2 must not be relabeled or downgraded to C1;
3. richer CAL parent/decomposition state must not be silently discarded to reach Decision;
4. a future C2/successor Decision slice requires its own bounded qualification and authority selection evidence;
5. the current frozen Decision slice may be staged locally now, but end-to-end use waits on a compatible authoritative Contract C handoff for the specific CAL output being tested.

## Local staging contract

A local pipeline runner should preserve:

- exact Decision release commit/tree/tag identity;
- source archive SHA-256 before extraction/use;
- exact Contract C authority commit;
- exact Contract D authority commit;
- exact input Contract C bytes and whole-object SHA-256;
- exact expected Contract B binding;
- exact policy ID/version;
- exact target identity/content hash;
- exact command and runtime environment;
- emitted canonical Contract D bytes/hash;
- nonzero/no-output failures;
- downstream Contract D consumer outcome when exercised.

The runner should use the maintained CLI or library boundary rather than importing research-only modules.

## Explicit exclusions

This freeze does not establish or authorize:

- Contract C 2.x ingress or semantics;
- Decision handling of richer CAL V1 decomposition state that released C1 cannot carry;
- generic policy registries, plugins, DSLs, or caller-supplied evaluators;
- operational Authorization;
- actor selection, approval, or delegation;
- execution, external mutation, rollback, or outcome verification;
- promotion of any open Decision research PR.

## Requalification triggers

Requalify rather than silently extending this slice if any of these change:

1. incoming contract authority/version;
2. Decision policy identity or semantics;
3. target or input-authority binding;
4. effect type/version/normalization;
5. Contract D authority or semantic identity rules;
6. the downstream representation of richer CAL decomposition state;
7. Authorization or execution semantics.

## Disposition

Observed: the exact v1.0.0 release object and extracted release artifact passed the release qualification and post-merge CI cited above.

Inference: that immutable object is already the strongest justified Decision Engine slice for local CAL Pipeline work that enters through exact Contract C 1.0.0.

Unknown / blocked boundary: the current richer CAL V1 -> authoritative Contract C successor -> Decision path is not qualified by this freeze.

No new runtime promotion, version, tag, or release is justified.
