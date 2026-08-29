# RC1 Failure 001 — local Contract C canonicalizer duplication

## Status

**PRESERVED FAILED IMPLEMENTATION CUT**

This record is evidence, not a defect-hiding cleanup note.

## Exact execution

- Workflow: `Research - Contract C Gate real-producer shadow RC1`
- Run: `33281131576`
- Decision Engine head: `3d0030040a1994684eec8c6cb5dd732cf7904c63`
- Uploaded failed-run artifact ID: `9723017525`
- Uploaded artifact digest: `sha256:bac69f7b496d902104219aaf5b23b92c84a9636d74ea6a40915337bcecc6a5bd`
- Failed step: `Run frozen real-producer Gate shadow and RC0 reconciliation`

All preceding steps passed, including exact frozen authority checks, unchanged Gate baseline, RC0 regression, authoritative mutation validation, preservation of the RC0 receipt-replay counterexample, the first hardened adversarial audit, current-CAL corpus capture, and independent validation of every captured Contract C object plus reconstructed Contract-B binding.

## Counterexample

The current CAL exporter emitted `production-minimal.json` with exact SHA-256:

`a6b03b66d77916b62a8cf668a4c683529a45370687a09c3d2adb64c2c2bb53cc`

The pinned authoritative Apparatus Contract C validator accepted those exact bytes as canonical and valid and reported the same canonical SHA-256.

The first RC1 adapter cut nevertheless rejected exact-object establishment because it reimplemented Contract C canonicalization in JavaScript and compared its locally reserialized bytes with the authoritative bytes.

The discriminating numeric representation was:

- authoritative Contract C bytes: `"value":1.0`
- local JavaScript reserialization: `"value":1`

Those values parse to the same JavaScript number but are different byte strings. The local canonicalizer therefore produced a different SHA-256 and falsely classified an authoritative, valid Contract C object as mismatched.

## OBSERVED

1. The authoritative validator accepted the real CAL-produced bytes.
2. The validation receipt bound `object_sha256` and authoritative `canonical_sha256` to the same exact byte digest.
3. The first RC1 JavaScript canonicalizer produced different bytes for the same parsed object.
4. The divergence was caused by JSON numeric lexical representation, not by Contract C invalidity or policy semantics.

## INFERENCE

A downstream Gate adapter must not duplicate Contract C canonicalization. Canonicalization is part of the Contract C authority surface and belongs to the authoritative validator/canonicalizer. Reimplementing it downstream creates a second validator and can reject authoritative objects for representation differences.

The smaller authority boundary is:

- accept exact raw bytes;
- hash those bytes locally;
- require an authoritative validation receipt whose `object_sha256` names those exact bytes;
- require the validator-reported canonical digest to name those same bytes for a successful canonical validation;
- require exact validator/release/version identity and matching `result_set_id`;
- only then permit semantic/policy mapping.

## FALSIFIER FOR THE REPAIR

The repair is invalid if it can be made to accept different bytes using a replayed receipt, wrong validator identity, wrong result-set identity, wrong Contract C version, invalid object, or altered validator-reported canonical digest.

## Preservation

The failed implementation remains permanently identified by Decision Engine commit `3d0030040a1994684eec8c6cb5dd732cf7904c63` and adapter blob `b569fedb9986f7b298e6ddcf7c89de1c2ce5014b`. Do not rewrite this failure as a successful cut.
