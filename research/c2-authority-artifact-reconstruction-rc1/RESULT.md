# C2 artifact-authority reconstruction RC1 — terminal result

## Disposition

`SUPPORTED_ARTIFACT_DERIVED_AUTHORITY`

This result supports the architecture claim that Decision Engine can drive the canonical Contract C2 external-authority checks from independently selected immutable artifacts rather than trusting caller-supplied evidence-index or producer-resolver authority data.

It does **not** authorize a maintained ingress change, merge, release, tag, Contract C2 promotion, CAL promotion, Authorization, execution, or production mutation.

## Exact research lineage

- Decision Engine maintained C2 integration subject: `b1bcc33e2b5ef0707b8cbf7dd8e821b2d34d1b55`.
- RC0 terminal parent: `153cd69c5a08ed0b86d0507ccc828acdad174afe`.
- RC1 preregistered branch: `research/c2-authority-artifact-reconstruction-rc1-20260917`.
- Decisive executed RC1 head: `fb11faeca89559ad76564176ef822f20251a0475`.
- Contract C2 authority: `camerontjs-dot/apparatus-contracts@b42c827acb0a9fe65353354d709add0e27bab307`.
- Independently selected Contract-B artifact source: `camerontjs-dot/claim-audit-lab@d03d0e960ad82d889e6763fd4fb53cd24babd187`, path `tests/fixtures/cb/evidence-bundle-minimal`.
- Independently selected producer resolver: `camerontjs-dot/apparatus-contracts@1d33e0612befcf8016816197c90c062373796df9`, path `research/contract_c2_current_cal_resolver_successor_rc0/RESOLVER.json`.
- Exact resolver Git blob: `1a408246fd3bef0758a958ae716b44ea74bc0689`.

The frozen Contract-B fixture is an authority-mechanism control. It is not the private first-genuine pipeline bundle and does not establish retrieval completeness, source truth, or production suitability.

## Decisive execution

- workflow run: `35227611340`;
- job: `105223083032`;
- conclusion: `success`;
- artifact ID: `10499068804`;
- artifact name: `c2-authority-artifact-reconstruction-rc1-fb11faeca89559ad76564176ef822f20251a0475`;
- artifact ZIP digest: `sha256:e6ceb39c36ec129f24b711efabcdb90c392e35ea70843c862bceb164dd66e84d`.

Every identity/scope gate and the preregistered discriminator completed successfully.

## Independently derived authority

The harness accepted no caller-authored evidence index or producer resolver as the strong authority source. It reconstructed the inputs from the exact frozen checkouts after verifying their Git identities and Contract-B `SHA256SUMS` entries.

Derived Contract-B authority:

- Contract-B Git tree: `5bcfa0a27877cb7ceebf22cd8960e907f6f92083`;
- `SHA256SUMS` entries verified: `7`;
- contract version: `1.0.0`;
- bundle ID: `41973898-948c-58b4-8982-61d62ec81500`;
- bundle hash: `sha256:e0419a18573a325da2f53ec028328210a8b18598ea5a166864ad8bf3b8b555fb`;
- derived evidence index: `[(src-001, pass-001)]`.

Derived producer-policy authority:

- resolver commit: `1d33e0612befcf8016816197c90c062373796df9`;
- resolver blob: `1a408246fd3bef0758a958ae716b44ea74bc0689`;
- current CAL semantic implementation: `847cc970642bb648dc994b929c2053b5c9d4648c`;
- policy digest: `44ecc33519fa8911079595d322f5f0decbf0389af42e153ac32214931798e42c`.

## Positive control

A canonical supported C2 object was built using only the independently derived authority values.

- C2 whole-object SHA-256: `sha256:a6c31027b54e288fde548b35a3bfd4e46b2370d459181146ce01ba468d297666`;
- current Decision C2 ingress: `CLEAR`;
- canonical Apparatus `verify_candidate(...)` with artifact-derived authority: PASS.

The stronger authority path therefore preserved the positive baseline and did not require a Decision policy change.

## Resealed mutation matrix

Each mutation was canonically resealed with a fresh whole-object identity. This is not stale replay.

