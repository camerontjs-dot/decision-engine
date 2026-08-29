# Contract C → Gate Real-Producer Shadow RC1 — Preregistration

## Classification

Research Infrastructure / downstream-consumer conformance experiment.

This is not production authorization, not a generalized Decision Engine, not Select/Rank integration, not Contract C redesign, and not authorization for automatic application.

## Frozen question

Can the existing Gate head consume an exact authoritative Contract C 1.0.0 object actually emitted by the current CAL exporter through a minimal downstream adapter, while:

1. establishing exact object authority before any semantic/policy mapping;
2. preserving unknown/failure/not-checkable distinctions;
3. using only Contract C semantics plus an explicitly frozen downstream policy bar;
4. retaining human/operator control; and
5. avoiding Select/Rank and CAL-internal reconstruction?

## Reconciliation rule for RC0 / PR #12

RC0's recorded `CONFORMANT_WITH_LIMITATIONS` disposition is treated as an immutable evidence record for its frozen apparatus and tests. RC1 may discover an untested limitation or counterexample without rewriting that historical result. Any such discovery is recorded as new evidence.

The first RC1 falsifier is receipt replay: RC0's receipt checks authority repository/SHA/version and `valid`, but do not bind that receipt to the exact Contract C bytes consumed. RC1 tests whether a receipt valid for object A can grant policy authority to different object B. A successful replay is preserved as an RC1 counterexample and must be blocked by the hardened firewall before real-producer promotion evidence can count.

## Exact frozen authorities

See `AUTHORITY.json`. Live repositories were inspected before this freeze.

## Frozen downstream policy question

**May this one CAL Contract C proposition advance to a human-controlled claim-release review stage?**

`PROMOTE` means only “eligible to advance to human review under this research bar.” It does not mean publish, approve, apply, mutate production state, or authorize an action.

The policy is frozen in `BAR.json` before observing any new RC1 real-producer Gate decisions.

## Minimal consumed Contract C surface

RC1 is allowed to consume only:

- whole-object Contract C conformance/identity boundary state supplied by the pinned validator receipt;
- top-level `execution.state`;
- target `proposition.proposition_id` only to select the object under policy;
- target `execution.state` and, only when completed, `execution.completion`;
- target `conclusion.reported_verdict` only when a conclusion is contract-valid and present.

RC1 must not consume Contract C assessments, contributions, measurement values/bases, evidence references/text, producer policy internals, raw NLI/semantic measurements, CAL private traces, hidden heuristics, or Select/Rank output to determine Gate policy state.

If the frozen bar proves to require a non-consumed field, stop and record insufficiency rather than widening consumption after decisions are observed.

## Frozen policy mappings

All criteria are blocking.

- exact Contract C conformance: valid exact object → PASS; invalid/unverified/mismatched → UNKNOWN;
- result execution: completed → PASS; failed/incomplete/missing/future → UNKNOWN;
- proposition execution: completed:assessed → PASS; completed:not_checkable/failed/incomplete/missing/future → UNKNOWN;
- reported verdict:
  - `supported` → PASS;
  - `overstated` → FAIL;
  - `partially_supported`, `unsupported`, `needs_source`, `not_checkable`, missing, and every unmapped/future value → UNKNOWN.

All UNKNOWNs block promotion. `overstated` is the only frozen verdict-level failure. No assessment state is granted downstream policy meaning in this bar.

## Operator-control invariants

Every result, including PROMOTE and REJECT, must satisfy exactly:

- `requiresHumanApproval = true`;
- `automaticApplicationPermitted = false`;
- `appliedAutomatically = false`.

A bar that attempts to relax any of these invariants must itself fail closed and must not produce operational authorization.

## Conformance-firewall authority rule

Before any non-conformance field can acquire PASS or FAIL policy authority, RC1 must establish that the validation receipt applies to the **exact bytes** being consumed and the exact authoritative Contract C validator/release identity.

The receipt must bind at minimum:

- authority repository;
- pinned authority main SHA used by this experiment;
- immutable release tag and release commit;
- exact Contract C version;
- exact validator Git blob SHA;
- validation result;
- SHA-256 of the exact raw Contract C bytes validated;
- `result_set_id` observed by the validator/consumer boundary.

If any binding is absent, mismatched, malformed, invalid, or for different bytes, semantic-looking source fields may not receive PASS or FAIL mapping.

