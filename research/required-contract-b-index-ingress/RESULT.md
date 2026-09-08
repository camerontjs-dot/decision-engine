# Required Contract B index ingress prototype result

**Classification:** Draft Research Infrastructure evidence record. No maintained source change, merge, release, tag, promotion, Authorization, or execution is authorized.

## Exact identity

- Decision Engine base: `a4425f8eb47449ff6c683222921bbea9483742e2`
- research science head: `cc0bf642a41812dc57a0a0d9b4778199bf03ed69`
- Contract C 1.0.0 authority: `5fe55f9ed5d0ee9f026ca1b077e9d70ce0487ea1`
- Contract D 1.0.0 authority: `298a1a0f7b7b6d7712e11200d04faec3e1ca169b`
- exact real CAL Contract C: `sha256:c599e97fd5b4da80ae558d5d57a351fa3b2d37081432013a9dbeaae65a80b5a3`
- exact frozen Contract B index: `sha256:a6a7205c67e912e8f929094c4fb50349b19d768e7742ee26163590fd19de7d63`

## Hosted evidence

Push research run `34253951200`: **SUCCESS**.

PR-event research run `34253982723`: **SUCCESS**.

Normal repository CI run `34253982705`: **SUCCESS**.

Push-run artifact:

- name `required-contract-b-index-ingress-34253951200`
- ID `10067084160`
- ZIP SHA-256 `89323909efc72a4d2d5254e20c3d73838f4d60dc02c20dd92efb5e424d6d9c23`

## Baseline preservation

The strict research ingress preserved the exact real-CAL positive behavior and exact Contract D bytes:

- Policy A -> `completed / clear`
- Policy A Contract D SHA -> `sha256:db47ebc844c14aa28bbc02524684b1ea7e388e1f1eea7ee8cbc7153af7548200`
- Policy B -> `completed / clear`
- Policy B Contract D SHA -> `sha256:1f2ddf98a05d5772833984c3747e6cfda5ef7448d5580a73e077897e60cdfa5b`

No Decision policy semantics or Contract D schema changed.

## Exact-reference pressure

Using the frozen exact B index, every PR #49 internal-reference substitution was rejected before either Decision policy could run:

1. proposition text-hash substitution;
2. proposition-ID substitution;
3. evidence passage-hash substitution;
4. evidence source-ID substitution;
5. evidence passage-ID substitution.

Both Policy A and Policy B surfaces were closed for every mutation.

## Transport controls

- missing Contract B index -> rejected;
- wrong expected Contract B index SHA -> rejected.

## Load-bearing falsifier: colluding index

A fabricated Contract B index was constructed around a mutated Contract C while deliberately retaining the exact same top-level:

- Contract B version;
- bundle ID;
- bundle hash.

Fake index SHA:

`sha256:4da1cb03d706385aa5a70f8fdb699cc816d233f0e02a64165c93e1aa7c84b8e7`

With the independently fixed expected real index SHA `sha256:a6a7205c...`, the fabricated index was rejected before indexed Contract C validation.

A negative control then allowed the fabricated index to self-declare its own new SHA. The mutated C + fabricated index became a self-consistent pair and the released indexed Contract C validator accepted it; Policy A could CLEAR.

Therefore:

> **Contract B index presence is not sufficient authority. The identity of the exact index must itself be independently established.**

The index's internal bundle ID/hash fields cannot provide that independence because the same party constructing a false index can copy them unchanged.

## Smallest supported ingress candidate

The smallest design supported by this experiment requires:

1. exact Contract C bytes;
2. external exact Contract C whole-object SHA-256;
3. exact released Contract C authority root;
4. expected Contract B version/bundle ID/bundle hash;
5. exact Contract B index bytes;
6. an independently established exact SHA-256 for those index bytes;
7. released Contract C 1.0.0 validation with `contract_b_index=index` before policy semantics.

The research implementation wraps the maintained ingress to keep `src/**` unchanged. If later promoted, the smaller maintained implementation would fold the indexed validator call into `src/contractCIngress.js` so Contract C is validated once rather than twice.

## Residual integration boundary

Current CAL RC0 already:

- creates canonical `CONTRACT-B-INDEX.json`;
- uses that index when validating each produced Contract C object.

But the current CAL pipeline receipt records the Contract B bundle ID/hash and validation state, not an independently authority-bearing SHA-256 of `CONTRACT-B-INDEX.json`.

So this experiment supports the DE-side validation shape but does **not** yet establish where production DE obtains the independently trusted expected index identity.

Possible later authority designs include an upstream handoff/receipt binding the index digest or independent reconstruction of the index from exact Contract B. This DE experiment does not choose between them.

## Disposition

**SUPPORTED_WITH_BOUNDARY.**

Requiring released Contract C validation against an exact B index closes the demonstrated C->B internal-reference aperture without changing policy semantics, but only when the exact index identity is independently established. Do not promote a design in which the same caller supplies both arbitrary index bytes and the authority for those bytes.
