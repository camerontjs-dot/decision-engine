# RC1 Failure 002 — semantic claim type crossed the Contract-B role boundary

## Status

**PRESERVED FAILED SUPPLEMENT CUT**

This record preserves a research-apparatus error encountered while closing the current-CAL `partially_supported` reachability gap. It does not alter the already-frozen six-case RC1 evidence.

## Exact execution

- Workflow: `Research - Contract C Gate RC1 partial-producer supplement`
- Run: `33281442752`
- Decision Engine head: `41523249916b50d9dadd89a763f4e3935fb8aaf9`
- CAL main: `53f0885b111676794d1bd20e10b91aa58b07e9d4`
- Failed step: `Emit partial-support Contract C through current CAL exporter`
- Preceding frozen-authority checks: PASS
- Current CAL rule control `test_numeric_mismatch_is_partially_supported_and_high_risk`: PASS
- Contract C validation and Gate evaluation: NOT REACHED

## Failed design

The first supplement constructed a semantic CAL `Claim` with `claim_type="numeric"`, correctly obtaining CAL rule state `partially_supported`, but then copied that semantic type into the modified Contract-B claim record.

That crosses two different type systems.

Authoritative current CAL Contract-B models explicitly define:

- Contract-B `claim_type`: handoff role `retrieval_seed | extracted_claim`;
- CAL `Claim.claim_type`: semantic family such as `numeric | causal | comparative | ...`;
- and state: **Never copy a C-B `claim_type` value into a CAL semantic `Claim.claim_type`.**

The inverse is equally invalid: a CAL semantic type must not overwrite the Contract-B handoff role.

## OBSERVED

1. The pinned current CAL rule control for the selected numeric-mismatch case passed and produced `partially_supported`.
2. The first exporter supplement failed before Contract C bytes were validated or sent to Gate.
3. The supplement had changed the Contract-B `claim_type` from its handoff-role vocabulary to the CAL semantic value `numeric`.

## INFERENCE

The smallest legitimate repair is to preserve the original Contract-B handoff role and change only the proposition identity/text and evidence passage needed for the controlled semantic rule input, matching the separation already encoded by CAL's adapter/model boundary.

No CAL source, rule threshold, exporter behavior, Contract C schema, or Gate bar should change.

## Falsifier for the repair

The repaired supplement does not count if any of the following occurs:

- current CAL no longer produces `partially_supported` from the pinned rule control;
- the current CAL exporter fails to emit Contract C for the controlled input;
- the authoritative Contract C validator rejects the emitted exact bytes or Contract-B binding;
- the frozen RC1 Gate bar does anything other than blocking `UNKNOWN/HOLD` for `partially_supported`;
- the adapter widens consumed fields or weakens operator-control invariants.

## Preservation

The failed script cut is identified by Decision Engine commit `41523249916b50d9dadd89a763f4e3935fb8aaf9` and workflow run `33281442752`. Do not rewrite that run as successful evidence.
