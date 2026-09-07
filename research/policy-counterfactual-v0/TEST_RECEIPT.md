# First execution receipt

- Date: 2026-09-07
- Decision Engine live base inspected before build: `a4425f8eb47449ff6c683222921bbea9483742e2`
- Runtime: Node `v22.16.0`
- Execution surface: isolated local working directory constructed from the inspected Gate API plus the research files; no GitHub Actions claim is made by this receipt.

Commands:

```bash
node --test research/policy-counterfactual-v0/policyCounterfactual.test.mjs
node research/policy-counterfactual-v0/run-demo.mjs
```

Observed test result:

```text
1..10
# tests 10
# suites 0
# pass 10
# fail 0
# cancelled 0
# skipped 0
# todo 0
```

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

This is a development/research execution receipt, not independent reproduction and not production-promotion evidence.
