# Decision Engine qualification against frozen parent-bound Contract C

## Question

Can exact frozen Decision Engine V1 decision semantics and Contract D materialization consume the newly frozen CAL V1 parent-bound Contract C through a bounded trusted ingress, without changing the frozen decision kernel?

## Exact subjects

- Decision Engine V1: `7be709b2141c767c5da89b8b94cf90233c4238fe`
- Contract C candidate freeze: `c5b1d757f3a0ad4f6e2c3f6dbdc2dd2d3c1403ec`
- Contract C candidate blob: `df6b6ed410f52cafaeadfe1578d770f480a34b09`
- independent consumer freeze: `12e7e640b229619501960b1b89cf4716d8d985b3`
- Contract D release: `298a1a0f7b7b6d7712e11200d04faec3e1ca169b`

## Falsifiers

- any exact PIPE01–PIPE04 handoff fails trusted ingress;
- parent `supported` does not map to the maintained supported-claim policy's CLEAR semantics;
- parent `contradicted` or `not_checkable` clears;
- emitted Contract D is not canonical under exact released Contract D authority;
- a raw mutation, missing native child, root-target substitution, cross-run replay, or authority mismatch reaches Decision;
- qualification requires modifying any frozen V1 `src/**`, `scripts/**`, or `tests/**` file.

## Expected compatibility discriminator

The maintained C1 ingress is expected to reject the new parent-bound Contract C. That is a compatibility observation, not by itself a semantic Decision failure.

Success may establish only:

`SUPPORTED_FROZEN_DECISION_CORE_WITH_ADDITIVE_PARENT_BOUND_INGRESS`

It may not authorize production promotion, version assignment, Contract D change, Authorization, or execution.
