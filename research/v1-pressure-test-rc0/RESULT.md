# Decision Engine v1.0.0 Pressure Test RC0 — Terminal Result

## Classification

Draft Research Infrastructure / post-release pressure campaign.

**Terminal disposition: `SUPPORTED_WITH_KNOWN_BOUNDS`. Keep Draft.**

No merge, release, tag, production promotion, Contract mutation, Authorization, execution, or maintained runtime change is authorized by this record.

## Exact subject

Published Decision Engine `v1.0.0`:

- release commit: `7be709b2141c767c5da89b8b94cf90233c4238fe`
- release tree: `4e92703e781024de62c77f2f14e9164aceb16815`
- annotated tag: `v1.0.0`
- published deterministic source archive SHA-256: `c440d5de2a3853db9f4ccc2ba37d273e29ce8d9e71e0d646fc0c20eee0cd5902`

The hosted experiment downloaded that published archive and executed the maintained runtime from the extracted release artifact. The research branch did not modify maintained `src/**`, `scripts/**`, `tests/**`, release metadata, or the maintained policy documentation.

## Decisive hosted evidence

Science head:

`71793bb3b933c7f491824ec61c8b2b663dbf6f8f`

PR merge-test SHA:

`c7bc1cc5f548f7ce0a97ca06771f2ce63edb0e38`

Hosted pressure run:

- workflow run: `34673772055` — **SUCCESS**
- job: `103499852916` — **SUCCESS**
- ordinary CI on the same research head: `34673772043` — **SUCCESS**
- artifact: `decision-engine-v1-pressure-rc0-71793bb3b933c7f491824ec61c8b2b663dbf6f8f`
- artifact ID: `10291328421`
- artifact digest: `sha256:1e158cb0223a0499d718ad65d33052e5ceac84e01810a2a6fce234f790aca89c`

Every preregistered semantic step in the primary hosted workflow passed.

## Preserved harness deviation

A second, accidentally duplicated RC0 workflow also triggered on the same exact head:

- run: `34673772056`
- job: `103499856502`
- conclusion: **FAILURE before Decision semantics**
- failing step: `Verify research-only branch scope and frozen release identity`

That duplicate workflow's scope guard did not allow the already-existing primary RC0 workflow file, so it rejected the research branch before downloading or evaluating the Decision Engine release artifact. All semantic steps were skipped. This is classified `EVALUATOR_OR_HARNESS_DEFECT`, not a Decision Engine result. The duplicate workflow is removed in the terminal-record cleanup while this failed run remains preserved in GitHub Actions history.

The terminal downstream evaluator also contains an explicit control against an earlier first-cut evaluator logic mistake around FAILED Decisions: applicability mismatch must not hide `evaluation_failed`. The decisive cohort uses the corrected evaluator and preserves FAILED as a distinct outcome.

## Fresh released-CAL producer control

Exact CAL `v0.5.0` release:

`5533bbcf27a3ee3a7d901f7dfc44c241bc558e2c`

Freshly generated Contract C 1.0.0:

`sha256:a6b03b66d77916b62a8cf668a4c683529a45370687a09c3d2adb64c2c2bb53cc`

Exact Contract B binding:

- contract version: `1.0.0`
- bundle ID: `41973898-948c-58b4-8982-61d62ec81500`
- bundle hash: `sha256:e0419a18573a325da2f53ec028328210a8b18598ea5a166864ad8bf3b8b555fb`

The fresh object contained one `completed / assessed / supported` proposition with one exact causal contribution. The published DE artifact consumed it successfully. Library and CLI outputs were byte-equivalent; the CLI Contract D SHA-256 was:

`sha256:e842957727b7bffcee5cf1d95e49fc388db8460e1ccdfc5aa5f5de077deef2eb`

## Maintained V1 policy coverage

Both maintained policies were exercised across positive, held, failed, invalid-authority, stale-target, cross-case, determinism, and CLI/library surfaces.

