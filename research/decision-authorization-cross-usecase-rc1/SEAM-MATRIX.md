# Promotable Decision / Authorization Boundary — RC1

This is the bounded architecture supported by RC0 + RC1. It is not Contract D 1.0.0.

| Information / responsibility | Decision | Authorization | Execution receipt |
| --- | :---: | :---: | :---: |
| upstream authority identity | ✓ | bind exact D | reference |
| target identity/hash | ✓ | re-bind | reference |
| decision policy identity/version | ✓ | reference | reference |
| decision disposition | ✓ | consume | reference |
| typed policy effect / action class | ✓ | enforce | reference |
| decision reason codes / blocking unknowns | ✓ | inspect if needed | reference |
| actor identity |  | ✓ | record |
| requested operation |  | ✓ | record |
| human approval state |  | ✓ | record/reference |
| delegation/autonomy profile |  | ✓ | reference |
| operational domain/risk restriction |  | candidate | record if relevant |
| permission validity/supersession |  | ✓ candidate | reference |
| automatic application permission |  | ✓ if modeled | record |
| idempotency / replay control |  |  | ✓ |
| actual mutation attempted/applied |  |  | ✓ |
| execution outcome |  |  | ✓ |

## Load-bearing invariants

1. Authorization-context changes do not rewrite Decision semantics.
2. A weakened or superseded Decision can only narrow/invalidate authority.
3. Actor, action, target, and approval substitution must not inherit authority from a valid D.
4. Generic eligibility is insufficient; the requested action must match the Decision's typed effect or equivalent.
5. Execution occurrence is not part of Decision truth.
