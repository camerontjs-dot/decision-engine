# Decision / Authorization Boundary Matrix — RC0

This matrix is a research output, not a released contract.

| Information | RC0 owner | Why |
| --- | --- | --- |
| authoritative upstream input identity | Decision | establishes what the policy decision was about |
| target object identity/hash | Decision, then re-bound by Authorization | D names its subject; authorization must prevent target substitution |
| decision policy identity/version | Decision | establishes the rule under which the conclusion was reached |
| policy disposition | Decision | this is the conclusion being operationalized |
| decision reason codes / blocking unknowns | Decision | explains the policy conclusion without granting execution rights |
| actor identity | Authorization | the same D can be consumed by different actors |
| requested action | Authorization | D eligibility is not equivalent to every possible mutation |
| delegation profile | Authorization | operator-tunable autonomy must not rewrite D |
| domain / operational risk class | Authorization candidate | RC0 demonstrates usefulness here, not final ownership |
| human approval state | Authorization candidate | approval changes permission without changing D |
| allowed action scope | Authorization | operational capability boundary |
| validity / revocation / supersession of permission | Authorization candidate | affects whether an actor may act now |
| execution occurrence | Neither D nor authorization decision | belongs in a later execution receipt |
| idempotency of mutation | Executor/receipt candidate | concerns action application, not policy meaning |
| upstream evidence text / NLI / CAL internals | Neither | authorization must not become another epistemic evaluator |

## Load-bearing seam invariant

Changing actor, requested action, delegation profile, approval state, or other authorization context may change operational permission while leaving the authoritative Decision object unchanged.

Changing the authoritative Decision may narrow or invalidate authorization, but authorization may not silently strengthen the Decision semantics.
