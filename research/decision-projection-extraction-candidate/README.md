# Decision projection extraction candidate

Classification: Draft Research, Decision Engine only.

This is a production-shaped research candidate, not a maintained implementation or promotion. It changes no maintained `src/**`, contract, Authorization, execution, release, tag, or production default.

## Candidate idea

Extract only the smallest reusable Decision materializer after domain-specific trust work has already completed:

`trusted admission -> trusted target resolution -> fixed trusted policy dispatch/evaluation -> materializeBoundDecision -> exact Contract D`

The candidate takes named bound fields and does not accept raw authority, a policy registry, or an evaluator callback.

## Primary falsifier

A policy result may be semantically correct only for the exact authority and target against which it was computed. Test whether a genuine CLEAR result from release authority A can be detached and replayed against an adverse release authority B under the same exact policy ID/version while still producing valid Contract D.

If yes, the materializer is not a standalone trust boundary. The safe architecture must keep policy evaluation and materialization colocated within trusted domain-owned call paths, unless a future portable policy-result warrant explicitly binds those values.

## Other preregistered checks

- exact maintained equivalence for Contract C claim, causal citation, and missing-target FAILED path;
- exact legacy equivalence for release-qualification and task-result domains;
- exact prior-minimality equivalence for source-bound artifact manifest;
- ten-run deterministic output;
- returned state does not alias caller-owned mutable objects;
- static absence of caller-controlled policy registry/evaluator/raw-authority parameters;
- research-only mutation surface.

## Stop rule

Preserve any counterexample. Do not add a portable receipt, evaluator digest, registry, or contract change to make the candidate pass. A replay counterexample narrows the allowed architectural boundary rather than authorizing a patch.
