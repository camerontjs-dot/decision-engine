# C2 artifact-authority reconstruction RC1 — preregistration

Status: frozen research preregistration. No maintained runtime change, merge, release, tag, Authorization, execution, or production promotion is authorized by this experiment.

## Question

Can Decision Engine drive the canonical Contract C2 `verify_candidate(...)` authority checks from independently selected immutable artifacts rather than trusting caller-supplied `exact_contract_b`, `evidence_index`, resolver commit, or resolver rows?

## Exact subject

- Decision Engine parent / RC0 terminal: `153cd69c5a08ed0b86d0507ccc828acdad174afe`.
- C2 integration implementation under pressure: `b1bcc33e2b5ef0707b8cbf7dd8e821b2d34d1b55`.
- Contract C2 authority: `camerontjs-dot/apparatus-contracts@b42c827acb0a9fe65353354d709add0e27bab307`.
- Independently selected Contract-B artifact source: `camerontjs-dot/claim-audit-lab@d03d0e960ad82d889e6763fd4fb53cd24babd187`, path `tests/fixtures/cb/evidence-bundle-minimal`.
- Independently selected producer-policy resolver: `camerontjs-dot/apparatus-contracts@1d33e0612befcf8016816197c90c062373796df9`, path `research/contract_c2_current_cal_resolver_successor_rc0/RESOLVER.json`, expected Git blob `1a408246fd3bef0758a958ae716b44ea74bc0689`.
- Current CAL semantic implementation used for the positive control: `847cc970642bb648dc994b929c2053b5c9d4648c`.

The Contract-B fixture is an authority-mechanism control only. It is not the private first-genuine pipeline bundle and does not establish retrieval quality, completeness, or source truth.

## Candidate authority derivation

The RC1 harness must derive, rather than accept from the Decision caller:

1. exact Contract-B `{contract_version,bundle_id,bundle_hash}` from the exact frozen fixture;
2. the allowed `(source_id, passage_id)` evidence index from that same fixture;
3. resolver commit identity from the exact independent resolver checkout;
4. resolver entries from the exact pinned resolver blob.

Before those values are admitted, the harness must:

- verify exact checkout HEADs;
- verify the exact resolver blob identity;
- verify every listed Contract-B `SHA256SUMS` entry;
- derive authority only from the pinned paths, never from the C2 object or caller context.

## Positive control

Construct one canonical supported C2 object using:

- exact derived Contract-B identity;
- one exact evidence reference derived from the frozen Contract-B tree;
- the exact current-CAL resolver row;
- exact resolver commit `1d33e061...`.

Required outcomes:

- current C2 Decision ingress reaches the policy and returns `CLEAR`;
- canonical Apparatus `verify_candidate(...)`, supplied only with artifact-derived authority, passes.

## Hostile controls

Create fresh, canonically resealed C2 objects for all of these substitutions while keeping the top-level Contract-B identity unchanged unless the mutation itself concerns producer authority:

1. evidence source ID substitution;
2. evidence passage ID substitution;
3. producer resolver-commit substitution;
4. producer semantic-implementation substitution;
5. producer policy-digest substitution.

The preregistered discriminator is:

- current C2 Decision ingress reaches policy and returns `CLEAR` for every structurally valid substitution;
- artifact-derived `verify_candidate(...)` rejects every substitution before it can be treated as authority-valid.

## Evaluator falsifier

For each authority family, also run a weak/colluding verifier where the mutated C2 object is allowed to bring matching authority data with it. At least the evidence and producer-policy mutations must become acceptable to that weak verifier. This demonstrates that rejection by the strong path depends on independent artifact selection rather than merely on calling a stricter function.

## Stop rule

Preserve red results. Do not repair Decision policy semantics, Contract C2, CAL, Contract B, or the independent resolver inside this experiment after reveal. Apparatus-only defects may receive a successor commit if the original failure is preserved and the preregistered discriminator is not weakened.

## Decision rule

`SUPPORTED_ARTIFACT_DERIVED_AUTHORITY` only if all positive controls pass, all five current-ingress substitutions reach `CLEAR`, all five are rejected by artifact-derived authority, and weak/colluding controls demonstrate at least one passing evidence mutation and one passing producer-policy mutation.

Anything else is `FALSIFIED_OR_INCONCLUSIVE` and must remain visible.