# Contract-C Consumer / Runtime Probe RC1

Research-only apparatus for Decision Engine PR #4.

## Inputs

- Decision Engine production baseline: `55f108c196ead020b5965c7d4d737464c92bc4a0`
- RC1 starting head: `2ade117f35bcbae8ca1ce1a85790afa493f8694d`
- Apparatus #11 head used: `eb7017710866997a2d4ceb1ed5a71cbdfebe2428`
- CAL #15 head used: `a1f8b216e3f163bce55867ded07eee0d5b0ebeb7`

## Files

- `fixtures.json` — frozen Contract-C-like semantic fixtures and destination contexts.
- `policies.json` — frozen policies for MainFrame, publication, SOP conformance, and deviation readiness.
- `policyRuntime.mjs` — research-only neutral evaluator and deterministic receipt.
- `gateAdapter.mjs` — adapter that evaluates the same policies through the current production Gate.
- `independentPublicationTable.mjs` — separate table-oriented publication policy implementation.

Executable assertions live in:

`tests/contract-c-consumer-probe-rc1.test.mjs`

## Boundary

This directory does not define Contract C, does not change CAL semantics, and is not production Decision Engine behavior.

No external action is applied by this apparatus.
