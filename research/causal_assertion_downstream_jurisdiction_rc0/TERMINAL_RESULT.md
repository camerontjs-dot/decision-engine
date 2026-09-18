# Causal Assertion Downstream Jurisdiction RC0 — Terminal Result

Date: 2026-09-18

Classification: Draft Research / cross-repository information-sufficiency discriminator.

## Frozen authorities

- Decision Engine parent: `b1bcc33e2b5ef0707b8cbf7dd8e821b2d34d1b55`
- Contract C2 authority: `camerontjs-dot/apparatus-contracts@b42c827acb0a9fe65353354d709add0e27bab307`
- CAL explicit-causal-assertion Gate-1B authority: `3653d4534ba8d6af22a54a593c30cafbd3b75725`

## Preserved apparatus failure

Initial run `35362208871` passed exact Decision-source isolation, exact C2 checkout identity, and JavaScript syntax, then failed before the discriminator because the workflow stored literal `$GITHUB_WORKSPACE/...` strings in `env:`. Python therefore could not import the exact C2 `validators` package.

Classification: **HARNESS_PATH_INTERPOLATION_DEFECT**.

The correction changed only workflow path interpolation to GitHub's expression form. Frozen preregistration, evaluator, manifest, exact Decision parent, exact C2 authority, expected observations, and semantic test remained unchanged.

## Decisive execution

- corrected head: `5c89b16a73900d1412fcefb4c04b2242bfad913c`
- workflow run: `35362333971`
- job: `105656367388`
- result: PASS
- artifact: `10554961939`
- artifact ZIP SHA-256: `7c2e93b717d9a9920217306134a2ad6b48a462e1b47fc3fcd2472fa147550cf4`

## Disposition

**SUPPORTED_BOUNDED_CAUSAL_JURISDICTION_INFORMATION_GAP.**

The current normative Contract C2 + Decision supported-claim inputs do not expose enough typed information for an independent downstream consumer to distinguish:

1. ordinary categorical support; from
2. support bounded to CAL's explicit-source-causal-assertion jurisdiction.

Both exact valid C2 objects:

- passed exact C2 validation and ingress;
- exposed the same result/proposition execution state;
- exposed the same `supported / categorical_support` terminal state;
- exposed the same participant relation/role shape;
- exposed the same basis-group cardinality;
- produced Decision `CLEAR`;
- produced the same supported-claim policy effect.

The separately frozen research manifest distinguishes the jurisdictions, but that distinction is not present in current normative Decision inputs.

## Exact negative controls

Contract C2 is closed-world at this profile:

- proposition results have no `semantic_jurisdiction` field;
- adding `semantic_jurisdiction: explicit_source_assertion_only` is rejected by exact C2 validation.

Observed rejection:

`candidate.propositions[0]: field mismatch: ['basis_groups', 'execution', 'participants', 'proposition', 'semantic_jurisdiction', 'terminal'] != ['basis_groups', 'execution', 'participants', 'proposition', 'terminal']`

The supported-claim Decision context is also closed-world:

- it accepts exactly `policy, proposition_id, target`;
- adding a semantic-jurisdiction input is rejected.

Observed rejection:

`decisionContext must contain exactly: policy, proposition_id, target`

## Interpretation

This result does **not** establish that the current generic supported-claim policy is incorrect.

It establishes a narrower information-sufficiency fact:

> A future downstream rule that must treat explicit-source-causal-assertion support differently cannot derive that distinction from current Contract C2 plus current supported-claim Decision context without reopening CAL semantics, interpreting raw proposition text, relying on producer-private conventions, or receiving an additional bound typed authority input.

That is exactly the stronger downstream gate required by the CAL semantic-family roadmap.

## Non-events

- no causal inference was performed;
- no Authorization was performed;
- no operational execution was performed;
- no maintained Decision `src/` changed;
- no Contract C bytes/schema/validator changed.

## Next discriminator

Do not select a Contract C schema change from this result alone.

Compare the smallest viable jurisdiction carriers against this exact counterexample:

1. **Fail-closed policy routing**: explicit-causal-assertion support is excluded from generic supported-claim verification unless a dedicated causal-jurisdiction policy is selected.
2. **Externally bound immutable jurisdiction manifest**: Decision receives a typed proposition-bound jurisdiction authority separate from Contract C.
3. **Future in-band Contract C carrier**: a typed jurisdiction/basis marker is preserved in a successor contract profile.

The next test should determine whether options 1 or 2 close the gap without duplicating or weakening semantic authority. Only a demonstrated insufficiency should justify widening Contract C.

No merge, release, production policy mutation, Contract C mutation, Authorization, or execution is authorized.
