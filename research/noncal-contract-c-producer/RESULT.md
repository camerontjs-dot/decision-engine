# Result — Non-CAL Contract C Producer Seam

## Disposition

**SUPPORTED FOR BOUNDED PRODUCER SUBSTITUTION; NOT A GENERAL PRODUCER-TRUST OR PRIMITIVE PROMOTION.**

A semantic producer that imported no Claim Audit Lab code and consumed no CAL artifacts or evaluator gold independently derived Contract C 1.0.0 from exact Contract B evidence. The exact released Contract C validator accepted that output with an independently rebuilt Contract B index. The unchanged maintained Decision Engine then produced the expected Policy A and Policy B decisions and exact Contract D outputs.

This demonstrates one real non-CAL producer at the Contract C seam. It does not establish semantic quality outside the preregistered grammar, trust of arbitrary Contract C producers, or that the current Decision policies should be refactored around a generic primitive.

## Exact final reproduction evidence

Decision Engine base: `358c2bb20f490bf25e808434394b26a70a16a123`.

Final stable-producer reproduction:

- workflow: `Research - Non-CAL Contract C producer seam`
- run: `34432368115` — **SUCCESS**
- job: `102730359797` — **SUCCESS**
- branch head evaluated: `c25c27482212ad2bc039952b4d664df3fb9b1b28`
- GitHub PR merge ref executed: `2dd18ff023e352578b606c905f3851681ec120e8`
- ordinary repository CI on the same branch head: `34432368174` — **SUCCESS**
- semantic producer source commit: `92dd837935a46e4a92197309611856516e11d480`
- artifact: `noncal-contract-c-producer-2dd18ff023e352578b606c905f3851681ec120e8`
- artifact ID: `10134944086`
- artifact ZIP SHA-256: `39beaef9b2bcbc0d972fbfc3a573c9435d71e94d21bc72d8f47f5d6c3d9982a1`

The earlier all-green run `34432105202` remains valid evidence of the same semantic result, but its `producer.semantic_implementation_sha` was bound to GitHub's temporary PR merge ref. The final reproduction above fixes that apparatus bookkeeping by binding producer identity to the last commit that changed `producer.py` and reruns the entire semantic and no-maintained-source-mutation aperture successfully.

Exact external authorities:

- Evidence Bundler qualification producer: `dd4fb2b89f351fbdcd8b08e48dd9d7d1f10c2d05`
- Contract B 1.2 production lock: `c314e53bd91c0736aa4370a364673b069aceb43e`
- Contract C 1.0 release: `5fe55f9ed5d0ee9f026ca1b077e9d70ce0487ea1`
- Contract C validator blob: `9c75ccfbf2223578a8d1a7bf0c39673b394fbea4`
- Contract D 1.0 release: `298a1a0f7b7b6d7712e11200d04faec3e1ca169b`

Exact Contract B input used by the semantic experiment:

- case: `C01_DIRECT`
- Contract B version: `1.2.0`
- bundle ID: `7def29df-ebf5-5d66-9606-eb74065e3243`
- bundle hash: `sha256:d2e8dd2051bb964134bb753d45d8f11be9eaba5864a2173285cd68b42f4ef332`
- EB qualification record: `cal_semantic_engine_called=false`

## Independent producer boundary

The producer implemented only this preregistered grammar:

`<entity> median alert latency is <number> ms.`

It read proposition text and retained passage text from the exact Contract B bundle. It admitted one semantic relation only when a retained passage contained the same entity plus the literal metric phrase `median alert latency of <number> ms`.

- equal number -> `support`
- unequal number -> `counterevidence`
- unsupported proposition grammar -> `not_checkable`
- more than one matching passage -> `not_checkable`

The producer did not rank ambiguous matches, compose the compound proposition, or import CAL semantics. Contract C canonicalization, result-set identity construction, and validation were supplied by released contract apparatus only after the producer had derived its narrow semantic state.

## Observed

### Stable Contract C production

The final reproduction produced:

- semantic implementation SHA: `92dd837935a46e4a92197309611856516e11d480`
- Contract C whole-object SHA-256: `sha256:3f29c2b29c4b53cbafcc1ca7cf889069cf6c28ff97aae31f910531d2545b34b7`
- result-set ID: `result-set:95d0910390cc0b2235f7b822580d790f7ac6ff66db76ef885accc17008a4e18c`
- exact released Contract C validation with the exact B index: **PASS**
- `cal_imported=false`
- `evaluator_gold_consumed=false`

`C01_DIRECT:child:1`:

- execution: `completed / assessed`
- verdict: `supported`
- deciding contribution: `contribution:4c261524e5722daffb7cc50f3dc25c9d1ba7a77612fe2dd4dd81490eacb88bb1`

`C01_DIRECT:child:2`:

- execution: `completed / assessed`
- verdict: `supported`
- deciding contribution: `contribution:0375f5bc4513fa2510a620aa63a34ae09f4e84a85196a693de0858d362de92d9`

`C01_DIRECT:root`:

- execution: `completed / not_checkable`
- verdict: `not_checkable`
- contributions: none

The root result is intentional. The producer had no registered semantic rule for the compound comparison and did not infer one merely because both child facts were individually available.

### Unchanged Decision Engine consumption

No maintained `src/**`, `scripts/**`, or `tests/**` bytes changed relative to base in the final reproduction.

For `C01_DIRECT:child:1`:

- supported-claim verification: `completed / clear`
- effect: `knowledge.add_verified_tag@1(scope=claim)`
- canonical Contract D SHA-256: `sha256:76743ca9f0cc6998f376a9d189aecb716d7e9a140d1b55b13c31a714dc1f42ee`
- causal-basis citation: `completed / clear`
- effect: `knowledge.cite_as_evidence@1`
- canonical Contract D SHA-256: `sha256:4c0929d2dd0d41f976169f2943f33033087db870f09bbd75a6b59a416726e5c7`