| Mutation | Current C2 ingress | Artifact-derived authority |
| --- | --- | --- |
| evidence source ID substitution | reached policy; `CLEAR` | rejected: evidence reference absent from exact bound Contract-B world |
| evidence passage ID substitution | reached policy; `CLEAR` | rejected: evidence reference absent from exact bound Contract-B world |
| producer resolver-commit substitution | reached policy; `CLEAR` | rejected: wrong resolver authority |
| producer semantic-implementation substitution | reached policy; `CLEAR` | rejected: unknown/ambiguous implementation-policy binding |
| producer policy-digest substitution | reached policy; `CLEAR` | rejected: unknown/ambiguous implementation-policy binding |

All five attacks satisfied the preregistered discriminator.

## Evaluator falsifier / collusion controls

The weak verifier was intentionally allowed to replace its authority data to match each mutated C2 object.

All five weak controls passed:

- source substitution + colluding evidence index;
- passage substitution + colluding evidence index;
- resolver-commit substitution + colluding resolver commit;
- semantic-implementation substitution + colluding resolver row;
- policy-digest substitution + colluding resolver row.

This is the key falsifier. Merely calling `verify_candidate(...)` is not sufficient. Its discrimination depends on the Contract-B world and resolver authority being selected independently of the C2 object being evaluated.

## Preregistered acceptance

All acceptance conditions were true:

- independently selected artifact identities verified;
- positive current-Decision baseline remained `CLEAR`;
- positive artifact-derived verification passed;
- all five mutations reached current policy;
- all five current Decisions were `CLEAR`;
- artifact-derived authority rejected all five;
- weak evidence collusion passed;
- weak producer-policy collusion passed.

Terminal disposition: `SUPPORTED_ARTIFACT_DERIVED_AUTHORITY`.

## Preserved apparatus failures

Two pre-decisive failures remain part of the record.

### Run `35227415255`

All exact Git identity and research-scope checks passed. The discriminator stopped before scientific evaluation because the harness assumed `bundle_id` lived at `manifest.bundle.bundle_id`; the frozen Contract-B fixture stores `bundle_id` at the manifest top level and only `bundle_hash` under `manifest.bundle`.

Classification: `APPARATUS_MANIFEST_PATH_DEFECT`.

Artifact ID: `10499482955`; artifact ZIP digest recorded by the run: `sha256:8023f6ed5e01238a560a0d0c6d18c8a065a9d5ad37fb81e1eb601a1e02322a0c`.

The failed `run.mjs` was preserved unchanged.

### Run `35227554178`

The mechanical successor wrapper had been committed, but the workflow still invoked the preserved failing `run.mjs` rather than the successor wrapper.

Classification: `APPARATUS_SUCCESSOR_NOT_WIRED`.

This failure is preserved rather than rewritten away.

The decisive workflow then invoked `run-successor.mjs`, which verifies there is exactly one known manifest-path defect in the frozen harness, applies only that replacement to a generated temporary execution copy, and leaves the failed source intact.

## Interpretation

### Observed

The current Decision Engine C2 ingress establishes exact C2 whole-object identity, exact C2 validator/source authority, and top-level Contract-B identity, but does not independently establish either:

1. that each C2 evidence reference belongs to the exact Contract-B world; or
2. that the C2 producer semantic implementation + policy digest is authorized by an independently selected immutable resolver.

The exact canonical C2 apparatus already contains checks for both relations. When their inputs are reconstructed from separately pinned immutable artifacts, those checks reject all tested coherent substitutions without changing Decision policy semantics.

### Supported architecture consequence

A hardened C2 ingress can remain a deterministic authority-and-policy boundary. It does not need another semantic model. The smallest supported direction is to establish the exact upstream authority inputs independently and invoke the canonical C2 external-authority verification before Decision policy evaluation.

### Still unknown / not established

This experiment does **not** establish the production mechanism for locating the exact real runtime Contract-B artifact. The first genuine pipeline's portable receipt exposes bundle-level identity but intentionally does not publish the raw Contract-B tree or a separately trusted artifact locator.

A maintained implementation therefore still needs a bounded authority-selection mechanism such as an independently bound upstream receipt, an immutable artifact reference in a trusted store, or another exact locator whose authority does not originate from the C2 object being evaluated.

Do not replace this unresolved selection problem with a caller-supplied evidence index, caller-supplied resolver table, or self-declared digest.

## Non-claims

This result does not establish:

- retrieval completeness or source truth;
- CAL semantic correctness;
- Contract C2 release readiness;
- Decision policy correctness beyond the preserved positive/negative controls;
- a production-ready authority-locator protocol;
- Authorization or execution authority;
- merge, promotion, release, or deployment approval.

Research PRs remain evidence records, not production authorization.
