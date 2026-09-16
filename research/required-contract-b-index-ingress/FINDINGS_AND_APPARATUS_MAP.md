# Decision Engine pressure findings and live apparatus map

Status: Draft Research Infrastructure record. This file is not production authorization, a release decision, or permission to merge any research prototype.

Exact live Decision Engine base inspected before this record: `main@a4425f8eb47449ff6c683222921bbea9483742e2`.

## 1. What Decision Engine actually is on live `main`

There is **not one universal frozen Decision Engine unit** through which every decision flows. The repository currently contains three distinct heads with different maturity and semantics.

### A. Maintained CAL / Contract C decision surface

This is the current CAL Pipeline Decision path:

```text
exact Contract C 1.0.0 bytes
  -> src/contractCIngress.js
  -> src/contractCDecisionRuntime.js
  -> one explicit policy implementation
       - src/contractCDecision.js
       - src/contractCBasisCitationDecision.js
  -> src/contractD.js
  -> src/contractDCanonicalOutput.js / exact Contract D 1.0.0 authority
```

The runtime is an explicit two-case dispatcher, not a registry, DSL, rule engine, plugin system, or generalized evaluator.

Maintained policies:

1. `decision-engine.contract-c.supported-claim-verification@1.0.0`
   - target: exact claim
   - positive effect descriptor: `knowledge.add_verified_tag@1(scope=claim)`
   - current positive predicate: result completed + proposition completed/assessed + `reported_verdict == supported`

2. `decision-engine.contract-c.causal-basis-citation@1.0.0`
   - target: exact claim-evidence link
   - positive effect descriptor: `knowledge.cite_as_evidence@1`
   - positive predicate: exact retained contribution is in the proposition causal basis after completed/assessed execution

The Contract C path deliberately does **not** route through the Gate head.

### B. Gate head

`src/gate/gateHead.js` is a separate smaller primitive with `pass | fail | unknown` criteria and deterministic `promote | hold | reject` routing. `src/gate/notePromotionBar.js` is one MainFrame policy application.

The Gate is still useful machinery and remains tested, but it is **not** the maintained CAL Contract C -> Contract D runtime.

### C. Career select/rank head

`src/decisionEngine.js` is the older domain-specific weighted career comparison engine. It remains a working regression surface and product/demo baseline. It is not the CAL decision kernel and is not evidence for a universal Decision Engine abstraction.

## 2. What is actually frozen / pinned

The maintained CAL decision surface pins external authority, not one frozen monolithic evaluator.

### Contract C authority

- version `1.0.0`
- release commit `5fe55f9ed5d0ee9f026ca1b077e9d70ce0487ea1`
- tag object `6bd135a948e407212b2e77ec18ac5c402f93565e`
- validator blob `9c75ccfbf2223578a8d1a7bf0c39673b394fbea4`

### Contract D authority

- version `1.0.0`
- release commit `298a1a0f7b7b6d7712e11200d04faec3e1ca169b`
- tag object `6eadd688b482f3c9fce2ce5e7a2841089d852096`

### Frozen evidence consumed by maintained conformance

The two-policy conformance workflow checks out frozen specimen-1 evidence from Decision Engine research head `0e0d14471b0ed24382794244468539a723b8b888` and runs the maintained supported-claim integration against it. Policy 2 uses direct valid Contract C contract fixtures plus mutation controls.

So the current apparatus is best described as:

> small maintained handwritten policy machinery surrounded by exact external contract authority and frozen/maintained conformance evidence.

It is not a single frozen inference unit analogous to RC8J.

## 3. How much of prior DE research is actually in the maintained apparatus?

**Some important falsifiers have been promoted into maintained tests/workflows, but not every historical experiment is replayed on every commit.**

Maintained two-policy conformance currently preserves, among other things:

- exact Contract C release/tag/validator identity;
- exact Contract D release identity and independent consumption;
- supported CLEAR and multiple HOLD states;
- evaluation failure for absent targets;
- exact Contract C whole-object mismatch rejection;
- top-level Contract B binding mismatch rejection;
- wrong Contract C version rejection;
- target content substitution rejection;
- policy identity substitution rejection;
- same-headline execution-state discrimination;
- causal-basis versus residual contribution discrimination on a valid Contract C fixture;
- cross-policy/effect reuse rejection downstream;
- effect and parameter substitution controls;
- metadata non-authority;
- weak validation/context/Authorization-collapse controls;
- Decision -> Authorization firewall: CLEAR becomes only `candidate_for_authorization` under exact Contract D applicability.

Normal repository CI separately continues to run:

- career engine invariant sweep;
- career output-quality sweep;
- career combination matrix;
- Gate tests;
- the older Contract C shadow fixture check.

However, many research results remain **evidence records rather than permanently replayed maintained tests**. That includes several findings from the September 7-8 pressure campaign below. They should not be treated as automatically enforced simply because the research PR exists.

## 4. September 7-8 Decision pressure campaign

All records below are Draft research evidence. No merge/release/tag/promotion/Authorization/execution was performed.

### PR #41 - real CAL output interoperability

Established that both maintained policies can consume fresh CAL-produced exact valid `supported` Contract C objects and emit canonical Contract D. Whole-object, B bundle, target, and cross-child replay controls failed closed.