For `C01_DIRECT:child:2`:

- supported-claim verification: `completed / clear`
- effect: `knowledge.add_verified_tag@1(scope=claim)`
- canonical Contract D SHA-256: `sha256:45871e34cda1b45ffef518e7327f93b6da36619bca0812f48bbbf379c3315407`
- causal-basis citation: `completed / clear`
- effect: `knowledge.cite_as_evidence@1`
- canonical Contract D SHA-256: `sha256:4e8ede4b12fc59938bd4d069065bf62b8f0e3d03885a614da37347ff41738874`

For `C01_DIRECT:root`:

- supported-claim verification: `completed / hold`
- reason: `contract_c_proposition_not_checkable`

Additional controls:

- exact target-content substitution -> rejected `target_binding_mismatch`
- repeated identical Decision input -> byte-identical canonical Contract D
- exact Contract D authority validation -> PASS
- maintained-source mutation guard -> PASS
- Authorization performed -> false
- execution performed -> false

## Preserved deviations

These apparatus deviations are retained rather than erased by the successful rerun.

### Run 1 — missing bounded EB dependency

The workflow failed while rebuilding the sealed B qualification cohort because `rank_bm25` was absent. The independent producer and Decision Engine had not run. The harness was amended to install the narrow required dependency instead of the full Evidence Bundler ML dependency stack.

Disposition: setup failure; no semantic conclusion.

### Run 2 — overbroad independence grep

The independence guard matched the producer's own attestation key `evaluator_gold_consumed: false` because it searched for the English token `evaluator_gold` rather than a dependency path/import.

The guard was narrowed to actual imports/path references. Semantic code was unchanged.

Disposition: evaluator/harness false positive.

### Run 3 — shallow-checkout receipt failure after semantic PASS

The independent Contract C production, indexed C validation, and maintained DE probe all passed. The later no-maintained-source-mutation check failed because the Decision repository checkout did not contain base commit `358c2bb...` and `git diff` reported `bad object`.

The checkout was changed to full history. No semantic code changed.

Disposition: receipt/harness failure after semantic PASS.

### First all-green run — transient producer identity

Run `34432105202` was fully green, but it supplied GitHub's PR merge-ref SHA as `producer.semantic_implementation_sha`. That exactly identified the executed integration tree, yet it changed under workflow/result-only commits even when the semantic producer source did not.

The apparatus was changed to derive semantic implementation identity from the last commit touching `producer.py`. The final reproduction then bound the producer to `92dd837935a46e4a92197309611856516e11d480` and reran every semantic and mutation-guard step successfully.

Disposition: bookkeeping weakness resolved by independent final reproduction; earlier artifact preserved unchanged.

## Inference

Within this bounded state surface, the maintained Decision Engine behaves as a **Contract C consumer rather than a CAL consumer**.

No CAL-specific adapter, relation object, evaluator identity, or hidden CAL state was needed after exact Contract C had been produced. The same two maintained policies operated over the independent producer's exact C state.

That strengthens the hypothesis that the reusable Decision machinery lives downstream of the Contract C semantic boundary and is closer to an authority-bound policy projection over C than to a CAL-specific evaluator.

A second inference is that the earlier producer-identity pressure result cannot automatically be classified as a bug. Producer-agnostic consumption may be an intended property of Contract C as a semantic authority abstraction. Whether arbitrary valid C producers should be trusted remains a separate authority-policy question.

## Alternate explanations / limitations

A passing result does not imply broad evaluator interchangeability.

- The independent producer is intentionally tiny and deterministic.
- Only one exact Contract B case was used.
- Both positively decided atoms were simple literal numeric facts.
- The producer did not demonstrate joint reasoning, measurement warrants, temporal reasoning, ambiguity resolution, or general natural-language entailment.
- The producer used the released Contract C apparatus for canonicalization/validation, so independence is semantic, not independence from the contract implementation.
- Current DE still does not itself require the exact Contract B index at ingress. This experiment validates C against B upstream; it does not close the DE C->B internal-reference aperture established in PR #49 / prototyped in PR #50.

## Load-bearing assumption

The main assumption is that valid Contract C is intended to be the complete semantic interface needed by these two Decision policies. If a future producer requires out-of-band trust or semantic context for the Decision to be correct, producer substitution at the structural C boundary alone will be insufficient.

## Falsifier / next discriminating test

Do not refactor to a generic Decision primitive from this one result.

The next useful test is a **cross-producer policy-dependency matrix**:

1. obtain equivalent Contract C-visible states from CAL and this independent producer where possible;
2. vary C fields one dimension at a time while retaining exact validity and authority controls;
3. verify that each maintained policy changes only when one of its declared policy-relevant C dimensions changes;
4. verify producer metadata, measurements, assessments, contributions, verdict, basis, and residuals are invariant or load-bearing exactly where the policy says they are;
5. mutation-test any candidate shared kernel against both producer families.

If a supposed common kernel needs to branch on CAL identity or independent-producer identity, the primitive hypothesis is falsified at that layer.

If the policies behave identically for equivalent C-visible semantic states independent of producer but differ only on their explicit predicates and typed effects, that is stronger evidence for an extractable Contract-C Decision primitive.

## Promotion boundary

Keep this PR Draft and research-only.

No maintained Decision refactor, producer allowlist, Contract C amendment, B-index ingress promotion, Authorization change, merge, release, or tag is justified by this experiment alone.