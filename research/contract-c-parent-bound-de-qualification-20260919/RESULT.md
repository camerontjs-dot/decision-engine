# Frozen Decision Engine qualification against parent-bound Contract C

## Terminal disposition

**SUPPORTED_FROZEN_DECISION_CORE_WITH_ADDITIVE_PARENT_BOUND_INGRESS**

This is bounded compatibility evidence. It does not mutate or supersede Decision Engine V1, assign a successor version, promote the research ingress, release anything, or authorize execution.

## Exact subjects

- Decision Engine V1 release subject: `7be709b2141c767c5da89b8b94cf90233c4238fe`
- frozen parent-bound Contract C candidate: `c5b1d757f3a0ad4f6e2c3f6dbdc2dd2d3c1403ec`
- Contract C candidate blob: `df6b6ed410f52cafaeadfe1578d770f480a34b09`
- frozen independent Contract C consumer: `12e7e640b229619501960b1b89cf4716d8d985b3`
- frozen CAL V1: `e24e405f5336ee024674f39dba97255bb58a2dd9`
- frozen Evidence Bundler: `4e1f6fe00e7c350b28f52bfea14f1f8988847884`
- released Contract C1 authority: `5fe55f9ed5d0ee9f026ca1b077e9d70ce0487ea1`
- released Contract D authority: `298a1a0f7b7b6d7712e11200d04faec3e1ca169b`

No maintained `src/**`, `scripts/**`, or `tests/**` Decision Engine V1 byte changed in this experiment.

## Preserved first hosted deviation

Initial run `35469160600`, job `105966843549`, passed:

- frozen Decision source identity;
- frozen Contract C / RC2 / resolver / CAL / EB / consumer identities;
- released Contract C1 and Contract D authority checks;
- exact parent-bound PIPE01–PIPE04 fixture generation.

It stopped when released Contract D validation imported its required Python canonicalization package:

`ModuleNotFoundError: No module named 'rfc8785'`

Classification:

**QUALIFICATION_HARNESS_DEPENDENCY_DEFECT**

Successor commit `ae2162d983820cc5fc0e90f24b0d728a1a7bc546` changed only the bounded workflow dependency installation to include `rfc8785`. The frozen Decision subject, Contract C candidate, fixtures, trusted research ingress, policy mapping, and falsifiers were unchanged.

## Decisive hosted execution

- science head: `ae2162d983820cc5fc0e90f24b0d728a1a7bc546`
- workflow run: `35469243798`
- job: `105967067961`
- workflow conclusion: **SUCCESS**
- artifact: `10592600968`
- artifact ZIP digest: `sha256:646e87fa47c26c1f25103ff292fe32815aa0a8e79166936fd8b61528d03cb500`

## Direct frozen-V1 ingress discriminator

The maintained Decision Engine V1 Contract C ingress rejected all four parent-bound Contract C handoffs:

- PIPE01: `contract_c_validation_failed`
- PIPE02: `contract_c_validation_failed`
- PIPE03: `contract_c_validation_failed`
- PIPE04: `contract_c_validation_failed`

This is expected from the released V1 contract boundary. V1 is hard-pinned to released Contract C 1.0.0 and therefore is not directly wire-compatible with the new parent-bound Contract C candidate.

This is not evidence that the Decision policy kernel is wrong.

## Trusted parent-bound ingress results

Using the exact frozen independent Contract C consumer as the authority-admission boundary, then the unchanged Decision V1 supported-claim policy/materializer:

| Case | Parent conclusion | Decision disposition | Exact Contract D |
| --- | --- | --- | --- |
| PIPE01 | `supported` | `clear` | canonical PASS |
| PIPE02 | `contradicted` | `hold` | canonical PASS |
| PIPE03 | `not_checkable` | `hold` | canonical PASS |
| PIPE04 | `contradicted` | `hold` | canonical PASS |

The emitted Decision objects validated canonically against exact released Contract D 1.0.0 authority.

## Negative controls

All preregistered negative controls were rejected before an invalid Decision could be accepted:

- raw-byte mutation under fixed Contract C authority -> `contract_c_whole_object_mismatch`
- missing native child result -> `contract_c_validation_failed`
- root/Decision-target substitution -> `target_binding_mismatch`
- cross-run native child replay -> `contract_c_validation_failed`
- mismatched independently supplied consumer authority -> `contract_c_validation_failed`

False accepts: **0**.

## What changed and what did not

Observed:

- frozen V1 direct Contract C ingress is incompatible with the new wire;
- frozen V1 Decision policy semantics did not need modification;
- frozen V1 Decision materialization did not need modification;
- Contract D 1.0.0 did not need modification;
- a trusted parent-bound authority-admission seam can feed the unchanged Decision policy/materializer correctly for the tested cohort.

Therefore:

- `frozen_v1_release_mutation = false`
- `decision_policy_kernel_change = false`
- `contract_d_change = false`
- `additive_parent_bound_ingress_required_for_direct_support = true`

## Supported interpretation

The smallest evidence-backed Decision Engine change is **not** a rewrite of V1 and not a change to its policy semantics. It is a new additive ingress/authority adapter in a successor Decision Engine version that admits the exact parent-bound Contract C candidate and then hands trusted state to the existing Decision semantics.

Because Decision Engine V1 is already released and the needed capability is additive rather than a breaking mutation of existing V1 behavior, the current release-governance evidence points toward a MINOR successor if/when promotion is authorized. No version is assigned by this research record.

## Boundaries

Not established here:

- production promotion of the research ingress;
- independent clean-room qualification of the eventual maintained ingress implementation;
- a Decision Engine release version;
- Contract C canonical release/version;
- Authorization;
- execution.

The next smallest promotion candidate, if pursued, is an additive maintained parent-bound Contract C ingress with the V1 decision kernel and Contract D surface byte-for-byte unchanged.
