# MainFrame knowledge adapter boundary

**Status:** research boundary note, not a lettered apparatus contract  
**Target:** MainFrame `10_knowledge/` → Evidence Bundler intake

## Problem

The desired operational loop starts with claims that already exist in MainFrame synthesized knowledge and audits them against the raw/source material MainFrame preserved.

The current Research Scaffold Harness Contract A is experiment-specific. Reusing its label or semantics for MainFrame would silently couple a durable knowledge workflow to research-harness fields such as experimental condition and task apparatus state.

Therefore MainFrame needs an **adapter profile** upstream of Evidence Bundler. It should remain unlettered until Contract-B conformance establishes the general evidence-preparation boundary.

## Responsibility

The adapter does not verify support. It packages MainFrame state faithfully enough for Evidence Bundler to construct an evidence aperture without inventing source identity or claim provenance.

## Candidate input

A synthesized MainFrame note in `10_knowledge/`, plus the source/raw objects it references.

The adapter should preserve at minimum:

### Note identity

- canonical note path or stable note ID;
- note content hash;
- note title/domain/type/status;
- `needs-audit` state when present;
- extraction timestamp and adapter version.

### Claim identity

For every claim selected for audit:

- stable claim ID within the note snapshot;
- exact claim text;
- claim-text hash;
- claim location/anchor in the note;
- epistemic label/confidence if already present;
- parent note ID/hash.

The adapter must not silently rewrite or decompose a claim and retain the original identity.

### Source/raw lineage

For every source reference already associated with the claim or note:

- referenced MainFrame path/ID as authored;
- resolved canonical path/ID when resolvable;
- content hash when readable;
- object type/status;
- raw-vs-synthesized classification;
- quarantine/verification state that MainFrame actually records;
- explicit unresolved/dangling state.

Do not manufacture bibliographic metadata to make an unresolved reference look complete.

## Candidate output to Evidence Bundler

Conceptually:

```yaml
mainframe_snapshot:
  note_id: ...
  note_path: ...
  note_sha256: ...
  status: synthesized
  needs_audit: true

claims:
  - claim_id: ...
    text: ...
    text_sha256: ...
    anchor: ...
    authored_source_refs: [...]

source_objects:
  - source_id: ...
    canonical_path: ...
    sha256: ...
    object_type: raw | note | other
    status: ...
    resolution: resolved | unresolved | quarantined

adapter:
  profile: mainframe-knowledge-adapter-rc0
  version: ...
  snapshot_sha256: ...
```

This is a research sketch, not a locked schema.

## What Evidence Bundler should own after intake

Once MainFrame identity/lineage is faithfully represented, Evidence Bundler owns evidence preparation:

- chunking/passages;
- retrieval and nomination provenance;
- deduplication;
- narrow admission/review state;
- source/passage integrity;
- coverage/search facts;
- Contract-B finalization.

The MainFrame adapter should not decide which passage supports or refutes the proposition.

## What CAL should own

CAL remains the proposition-specific auditor:

- semantic relation;
- audit assessment;
- applicability/eligibility where policy defines it;
- completeness conclusion;
- support verdict/abstention;
- flags, citation status, confidence, decision basis.

## What Decision Engine should own

Decision Engine consumes Contract C and applies a destination bar. It must not reach back into raw MainFrame sources to recreate CAL's audit.

## MainFrame lifecycle rule

This loop is about **auditing a snapshot**, not editing history in place.

A future successful sequence should look like:

```text
synthesized note snapshot N
   -> evidence bundle B
   -> CAL result A
   -> Contract C
   -> Gate receipt D
   -> operator accepts promotion
   -> new MainFrame lifecycle state referencing D
```

If the note text changes materially, the old audit remains tied to snapshot N. The modified claim needs a new identity/hash and a new audit.

## Raw-source immutability

The adapter reads raw evidence. It does not normalize away or rewrite raw content to make it easier for downstream tools.

Derived chunks, normalized text, embeddings, and evidence passages belong in derivative artifacts with lineage back to the raw object.

## Missing-source behavior

A dangling or unresolved authored source reference must remain explicit.

Allowed downstream consequences include:

- Evidence Bundler records a coverage/admission limitation;
- CAL abstains or reports a citation/source problem where appropriate;
- Decision Engine holds or rejects promotion under a destination bar.

Not allowed:

- invent a substitute source;
- silently drop the missing reference and report a complete aperture;
- assume the missing material would support the claim.

## Why this is not Contract A yet

Contract A currently has a defined producer and experimental purpose. Renaming a MainFrame adapter to C-A would blur producer ownership and introduce research-harness concepts into a general knowledge workflow.

After Contract B and Contract C settle, the apparatus can decide whether:

1. Contract A becomes a generalized claim/source-intake family with producer profiles; or
2. MainFrame gets its own named adapter profile outside the lettered research-handoff chain.

Testing should decide that architecture.

## Next experiment

Choose one real synthesized note with a small, inspectable source set. Freeze the note/source snapshot and test:

1. claim identity extraction;
2. authored source-reference resolution;
3. raw-source hash preservation;
4. missing/dangling reference behavior;
5. Evidence Bundler ingestion without harness-only fields;
6. full C-B → CAL → C-C → Gate round trip.

The adapter succeeds only if every downstream artifact remains reconstructable back to the exact MainFrame note and raw-source snapshot that produced it.
