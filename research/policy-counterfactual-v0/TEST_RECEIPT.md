# Execution receipts

## Authority and scope

- Date: 2026-09-07
- Decision Engine live base inspected before build: `a4425f8eb47449ff6c683222921bbea9483742e2`
- Research branch: `research/policy-counterfactual-v0-20260907`
- Exact research code/test head under the decisive GitHub-hosted run: `9a7ab0f9bc75c4250bb0f78ac631f9854c3b35be`
- Maintained source mutation: none
- Research claim: deterministic policy replay can distinguish caller-declared decision-critical unknowns from decision-invariant unknowns without making a world/causal claim.

## First local development execution

Runtime: Node `v22.16.0`.

The first isolated local development execution used the inspected Gate API plus the research files and passed 10/10 tests. This was a development receipt only, not independent reproduction or GitHub-hosted evidence.

## GitHub-hosted decisive run

Workflow: `Research - Policy Counterfactual v0`

- workflow run: `34167981911`
- job: `101882716453`
- checked-out PR merge ref combined exact research head `9a7ab0f9bc75c4250bb0f78ac631f9854c3b35be` with exact base `a4425f8eb47449ff6c683222921bbea9483742e2`
- runner: Ubuntu 24.04
- Node: `v22.23.2`
- result: SUCCESS

Commands:

```bash
node --test research/policy-counterfactual-v0/policyCounterfactual.test.mjs
node research/policy-counterfactual-v0/run-demo.mjs
```

Observed test result:

```text
1..12
# tests 12
# suites 0
# pass 12
# fail 0
# cancelled 0
# skipped 0
# todo 0
```

The 12 tests include the original falsifiers plus two checks against the maintained `NOTE_PROMOTION_BAR`:

1. A note with unresolved source resolution begins at `hold`. Over an explicit admissible domain, all sources resolving moves the same policy to `promote`, while a dangling source moves it to `reject`. `source-resolution` is therefore decision-critical for that exact baseline and policy.
2. With all blocking checks satisfied, changing only the advisory purpose-field input changes the `states-its-purpose` criterion from `pass` to `fail` while the recommendation remains `promote`. That patch is decision-invariant for the exact baseline and policy.

Observed demo summary:

```text
baseline_decision: hold

evidence-status:
  routing_class: decision-critical
  pass -> promote
  fail -> reject

documentation-status:
  routing_class: decision-invariant

retention-status:
  routing_class: policy-mandatory
  decision_impact: invariant

world_causal_claim: false
```

## Maintained regression and hygiene run

Workflow: `CI & Repository Hygiene Verification`

- workflow run: `34167981931`
- `JavaScript Tests`: SUCCESS
- `Path & Secret Leak Audit`: SUCCESS
- maintained Gate tests: SUCCESS
- maintained engine sweeps: SUCCESS
- maintained Contract C seam fixture check: SUCCESS

## Bounded result

Observed behavior supports the research claim for the existing Gate abstraction and the maintained `NOTE_PROMOTION_BAR` case exercised here.

It does not establish:

- that the same abstraction is sufficient for the maintained Contract C -> Decision -> Contract D policies;
- that caller-supplied admissible values correspond to reachable or probable world states;
- causal or interventional semantics;
- evidence-acquisition routing;
- Authorization or execution;
- production-promotion readiness.

This remains a research evidence record. A broader cross-head claim requires a separate discriminating experiment with the exact authority requirements of the other Decision head rather than silently generalizing from Gate.
