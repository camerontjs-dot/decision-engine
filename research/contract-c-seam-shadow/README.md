---
title: "Contract C seam shadow fixtures"
status: proposed
research_only: true
schema: "decision-engine/contract-c-claim-audit-fixture@0.1.0"
updated: 2026-08-27
---

# Contract C seam shadow fixtures

**PROVISIONAL. SINGLE-AGENT ADJUDICATION. NOT CAL VALIDATION. NOT a regulatory/compliance opinion.**

This is a small research surface for the proposed Claim Audit Lab (CAL) → Decision Engine (DE) handoff. It asks a narrow question:

> Given a claim, the evidence-world observations supplied by the Evidence Bundler, and a CAL result, does the DE Gate produce the expected `promote`, `hold`, or `reject` recommendation while preserving the distinction between an abstention and a failure?

The fixtures are deliberately synthetic. They are not a production MainFrame adapter, a CAL gold set, a performance benchmark, or evidence that a mainframe claim is true in the world.

## What is included

`fixtures.json` contains eight small cases:

| Case family | Cases | Expected Gate behavior |
| --- | --- | --- |
| Clear support | one direct observation | `promote` recommendation |
| Explicit inference | one supported inference | `promote` with an advisory caveat |
| Support not checkable | future/generalized claim with one-run evidence | `hold`, not reject |
| Coverage not checkable | CAL coverage receipt absent | `hold`, not reject |
| Direct contradiction | evidence records the opposite value | `reject` |
| Overstated claim | source supports a narrower claim than the wording | `reject` |
| Incident-derived provenance controls | quarantined or missing citation authority | `reject` for source/citation failure |

The read-only review record is [`review/claim-review.md`](review/claim-review.md). It records the subagent’s findings, the repairs made after that first-draft review, and the boundary that the final fixture text was not independently re-reviewed.

The two incident-derived cases are sanitized controls inspired by the 2026-08-09 citation-hallucination incident. They contain no raw incident files, private paths, real citation text, authors, DOI, or external URL. The incident patterns represented here are a citation-shaped/quarantined record and an unresolved identifier requiring manual review; the wider incident also included placeholder and reserved-domain source shapes. An unresolved identifier is not, by itself, proof of fabrication. These cases test “do not promote without admissible provenance,” not fabrication prevalence or detector accuracy.

The incident population is intentionally **not** used as calibration gold. The local incident was one mechanically labelled event, and its quarantine metadata would leak the answer. The public controls therefore retain only the failure pattern and an explicit `negative_control` label.

## Candidate seam fields

The fixture preserves the CAL axes separately:

- `support_verdict`: `supported`, `partially_supported`, `unsupported`, `contradicted`, `not_checkable`
- `audit_flags`: the current known flags, including `overstated` and `inferred`; this field remains extensible
- `citation_status`: `correct`, `partial`, `wrong_source`, `missing_needed`, `not_cited`, `not_applicable` — fixture-only/reserved here because its contract status is unresolved
- `support_verdict_reason`: present only where the fixture needs to explain an abstention, using the versioned observed subset in `fixtures.json`
- evidence lineage: stable fixture source ID, source state, excerpt, and SHA-256 hash

The schema is a **candidate**, not a ratified apparatus contract. DE does not re-judge CAL’s proposition-level result. It applies a named research bar to the supplied observations and records why the recommendation was made. The deterministic validator replays the supplied CAL fields; it does not independently prove entailment.

## Operator boundary

Every Gate result in this surface is a recommendation:

- `requiresHumanApproval: true`
- `appliedAutomatically: false`
- `mainframeStatusMutation: null`

No fixture authorizes a status change, publication, or downstream action.

## Run the deterministic check

From the repository root:

```bash
node research/contract-c-seam-shadow/validate-fixtures.mjs
```

The validator runs the actual pure Gate head against every fixture. It also checks that the controlled vocabulary, claim/evidence hashes, incident-control sanitization, expected decision, and operator-only envelope agree. It does not resolve a citation or contact a live mainframe system.

## Hash convention

`claim_hash` is SHA-256 over the UTF-8 claim text. Each `evidence_hash` is SHA-256 over the UTF-8 string `${source_ref}\n${excerpt}`. The hashes bind the public fixture’s exact text; they do not turn synthetic evidence into external proof.
