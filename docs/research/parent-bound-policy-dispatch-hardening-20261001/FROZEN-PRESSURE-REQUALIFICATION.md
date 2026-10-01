# Frozen PR #88 pressure-apparatus requalification

**Status:** preregistered successor requalification. No result is recorded here.

## Decision

Determine whether the minimal hardened dispatch subject at semantic commit `fa6039567d543ef8c9009e0a4ffdfdc1dd97281f`, dispatch blob `d711f05000eb46ed4b0763c1c0bd73056d3d3073`, survives the exact adversarial measurement logic that falsified PR #87 in Decision Engine PR #88 while preserving the PR #86 behavior baseline.

## Prior authority

PR #88 is the authoritative falsification record for PR #87 subject `816374379ba7eb23f5bfdadaf203b7e287c052db`.

Frozen PR #88 apparatus identities reused here:

- pressure test blob: `30490f91e77c3cc7cda86cecde650878a26ef80a`
- pressure preregistration blob: `b79244a3315dcea75d7d43893dbada06f71f3e4b`
- original workflow blob: `636284602f173bbc8cae65a44342fe2d3c7e3e91`
- PR #87 phase-A test blob: `090756ffd7315585d7df2b1eba430a4a36446332`

The pressure-test source file and predecessor preregistration are copied byte-for-byte. The successor workflow changes only routing/subject identity and result-binding metadata needed to run the same checks on the new subject.

The pressure test's embedded `frozen_subject` metadata still names the historical PR #87 subject because changing that file would change the frozen evaluator. For this successor run, authoritative subject identity comes from workflow hash checks plus the successor result receipt.

## Successor subject

- semantic repair commit: `fa6039567d543ef8c9009e0a4ffdfdc1dd97281f`
- dispatch blob: `d711f05000eb46ed4b0763c1c0bd73056d3d3073`
- protected PR #86 baseline: `6cdb59c2ba41779ac954af56dd077574ba090013`
- protected parent-bound ingress blob: `83ab34bce30f874111500ed91f2c01421be9f9a0`
- protected V1 materializer blob: `1562fb29da6679a0cf894e478cbdd4ae16e21a18`
- protected V1 policy blob: `2225f73eb6eefd83609f0ba19e4786d1267dd527`

No semantic source change is permitted during this requalification.

## Acceptance

The unchanged PR #88 pressure test must produce no falsifiers or apparatus errors. The PR #87 phase-A controls must pass. The weak-control effect mutation must still be rejected. Ordinary Decision Engine regressions must pass.

If those observations hold, the allowed research disposition is `SUPPORTED FOR PROMOTION` for this bounded dispatch boundary only.

## Non-claims

No Contract D registration, Contract E, ERS readiness, Authorization, execution, release, merge, or production promotion is authorized by this requalification.
