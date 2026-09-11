# Decision Engine V1 release-readiness record

Status: release-qualified candidate. Release authority remains withheld. This record does not authorize an immutable tag, GitHub Release, package publication, Contract mutation, Authorization, or execution.

## Exact baseline

Release-readiness starts from protected production `main`:

- `97994fa691992d74778a5c05cf22484fec63bed1`

That commit contains the promoted runtime from PR #68 plus the documentation-only promotion record from PR #69.

The implementation evidence anchor remains:

- qualified candidate: `65aff0d47f450bc99dad5efaf1d2233173a3f350`
- implementation promotion merge: `247a8bc5da5dc94358937a32f52241777aadeb34`
- qualified/promoted implementation tree: `e4a78cbe9098e27c32dbc35d09c092701472c85b`

The current production baseline intentionally adds the durable promotion record after that implementation merge.

## Proposed version

Proposed repository release: `1.0.0`.

This is justified only as a narrow stable compatibility promise. It does not mean that every historical head, research branch, or experimental Decision abstraction in the repository is a stable public interface.

The proposed 1.0.0 public compatibility surface is limited to:

1. exact released Contract C 1.0.0 admission through the maintained Contract C ingress;
2. external whole-object identity and expected Contract B top-level binding checks;
3. exact policy-owned target resolution;
4. fixed maintained dispatch over exactly these policy identities:
   - `decision-engine.contract-c.supported-claim-verification@1.0.0`
   - `decision-engine.contract-c.causal-basis-citation@1.0.0`
5. immediate binding-preserving internal Decision materialization;
6. canonical Contract D 1.0.0 output;
7. `evaluateContractCDecision(options)` as the maintained library invocation boundary;
8. `scripts/decision-engine-evaluate.mjs` as the maintained exact-authority CLI, including its documented canonical stdout and fail-closed stderr/exit behavior;
9. the Decision/Authorization boundary under which exact CLEAR can establish only `candidate_for_authorization` downstream.

Future incompatible changes to those declared surfaces should require a new major repository version.

## Explicit non-versioned / non-promised surfaces

The proposed 1.0.0 repository tag contains repository history and additional code, but the stable compatibility promise does not expand merely because those files are present.

Outside the 1.0.0 compatibility promise:

- the career select/rank head as a general-purpose engine;
- the Gate head as universal Decision semantics;
- research-only authority domains and experimental adapters;
- Contract C research `non_deciding`;
- generic policy registries, plugins, DSLs, or caller-supplied evaluator implementations;
- operational Authorization, actor selection, approval/delegation, execution, mutation, rollback, or outcome verification.

## Release-object decision

Neither the implementation merge `247a8bc5...` nor baseline `97994fa6...` should be tagged directly as `v1.0.0`.

Reason: repository release governance requires the released tree itself to contain consistent version metadata, changelog state, public compatibility claims, and release acceptance machinery. Those artifacts do not all exist in either earlier object.

The intended release object should therefore be the eventual merge commit of the dedicated release PR descended from exact baseline `97994fa691992d74778a5c05cf22484fec63bed1`, after release qualification passes and after a separate explicit operator decision authorizes release.

This preserves the user's core intuition that the durable promotion record belongs in the release lineage while avoiding a tag whose own tree lacks its version and changelog declaration.

## Release artifact and receipt strategy

The release qualification builds a deterministic source archive from the exact candidate commit using `git archive`, then deterministic gzip metadata suppression. It builds the archive twice and requires byte identity.

Proposed official release artifacts:

- immutable annotated Git tag `v1.0.0` pointing to the exact release commit;
- GitHub Release created from that tag;
- deterministic `decision-engine-v1.0.0-source.tar.gz` attached to the release;
- `SHA256SUMS` for that archive;
- `release-receipt.json` recording exact release candidate SHA, source archive digest, external Contract C/D authority identities, qualification status, and explicit non-actions.

GitHub-generated source archives remain useful navigation artifacts but are not the reproducibility receipt. The attached deterministic archive and digest are the release artifact pair used for repeatability claims.

## Release qualification requirements

The exact intended release tree must demonstrate:

- ordinary repository CI and leak checks;
- no runtime/source/test changes relative to production baseline except explicitly allowed release metadata/documentation/workflow changes;
- version metadata exactly `1.0.0`;
- changelog and compatibility declaration consistent with that version;
- active public docs no longer describe maintained policy or CLI surfaces as unpromoted candidates;
- exact Contract C and Contract D authority identity checks;
- materializer binding-preservation controls;
- V1 qualification cohort;
- maintained Contract C → Contract D integration cohort;
- causal-basis policy cohort;
- exact-authority CLI integration cohort;
- canonical Contract D downstream applicability checks;
- deterministic release archive rebuilt twice with identical bytes;
- smoke execution from the extracted release archive rather than from the working checkout;
- generated release receipt with release/tag creation explicitly false during qualification.

## Qualification deviation preserved

The first release-candidate head exposed a stale evaluator assumption in the pre-existing `Contract-first Decision evaluate CLI conformance` workflow.

Observed failure:

- run `34608423144` failed before CLI execution in `Verify exact authority and stacked scope`;
- the workflow still diff-locked policy implementation and `docs/DECISION_POLICY_SURFACE.md` to engineering base `a29e21da6f9d8a67dcd0f2d5181f1ac526f835cc`;
- that base predates the promoted V1 binding-preserving materializer extraction, so the gate treated the already-promoted V1 implementation and the release-readiness status correction as forbidden drift;
- ordinary CI and the independent release qualification on the same head passed, and the two-policy conformance workflow passed.

Disposition:

- do not erase or relabel the failed run;
- re-anchor the legacy CLI conformance gate to exact maintained production baseline `97994fa691992d74778a5c05cf22484fec63bed1` for runtime/source/test bytes;
- keep documentation outside that runtime immutability comparison;
- rerun the complete exact-head release qualification after the correction.

This is evaluator-maintenance evidence, not evidence of a Decision Engine runtime regression.

## Known limitations carried into release

These remain documented limitations, not hidden gaps:

1. Contract C ingress establishes exact Contract C bytes, validator authority, and expected Contract B top-level binding, but does not independently authenticate a complete Contract B evidence index.
2. `knowledge.add_verified_tag@1` is broader-sounding vocabulary than the narrow supported-claim policy meaning.
3. Contract C `non_deciding` successor/sidecar architecture remains unresolved upstream and is not part of this release.
4. Decision Engine performs no operational Authorization or execution.
5. Open research PRs remain evidence records and do not expand the released compatibility surface.

## Release decision boundary

A green release-qualification PR is necessary but not sufficient to publish the release.

After exact-head qualification, the allowed next decision is one of:

- authorize merge of the exact qualified release PR and then create `v1.0.0` from the resulting exact release commit;
- require a bounded release-preparation correction and rerun qualification;
- withhold release.

No tag or GitHub Release is created by this readiness work.
