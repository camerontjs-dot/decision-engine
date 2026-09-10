# Contract C non-deciding shadow RC0 handoff spec

This directory is a frozen research handoff surface. It is not a canonical Contract C release.

## Authority lineage

- released Apparatus base: `c3563cff66d2c85dcbf575c693056e2d8e4563d4`
- released Contract C 1.0 schema blob: `b0369de9b5c156322d6787261bbc7658a3b33781`
- released Contract C 1.0 validator blob: `9c75ccfbf2223578a8d1a7bf0c39673b394fbea4`
- CAL repair comparison PR #100 pressure-test head: `aa5f0f1313e65e6d31493095214c76d743ca6d89`
- Apparatus structural qualification run: `34528850394`
- Apparatus structural qualification artifact: `10172655148`
- artifact digest: `sha256:94b5edd27cc2515ce9af3c460d88a821c1d59d477c18c97d832a543df2479f24`

## Wire semantics

The shadow inherits released Contract C 1.0 semantics except for exactly two semantic leaves:

1. `contract_c_version` is the non-canonical research sentinel `research-non-deciding-rc0`.
2. contribution `channel` accepts the released values `support`, `counterevidence` plus one research value `non_deciding`.

`non_deciding` means the evidence participated in the CAL-attributable terminal epistemic basis without being classified as support or counterevidence.

A `non_deciding` contribution otherwise uses the normal Contract C contribution identity, exact Contract-B evidence reference, conclusion basis, residual classification, and causal-form machinery.

The handoff fixture contains two distinct `non_deciding` contributions in the causal basis and declares `causal_form=independent_sufficient_alternatives`. The consumer must preserve both exact evidence references and that multiplicity. It must not relabel either contribution as support or counterevidence.

## Exact fixture identity

- expected canonical `valid-shadow.json` SHA-256: `325962ebcdbf6af836bb6193a451524ccd40b4d10f2394ff9f703fbfce1ec1e3`
- expected `result_set_id`: `result-set:4483272c4f6fbd9cb2362be7e3174bbd00aff3cf761d6c374897f3478818c9f0`

## Consumer obligations

From this handoff alone, a consumer must be able to recover:

- proposition `temporal-p1`;
- terminal result `not_checkable / unresolved_categorical_relation`;
- both causal passage IDs `u-a` and `u-b` with exact source/hash bindings;
- contribution channel `non_deciding` for each;
- causal multiplicity `independent_sufficient_alternatives`.

The consumer must fail closed on a wrong Contract-B evidence reference, missing basis contribution, malformed causal cardinality, unknown channel, changed version sentinel, or broken fixture hash.

The consumer is not authorized to infer operational permission, support, refutation, or Contract E authorization from `non_deciding`.