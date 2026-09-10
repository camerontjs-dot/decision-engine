# Contract C non-deciding consumer RC0

**Classification:** Draft Research Infrastructure / cross-repository consumer conformance. No maintained `src/**`, `scripts/**`, or `tests/**` change; no Contract C/D amendment; no Authorization, execution, merge, release, tag, promotion, or production-default change.

## Exact Decision Engine base

- protected `main`: `358c2bb20f490bf25e808434394b26a70a16a123`
- maintained Contract C ingress blob: `f57a8067dadc04afb459f1d0342b2b786ec775e6`
- maintained supported-claim Decision blob: `3529b75f75936fffb9b2d9e2972cb7117b526661`
- maintained Contract C authority remains released `1.0.0`; this experiment must not alter it.

## Frozen external handoff authority

- Apparatus Draft Research PR #85
- qualified handoff receipt commit: `ad1ffbd7906a7cf34cce5afa906a5797cd4a14ff`
- producer-side qualification run: `34529151133`
- artifact: `10172768614`
- artifact digest: `sha256:7af02c2230be29b893f3480ef25b82a0caf0ce334d3967997ac713ebb659170b`
- exact handoff `valid-shadow.json` SHA-256: `sha256:325962ebcdbf6af836bb6193a451524ccd40b4d10f2394ff9f703fbfce1ec1e3`
- exact handoff result-set ID: `result-set:4483272c4f6fbd9cb2362be7e3174bbd00aff3cf761d6c374897f3478818c9f0`
- frozen shadow wire sentinel: `research-non-deciding-rc0`

The consumer may read only these frozen handoff artifacts from the Apparatus receipt commit:

- `research/contract_c_non_deciding_shadow_rc0/handoff/SHADOW_SPEC.md`
- `research/contract_c_non_deciding_shadow_rc0/handoff/schema-delta.json`
- `research/contract_c_non_deciding_shadow_rc0/handoff/valid-shadow.json`
- `research/contract_c_non_deciding_shadow_rc0/handoff/contract-b-index.json`

It must not import, copy, execute, or inspect the Apparatus shadow implementation/evaluator or CAL producer/relation/composition implementation as part of this consumer.

## Independence scope

This is a separate-repository implementation with no producer-code dependency and a frozen byte-level handoff. It is **not** claimed as a fresh-human/model clean-room reproduction because the same research session has prior knowledge of the upstream experiment. A later independent implementer remains a stronger successor if promotion is contemplated.

## Question

Can a Decision Engine research consumer, implemented only from the frozen handoff contract, independently establish the shadow object's exact byte identity and internal B/evidence/basis/multiplicity relations, preserve `non_deciding` as a non-polarized evidence channel, and reach the same safe supported-claim policy core (`HOLD` for completed/not-checkable) without converting neutral evidence into support/counterevidence or weakening the maintained released-1.0 authority boundary?

## Consumer architecture under test

`frozen shadow bytes + frozen B index -> independent shadow admission -> exact proposition/evidence/basis view -> maintained-policy-core-equivalent evaluation -> research Decision observation`

The consumer must not call the maintained released-1.0 Contract C ingress with forged/relabelled bytes. Released `1.0.0` rejection is expected and must remain a negative control.

The consumer may reuse no CAL or Apparatus semantic code. It may use Node standard-library primitives and Decision Engine's documented maintained policy semantics as the comparison oracle.

## Preregistered positives

P1. Exact handoff SHA and result-set ID are verified before semantic consumption.

P2. Exact Contract-B version/bundle ID/bundle hash match between C and the frozen index.

P3. Proposition `temporal-p1` and its exact text hash are bound to the B index.

P4. Both causal contributions are independently resolved to exact B passages `u-a` and `u-b` with exact source/hash matches.

P5. Both causal contributions remain channel `non_deciding`; no compatibility relabeling is permitted in the consumer observation.

P6. Both contribution IDs are distinct causal basis members and `causal_form=independent_sufficient_alternatives` is preserved.

P7. `completed / not_checkable / not_checkable / unresolved_categorical_relation` evaluates to the maintained supported-claim policy core outcome `HOLD / contract_c_proposition_not_checkable`.

P8. An ordinary released-1.0 supported-claim control still produces the maintained `CLEAR / contract_c_supported` result through the maintained path, demonstrating the experiment did not redefine Policy A.

P9. The released maintained Contract C ingress rejects the shadow rather than accepting it as 1.0.0.

## Preregistered falsifiers

F1. Wrong handoff whole-object hash must fail before semantic interpretation.

F2. Wrong shadow version sentinel must fail.

F3. Unknown contribution channel must fail.

F4. Any causal contribution absent from the B index or mismatching source/hash must fail.

F5. Any basis member referencing a missing contribution must fail.

F6. A contribution cannot be both causal and residual; every retained contribution must be classified.

F7. `single_necessary` with two basis members and `independent_sufficient_alternatives` with fewer than two must fail.

F8. Changing one causal neutral contribution to `support` or `counterevidence` must be observable as a channel mutation and must not be silently normalized back to neutral.

F9. A research policy evaluator that would return CLEAR solely because neutral contributions are present is a falsifier.

F10. Any need to edit maintained `src/**`, weaken released Contract C 1.0 authority, or translate neutral evidence into a polarized released contribution falsifies the bounded consumer-seam claim.

## Allowed outcomes

- `SUPPORTED_BOUNDED_CROSS_REPO_CONSUMER`
- `FALSIFIED_CONSUMER_SEAM`
- `INCONCLUSIVE_CONSUMER_APPARATUS_INVALID`

A supported result is not production conformance for a canonical future Contract C version. It only supports the exact frozen research shadow and downstream policy-core behavior.