Observed controls all passed:

- exact repeat determinism;
- context-key-order invariance;
- wrong Contract C whole-object identity rejected;
- wrong expected Contract B binding rejected;
- wrong Contract C authority root rejected;
- unknown policy identity rejected;
- cross-case claim replay non-positive;
- cross-case citation replay non-positive;
- stale same-ID changed-content claim target rejected;
- stale same-ID changed-content citation target rejected;
- caller-supplied implementation/registry substitution had no effect;
- Policy A changed on its declared verdict discriminator;
- Policy B changed on causal-basis membership;
- documented generic assessment-stage invariance was reproduced rather than relabelled as a new defect;
- released CLI and library behavior matched.

## Domain-shaped pressure

Nine exact-validator-valid consumer cases spanned six domain families. They are consumer pressure objects, not claims of CAL reachability or real-world truth.

Key discriminators:

### MainFrame knowledge synthesis

A supported assessed claim CLEARed for `knowledge.add_verified_tag@1(scope=claim)` while a separately retained non-deciding citation HOLDed under the citation policy.

This is the desired separation: a claim-level positive Decision does not bless every attached source as deciding citation evidence.

### SOP / controlled requirement

A supported jointly-sufficient proposition CLEARed at claim level and both exact causal-basis links CLEARed independently. An overstated SOP-shaped proposition HOLDed, and its retained residual citation also HOLDed.

### Source literature

A supported independent-alternatives case CLEARed and each exact causal alternative CLEARed for citation.

A contradicted literature-shaped claim HOLDed under supported-claim verification while the exact deciding counterevidence contribution CLEARed under causal-basis citation. The two V1 policies therefore remain materially distinct on the same authority object.

### Regulated quality

An unsupported quality-shaped claim HOLDed while its exact declared causal counterevidence contribution CLEARed for citation. This is consistent with the citation policy asking whether the contribution decided the result, not whether it supported the claim.

### Credential / provenance

A `needs_source` credential-shaped claim HOLDed and exposed no positive citation surface.

### Ambiguous / unclassified

A `not_checkable` proposition HOLDed and exposed no positive citation surface.

## Exact Contract D downstream pressure

Twenty ordinary Decisions plus two independent FAILED controls were validated, canonicalized, and consumed under exact Contract D 1.0 authority.

Observed outcomes across 22 Decisions:

- `candidate_for_authorization`: **13**
- `hold`: **7**
- `evaluation_failed`: **2**

Controls passed:

- CLEAR is only `candidate_for_authorization`, never Authorization;
- no HOLD escalated;
- no FAILED Decision escalated;
- wrong target -> `not_applicable`;
- wrong input authority -> `not_applicable`;
- wrong operation on completed Decision -> `not_applicable`;
- wrong operation on FAILED Decision remains `evaluation_failed`;
- effect substitution cannot satisfy the original request;
- metadata remains non-authoritative.

No Authorization or execution occurred.

## Known Contract-B internal-reference authority aperture

The campaign deliberately replayed the already-established PR #49 authority boundary against the **published v1.0.0 artifact**.

Prior science head:

`570104216ef104ea8d3ba00f9383402b9c2e3154`

Baseline real CAL Contract C:

`sha256:c599e97fd5b4da80ae558d5d57a351fa3b2d37081432013a9dbeaae65a80b5a3`

Five coherent internal substitutions were tested while the top-level Contract B bundle identity stayed fixed:

1. proposition text hash;
2. proposition ID;
3. evidence passage hash;
4. evidence source ID;
5. evidence passage ID.

For all five:

- exact released Contract C validation **with the exact Contract-B index** rejected the object;
- maintained v1.0.0 bundle-level ingress accepted the freshly canonicalized object and both current policies could CLEAR when supplied fresh targets derived from that object;
- the changed Contract C whole-object identity propagated into Contract D, so this is not stale Decision replay.

Classification:

