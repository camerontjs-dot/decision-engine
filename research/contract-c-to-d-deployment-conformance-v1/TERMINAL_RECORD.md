# Contract C → Decision → Contract D deployment conformance v1

Status: **TERMINAL — SUPPORTED FOR BOUNDED OPERATIONAL INVOCATION; NO PRODUCTION SURFACE PROMOTION**

Issue: #31

## Question

Can the already-promoted `decideContractCToContractD` production implementation be invoked from a file-oriented, non-mutating caller in a GitHub-hosted runtime while preserving its exact Contract C authority, Contract B binding, explicit decision context, and Contract D boundary requirements?

This unit does not ask whether a new CLI/public API should be promoted. It tests the remaining deployment assumption for the existing maintained API.

## Frozen execution aperture

- Decision Engine production base: `9f5ffc04a0184abe44dc49509058a7ff88893e30`
- scientific run head: `65ddf8944573c4c526c25b10a48e55a2ea03a859`
- CAL producer commit: `53f0885b111676794d1bd20e10b91aa58b07e9d4`
- exact Contract B handoff: `213ed9e912b922bd5c57ef58009eb6b0d7fff398`
- Contract C 1.0.0 release commit: `5fe55f9ed5d0ee9f026ca1b077e9d70ce0487ea1`
- Contract C tag object: `6bd135a948e407212b2e77ec18ac5c402f93565e`
- Contract C validator blob: `9c75ccfbf2223578a8d1a7bf0c39673b394fbea4`
- Contract D 1.0.0 release commit: `298a1a0f7b7b6d7712e11200d04faec3e1ca169b`
- Contract D tag object: `6eadd688b482f3c9fce2ce5e7a2841089d852096`

No Decision semantic implementation file changed from the production base. The research aperture added only the file-oriented caller and its conformance workflow/record.

## Accepted run

- workflow run: `33468925365`
- job: `99734485392`
- conclusion: `SUCCESS`
- artifact: `9785829118`
- artifact digest: `sha256:9e2b1d2827239dba3e10929e9debd4f04180c4ce5512df72638d9705fb01fa12`
- artifact retention expiry reported by GitHub: 2026-11-30

## Observed evidence

1. The exact current CAL producer commit ran from the reconstructed frozen Contract B input and emitted Contract C bytes byte-identical to the released Contract C canonical fixture for that input.
2. The released Contract C validator accepted the emitted bytes with whole-object binding and released Contract B index validation.
3. Caller authority inputs were not reflected out of Contract C:
   - expected Contract B was constructed from the reconstructed Contract B manifest;
   - proposition target identity/content hash was constructed from the source claim exposed by the CAL Contract B adapter;
   - policy identity was explicit caller context.
4. The file-oriented caller successfully invoked unchanged `decideContractCToContractD` with the exact released Contract C authority checkout.
5. Caller-boundary negative controls were all caught:
   - substituted Contract B → `contract_b_binding_mismatch`;
   - same target id with substituted target content hash → `target_binding_mismatch`;
   - substituted expected whole-object Contract C digest → `contract_c_whole_object_mismatch`.
6. The emitted Contract D object passed the released Contract D validator/consumer authority.
7. The selected real proposition (`clm-txt`) preserved its observed adverse state. The Decision was `completed/hold`; the canonical Contract D consumer outcome was `hold`.
8. No external mutation occurred and no Authorization was established.

Accepted receipt values:

- Contract C SHA-256: `sha256:7a66583e332be4901d13ba9f2d7e12419938c77a41b83223a4b0946ad529b7a1`
- expected Contract B:
  - version: `1.2.0`
  - bundle id: `85f8f6dc-f46f-5efa-b7e7-6e049da84591`
  - bundle hash: `sha256:a40fe687c19944248fe77d044801dca02bba56259198b297b897f6a5a304f2fa`
- target: `clm-txt`
- target content SHA-256: `sha256:09bd2d4cf1493718fdf2d130ff37c3aee30f38836009c01560409e6642fe7f9f`
- observed disposition: `hold`
- canonical Contract D consumer outcome: `hold`

## Alternative explanations / strongest assumption

The successful result could be overread as proving arbitrary deployment compatibility. It does not. The run proves one concrete runtime shape: GitHub-hosted Ubuntu with Node 22, Python 3.11, a local exact apparatus-contracts authority checkout, and the pinned current CAL producer commit against one exact frozen Contract B input.

The strongest remaining operational assumption is deployment packaging/provisioning of those exact authority artifacts and the independently sourced bindings. This run proves that supplying them works; it does not establish how every future host will distribute or attest them.

The run also selected the existing real `clm-txt` proposition and accepted its actual HOLD result. It did not choose or mutate evidence to force CLEAR. CLEAR reachability remains covered by the already-promoted semantic conformance evidence, not by this deployment unit.

## Falsifier result

The stated falsifier did not fire. The maintained API was invokable without weakening canonical validation or any authority binding. All three boundary-substitution controls failed closed.

## Promotion decision

**Do not promote the research caller as a new production interface.**

The evidence resolves the deployment assumption for the existing maintained API. Promoting a CLI/public wrapper now would create a new interface commitment without an observed production consumer that requires that interface. The smallest justified production code change remains none.

## Preserved limitations / nonclaims

This result does not establish or authorize:

- arbitrary CAL inputs or every deployment host;
- a stable public CLI, service, package, or network API;
- Contract E;
- Authorization or execution;
- actor, delegation, approval, autonomy, or trust semantics;
- external or MainFrame mutation;
- CAL RC1A receipt promotion;
- generalized policy configuration;
- Gate or Select/Rank replacement;
- repair of upstream Contract C reachability limitations.

The existing current-CAL `partially_supported` / `numeric_mismatch` exportability limitation remains upstream and unchanged.

## Disposition

**SUPPORTED.** The promoted bounded Contract C 1.0.0 → Decision → Contract D 1.0.0 slice is operationally invokable in the tested runtime shape with exact authority and binding inputs. No additional production surface is justified by this unit.
