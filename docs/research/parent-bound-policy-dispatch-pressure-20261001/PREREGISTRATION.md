# Parent-bound policy dispatch pressure test

**Status:** preregistration. No result is recorded here.

## Decision

Determine whether the exact PR #87 policy-dispatch candidate can support the bounded claim that:

1. the caller selects only a maintained policy identity and version;
2. the selected policy, not caller-supplied data, owns the emitted effect;
3. unsupported or ambiguous selection fails before a Decision is emitted; and
4. the emitted policy/effect relationship is reconstructable from frozen identities and receipts.

This experiment does not decide ERS readiness, Contract D registration, Contract E, Authorization, or execution.

## Frozen subject

- parent baseline: Decision Engine PR #86 commit `6cdb59c2ba41779ac954af56dd077574ba090013`
- policy-dispatch candidate: PR #87 commit `816374379ba7eb23f5bfdadaf203b7e287c052db`
- policy-dispatch blob: `9948b0dba9f77d2ad7c71d74b27d2684985ecc70`

Protected bytes must remain unchanged:

- `src/parentBoundContractCDecision.js` blob `83ab34bce30f874111500ed91f2c01421be9f9a0`
- `src/decisionMaterializer.js` blob `1562fb29da6679a0cf894e478cbdd4ae16e21a18`
- `src/contractCDecision.js` blob `2225f73eb6eefd83609f0ba19e4786d1267dd527`
- `scripts/decision-engine-parent-bound-evaluate.mjs` blob `4e5a85aa1179e815b5e23e6524e2b2a314aab7d0`

The decisive run must test the frozen PR #87 dispatch blob. Test or workflow changes made in this successor branch are apparatus only.

## External authorities

Use the same frozen parent-bound Contract C / consumer / Contract D authorities as the qualified PR #86 lane. Exact identities must be checked before the decisive test executes.

## Controls

### Positive / parity controls

For PIPE01, PIPE02, and PIPE03:

- the existing supported-claim policy must remain byte/structure equivalent to the frozen parent-bound Decision result where that equality is already claimed;
- the ERS staging policy must emit only its maintained effect;
- repeated evaluation of the same frozen inputs must be deterministic.

### Caller-smuggling controls

The candidate must emit no Decision when the caller supplies or attempts to encode:

- an effect at the decision-context, policy, or target level;
- a requested operation at the decision-context, policy, or target level;
- an unknown policy id;
- a wrong policy version;
- case/whitespace/confusable policy-id variants;
- duplicate CLI policy/effect/request-operation flags;
- extra policy or target fields.

### In-process object-semantics controls

Because `decideParentBoundPolicy` accepts JavaScript objects directly, test whether dynamic caller objects can change trusted state after validation:

- accessor/proxy-backed policy identity;
- accessor/proxy-backed target fields that change across reads;
- inherited policy-registry names such as `__proto__` and `constructor`;
- inherited registry state under controlled prototype pollution.

A caller-controlled object must not cause the emitted target or effect to differ from the exact state that passed binding checks.

### Reconstruction control

For every emitted Decision:

- the emitted policy id/version must resolve to exactly one maintained policy in the frozen candidate;
- the emitted effect must equal that policy's frozen effect exactly;
- the receipt must pin the Decision Engine commit, dispatch blob, policy id/version, effect, Contract C identity, and target identity.

### Weak-control discriminator

Create an ephemeral test-only copy of the dispatch implementation in which the ERS policy effect is changed while its policy id/version remain unchanged. The pressure-test apparatus must reject that weak implementation for a policy/effect ownership mismatch.

If this weak control passes, the apparatus is not discriminating enough for the reconstruction claim.

## Falsifiers

The bounded claim is falsified if any of the following occurs:

- caller-supplied effect/request-operation data reaches an emitted Decision;
- unsupported or inherited policy selection emits a Decision;
- a dynamic caller object changes the emitted target after the candidate's binding check;
- an emitted effect cannot be reconstructed exactly from the frozen maintained policy identity;
- the same frozen inputs produce different Decision bytes/state;
- the weak-control effect mutation passes the decision gate;
- any protected PR #86 or released V1 byte must change to make the candidate pass.

## Allowed dispositions

- `SUPPORTED FOR PROMOTION`
- `FALSIFIED`
- `INCONCLUSIVE`

A supported result applies only to this frozen policy-dispatch boundary. It does not authorize Contract D registration, Contract E, Authorization, execution, or an ERS production path.

## Stop

Do not repair the frozen PR #87 dispatch implementation after observing a decisive failure in this run. Preserve the failure and open a separately identified successor if a corrected implementation is scientifically warranted.
