# Contract C non-deciding consumer RC0 terminal record

## Disposition

`SUPPORTED_BOUNDED_CROSS_REPO_CONSUMER`

This is a bounded research result only. It does not establish a canonical Contract C successor, production Decision Engine support for a future Contract C version, Contract E Authorization, merge, release, tag, or promotion.

## Exact Decision execution

- protected Decision Engine base: `358c2bb20f490bf25e808434394b26a70a16a123`
- exact tested research head: `cd591c08c56a0336c8c2052c005a935de6ab1140`
- maintained Contract C ingress blob held fixed: `f57a8067dadc04afb459f1d0342b2b786ec775e6`
- maintained supported-claim Decision blob held fixed: `3529b75f75936fffb9b2d9e2972cb7117b526661`
- run: `34530232915`
- artifact: `10173178817`
- artifact digest: `sha256:3f4f8a24cc25288127115269d030c92530cfe3d671e43f36b44f2c328e234df7`

## Frozen handoff consumed

- Apparatus Draft Research PR #85
- exact Apparatus handoff receipt: `ad1ffbd7906a7cf34cce5afa906a5797cd4a14ff`
- exact `valid-shadow.json` SHA-256: `sha256:325962ebcdbf6af836bb6193a451524ccd40b4d10f2394ff9f703fbfce1ec1e3`
- exact result-set identity: `result-set:4483272c4f6fbd9cb2362be7e3174bbd00aff3cf761d6c374897f3478818c9f0`

The four copied handoff files have Git blob identities exactly equal to the source Apparatus handoff blobs:

- `SHADOW_SPEC.md`: `d98d2dac12b6639d5c76d267de3e337cd8d1faf7`
- `schema-delta.json`: `0b1edf9ebdf1c7508306ffc51b703650dac9fdc4`
- `contract-b-index.json`: `4de40713482a1fc5a075a230a61e19acc25afbd9`
- `valid-shadow.json`: `14e88cbc691f7eba9366b4bf88611ef834637f27`

No Apparatus shadow implementation/evaluator or CAL semantic implementation was copied into the consumer.

## Observed consumer reconstruction

The research consumer independently reconstructed from the frozen handoff:

- proposition `temporal-p1`;
- exact Contract-B version / bundle ID / bundle hash;
- both causal passages `u-a` and `u-b` with exact source/hash bindings;
- channel `non_deciding` for both causal contributions;
- causal form `independent_sufficient_alternatives`;
- terminal state `completed / not_checkable / not_checkable / unresolved_categorical_relation`.

The supported-claim policy-core-equivalent evaluation was:

- state: `completed`
- disposition: `hold`
- reason: `contract_c_proposition_not_checkable`

Changing one neutral causal contribution to `support` or `counterevidence` remained observable as that changed channel; the consumer did not normalize it back to neutral. Those mutations still produced HOLD because the proposition remained `not_checkable`.

## Falsifiers / mutation controls

The consumer rejected:

- wrong frozen whole-object digest;
- wrong research version sentinel;
- unknown contribution channel;
- Contract-B evidence-reference substitution;
- missing/unknown causal basis contribution;
- causal/residual overlap;
- unclassified retained contribution;
- `single_necessary` with two basis members;
- `independent_sufficient_alternatives` with one basis member;
- stale result-set identity.

An intentionally unsafe evaluator that returned CLEAR merely because a causal `non_deciding` contribution existed was observed to return CLEAR and was rejected by the expected policy-core result. This demonstrates that the cohort discriminates the neutral-evidence laundering failure it is intended to catch.

## Maintained-boundary controls

The exact released Contract C authority was checked out at:

- release commit `5fe55f9ed5d0ee9f026ca1b077e9d70ce0487ea1`
- tag object `6bd135a948e407212b2e77ec18ac5c402f93565e`
- validator blob `9c75ccfbf2223578a8d1a7bf0c39673b394fbea4`

The maintained Decision Engine released-1.0 ingress rejected the shadow with `contract_c_validation_failed`, as required by the version boundary.

A separate released-1.0 `completed / assessed / supported` control passed the maintained path and produced:

- exact research-control C SHA-256: `sha256:c33ca78ad9cc11bf3c1410d433e17cda32f91a10d19f730c46f3ccde2ee75009`
- result-set identity: `result-set:9ca153af6e7cf4ce3db2733a67ec96495e10238640e49fe6ae014fda86aff66f`
- Decision: `completed / clear`
- reason: `contract_c_supported`.

Ordinary Decision regression on the same job also passed:

- engine invariant sweep: `81/81`;
- output-quality sweep: `56/56`;
- combination matrix: `6309/6309`;
- Gate head tests: `14/14`;
- existing Contract C seam fixture check: `165 checks across 8 fixtures`.

## Independence boundary

This is a cross-repository implementation using a frozen byte-level handoff and no producer-code dependency. It is **not** claimed as a fresh-human/model clean-room reproduction because the same research session designed and observed the upstream work.

A genuinely context-free implementer remains a stronger test before any promotion decision.

## Bounded inference

Within the exact frozen shadow profile, the `non_deciding` contribution representation is consumable across the Apparatus -> Decision Engine repository boundary without evidence-channel laundering, loss of exact unresolved provenance, or loss of independently-sufficient causal multiplicity. The maintained supported-claim policy semantics remain safe: `not_checkable` HOLDs, while a released-1.0 supported control still CLEARs.

This supports the representation as a viable successor candidate. It does not establish how the candidate should be versioned, whether it is minimal across all future semantic families, or whether production consumers should support it.

## Highest-value next falsifier

Do not add another happy-path fixture. The next discriminating question is version/compatibility architecture:

1. Can a versioned successor preserve exact 1.0 semantics for all existing 1.0 objects while adding `non_deciding` without ambiguous downgrade/translation behavior?
2. Must `non_deciding` be rejected on downgrade rather than mapped to `support`, `counterevidence`, or dropped?
3. Can a dual-version consumer select validator semantics from independently bound contract authority rather than caller-controlled version metadata?

A later context-free independent consumer should follow if a concrete successor wire version survives that pressure test.