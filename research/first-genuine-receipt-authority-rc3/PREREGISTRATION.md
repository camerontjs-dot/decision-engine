# First-genuine Contract-B receipt authority RC3 — preregistration

## Classification

Draft Research only. No maintained Decision Engine change, Contract B/C/D change, release, promotion, Authorization, execution, or production-default change is authorized.

## Frozen parent

- Decision research parent: `97f654a8dd70acf522007ae94a1e23f881a0e7cd` (RC2 trusted authority-adapter seam)
- real portable first-genuine receipt: `camerontjs-dot/claim-audit-lab@93c4f162c0f22a5c2e599fd332160628bc8b2986`
- receipt path: `research/first_genuine_b_side_001/PORTABLE_RECEIPT.md`
- receipt Git blob: `31094d3fd0b8b3ce59b02dad08a26688f34234be`
- mechanism-control Contract-B artifact: `camerontjs-dot/claim-audit-lab@d03d0e960ad82d889e6763fd4fb53cd24babd187`, `tests/fixtures/cb/evidence-bundle-minimal`

## Question

Is the published first-genuine portable receipt sufficient, by itself, for Decision Engine to independently establish the exact Contract-B participant-reference authority required by canonical C2 verification?

If not, does the smallest stronger mechanism, an independently bound immutable locator for the exact Contract-B artifact, recover that authority without moving trust back to the caller?

## Hypotheses

### H1 — receipt-only authority

The portable receipt is sufficient only if a verifier restricted to information actually present in that receipt can independently enumerate or otherwise verify the exact permitted Contract-B participant references.

H1 is falsified if the receipt binds only bundle-level identity while omitting the retrievable artifact or participant index, such that a receipt-only verifier cannot distinguish legitimate from substituted participant references without importing caller-supplied state.

### H2 — immutable-locator mechanism

An independently selected immutable locator is promising if it can:

1. bind an exact artifact independently of the candidate under evaluation;
2. verify artifact identity/integrity;
3. derive Contract-B identity and participant references from the artifact itself;
4. accept the legitimate control;
5. reject participant substitution before policy;
6. reject locator identity/integrity mutations;
7. demonstrate that a caller-selected locator remains unsafe.

## Separation of subjects

The real first-genuine receipt is tested only for **information sufficiency**. Its omitted private Contract-B packet will not be reconstructed, guessed, or replaced.

The frozen `evidence-bundle-minimal` fixture is used only as a **mechanism control** for the immutable-locator hypothesis. Passing that control must not be represented as proof that the real first-genuine artifact is currently locatable.

## Preregistered controls

Receipt-only:

- verify exact receipt commit/blob;
- parse the recorded B version, bundle ID, and bundle hash;
- mechanically test whether the receipt exposes a raw B artifact locator, immutable B tree/object identity, checksum manifest, participant index, or `(source_id, passage_id)` authority;
- exercise a deliberately weak top-level-identity checker on two synthetic participant-reference variants with identical receipt-level B identity.

Immutable-locator mechanism:

- verify exact repo/commit/path/tree for the frozen B fixture;
- verify every `SHA256SUMS` entry;
- derive B version/bundle identity and exact participant index from artifact bytes;
- baseline exact participant passes;
- source substitution rejects;
- passage substitution rejects;
- wrong commit/tree/path/checksum binding rejects;
- weak caller-selected-locator control must admit a malicious self-consistent world, demonstrating why locator selection itself must be trusted.

## Stop/disposition rules

- `SUPPORTED_RECEIPT_ONLY_AUTHORITY` only if receipt-only participant authority is actually derivable and substitution is rejected without external/caller data.
- `FALSIFIED_RECEIPT_ONLY_AUTHORITY_SUPPORTED_IMMUTABLE_LOCATOR_MECHANISM` if H1 fails and H2 passes.
- `FALSIFIED_AUTHORITY_LOCATOR_DIRECTION` if H2 cannot preserve the legitimate control while rejecting preregistered substitutions under fixed independent authority.
- `INCONCLUSIVE_APPARATUS` for an apparatus failure before the discriminator.

No result may claim that a real first-genuine locator exists unless an independently retrievable locator for that exact private B artifact is observed.