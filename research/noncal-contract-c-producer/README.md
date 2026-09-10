# Non-CAL Contract C Producer Seam

## Classification

Draft Research Infrastructure / producer-substitution experiment.

This experiment does not modify maintained Decision Engine source, CAL, Evidence Bundler, Contract B, Contract C, Contract D, Authorization, execution, production defaults, releases, or tags.

## Question

Can a semantic producer that is independent of Claim Audit Lab consume an exact Contract B bundle, emit exact valid Contract C 1.0.0, and drive the already-maintained Decision Engine Contract C policies without any CAL-specific adapter inside Decision Engine?

A positive result would establish only producer substitution at the released Contract C boundary. It would not establish general entailment quality, production semantic correctness, or a universal Decision primitive.

## Exact authorities

- Decision Engine base: `358c2bb20f490bf25e808434394b26a70a16a123`
- Evidence Bundler RC0 qualification producer: `dd4fb2b89f351fbdcd8b08e48dd9d7d1f10c2d05` (Draft PR #54; used only to produce a sealed Contract B input)
- Contract B 1.2 production lock: `c314e53bd91c0736aa4370a364673b069aceb43e`
- Contract C 1.0 release: `5fe55f9ed5d0ee9f026ca1b077e9d70ce0487ea1`
- Contract D 1.0 release: `298a1a0f7b7b6d7712e11200d04faec3e1ca169b`

## Independent producer

`producer.py` is intentionally narrow. It does not import CAL, read CAL artifacts, read evaluator gold, or consume expected CAL outcomes.

It supports one explicit grammar only:

`<entity> median alert latency is <number> ms.`

For a proposition in that grammar, it scans only evidence passages retained in the exact Contract B claim unit. A passage contributes only if it contains the same entity and the phrase `median alert latency of <number> ms`. Exact numeric equality produces `support`; an unequal number produces `counterevidence`. More than one matching passage is treated as unresolved rather than arbitrarily selected.

Propositions outside that grammar are emitted as `completed / not_checkable` with no semantic contribution.

This is a deliberately tiny deterministic fact checker, not an entailment model and not a claim that this grammar generalizes.

## Pre-registered expected observations

Using qualification case `C01_DIRECT`:

1. `C01_DIRECT:child:1` should independently resolve `42 ms` from its retained Contract B passage and produce `assessed / supported`.
2. `C01_DIRECT:child:2` should independently resolve `58 ms` and produce `assessed / supported`.
3. `C01_DIRECT:root` is outside the producer grammar and should produce `not_checkable` rather than being guessed from its children.
4. The released Contract C validator, when supplied an index independently rebuilt from the exact B bundle, should accept the producer output.
5. Maintained supported-claim verification should CLEAR each atomic child and HOLD the compound root.
6. Maintained causal-basis citation should CLEAR the exact deciding passage contribution for each atomic child.
7. Exact target substitution against the independent producer output should still fail closed.
8. Contract D output should validate/canonicalize under the exact released Contract D authority.

## Falsifiers

The producer-substitution hypothesis is falsified for this slice if any of the following occurs:

- the independent producer needs CAL code, CAL relation artifacts, evaluator gold, or a CAL-specific field not required by Contract C;
- exact Contract C validation with the exact B index rejects the independently produced C;
- maintained Decision Engine requires CAL producer identity or CAL-specific adapter state not represented by Contract C;
- a supported atomic proposition cannot reach the same maintained CLEAR policy branches through this producer;
- the out-of-grammar compound proposition is silently coerced into a semantic verdict;
- target substitution or exact authority controls weaken;
- canonical Contract D validation fails.

## Boundary

Evidence Bundler PR #54 is used only as a source of a sealed research Contract B bundle. Its compatibility-carrier limitation remains intact and is not repaired here. This experiment begins its semantic question at the exact Contract B output.

A passing result would motivate a later anti-unification experiment across CAL-produced Contract C and independently produced Contract C. It would not by itself justify refactoring maintained Decision Engine code.