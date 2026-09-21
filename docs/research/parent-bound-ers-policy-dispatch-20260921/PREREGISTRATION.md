# Parent-bound ERS policy dispatch

**Status:** research preregistration. This file does not record a result.

## Question

Can a successor of frozen Decision candidate `6cdb59c2ba41779ac954af56dd077574ba090013` select between two maintained parent-bound policies, where each policy owns its effect, and natively emit `epistemic_audit.stage_pending_review@1` for a supported parent Contract C conclusion?

## Boundary

The caller names a policy identity and version. The caller does not supply an effect or a requested operation.

Maintained policies:

- `decision-engine.contract-c.supported-claim-verification` `1.0.0`
  - effect `knowledge.add_verified_tag@1`
  - params `{ "scope": "claim" }`
- `decision-engine.contract-c.epistemic-audit-stage-pending-review` `1.0.0`
  - purpose: stage an epistemically supported claim for ERS pending review
  - effect `epistemic_audit.stage_pending_review@1`
  - params `{}`

The context shape is exactly `policy` plus `target`. Unknown policies, wrong versions, extra fields, a caller effect, a caller requested operation, and a mutated target emit no Decision.

The frozen parent-bound ingress and the released Contract D registry stay unchanged. Released Contract D is expected to reject the new effect. This preregistration does not authorize Contract E, execution, or effect registration.

## Subjects

Exact frozen parent-bound Contract C fixtures from the CAL Pipeline v3 composition, cases PIPE01, PIPE02, and PIPE03.

## Stop

If the successor cannot emit the ERS effect without taking that effect from the caller, or without editing the frozen ingress, materializer, or released Contract D, the discriminator stops.