`KNOWN_AUTHORITY_APERTURE_REPRODUCED_ON_RELEASE_ARTIFACT`

Defect status:

`KNOWN_RELEASE_LIMITATION_NOT_NEWLY_DISCOVERED`

The released engine therefore proves exact C identity plus exact top-level B bundle binding, but it does not independently prove that the proposition/evidence references inside C belong to the exact bound B contents unless the stronger indexed validation path is supplied.

## Capability gaps exposed by the use-case pressure

V1.0.0 has two maintained atomic policies. It is not currently a general document/workflow approver.

Ten requested/useful decisions are outside the maintained V1 surface and were recorded as `CAPABILITY_GAP`, not approximated through existing policies:

1. MainFrame note lifecycle promotion;
2. controlled-document / SOP approval;
3. regulated publication/use approval;
4. typed human-review requirement;
5. evidence remediation/retrieval request;
6. task dispatch;
7. release/qualification approval;
8. aggregate multi-claim approval;
9. conditional approval;
10. explicit negative action such as reject/remove/retract candidate effect.

This is a useful result rather than a test failure. It identifies what V1 actually is: a bounded atomic Decision layer over exact Contract C claims and exact causal evidence links.

## Observed / inference / unknown

### Observed

Within the tested surface, the published v1.0.0 artifact behaved deterministically and fail-closed on its declared authority, policy, target, replay, and downstream Contract D boundaries. No new maintained runtime defect was observed.

The known Contract-B internal-reference aperture remains reproducible on the published artifact.

Broader note/document/workflow decisions do not exist in maintained V1.

### Inference

The most plausible first real application remains MainFrame knowledge/citation governance: atomic supported-claim and exact-citation Decisions are already useful building blocks for an audited note, but an additional note-level policy would be required to decide a lifecycle transition.

### Unknown

The largest load-bearing assumption for higher-stakes use remains where exact C→B internal-reference authority is established. Current V1 can be safe if Contract C arrives from a separately assured producer boundary that already proved those references. It is insufficient if DE itself is expected to establish that relation from only C plus top-level B identity.

It is also unknown which broader effect vocabulary and authority object should govern note/SOP/document approval. V1 evidence does not justify inventing that by overloading the two current effects.

## Highest-value successor

Do not begin by adding a generic policy registry or by making `knowledge.add_verified_tag` mean document approval.

The smallest next discriminating sequence is:

1. **Close or deliberately externalize the C→B exact-reference authority boundary.** Reuse the already-supported strict indexed-ingress shape from PR #50, but bind the expected exact Contract-B index identity independently, for example through an upstream receipt or independent reconstruction from authoritative B. The falsifier is straightforward: preserve legitimate real-CAL outputs and exact D behavior while rejecting all five coherent internal substitutions above.
2. **Then test a MainFrame audited-note promotion policy as a new research policy/domain.** Authority should bind an exact note/revision plus the complete required set of atomic claim/citation Decision evidence or their exact source authorities. Target the exact note lifecycle transition candidate. CLEAR may only become a typed candidate for downstream Authorization, never a direct MainFrame mutation.
3. **Use SOP/controlled-document readiness as the next materially different domain** if the MainFrame specimen survives, to test whether the same bound materialization seam generalizes without smuggling document semantics into a generic kernel.

The unfinished newer CAL/Contract-C work is therefore not a blocker for V1 pressure testing, but it may become useful for the first successor if it supplies a stronger bound provenance/index authority surface.

## Terminal disposition

`SUPPORTED_WITH_KNOWN_BOUNDS`

The published Decision Engine v1.0.0 survived this multi-angle pressure campaign across its declared maintained surface. The evidence does **not** support broadening the meaning of V1.0.0. It supports preserving the release as-is, treating the Contract-B internal-reference aperture as the primary authority boundary to resolve for higher-stakes integration, and selecting one explicit new policy/domain for the next experiment rather than expanding the engine generically.
