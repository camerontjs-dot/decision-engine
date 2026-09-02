# Contract-first policy specimen #2 — results and disposition

## Disposition

**SUPPORTED FOR PROMOTION**

This disposition is bounded to the exact experimental policy `decision-engine.contract-c.causal-basis-citation@1.0.0` and the common machinery demonstrated by comparison with the already-maintained `decision-engine.contract-c.supported-claim-verification@1.0.0` policy.

It is not a production authorization, release decision, claim of current CAL reachability, or approval of downstream Authorization/execution.

## Frozen evidence

- Decision Engine research base: `9f5ffc04a0184abe44dc49509058a7ff88893e30`
- Research branch head under test: `c713ad08c1b700d749e1b7ee74c926fcb8255b95`
- GitHub pull-request merge-test SHA recorded by Actions: `8b0b3920a2a9a83f2997c7656ff8bdd44667127d`
- Contract C 1.0.0 release: `5fe55f9ed5d0ee9f026ca1b077e9d70ce0487ea1`
- Contract D 1.0.0 release: `298a1a0f7b7b6d7712e11200d04faec3e1ca169b`
- Contract C canonical fixture SHA-256: `7a66583e332be4901d13ba9f2d7e12419938c77a41b83223a4b0946ad529b7a1`
- Research workflow run: `33635475088`
- Research workflow job: `100265152677`
- Research artifact: `9848589243`
- Artifact digest: `sha256:e6c1a2e251bc7344fd67f76c542811ca79a8f5ba393e07259aba084a2adc509a`
- Normal repository CI run: `33635474940`

The pull-request merge-test SHA is not the research branch head. It is preserved separately so the evidence record does not collapse two different Git identities.

## Observed

The preregistered policy matrix passed under exact released Contract C and Contract D authority.

Using the same exact canonical Contract C object:

- the first proposition's retained causal-basis contribution produced Contract D `CLEAR` with effect `knowledge.cite_as_evidence@1`;
- the same proposition's retained residual contribution produced Contract D `HOLD` with the same effect;
- a requested contribution that could not be identified produced `evaluation.state=failed` and no effect.

The experiment also observed:

- stale whole-object Contract C identity rejected;
- wrong expected Contract B binding rejected;
- wrong Decision policy identity rejected;
- target ID substitution rejected;
- target content substitution rejected;
- a valid unknown headline verdict plus a valid performed-unknown assessment did not change the basis-membership Decision;
- missing Contract-C-required state was rejected by the exact Contract C validator;
- incomplete result execution and not-checkable proposition completion yielded HOLD rather than a fabricated subject-matter result;
- same logical proposition/contribution IDs with changed immutable evidence content changed target content identity and rejected stale target replay;
- a weak headline-verdict-only implementation and a weak any-retained-contribution implementation both failed the discriminator;
- every emitted Decision validated under the exact Contract D 1.0.0 validator;
- exact Contract D consumption returned `candidate_for_authorization`, `hold`, or `evaluation_failed` as applicable;
- upstream, policy, target, effect, and effect-parameter substitution controls failed closed or became non-applicable as required;
- metadata-only mutation did not change Contract D semantic identity;
- the Authorization-collapse negative control was caught: CLEAR remained only `candidate_for_authorization`;
- specimen #1 regression passed unchanged;
- normal repository hygiene and JavaScript tests passed.

## Inference supported by the evidence

Contract C 1.0.0 contains sufficient normative state for a downstream Decision policy to distinguish an exact retained contribution that participates in a proposition's causal basis from an exact retained residual/non-deciding contribution, without inspecting CAL-private state or reinterpreting the headline verdict.

That distinction is sufficient to implement the bounded experimental Decision question:

> Is this exact claim–evidence link established by Contract C as a causal-basis contribution for this exact completed assessed proposition?

When the answer is yes under the explicit policy, Contract D can represent the Decision with `knowledge.cite_as_evidence@1`. The resulting CLEAR still carries no operational permission.

## Architecture comparison: specimen #1 vs specimen #2

### Demonstrated common machinery

Both working specimens require the same authority-side machinery:

1. exact Contract C release identity verification;
2. exact external whole-object SHA-256 verification before semantic reads;
3. exact canonical Contract C validation;
4. exact expected Contract B binding verification;
5. construction of Contract D `input_authority` from the Contract C `result_set_id` plus exact whole-object SHA;
6. explicit Decision policy ID/version validation;
7. exact target binding before favorable authority can be emitted;
8. fail-closed handling for invalid authority/context;
9. Contract D emission from already-owned Decision state;
10. exact Contract D validation and consumer applicability as the downstream boundary.

The research implementation intentionally duplicated items 1–4 rather than refactoring specimen #1 before the second policy existed. That duplication is now direct evidence for extracting a small common Contract C ingress helper. Leaving the copies independent would create a concrete drift risk at an authority boundary.

### Deliberately policy-specific

The following remain policy-owned and should not be generalized away:

- selector/context shape;
- target kind and target-content derivation;
- fields of Contract C inspected for disposition;
- CLEAR/HOLD semantics;
- evaluation-failure semantics beyond common transport/context failures;
- registered Contract D effect;
- reason-code and diagnostic content.

Specimen #1 asks whether one exact claim is supported under the maintained supported-claim policy and emits `knowledge.add_verified_tag@1`.

Specimen #2 asks whether one exact retained contribution is in the causal basis of one exact claim–evidence link and emits `knowledge.cite_as_evidence@1`.

The difference is semantic, not a threshold flip or cosmetic variation.

## Abstractions rejected

No evidence currently justifies:

- a policy registry abstraction beyond an explicit two-policy dispatch table/switch;
- class hierarchy;
- policy DSL;
- plugin system;
- generic rule engine;
- configuration language;
- generic target-derivation framework.

With only two demonstrated policies, those structures remove no observed semantic duplication. They would make the authority surface larger without eliminating a concrete failure mode.

A small shared Contract C ingress boundary is justified because duplicated exact-release, whole-object, validator, and Contract-B checks can drift independently and thereby weaken a common authority invariant.

## Unknowns and limitations

- The experiment does not establish that current CAL emits every synthetic Contract C state used by the falsifier matrix.
- It does not establish source legitimacy, corpus completeness, or correctness of CAL semantic judgments.
- It does not establish that a causal-basis contribution is independently sufficient; the policy asks only basis membership.
- It does not establish generic citation completeness, publication suitability, or citation assessment because Contract C 1.0.0 intentionally has no generic citation stage.
- It does not justify `task.dispatch@1` from Contract C alone.
- It does not justify a generic policy language or open-ended runtime.
- Interactive local clone/test execution remained unavailable because the runtime could not resolve public GitHub addresses. GitHub Actions was the execution venue; this deviation is retained rather than erased.

## Promotion boundary

The evidence supports only the smallest maintained successor:

1. extract the demonstrated common Contract C ingress/authority verification into one maintained helper while preserving specimen #1 behavior;
2. promote the causal-basis citation policy as a second explicit maintained policy;
3. test both against exact frozen Contract C/D authority;
4. only after both maintained paths work, add the smallest explicit library dispatch boundary and thin no-mutation CLI if that boundary remains useful under tests.

The research branch itself should not be merged wholesale. Experimental scaffolding and research workflow remain evidence records.
