# Contract C producer-semantic authority binding pressure

## Classification

Draft Research Infrastructure / authority-scope discrimination experiment. No maintained policy or ingress change, merge, release, tag, promotion, Authorization, or execution.

## Exact real baseline

Verbatim real CAL-supported Contract C from Decision Engine PR #41:

- Contract C SHA: `sha256:c599e97fd5b4da80ae558d5d57a351fa3b2d37081432013a9dbeaae65a80b5a3`
- semantic implementation SHA: `4b9d69936d8ecdbaac0217561be7a3a821b70522`
- producer policy SHA: `e9c1db9e5bf3cb0bfb50f2f3615e89054fa2781c99e464b0d50b6adf0e24117b`
- completed / assessed / supported
- one exact support contribution in the causal basis

## Authority distinction under test

Maintained DE ingress establishes:

1. exact external Contract C whole-object bytes/digest;
2. exact released Contract C validator authority;
3. Contract-C-internal validity;
4. exact expected Contract B binding.

Contract C itself carries `producer.semantic_implementation_sha` and a self-hashed `producer.policy.canonical` object. Released Contract C validation requires the semantic SHA to be 40-hex and verifies only that the producer-policy hash matches the canonical policy object. The contract does not allowlist a particular CAL implementation SHA or policy identity.

The question is therefore:

> Do the maintained DE policies intentionally trust any Contract-C-valid producer semantics, or is exact CAL producer identity an authority-bearing condition that is currently unbound at Decision time?

## Variants

Starting from the exact real CAL-supported object, construct and independently validate:

A. exact baseline;
B. semantic-implementation substitution only, preserving producer policy;
C. producer-policy substitution only, preserving semantic implementation;
D. both semantic implementation and producer policy substituted;
E. producer-policy canonical payload changed without updating its hash, as a negative control.

For policy substitution, keep the proposition/contribution/conclusion bytes semantically unchanged while changing the producer policy identity and recomputing the exact required policy hash and result-set identity. This tests authority binding, not whether the alternate producer actually deserves the same conclusion.

## Pre-registered expectations

- E must fail Contract C validation.
- B/C/D should remain Contract-C-valid if the released contract treats producer identity as carried-but-unrestricted metadata.
- maintained Policy A should CLEAR B/C/D if producer identity is outside its predicate.
- maintained Policy B should CLEAR the same exact causal-basis contribution in B/C/D if producer identity is outside its predicate.
- exact Contract D input authority must still bind each changed whole-object Contract C digest, so no output-byte replay should occur.

## Counterfactual identity guards

Compare, without changing maintained code:

1. exact semantic-implementation pin only;
2. exact producer-policy SHA pin only;
3. both pins.

The discriminator is whether either single pin can reject all valid producer-identity substitutions while preserving the real baseline.

## Falsifiers

- a policy-hash mismatch passes Contract C validation;
- a substituted valid producer identity is rejected by maintained DE despite no corresponding maintained predicate;
- a changed exact Contract C object reuses the prior Contract D bytes/immutable input authority;
- one identity pin alone blocks substitution of the other independent producer-identity dimension;
- the exact real baseline is changed by either identity guard.

## Boundary

A passing substituted object is **not evidence that the alternate producer is legitimate or semantically correct**. It establishes only the current Contract C/DE trust aperture. Whether DE should pin producer identities is a governance/policy question, not answered by schema validity alone.
