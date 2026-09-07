# CAL Pipeline real-output Decision pressure test

## Classification

Draft Research Infrastructure / integration pressure test. No production authorization, merge, release, tag, promotion, Contract C/D change, Authorization, or execution.

## Exact Decision Engine base

`a4425f8eb47449ff6c683222921bbea9483742e2`

The experiment adds only this research directory and one research workflow. Maintained `src/**` and `scripts/**` are not changed.

## Upstream authority under test

The workflow regenerates fresh outputs from the exact CAL Pipeline RC0 integration head:

`camerontjs-dot/claim-audit-lab@4b9d69936d8ecdbaac0217561be7a3a821b70522`

That upstream build produces validated Contract C 1.0 objects from its exact bounded A -> Evidence Bundler -> B -> CAL -> C vertical. Decision Engine consumes those freshly generated Contract C bytes directly.

Exact external heads:

- Evidence Bundler: `50270b9bfcf6b5112c6ec88c02c7cdd7215e0ff4`
- RC7F-B1: `0ecdedc5cea970485a635508255f3670ab231c33`
- RC8J: `8e75c6782bb95c3763d06230b9c5df2b6af44054`
- Contract B 1.2 authority: `c314e53bd91c0736aa4370a364673b069aceb43e`
- Contract C 1.0 authority: `5fe55f9ed5d0ee9f026ca1b077e9d70ce0487ea1`
- Contract D 1.0 authority: `298a1a0f7b7b6d7712e11200d04faec3e1ca169b`

## Question

Can the maintained Decision Engine consume real, freshly generated CAL Pipeline Contract C outputs through the exact authority boundary and produce valid canonical Contract D for both maintained policies, while refusing obvious authority, binding, and cross-output replay mutations?

## Decisive result

**SUPPORTED_WITH_BOUNDS** for this exact real-output interoperability slice.

Decisive Decision Engine head: `3e45b721827515187ea6de9243ace85a65599921`

GitHub-hosted run: `34171780593`

Job: `101893314935`

Artifact: `cal-de-real-output-pressure-34171780593`

Artifact ID: `10035941867`

Artifact ZIP digest: `sha256:1ed05eb4353405ba6422b3fe410d82de9d5e125c63ff83c5a9d84fb050d208ec`

The run regenerated the exact upstream pipeline successfully, then consumed the resulting Contract C bytes through maintained Decision Engine ingress.

### Fresh child 1

- proposition: `PIPELINE_SMOKE_001:child:1`
- Contract C whole-object digest: `sha256:c599e97fd5b4da80ae558d5d57a351fa3b2d37081432013a9dbeaae65a80b5a3`
- supported-claim policy: `completed / clear`
- effect: `knowledge.add_verified_tag@1(scope=claim)`
- reason: `contract_c_supported`
- canonical Contract D digest: `sha256:db47ebc844c14aa28bbc02524684b1ea7e388e1f1eea7ee8cbc7153af7548200`
- causal-basis citation policy: `completed / clear`
- effect: `knowledge.cite_as_evidence@1`
- reason: `contract_c_contribution_in_causal_basis`
- canonical Contract D digest: `sha256:1f2ddf98a05d5772833984c3747e6cfda5ef7448d5580a73e077897e60cdfa5b`

### Fresh child 2

- proposition: `PIPELINE_SMOKE_001:child:2`
- Contract C whole-object digest: `sha256:8ae6759e52d2de69572594b31dce7562808786dc75dcc26d2b7bff74c4edb765`
- supported-claim policy: `completed / clear`
- effect: `knowledge.add_verified_tag@1(scope=claim)`
- reason: `contract_c_supported`
- canonical Contract D digest: `sha256:86be4b26ea9718e24fa2d185b70d95ba3f58d2905f24b4288839c6753683a750`
- causal-basis citation policy: `completed / clear`
- effect: `knowledge.cite_as_evidence@1`
- reason: `contract_c_contribution_in_causal_basis`
- canonical Contract D digest: `sha256:f1dd833b7390d2863cc44c2680dc0b75a602d78c13b5a82327d4bd632d768aa9`

### Fail-closed controls

For both fresh Contract C objects:

- wrong whole-object Contract C digest -> `contract_c_whole_object_mismatch`
- wrong expected Contract B binding -> `contract_b_binding_mismatch`
- wrong claim target content digest -> `target_binding_mismatch`

Cross-child replay controls also stayed closed:

- child-2 claim target against child-1 Contract C -> `failed`, `target_proposition_not_found`, no effect
- child-2 citation target against child-1 Contract C -> `failed`, `target_proposition_not_found`, no effect

The maintained exact-authority CLI independently reproduced `clear` for the first supported-claim case.

The workflow's maintained-source mutation guard passed. No `src/**` or `scripts/**` change was needed to obtain the result.

## Preserved apparatus deviations

The path to the decisive result includes three failed research-harness runs. They are retained as evidence rather than rewritten away.

1. Run `34171468257`: CAL regenerated successfully, but the workflow attempted to `tee` into a missing top-level `build/` directory under `pipefail`. This was a harness filesystem failure before Decision evaluation.
2. Run `34171587233`: the harness passed the full exported policy descriptor into `decisionContext.policy`; the maintained runtime correctly rejected it because the public context accepts exactly `{id, version}`. The harness was narrowed to that exact public shape.
3. Run `34171677438`: CAL again regenerated exact valid Contract C objects, but Decision Engine's independent released Contract C validator ran under global `python3` without the validator package's declared Pydantic dependency. The experiment environment was provisioned with the released apparatus dependency set. Validation was not bypassed.

## Bounded interpretation

Observed evidence supports a narrow interoperability claim: for these two fresh, valid, CAL-produced `assessed / supported` Contract C objects, both maintained Decision Engine policies consume the exact upstream bytes, emit canonical Contract D, and preserve the tested binding and replay protections.

This does not establish:

- CAL semantic correctness beyond the upstream bounded evidence;
- source legitimacy or corpus completeness;
- reachability of all valid Contract C states;
- correctness of Decision behavior on contradicted, not-checkable, mixed, or otherwise non-supported valid Contract C states;
- a general Decision policy framework;
- a generalized Contract C policy-counterfactual architecture;
- operational Authorization or execution.

## Next discriminating Decision test

The strongest next slice is valid semantic variation produced by CAL itself, not hand-edited Contract C.

Use the same admitted evidence for child 1 (`Women trailed Men...`) but supply the opposite strict-comparison target through the CAL input surface. If the frozen CAL machinery produces a valid `assessed / contradicted` Contract C object, run that object through both maintained policies.

That should discriminate policy semantics rather than merely repeat positive interoperability:

- supported-claim verification is expected to HOLD because the reported verdict is not `supported`;
- causal-basis citation may still CLEAR the exact deciding contribution if that contribution remains in the causal basis of the contradiction.

Those expectations are hypotheses for the successor experiment, not conclusions from this run.
