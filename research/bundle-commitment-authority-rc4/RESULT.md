# Contract-B bundle commitment authority RC4 — terminal record

## Disposition

**`SUPPORTED_TRUSTED_BUNDLE_COMMITMENT_PLUS_PRESENTED_ARTIFACT`**

Research evidence only. This is a promising authority mechanism, not maintained-runtime promotion.

## Exact decisive execution

- RC3 parent: `e7ab81f46ffecfe0e796d8ea94593eedaced89fb`
- preregistration: `5ff25085ba8f57cc75ceaaebe1f125b7046ec74c`
- decisive executed head: `32a165f2bd579f559959903e9d02bc9c84a82908`
- workflow run: `35237017076`
- job: `105255423211`
- conclusion: `success`
- artifact ID: `10504225119`
- artifact ZIP digest: `sha256:67ac035438d5ba20ee2e7e87cafa49f97a1e9e597825716ca4321586889274cd`
- packaged evidence TGZ SHA-256: `9fa096a21228b0e4db0191dee692dc343392d74259cc683391affc678b1179f1`

Exact authorities:

- Evidence Bundler integration authority: `4e1f6fe00e7c350b28f52bfea14f1f8988847884`
- exact hashing implementation blob: `7722ca0d94260b60de0bf81003ff992a789b9cd7`
- Contract-B mechanism-control commit: `d03d0e960ad82d889e6763fd4fb53cd24babd187`
- exact control artifact tree: `5bcfa0a27877cb7ceebf22cd8960e907f6f92083`
- preserved original scientific harness blob: `40eb85ab1ff4232249b708593706fef3df4e49a2`

Maintained `src/**`, `scripts/**`, and `tests/**` were unchanged from the RC3 parent. The hosted scope guard passed before and after the discriminator.

## Result

The tested mechanism supports a smaller authority boundary than an immutable artifact locator:

```text
independently selected Contract-B commitment
    { contract_version, bundle_id, bundle_hash, hashing authority }
                    +
raw Contract-B artifact from untrusted transport
                    ↓
recompute whole-bundle commitment
                    ↓
require exact equality with trusted commitment
                    ↓
derive exact participant references from verified bytes
                    ↓
canonical C2 external-authority verification
                    ↓
existing trusted policy / Decision projection / Contract D
```

The artifact's enclosing filesystem path was not part of the trust requirement. Two copies at different arbitrary locations opened the same fixed commitment.

## Baseline

Trusted mechanism-control commitment:

- Contract B `1.0.0`
- bundle ID `41973898-948c-58b4-8982-61d62ec81500`
- bundle hash `sha256:e0419a18573a325da2f53ec028328210a8b18598ea5a166864ad8bf3b8b555fb`

Observed:

- exact EB producer hash: `sha256:e0419a18573a325da2f53ec028328210a8b18598ea5a166864ad8bf3b8b555fb`
- separately implemented hash reproducer: exact same value
- copy at arbitrary location A: accepted
- copy at a different arbitrary location B: accepted
- participant authority derived only after commitment verification: `src-001 / pass-001`

This is evidence that the transport/location of raw B bytes need not itself be trusted if the bytes must open an independently selected commitment under independently bound hashing semantics.

## Stale participant tamper

A passage identity was changed without resealing.

Result: **rejected** before participant use because the artifact's internal commitment no longer matched recomputed bytes.

## Fully resealed alternate world

A materially different participant world was constructed by changing the exact source/passage identity throughout the artifact and renaming the corresponding artifact paths:

- participant: `src-001-attacker / pass-001-attacker`
- new whole-bundle hash: `sha256:4b90d6ebb0a647110b23393647213de077a6739f04307e239b2213fb2953b297`
- exact EB producer hash and separate reproducer agreed on that new hash
- `SHA256SUMS` was regenerated
- current EB structural/model validator produced the same sole `CONTRACT_VERSION mismatch` diagnostic on both the untouched 1.0 baseline and the resealed alternate; after neutralizing only that known evaluator-version aperture, no additional validator error remained

The fully resealed alternate was then:

- **rejected** against the original fixed external commitment: `presented artifact does not open the independently selected external commitment`;
- **accepted** when the weak control deliberately allowed the external commitment to move with the attacker artifact.

That weak control is the causal discriminator. Hash validation is not enough if the caller can also choose the expected hash.

## Preserved apparatus failure

Run `35236596463`, job `105253975881`, head `8b99534d951931de6359db477b01b9868e7ca8dd` is preserved as `APPARATUS_VERSION_MISMATCHED_BUNDLE_VALIDATOR`.

The first RC4 harness reached the resealed alternate, then treated the current EB validator's sole `CONTRACT_VERSION mismatch` as a scientific failure even though the frozen control is Contract B 1.0 and the validator is current-version-bound.

The original harness remains byte-preserved. The successor first demonstrated that the untouched baseline produces exactly the same sole version diagnostic, then neutralized only that diagnostic for both baseline and alternate. Any other validation error remained fatal.

## What is promising

RC1 required an independently established exact Contract-B participant index. RC3 showed that a portable receipt containing only top-level bundle identity cannot itself enumerate those participants. RC4 now shows a smaller tested mechanism for recovering that index:

> independently trust the **bundle commitment**, not the artifact's transport location; verify presented raw B bytes against that commitment; then derive participant authority from the verified bytes.

For the tested mechanism, a durable trusted artifact locator is therefore **not required for integrity**.

## What remains load-bearing

This result does not remove the trust problem. It moves it to a much smaller object:

> who or what independently selects the correct run's Contract-B commitment and hashing authority?

The first-genuine portable receipt already records the real run's Contract B version, bundle ID, and whole-bundle hash. What remains unqualified is the runtime binding that says that receipt/commitment is the one Decision Engine must trust for this evaluation.

That binding must not be selected solely by the C2 object or by the same caller presenting the raw B artifact.

## Non-claims

- The private first-genuine raw Contract-B 1.2 artifact was not available in this GitHub-visible aperture and was not tested.
- The mechanism-control artifact is Contract B 1.0.0. Contract B 1.2 separately specifies that its extension participates in the bundle-tree hash, but exact first-genuine 1.2 bytes remain the strongest next reproduction.
- This is not an independently isolated clean-room consumer reproduction.
- This does not establish runtime receipt/commitment selection semantics.
- This does not authorize arbitrary caller-selected commitments, locators, adapters, policies, or hashing implementations.
- This does not change Contract B/C/D, CAL, Decision Engine maintained runtime, Authorization, execution, tags, releases, or production defaults.

## Promotion boundary

Do not promote maintained Decision Engine code from RC4 alone.

The smallest justified next evidence, if available, is an exact reproduction using the real first-genuine Contract-B 1.2 packet and its already-published external bundle commitment. After that, independently isolate the consumer/reimplementation and qualify how the runtime selects the commitment.