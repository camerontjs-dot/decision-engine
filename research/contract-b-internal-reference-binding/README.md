# Contract B internal-reference binding pressure

## Classification

Draft Research Infrastructure / exact-ingress authority experiment. No maintained ingress/policy change, merge, release, tag, promotion, Authorization, or execution.

## Exact real baseline

From Decision Engine PR #41 decisive artifact:

- exact Contract C SHA: `sha256:c599e97fd5b4da80ae558d5d57a351fa3b2d37081432013a9dbeaae65a80b5a3`
- exact Contract B bundle ID: `8e207512-fa41-5ead-bbba-08938b7f4ce0`
- exact Contract B bundle hash: `sha256:46f0cd9c4156bb64c54688777480bd838fc83c323f02b4c7fe04dfcf5e995564`
- exact PR #41 Contract B index is frozen verbatim beside this record.

Released Contract C 1.0.0 supports an optional Contract B index during validation. With that index supplied, it verifies proposition presence/text hashes and every contribution evidence passage/source/hash against the exact B index.

Maintained DE ingress currently runs exact Contract C validation without a Contract B index, then independently compares only `contract_version`, `bundle_id`, and `bundle_hash` against caller-supplied expected B authority.

## Question

Can a canonical Contract C object retain the exact real Contract B bundle-level binding while substituting internal proposition/evidence references that the released validator would reject when given the exact B index, and still receive a positive maintained Decision?

## Variants

Starting from the real supported C object, construct canonical self-consistent C variants while leaving `input.contract_b` unchanged:

1. proposition text-hash substitution;
2. proposition-ID substitution;
3. evidence passage-hash substitution;
4. evidence source-ID substitution;
5. evidence passage-ID substitution to an index-absent ID.

Each variant receives a new exact result-set identity and whole-object digest. Policy targets are derived freshly from the mutated C, so this is not target replay.

## Pre-registered expectations

- baseline must PASS released Contract C validation both without and with the exact B index;
- each reference-substitution variant may PASS no-index Contract C structural validation if the fields remain schema-valid;
- each must FAIL released Contract C validation when the exact B index is supplied;
- if maintained DE establishes only bundle-level B binding, Policy A should CLEAR proposition-reference variants whose headline remains supported and Policy B should CLEAR evidence-reference variants whose contribution remains in the causal basis;
- exact Contract D input authority must bind each changed C whole-object identity, so no old output bytes may replay.

## Falsifiers

- baseline fails exact indexed validation;
- a deliberately substituted reference passes exact indexed validation;
- maintained DE rejects a no-index-valid variant because it independently establishes the missing internal B reference relation;
- a changed C object reuses prior Contract D immutable authority/output bytes.

## Interpretation boundary

A positive maintained Decision on an index-invalid C does not prove the C is truthful or producer-legitimate. It measures the authority aperture of the current DE ingress. Whether DE is expected to receive a separately trusted C artifact that already carries producer assurance, versus independently re-establishing exact C→B internal references, is a governance decision.
