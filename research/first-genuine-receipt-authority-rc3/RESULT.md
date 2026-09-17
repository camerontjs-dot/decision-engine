# First-genuine receipt authority RC3 — terminal record

## Disposition

**`FALSIFIED_RECEIPT_ONLY_AUTHORITY_SUPPORTED_IMMUTABLE_LOCATOR_MECHANISM`**

Research evidence only. No maintained runtime, contract, release, promotion, Authorization, or execution change follows.

## Decisive execution

- preregistration: `c4eb8d7fd59874c405af74855c87c78e48d39923`
- executed head: `f99e3f56937b7d722e08a5decaf5966bc0fcaccf`
- workflow run: `35236144106`
- job: `105252434668`
- conclusion: `success`
- artifact ID: `10502843169`
- artifact ZIP digest: `sha256:e877672ccd15f0e2d00d28c443b695edcdecb8447658a8210e7690e56c5742eb`
- packaged evidence TGZ SHA-256: `83889a0c60dd2cc212fe639aab79040bd42e4105234c311f2ecc7d12c985a05c`

Maintained `src/**`, `scripts/**`, and `tests/**` were unchanged from RC2 parent `97f654a8dd70acf522007ae94a1e23f881a0e7cd`.

## H1 — portable receipt by itself

**Falsified.**

The exact published first-genuine receipt at CAL commit `93c4f162...`, blob `31094d3...`, correctly records:

- Contract B `1.2.0`;
- bundle `fc459009-fc50-5cc7-a874-0371ce7a3853`;
- bundle hash `sha256:8c25ad48...`.

But the portable receipt intentionally excludes the raw B packet and exposes neither `(source_id, passage_id)` participant authority nor an independently retrievable raw-B artifact locator.

A deliberately weak verifier constrained to receipt-level B identity therefore accepted two synthetic candidates with different hidden participant references. Those candidates are not represented as valid first-genuine C2 objects; the control only demonstrates that bundle-level identity fields alone do not enumerate participant authority.

## H2 — independently bound immutable locator

**Supported as a mechanism control.**

Using the separately frozen Contract-B fixture at CAL `d03d0e960...`:

- exact artifact tree `5bcfa0a27877cb7ceebf22cd8960e907f6f92083` verified;
- all 7 `SHA256SUMS` entries verified;
- exact participant authority derived as `src-001 / pass-001`;
- legitimate participant accepted;
- source substitution rejected;
- passage substitution rejected;
- wrong repository, commit, path, and tree bindings rejected;
- the weak caller-selected authority control accepted a malicious participant, preserving the RC0/RC1 conclusion that trust-anchor selection cannot be delegated to the caller.

This fixture remains a mechanism control only. It is not the private first-genuine B artifact.

## Important post-preregistration observation

After preregistration, Contract B authority revealed a smaller possible mechanism: `bundle_hash` is specified as the SHA-256 of the entire bundle at seal time, and the frozen EB integration authority implements a deterministic bundle-tree hash over all bound files with explicit normalization of self-referential fields.

That creates a distinct successor hypothesis:

> a trusted bundle commitment plus presented raw Contract-B bytes may recover participant authority without needing a durable locator.

This was not folded into RC3 after reveal and is not claimed by the RC3 disposition. It requires a separate preregistered successor.

## Boundary

RC3 falsifies only **receipt by itself as participant authority**. It does not falsify using the receipt as an independent cryptographic commitment to a separately presented raw B artifact.

The strongest next discriminator is therefore commitment-bound presented-artifact verification, not more locator engineering.