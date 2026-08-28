# Contract C Consumer Policy Freeze — RC1

**Status:** frozen for this experiment  
**Production impact:** none

The four first destination policies are now frozen in:

`research/contract-c-consumer-probe-rc1/policies.json`

Fixtures and destination contexts are frozen in:

`research/contract-c-consumer-probe-rc1/fixtures.json`

## Shared constraints

All policies:

- consume structured Contract-C-like semantic state plus destination context;
- do not reopen raw evidence;
- do not re-run CAL semantic measurements;
- do not infer favorable/adverse defaults from missing fields;
- keep action authorization and execution external;
- require exact input/policy lineage in the receipt.

## P1 — MainFrame durable knowledge

**Decision question:** is the audited item eligible for operator promotion review, should it be held for more evidence, or is it not eligible as written?

**External authority:** MainFrame/operator.

**Important distinction:** full aperture can be destination-optional. When the destination does not require it, that criterion is not applicable and must not block the whole policy.

## P2 — publication / website claim

**Decision question:** is the exact claim supportable as written for the destination, or should it be reviewed/caveated/narrowed/withheld?

**Material state:** headline result, counterevidence, eligibility, semantic validity, applicability, and destination-required aperture.

**External authority:** publisher/operator.

## P3 — SOP / controlled requirement conformance

**Decision question:** for the stated requirement and audited proposition, is conformance supported, nonconformance supported, indeterminate, or is the requirement not applicable?

**Important distinction:** “requirement not applicable” is neither pass nor unknown.

**External authority:** quality-system/operator.

## P4 — deviation / investigation readiness

**Decision question:** is the current evidence/assessment state sufficient for the next procedural decision, is an adverse condition established, is further investigation required, or is the procedure not applicable?

**Material destination context:** procedural applicability, event scope, causal-state resolution, and counterevidence review.

**External authority:** investigation owner/operator.

## Falsifiers

The policies are considered inadequately separated from CAL if they must:

- inspect raw evidence passages;
- re-run semantic support/refutation;
- invent missing CAL assessments;
- mutate C to obtain a different destination decision.

The candidate runtime is considered inadequate if:

- malformed/system failure becomes an adverse subject finding;
- changing policy while holding C fixed cannot change the decision;
- same headline verdict plus different residual CAL state cannot be distinguished when policy declares that state material;
- action application occurs inside evaluation.