### PR #42 - valid contradicted CAL state

Fresh CAL-produced `contradicted` Contract C caused:

- supported-claim verification -> HOLD;
- exact deciding counterevidence citation -> CLEAR.

This demonstrated real policy discrimination rather than two policies merely shadowing one headline verdict.

### PR #43 - valid CAL abstention / `not_checkable`

A measurement-safe miss produced CAL abstention and Contract C `not_checkable`:

- claim verification -> distinct HOLD reason `contract_c_proposition_not_checkable`;
- no positive deciding-citation target existed in the tested case.

### PR #44 - residual contribution reachability

Current frozen CAL RC0 does not naturally emit an assessed Contract C containing one deciding basis contribution plus a retained residual contribution. One SUPPORTS + one IRRELEVANT drops the irrelevant relation from contributions; two SUPPORTS triggers projection loss to `not_checkable` rather than arbitrary unique-basis selection.

The DE residual branch itself remains implemented and tested using the canonical Contract C consumer fixture. Missing evidence is upstream producer reachability, not a demonstrated DE branch defect.

### PR #45 - mixed warranted conflict and adversarial matrix

Real pipeline support + refutation for the same proposition produced CAL `mixed_categorical_relations` and Contract C `not_checkable` with both contributions residual. Both DE policies HOLDed before either side could become a positive surface.

Additional authority/target/policy/replay controls failed closed.

### PR #46 - execution precedence and assessment scope

Execution handling remained clean:

- result incomplete/failed -> HOLD;
- proposition incomplete/failed -> HOLD;
- proposition `not_checkable` -> HOLD;
- exact authority replay into an incomplete C changed Decision identity and HOLDed;
- repeated exact inputs were byte-deterministic;
- noncanonical C bytes failed.

New policy-scope observation: Policy A still CLEARed a `supported` proposition when generic Contract C assessment stages were explicitly adverse/failed, individually and together.

### PR #47 - Policy A assessment guard counterfactual

Contract C 1.0.0 has no generic `performed/favorable` assessment state. It exposes only `not_performed`, `performed/unknown`, `performed/adverse`, `not_applicable`, and `failed`.

Two bounded candidate guards both preserve exact current real CAL behavior where all four stages are `not_performed`:

1. block explicit `adverse` or `failed`;
2. block `unknown`, `adverse`, or `failed`.

The only remaining discriminator is whether `performed/unknown` should block verified-tag candidacy. No maintained change authorized.

### PR #48 - producer semantic authority aperture

Contract C validates producer-policy self-consistency but does not allowlist one semantic implementation or producer policy identity. Maintained DE CLEARed both policies after independently substituting:

- `producer.semantic_implementation_sha`;
- producer policy identity;
- both together;

while recomputing valid Contract C identity.

Interpretation remains architectural: deliberate producer-agnostic Contract C consumer versus bounded CAL-policy consumer.

### PR #49 - Contract C -> Contract B internal-reference aperture

This is the strongest concrete ingress finding so far.

The released Contract C validator can accept an exact Contract B index and then verify:

- proposition presence;
- proposition text hashes;
- contribution passage presence;
- evidence source IDs;
- evidence passage hashes;
- top-level B version/bundle ID/bundle hash.

Maintained DE invokes the released validator **without** that index, then separately checks only top-level B version/bundle ID/bundle hash.

Holding the exact B bundle identity fixed, research substitutions of proposition ID/text hash and evidence passage ID/source/hash were all:

- rejected by the released Contract C validator when the exact B index was supplied;
- accepted by current maintained DE ingress;
- CLEAR under both maintained policies when fresh targets were derived from the mutated C.

This is not stale output replay: every changed C propagated a new immutable C identity into Contract D.

## 5. Current highest-value engineering discriminator

Prototype the smallest ingress that requires released Contract C validation **with an exact Contract B index**.

Load-bearing issue: an index supplied by the same untrusted caller is not self-authenticating. A colluding fake index can copy the correct bundle ID/hash and be edited to match a mutated C. Therefore a meaningful strict ingress needs an independently established identity for the exact index bytes, or a stronger source from which the index can be independently reconstructed.

This branch tests the smallest candidate:

```text
exact Contract C bytes + exact C SHA
+ exact released Contract C authority
+ expected Contract B bundle identity
+ exact Contract B index bytes
+ independently supplied exact Contract B index SHA
    -> released Contract C validator with contract_b_index
    -> unchanged maintained policy semantics
```

The prototype is falsified if a mutated C can pass against the frozen real B index, or if a colluding fabricated index can acquire authority while the independently expected index digest remains fixed.

## 6. Boundaries / unknowns

- The current CAL RC0 pipeline writes canonical `CONTRACT-B-INDEX.json` and uses it when validating each Contract C object, but its current pipeline receipt records the B bundle ID/hash and validation state, not the index file's independent SHA-256.
- Therefore a production-quality DE requirement for an independently pinned index digest would require an upstream handoff/receipt source for that digest, or another independently trusted way to derive the index from exact Contract B.
- This branch does not amend Contract B or C and does not authorize changing CAL/EB in this DE thread.
- Assessment-policy hardening and producer-identity policy remain separate governance questions from the concrete C->B reference-integrity aperture.
