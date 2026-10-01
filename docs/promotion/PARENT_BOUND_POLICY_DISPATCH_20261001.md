# Parent-bound maintained-policy dispatch promotion

## Classification

Production / Promotion candidate stacked on qualified parent-bound ingress PR #86.

This candidate promotes only the hardened maintained-policy dispatch demonstrated by research PR #90. It does not modify PR #86's qualified ingress, the released V1 policy/materializer, Contract D 1.0.0, Contract E, ERS, Authorization, or execution.

## Claim being promoted

For the parent-bound Contract C path, the caller may select one exact maintained policy id/version, but may not supply an effect or requested operation. The selected policy owns its exact effect, caller-owned context is snapshotted before validation/use, and unsupported or malformed policy/context state fails closed.

Maintained policies in this candidate:

- `decision-engine.contract-c.supported-claim-verification@1.0.0` -> `knowledge.add_verified_tag@1`
- `decision-engine.contract-c.epistemic-audit-stage-pending-review@1.0.0` -> `epistemic_audit.stage_pending_review@1`

## Evidence basis

Preserved falsification:

- PR #87 exact subject: `816374379ba7eb23f5bfdadaf203b7e287c052db`
- PR #88 decisive pressure run: `36897346412`
- failures: dynamic target rebinding after validation and prototype-visible policy lookup allowing caller-controlled effect state.

Supported successor:

- PR #90 semantic repair: `fa6039567d543ef8c9009e0a4ffdfdc1dd97281f`
- hardened dispatch blob: `d711f05000eb46ed4b0763c1c0bd73056d3d3073`
- evidence head: `efca4d6a2b9d5bbcf1bdc0dc7cfdc7edd5bef686`
- decisive requalification: run `36921865865`, job `110569614780`
- artifact `11191732872`
- artifact digest `sha256:b28eb378b09a542f70fa8fa28a46801885cea9acccab94d33d9eb33f94daf45f`
- research disposition: `SUPPORTED FOR PROMOTION`

The production candidate retains exact research-qualified bytes for:

- dispatch: `d711f05000eb46ed4b0763c1c0bd73056d3d3073`
- parent-bound policy CLI: `c628eaaf4f55b890f7fe0a6750f7265bf407d92e`
- phase-A qualification: `090756ffd7315585d7df2b1eba430a4a36446332`
- frozen pressure apparatus: `30490f91e77c3cc7cda86cecde650878a26ef80a`

## Protected baseline

The branch starts from PR #86 exact head `6cdb59c2ba41779ac954af56dd077574ba090013`.

These protected bytes must remain unchanged:

- `src/parentBoundContractCDecision.js`: `83ab34bce30f874111500ed91f2c01421be9f9a0`
- `src/contractCDecision.js`: `2225f73eb6eefd83609f0ba19e4786d1267dd527`
- `src/decisionMaterializer.js`: `1562fb29da6679a0cf894e478cbdd4ae16e21a18`
- `scripts/decision-engine-parent-bound-evaluate.mjs`: `4e5a85aa1179e815b5e23e6524e2b2a314aab7d0`

## Compatibility / version decision

This is an additive public capability after released Decision Engine `1.0.0`. Existing V1 surfaces are intended to remain compatible. If this candidate and its parent-bound ingress dependency are promoted into a normal release, the appropriate repository version class is **MINOR**, i.e. the next release train is `1.1.0`.

The release decision remains separate from this implementation promotion. A dedicated release PR must reconcile version metadata, changelog, public docs, exact release qualification, deterministic archive, immutable tag, and GitHub Release.

## Contract D boundary

Released Contract D 1.0.0 still rejects `epistemic_audit.stage_pending_review@1` as `unknown_effect_type`.

Therefore this candidate establishes a native Decision capability only. It does not establish the complete ERS Decision -> Contract D path. Contract D registration is a separate contract/version/conformance decision.

## Non-claims

This promotion does not establish:

- Contract D registration of the ERS effect;
- Contract E production readiness;
- ERS write readiness;
- Authorization;
- execution;
- universal JavaScript object safety;
- a release or version tag.

## Promotion gate

Before merge:

1. exact candidate bytes and protected PR #86 bytes must match;
2. PR #87 phase-A controls must pass on the ported candidate;
3. the exact frozen PR #88 pressure apparatus must report zero falsifiers and zero apparatus errors;
4. the same-policy weak effect mutation must be rejected;
5. ordinary Decision Engine regressions must pass;
6. the resulting qualification receipt must be `SUPPORTED FOR PROMOTION`.

After this stacked PR qualifies, merge/retarget sequencing must preserve the PR #86 dependency. The release train then proceeds separately as `1.1.0`.
