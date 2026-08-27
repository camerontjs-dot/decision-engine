# Results 02: Gate-head + MainFrame composition

**Status:** structural composition passed; real cross-repository fixture still required  
**Branch:** `research/contract-c-seam-shadow`  
**Certified workflow run:** GitHub Actions `33037265160`  
**Head tested:** `73b2d1965387a1990bf54b4e3a833aecc5fd1aba`

## Observed result

The Contract-C shadow workflow completed successfully after composing:

- the Contract-C CAL-result projection;
- the existing generic Gate head;
- the new audited-claim promotion bar;
- the existing MainFrame note-promotion bar;
- a note-level compositor that requires both structural and claim-audit coverage.

The same run also re-executed the existing Decision Engine regression surfaces:

- engine invariant sweep;
- output-quality sweep;
- combination-matrix sweep;
- Gate-head tests.

All workflow steps completed successfully.

## S1. Contract C can feed the existing Gate primitive

The research adapter projects CAL result state into a Gate item rather than implementing a parallel decision engine.

This reduces the architecture to:

```text
CAL result
  -> Contract C
  -> Gate item
  -> destination bar
  -> inspectable Gate recommendation
```

The Gate still owns only destination policy. CAL remains the audit authority for the supplied evidence/claim relationship.

## S2. Known adverse state and unknown state remain distinct

The integrated tests verified:

- `unsupported` → Gate `reject`;
- `contradicted` → Gate `reject`;
- `not_checkable` with a valid reason → Gate `hold`;
- explicit unresolved audit state → Gate `hold`;
- below-shadow audit confidence → Gate `hold`.

The hold paths contain no manufactured blocking failure.

This preserves the important rule:

> failure to establish is not the same object as establishing failure.

## S3. Overstatement does not trigger automatic rewriting

An `overstated` flag causes the claim as written to fail the current promotion bar.

The criterion records that the proposition must not be weakened in place while retaining the original audit identity.

A revised claim requires a new claim identity/hash and a new audit.

## S4. Advisory audit state survives without becoming a hidden blocker

The `inferred` flag is advisory in the current shadow bar.

A fully supported claim carrying that flag can still receive a Gate `promote` recommendation, but the Gate marks the decision as a close call and preserves the advisory caveat for operator review.

This demonstrates the benefit of using the generic Gate model instead of flattening all non-perfect states into pass/fail.

## S5. MainFrame note structure and CAL claim support are separate gates

A frozen synthetic MainFrame note fixture was parsed through the existing note-promotion bar and combined with Contract-C claim decisions.

Observed composition behavior:

- resolvable note evidence + one supported audited claim → `promote` recommendation;
- unresolved note source references → `hold`;
- CAL abstention on the claim → note-level `hold`;
- unsupported audited claim → note-level `reject`;
- missing claim-audit coverage → note-level `hold`.

The note structure does not substitute for claim support, and passing claim audits do not excuse unresolved note provenance.

## S6. Audit coverage is explicit

The compositor records:

```text
parsedClaimCount
auditedClaimCount
complete
```

A mismatch holds the note rather than allowing a passing subset of audit results to stand in for full note coverage.

This is only a structural coverage check. It does not prove the note parser found every substantive natural-language claim.

## S7. MainFrame mutation authority remains outside Decision Engine

Both claim-level and note-level outputs retain:

```text
requiresHumanApproval: true
appliedAutomatically: false
mainframeStatusMutation: null
```

A successful Gate result therefore remains a recommendation/receipt candidate, not a direct `status: stable` write.

## S8. Existing Decision Engine behavior remains intact

The branch workflow re-ran the public engine's existing invariant, output-quality, combination-matrix, and Gate tests successfully.

The Contract-C research therefore remains isolated from the career comparison implementation while reusing its generic Gate primitive.

## Current architecture disposition

**Adopt for further testing:** Contract C is an adapter boundary into the existing Gate head.

**Adopt for further testing:** MainFrame note promotion composes two distinct evidence surfaces:

1. note/provenance-structure observations;
2. CAL claim-audit observations.

**Adopt for further testing:** `unknown` maps to hold, not adverse failure.

**Adopt for further testing:** a positive Gate result remains operator-applied.

**Do not lock:** exact Contract-C fields remain candidate until a real CAL result traverses the boundary.

**Do not modify MainFrame production workflow yet:** first prove the full MainFrame source snapshot → EB → C-B → CAL → C-C → Gate round trip.

## Next discriminating experiment

Use one frozen real MainFrame `10_knowledge/` synthesized note with a small, inspectable raw/source set.

Run:

```text
MainFrame knowledge adapter RC0
  -> Evidence Bundler
  -> Contract-B candidate
  -> Claim Audit Lab
  -> Contract-C RC0
  -> audited-claim Gate
  -> note-level Gate composition
```

The experiment should compare:

- minimal C-C versus full CAL result package;
- complete versus intentionally missing source references;
- supported versus not-checkable versus adverse claims;
- exact snapshot identity before and after a claim edit.

Only after that should the MainFrame adapter or Contract C become canonical production interfaces.
