# NEXT — Decision / Authorization Seam

## Authorized successor

Design and preregister the smallest **Contract D discovery + authorization boundary RC1**.

Do not implement production authorization yet.

Use the RC0 seam as a constraint:

1. Contract D must be definable without actor-specific delegation settings.
2. Authorization must consume an exact D identity plus actor/action/context.
3. Authorization changes must not rewrite D.
4. A weakened/superseded D must invalidate or narrow permission.
5. Execution must remain a separate event/receipt.

## Smallest discriminating next test

Pressure-test the same envelope across at least three real MainFrame policy questions:

- source-audit tag/status eligibility;
- citation permission for a retrieved knowledge object;
- prepared-task dispatch.

For each, freeze:

- authoritative Decision question;
- target;
- possible D dispositions;
- authorization request;
- one manual and one delegated profile;
- expected HOLD/deny path.

Ask whether one common D envelope plus policy-specific effect can support all three without moving actor/action/delegation semantics back into D.

## Falsifier

If any use case requires the policy decision itself to change merely because the consumer's actor, delegation level, or execution environment changes, then the proposed seam is too strong or located incorrectly.

If the use cases need fundamentally different decision envelopes, do not force a universal Contract D.
