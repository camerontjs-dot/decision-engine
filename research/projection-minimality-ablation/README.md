# Decision projection minimality / ablation research

Classification: Draft Research, Decision Engine only.

This experiment does not modify maintained `src/**`, release, tag, merge, promote, authorize, or execute anything.

## Question

After exact domain admission, exact target resolution, and trusted policy implementation dispatch, what is the smallest reusable Decision projection responsibility that remains before exact Contract D 1.0.0?

## Candidate

`minimalProjection.mjs` accepts only:

- externally established `inputAuthority`;
- externally established `policy`;
- externally established exact `target`;
- an already trusted policy-owned Decision fragment containing `evaluation` plus optional `effect` / `metadata`;
- exact Contract D authority root.

It does not accept raw domain authority, a policy registry, an evaluator callback, or domain semantic state.

## Preregistered discriminators

1. Exact valid-output equivalence against the prior projection kernel across:
   - released Contract C canonical claim;
   - released Contract C causal-basis citation;
   - Contract C missing-target FAILED path;
   - release-qualification authority;
   - task-result authority;
   - source-bound artifact-manifest authority.
2. Where an older maintained/legacy Decision path exists, minimal output must also be byte-identical to it.
3. Remove projection-specific pre-validation and submit malformed Contract-D-bound state. Record whether exact Contract D or the existing exporter still fails closed.
4. Inject alternate `input_authority`, `policy`, and `target` fields inside an otherwise valid policy fragment. The candidate must ignore them and preserve external bindings.
5. Construct the corresponding naive spread-based projection. If exact Contract D accepts the alternate self-consistent bindings, external-binding preservation is a unique projection responsibility rather than a Contract-D responsibility.
6. Static check: candidate must contain no `policyRegistry`, `admittedAuthority`, Contract-C/CAL/release/task-result/domain vocabulary.

## Falsifiers

The minimal candidate is falsified for this slice if any previously valid exact Decision changes bytes, if malformed state escapes exact Contract D, if injected fragment fields can replace external bindings, or if the candidate requires domain/policy-dispatch knowledge.

## Stop rule

Preserve any failure. Do not widen the candidate to repair a domain in this PR. Do not promote the candidate from this experiment alone.
