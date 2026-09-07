# CAL Pipeline real-output Decision pressure test

## Classification

Draft Research Infrastructure / integration pressure test. No production authorization, merge, release, tag, promotion, Contract C/D change, Authorization, or execution.

## Exact Decision Engine base

`a4425f8eb47449ff6c683222921bbea9483742e2`

The experiment adds only this research directory and one research workflow. Maintained `src/**` and `scripts/**` are not changed.

## Upstream authority under test

The workflow regenerates fresh outputs from the exact CAL Pipeline RC0 integration head:

`camerontjs-dot/claim-audit-lab@4b9d69936d8ecdbaac0217561be7a3a821b70522`

That upstream build produces validated Contract C 1.0 objects from its exact bounded A -> Evidence Bundler -> B -> CAL -> C vertical. Decision Engine consumes those freshly generated Contract C bytes directly.

Exact external heads:

- Evidence Bundler: `50270b9bfcf6b5112c6ec88c02c7cdd7215e0ff4`
- RC7F-B1: `0ecdedc5cea970485a635508255f3670ab231c33`
- RC8J: `8e75c6782bb95c3763d06230b9c5df2b6af44054`
- Contract B 1.2 authority: `c314e53bd91c0736aa4370a364673b069aceb43e`
- Contract C 1.0 authority: `5fe55f9ed5d0ee9f026ca1b077e9d70ce0487ea1`
- Contract D 1.0 authority: `298a1a0f7b7b6d7712e11200d04faec3e1ca169b`

## Question

Can the maintained Decision Engine consume real, freshly generated CAL Pipeline Contract C outputs through the exact authority boundary and produce valid canonical Contract D for both maintained policies, while refusing obvious authority, binding, and cross-output replay mutations?

This is deliberately narrower than asking whether the whole CAL Pipeline is correct.

## Preregistered observations

For each upstream child that CAL reports as a completed assessed `supported` proposition with one causal-basis contribution:

1. `decision-engine.contract-c.supported-claim-verification@1.0.0` should produce `completed / clear` with `knowledge.add_verified_tag@1(scope=claim)`.
2. `decision-engine.contract-c.causal-basis-citation@1.0.0` should produce `completed / clear` for the exact causal-basis contribution with `knowledge.cite_as_evidence@1`.
3. Both outputs must canonicalize successfully under exact Contract D 1.0 authority.
4. The maintained exact-authority CLI should consume the same fresh Contract C bytes and agree with the programmatic supported-claim path.

## Falsifiers / negative controls

The experiment fails if any of the following occurs:

- a fresh upstream Contract C object cannot pass maintained Decision ingress despite upstream exact Contract C validation;
- a supported upstream child does not CLEAR under the maintained supported-claim policy;
- its exact causal-basis contribution does not CLEAR under the maintained citation policy;
- emitted Decision output fails exact Contract D canonical validation;
- wrong whole-object Contract C SHA-256 does not fail closed;
- wrong expected Contract B binding does not fail closed;
- wrong claim target content hash does not fail closed;
- replaying another fresh child target against the first Contract C yields CLEAR;
- replaying another fresh child's citation target against the first Contract C yields CLEAR;
- maintained CLI cannot reproduce the programmatic supported-claim result.

## Interpretation boundary

A passing run would establish only that the current maintained Decision surfaces are interoperable with this exact real CAL Pipeline RC0 output family and preserve the tested fail-closed bindings.

It would not establish:

- CAL semantic correctness beyond the upstream bounded evidence;
- source legitimacy or corpus completeness;
- reachability of all valid Contract C states;
- a general Decision policy framework;
- a generalized Contract C policy-counterfactual architecture;
- operational Authorization or execution.

If this passes, the next useful Decision Engine test is to obtain or generate **valid upstream Contract C HOLD states** rather than manufacturing invalid Contract C mutations. That would test the maintained policy boundary over real semantic variation instead of only positive reachability and binding safety.
