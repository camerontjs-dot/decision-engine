# Decision Engine Repository Lineage Note — RC1

**Status:** research context note  
**Purpose:** avoid confusing repository naming/history with evidence that a generic decision runtime already exists.

## Observed

Two separate public repositories currently exist:

- `camerontjs-dot/career-decision-engine` — the original career decision-support repository, created 2026-04-24 and last pushed 2026-05-06 at the time of this note. Its repository description is explicitly about comparing job offers and career paths with relative scoring, rule checks, calibrated uncertainty, and validation sweeps.
- `camerontjs-dot/decision-engine` — the active pipeline-facing repository. Its current `main` still contains the inherited career application, and later work added the generic Gate head, MainFrame note-promotion research, and Contract-C fixtures/shadows.

## Inference

The active `decision-engine` repository should not be assumed to have a validated generic architecture merely because it has the broader name.

The separate original career repository also reduces migration pressure: if the Contract-C research supports a small generic Gate/policy runtime, the career application can remain conceptually and historically distinct rather than forcing its weighted scoring model into the common kernel.

## Open repository-identity decision

After the Contract-C consumer-diversity experiments, decide which of these better matches the evidence:

1. `decision-engine` becomes a small generic decision/policy runtime, while career comparison remains a separate application/history;
2. `decision-engine` remains a collection of decision applications with no claim of one universal runtime;
3. the generic policy function is sufficiently standard that no bespoke Decision Engine is justified, and the repository is narrowed/reframed accordingly.

No rename, migration, archival action, or code move is justified by this note alone.
