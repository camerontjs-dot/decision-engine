# Contract-B bundle commitment authority RC4 — preregistration

## Classification

Draft Research only. No maintained Decision Engine, Contract B/C/D, release, promotion, Authorization, or execution change is authorized.

## Frozen parent and authorities

- RC3 terminal parent: `e7ab81f46ffecfe0e796d8ea94593eedaced89fb`
- Evidence Bundler integration authority: `camerontjs-dot/evidence-bundler@4e1f6fe00e7c350b28f52bfea14f1f8988847884`
- exact hashing implementation blob: `7722ca0d94260b60de0bf81003ff992a789b9cd7` at `src/evidence_bundler/contracts/hashing.py`
- mechanism-control Contract-B artifact: `camerontjs-dot/claim-audit-lab@d03d0e960ad82d889e6763fd4fb53cd24babd187`, path `tests/fixtures/cb/evidence-bundle-minimal`, tree `5bcfa0a27877cb7ceebf22cd8960e907f6f92083`
- real first-genuine receipt commitment shape: CAL receipt `93c4f162...` records Contract B version, bundle ID, and whole-bundle hash but omits the raw private artifact.

## Question

Can Decision Engine recover exact Contract-B participant authority from an independently selected bundle commitment plus caller-presented raw Contract-B bytes, without requiring a trusted artifact locator?

## Hypothesis

A trusted commitment is sufficient for the tested mechanism if all of the following hold:

1. the exact hashing semantics are independently bound;
2. the same legitimate artifact verifies from an arbitrary filesystem location;
3. recomputation of the presented artifact equals the external trusted commitment;
4. exact participant references are derived only after that equality passes;
5. participant tampering changes the recomputed commitment;
6. even a coherently resealed different artifact cannot satisfy the original external commitment;
7. a weak control that lets the caller move the external commitment accepts the resealed attacker world, proving commitment selection itself is the trust boundary.

## Preregistered controls

- verify exact EB commit and hashing blob;
- verify exact mechanism-control artifact commit/tree and `SHA256SUMS`;
- baseline: copy the artifact to an arbitrary untrusted/presented location and verify its recomputed bundle hash, bundle ID, and contract version against a separately frozen commitment;
- derive the exact participant index only after commitment verification;
- mutate a participant identity without resealing: reject;
- create a coherent resealed alternate artifact by changing source/passage identity across the artifact, recomputing its internal whole-bundle hash, and regenerating `SHA256SUMS`; the alternate must be internally self-consistent but reject against the original external commitment;
- verify the alternate passes when the external commitment is deliberately allowed to move with it;
- path-relocation control: identical bytes at a different enclosing filesystem path must still verify;
- if the producer hash implementation and an independently implemented hash reproducer disagree on the baseline or resealed artifact, stop as evaluator/apparatus inconclusive rather than choosing one silently.

## Disposition rules

- `SUPPORTED_TRUSTED_BUNDLE_COMMITMENT_PLUS_PRESENTED_ARTIFACT` only if the legitimate artifact verifies and all preregistered tamper/reseal controls discriminate as above.
- `FALSIFIED_BUNDLE_COMMITMENT_AUTHORITY` if a different participant world can satisfy the fixed original trusted commitment without a SHA-256 collision assumption or if the legitimate artifact cannot be verified under the bound algorithm.
- `INCONCLUSIVE_HASH_ALGORITHM_DIVERGENCE` if the two hash implementations disagree.
- `INCONCLUSIVE_APPARATUS` for an apparatus failure before the scientific discriminator.

## Non-claim boundary

The private first-genuine raw Contract-B packet is not available in this GitHub-visible aperture. A positive RC4 result therefore supports the **mechanism**, not a claim that the exact first-genuine private artifact has already been verified this way.