## Frozen adversarial matrix

The following mutations are preregistered:

1. schema-invalid object + adverse verdict;
2. valid shape but wrong Contract C version;
3. valid-looking object with altered receipt/object SHA-256;
4. mismatched `result_set_id`;
5. mismatched proposition identity;
6. missing validator receipt;
7. validator receipt for different bytes;
8. wrong validator blob/version identity;
9. unknown future `reported_verdict`;
10. malformed assessment state;
11. additional unknown fields;
12. semantically adverse contribution mutation with all Gate-consumed fields unchanged;
13. operator bar mutation attempting `requiresHumanApproval = false`;
14. operator bar mutation attempting automatic application eligibility.

For cases 1–11, the falsifier is any PASS/FAIL mapping sourced from the unestablished Contract C object before conformance. Case 12 must be decision-invariant because contributions are not consumed. Cases 13–14 must not produce operational authorization.

## Real-producer corpus rule

The corpus must consist only of bytes emitted by the unmodified current CAL Contract C exporter at the pinned CAL main SHA, or immutable production Contract C bytes whose byte identity to that same exporter implementation is independently established.

Synthetic schema-valid RC0 fixtures remain useful conformance controls but do not establish current CAL production reachability.

For each desired state, classify reachability as one of:

- observed from current CAL exporter;
- observed from an existing official CAL exporter-test pathway using the unmodified exporter;
- synthetically schema-reachable only;
- production reachability unknown.

Do not manufacture performed-assessment or failed/incomplete states merely to fill the matrix.

## Contract C 1.0.0 sufficiency test

The bar is frozen without consuming assessment slots. Therefore the absence of a generic `performed:pass` assessment value is a falsifier only if the frozen policy cannot be expressed faithfully without that distinction.

Allowed outcomes:

- `WORKS_WITHOUT_GENERIC_PERFORMED_PASS`;
- `EXISTING_DISTINCTION_SUFFICIENT_WITHOUT_REINTERPRETATION`;
- `AFFIRMATIVE_STAGE_CLEARANCE_MISSING`;
- `UNOBSERVED`.

Only `AFFIRMATIVE_STAGE_CLEARANCE_MISSING` supports a future Contract C compatibility experiment. It does not authorize a Contract C change.

## Select/Rank stop condition

No comparative alternative selection is in scope. If answering the frozen question requires comparing multiple candidates/options, stop and record `INCONCLUSIVE` for this Gate experiment rather than importing Select/Rank.

## Terminal disposition criteria frozen before execution

### `ADAPTER_AUTHORITY_LEAK`

Use if any unverified/mismatched/different-byte object can acquire PASS or FAIL policy authority before exact object conformance is established, or if an unsafe operator-control mutation can silently create automatic authorization.

### `CONTRACT_C_INSUFFICIENT_FOR_BAR`

Use if the frozen downstream policy genuinely requires a semantic distinction Contract C 1.0.0 cannot represent without reinterpretation.

### `FALSIFIED`

Use if, after the authority boundary is correctly established, the adapter violates a frozen mapping, consumes prohibited semantic material, changes behavior on contribution-only mutation, regresses Gate baseline behavior, or requires Select/Rank.

### `INCONCLUSIVE`

Use if exact authority or real-producer provenance cannot be established, the experiment cannot obtain a discriminating real-producer object, or execution failure prevents the frozen questions from being tested.

### `CONFORMANT_REAL_PRODUCER_SHADOW`

Use only if all preregistered authority/firewall mutations fail closed as required, exact real CAL-produced Contract C bytes are validated and consumed, frozen bar behavior is reproduced without semantic reinterpretation, operator invariants hold, Gate baseline remains unchanged, Select/Rank remains unused, and Contract C is sufficient for the frozen bar.

### `CONFORMANT_WITH_LIMITATIONS`

Use if the hardened adapter satisfies the tested authority, policy, operator, and separation properties but the current CAL-produced corpus is too narrow to justify the stronger real-producer-shadow claim across the intended decision surface.

## Evidence discipline

Every terminal report must separate `OBSERVED`, `INFERENCE`, `HYPOTHESIS`, and `UNKNOWN`; preserve initial failed designs/counterexamples; record exact SHAs and artifact hashes; and treat green CI as execution evidence rather than semantic proof by itself.
