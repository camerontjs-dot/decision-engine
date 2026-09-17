# Post-preregistration observation

After the RC3 preregistration was frozen, live Contract B authority was inspected before implementation.

Two relevant facts were found and are preserved rather than folded back into the preregistered question:

1. the locked Contract B specification describes `bundle.bundle_hash` as the SHA-256 of the entire bundle at seal time and requires the consumer to recompute the bundle contents before intake;
2. the frozen Evidence Bundler integration authority exposes a deterministic `compute_bundle_tree_hash()` algorithm over sorted relative paths and file digests, with the two self-referential hash fields normalized and `SHA256SUMS` excluded.

This creates a distinct successor hypothesis not preregistered in RC3:

> an independently trusted bundle-level commitment plus caller-presented raw Contract-B bytes may be sufficient to derive participant authority without a durable artifact locator, provided the exact tree-hash algorithm is independently bound and the presented artifact recomputes to the trusted commitment.

RC3 will not silently change its preregistered discriminator to test this. RC3 still asks whether the portable receipt **by itself** supplies participant authority, and whether an independently selected immutable locator is a sufficient mechanism control.

If RC3 completes, the commitment-plus-presented-artifact hypothesis should be tested separately as a successor.