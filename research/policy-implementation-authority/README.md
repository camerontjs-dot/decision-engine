# Policy Implementation Authority / Registry Substitution

## Classification

Stacked Draft Research experiment after the heterogeneous-authority result. Decision Engine only. No maintained `src/**`, `scripts/**`, `tests/**`, contract amendment, Authorization, execution, release, tag, promotion, or production-default change.

## Trigger

The PR #58 research projection kernel accepts a `policyRegistry` object and records only the selected policy `{id, version}` in Contract D. The live maintained Contract-C runtime does something intentionally stronger: it hardwires the two maintained policy identities to their maintained implementations through an internal switch rather than exposing a generic caller-supplied registry.

This experiment asks whether the research abstraction accidentally hides that trust boundary.

## Question

If admitted authority, exact target, and policy ID/version are held fixed, can substituting only the evaluator implementation behind that same policy identity change a Decision while still producing valid exact Contract D?

## Preregistered comparisons

Use the frozen release-qualification assessment producer because it gives one simple trusted policy with both natural CLEAR and natural HOLD states.

### Pair A: false negative

- exact baseline authority fixed;
- exact target fixed;
- exact policy object fixed: `decision-engine.release-qualification.regression-maintenance-review@research-0`;
- trusted registry must CLEAR;
- substituted evaluator under the **same exact registry key** returns a valid HOLD.

If both Decisions validate under exact Contract D and the downstream Contract-D consumer returns `candidate_for_authorization` for the trusted result and `hold` for the substituted result, policy ID/version alone does not authenticate evaluator semantics.

### Pair B: false positive

Create one canonical adverse authority by changing the required-CI observation to failure before producing the authority.

- exact adverse authority fixed within the pair;
- exact target fixed;
- exact policy ID/version fixed;
- trusted registry must HOLD;
- substituted evaluator under the same exact key returns a valid CLEAR.

If exact Contract D accepts both and downstream applicability flips from `hold` to `candidate_for_authorization`, an untrusted registry can manufacture a positive Decision without changing the recorded policy identity.

## Expected interpretation if substitution succeeds

This would **not** by itself be a Contract D defect. Contract D is a Decision record, not necessarily a cryptographic attestation of policy executable code.

It would establish that policy implementation dispatch is part of trusted Decision Engine machinery. A generic projection API must not accept caller-controlled evaluator bindings merely because policy ID/version is validated.

The candidate seam would refine to:

`trusted authority adapter -> trusted target resolver -> trusted policy implementation dispatch -> domain-neutral projection -> exact Contract D`

## Maintained negative control

The current maintained Contract-C runtime is not a generic caller-supplied registry. It explicitly switches exact policy ID/version to maintained policy functions and rejects all other policy identities. This experiment must not be reported as a demonstrated vulnerability in maintained production Decision Engine unless a maintained injection path is separately found.

## Main falsifiers

- substituted evaluator cannot change a valid D while authority/target/policy identity remain fixed;
- exact Contract D or its consumer independently binds policy implementation identity in a way this test overlooked;
- maintained code already allows equivalent caller-controlled evaluator substitution, which would make this a production finding rather than only an abstraction boundary;
- the result depends on changing authority, target, policy ID/version, effect type, or Contract D authority.

## Stop rule

Preserve either outcome. Do not add evaluator hashes to Contract D or refactor maintained dispatch in this experiment. First establish the boundary.
