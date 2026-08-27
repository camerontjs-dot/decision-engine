# Research brief 02: Gate-head + MainFrame composition

**Status:** architecture refinement after the initial Contract-C shadow  
**Branch:** `research/contract-c-seam-shadow`  
**Depends on:** `brief-01-contract-c-seam-shadow.md`  
**Target:** MainFrame `10_knowledge/` synthesized-note promotion review

## Why this refinement exists

The initial Contract-C shadow treated downstream policy as a small dedicated audited-claim decision function.

Inspection of the current Decision Engine repository exposed a better existing primitive: the generic **Gate head** already models the exact epistemic behavior needed for MainFrame promotion decisions:

- named criteria rather than an opaque score;
- `pass | fail | unknown` observations;
- `promote | hold | reject` recommendations;
- unknown is not manufactured into failure;
- operator-only transitions remain operator-only;
- the engine is pure and performs no IO.

The repository also already contains a `NOTE_PROMOTION_BAR` for MainFrame knowledge notes.

Therefore the revised hypothesis is:

> **Contract C should adapt CAL audit state into the existing Gate head, not create a second downstream decision engine.**

This is a simplification, not a change to the Contract-C ownership boundary.

## Revised chain

```text
MainFrame synthesized note + source lineage
            │
            ▼
      Evidence Bundler
            │
      Contract B / C-B
            ▼
      Claim Audit Lab
            │
      Contract C / C-C
            ▼
      Contract-C adapter
            │
            ▼
     generic Gate head
        ┌───────────────┐
        │               │
 note structure bar   audited-claim bar
        │               │
        └──────┬────────┘
               ▼
      note-level recommendation
       promote | hold | reject
               │
               ▼
       MainFrame/operator gate
```

## Two bars, two kinds of evidence

### 1. Existing note-promotion bar

This checks the **shape and provenance plumbing of the synthesized note**:

- identifiable claims exist;
- claims are labelled;
- claims point at evidence;
- evidence references resolve;
- sources are not quarantined;
- useful advisory structure is present.

These are note/document observations. They do not establish that a cited source actually supports a claim.

### 2. New audited-claim promotion bar

This checks the **CAL audit state for each claim** through Contract C:

- support clears the destination bar;
- no blocking audit flags are present;
- no explicit decision-relevant unknown state remains;
- citation status clears the destination bar;
- audit confidence clears the current shadow bar;
- non-blocking flags remain visible as advisory caveats.

These are downstream policy criteria over a supplied audit result. The Gate does not re-run CAL.

## Composition rule

At the note level:

```text
if note structure rejects OR any audited claim rejects:
    reject promotion
else if note structure holds OR any audited claim holds OR audit coverage is incomplete:
    hold promotion
else:
    promote recommendation
```

`promote` remains a recommendation only.

Every composed result records:

```text
requiresHumanApproval: true
appliedAutomatically: false
mainframeStatusMutation: null
```

## Why `unknown` matters

The Gate's existing distinction between failure and unknown is load-bearing for the audit chain.

Examples:

- CAL `unsupported` or `contradicted` is a known adverse audit state for the promotion bar and may fail it.
- CAL `not_checkable` is not evidence that the claim is false. It becomes `unknown` at the Gate and holds the item.
- unresolved temporal/authority/completeness state is also `unknown`, not a fabricated failure.
- lower-than-required CAL confidence in the shadow policy holds rather than rejects.

This matches the apparatus rule already emerging at Contract B:

> missing or unresolved state must not silently become favorable or adverse truth.

## No claim laundering

The Gate evaluates the exact claim identity carried by Contract C.

If CAL reports `overstated`, the promotion bar fails the claim **as written**. Neither Contract C nor the Gate may weaken the proposition while keeping the original audit identity.

A revised proposition is a new claim and requires a new audit.

## Audit coverage is a separate gate

A note cannot clear simply because every audit result supplied happens to pass.

The note-level compositor compares:

- number of claims parsed from the note; and
- number of CAL audit results supplied.

A mismatch becomes an explicit coverage hold.

This is a structural check only. It does not prove that the claim parser found every substantive claim in prose. That stronger completeness question remains a separate measurement problem.

## MainFrame authority

The integration intentionally stops before lifecycle mutation.

MainFrame's current governance requires verified statuses such as `stable` to be earned and receipt-bound. Therefore the eventual production sequence should be:

```text
Gate recommendation
  -> immutable decision/audit receipt
  -> operator review
  -> separate MainFrame lifecycle action referencing the receipt
```

The Gate receipt may become part of the verification evidence. It is not itself the write.

## Upstream adapter remains separate

This refinement does not solve how a MainFrame synthesized note becomes an Evidence Bundler input.

That boundary should remain a distinct adapter profile rather than quietly redefining the research harness's Contract A.

The MainFrame adapter must preserve note/claim/source identity and explicit missing-source state, then allow Evidence Bundler and CAL to do their own jobs.

## Falsifiers

Reject this composition if testing shows any of the following:

- the Gate must inspect raw NLI/retrieval telemetry to make a legitimate destination decision;
- note-structure observations become substitutes for CAL support measurement;
- CAL abstention is converted to reject or promote through a default;
- a passing subset of claims can hide incomplete note-level audit coverage;
- the Gate rewrites claims or evidence history;
- a Gate recommendation directly mutates MainFrame `stable` state;
- a destination criterion is pushed back upstream into CAL merely for implementation convenience.

## Next gate

Use a frozen real MainFrame note and its actual preserved source files for an end-to-end experiment:

```text
MainFrame fixture
  -> MainFrame knowledge adapter
  -> Evidence Bundler
  -> candidate C-B
  -> CAL
  -> candidate C-C
  -> audited-claim Gate
  -> note-level Gate composition
```

Only after that should this profile move toward a canonical schema or production MainFrame adapter.
