---
title: "Independent claim review for Contract C seam fixtures"
status: provisional
review_mode: single-agent-adjudication
reviewed: 2026-08-27
cal_validation: false
---

# Independent claim review

**PROVISIONAL. SINGLE-AGENT ADJUDICATION. NOT CAL VALIDATION. NOT a regulatory/compliance opinion.**

An independent read-only subagent reviewed the first draft of `../fixtures.json`, the deterministic validator, the pure Gate head, the direct incident records, and the current apparatus field notes. It did not edit files, run CAL, resolve citations, or treat the fixture validator as proof of entailment.

The review found that the first validator run was internally consistent (`138` checks; `2 promote / 2 hold / 4 reject`) but correctly noted that the validator replays supplied CAL fields. It validates seam routing and provenance metadata; it does not independently establish that a claim follows from a real-world source.

## Fixture review and disposition

| Fixture | Independent review finding | Gate disposition | Integration disposition |
| --- | --- | --- | --- |
| `mainframe-approval-claim-supported-001` | The bounded run observation follows from the supplied synthetic excerpt. | `promote` | Retained. |
| `mainframe-approval-claim-inferred-002` | The first draft inferred correctness from a raw `Y` flag. | First draft was too strong. | Repaired: the claim now says it meets the fixture expectation, and the excerpt supplies expected `Y` plus observed `Y`; `inferred` remains an advisory caveat. |
| `mainframe-approval-claim-not-checkable-003` | One run does not establish every future input; the abstention is correct. | `hold`, not reject | Retained as a hold. Reason uses the observed `no_entail_signal` vocabulary rather than inventing a new unratified enum. |
| `mainframe-approval-claim-coverage-gap-004` | Claim support is present, but coverage is unknown. | `hold`, not reject | Retained as a coverage hold. |
| `mainframe-approval-claim-contradicted-005` | The evidence records the opposite flag for the same bounded run. | `reject` | Retained. |
| `mainframe-approval-claim-overstated-006` | The first draft lacked an expected-value observation needed to justify partial support. | `reject` | Repaired: the excerpt now supplies expected `Y` and observed `Y`; `partially_supported + overstated` remains separate and blocking. |
| `incident-citation-provenance-quarantined-007` | Quarantined citation authority cannot support promotion; this is not itself a fabrication finding. | `reject` on source/citation failure; CAL abstention remains `unknown` | Retained as a sanitized shadow control with `calibration_gold: false` and `evaluation_use: shadow_only`. |
| `incident-citation-provenance-unresolved-008` | An unresolved identifier is a provenance gap, not proof of fabrication. | `reject` on missing source/citation failure; CAL abstention remains `unknown` | Retained as a manual-review shadow control with the same non-gold metadata. |

## Contract-level findings

- `support_verdict`, `audit_flags`, and `citation_status` remain separate axes. The fixture does not flatten `not_checkable`, `overstated`, or `wrong_source` into one label.
- `audit_flags` are treated as an extensible field. The validator checks only the current known values used by this fixture set.
- `citation_status` is explicitly marked `fixture_only_reserved`; the apparatus field notes do not establish it as a ratified required field.
- The reason vocabulary is versioned as an observed, non-ratified subset. The fixture does not promote the research set into a contract enum.
- The incident-derived cases are not calibration gold, not a prevalence estimate, and not a source-resolvability benchmark. Raw incident material is excluded.
- The Gate remains operator-only: `requiresHumanApproval: true`, `appliedAutomatically: false`, and `mainframeStatusMutation: null`.

## Review boundary

The repairs above were applied after the subagent’s first-draft review. The final validator was re-run after the repairs, but this artifact is not a claim that the subagent performed a second pass over the repaired text. A future promotion of this fixture set would require an independent second review and a real CAL/evidence-bundle replay.
