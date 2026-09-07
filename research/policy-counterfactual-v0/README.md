# Policy Counterfactual / Decision-Critical Unknown Prototype v0

## Question

Can Decision Engine identify which explicitly supplied unknown inputs are decision-critical by replaying an existing deterministic policy under caller-declared admissible values, without making a prediction or causal claim about the world?

This is a research prototype. It does not change maintained Decision Engine behavior.

## Why this slice

The maintained repository already has a deterministic Gate head and the maintained Contract C -> Decision -> Contract D surface. The next useful capability is not another policy abstraction. It is a way to ask a narrower question about a fixed policy:

> If this unknown policy input were different, would the recommendation change?

That is a policy counterfactual. It is sensitivity analysis over deterministic decision logic, not a world counterfactual.

## Scope

This prototype is deliberately limited to the existing Gate surface.

It adds research-only helpers that:

- replay the same Gate bar against a cloned item with one explicit patch;
- report whether the recommendation changed;
- report which criterion outcomes changed;
- classify a caller-declared unknown as `decision-critical` or `decision-invariant` over an explicit finite set of admissible values;
- preserve `policy-mandatory` as a separate routing class even when recommendation impact is invariant.

The caller owns the meaning of an "unknown" and the admissible value set. The prototype does not infer possible worlds, probabilities, evidence availability, or acquisition cost.

## Hard boundaries

The output explicitly declares `world_causal_claim: false`.

It does not:

- predict what will happen;
- estimate probability or expected utility;
- claim a patched value is realistic, observable, or causally attainable;
- choose an evidence-producing action;
- perform Authorization or execution;
- mutate the baseline input;
- modify `src/**` or any maintained policy.

A `decision-invariant` result means only that none of the caller-supplied admissible values changed the decision for this exact baseline and policy version while all other supplied item fields were held fixed.

## Falsifiers / controls

The prototype must fail or be considered insufficient if it:

1. mutates the baseline item;
2. permits an implicit or undeclared unknown-value domain;
3. allows a patch to invent a new state path;
4. permits prototype-pollution paths;
5. labels an advisory-only change decision-critical when the recommendation is unchanged;
6. loses a policy-mandatory collection requirement merely because the recommendation is invariant;
7. produces nondeterministic output for identical inputs;
8. implies a causal/world counterfactual.

## Run

From the repository root:

```bash
node --test research/policy-counterfactual-v0/policyCounterfactual.test.mjs
node research/policy-counterfactual-v0/run-demo.mjs
```

## First observed execution

Environment: Node `v22.16.0`.

The first local execution on 2026-09-07 passed 10/10 tests. The demo baseline was `hold` and classified:

- `evidence-status` -> `decision-critical` (`pass -> promote`, `fail -> reject`);
- `documentation-status` -> `decision-invariant`;
- `retention-status` -> `policy-mandatory`, with decision impact still `invariant`.

This establishes only the behavior of this research apparatus against the demonstrated Gate fixture. It does not establish that the abstraction belongs in maintained Decision Engine code, that every Decision head can use the same mechanism, or that a Workflow Advisor should act on the classification.
