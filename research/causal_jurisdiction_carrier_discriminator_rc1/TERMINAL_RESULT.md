# Causal Jurisdiction Carrier Discriminator RC1 — Terminal Result

Date: 2026-09-18

Classification: Draft Research / downstream jurisdiction-carrier discriminator.

## Lineage

- exact Decision C2 integration parent: `b1bcc33e2b5ef0707b8cbf7dd8e821b2d34d1b55`
- exact Contract C2 authority: `b42c827acb0a9fe65353354d709add0e27bab307`
- information-gap trigger: Decision PR #82, run `35362333971`
- evaluator-invalid predecessor: Decision PR #83

RC0 #83 is preserved as `INCONCLUSIVE_EVALUATOR_INVALID`: it defined ten hostile controls but asserted nine after candidate exposure.

## Fresh RC1 freeze

- pre-candidate apparatus head: `2ed3e7502d815a4b1ae754cf69596e5dc899b58c`
- pre-candidate run: `35363219456`
  - exact Decision source isolation: PASS
  - exact C2 authority: PASS
  - weak unbound-routing discriminator: PASS
  - candidate import: absent as intended
- exact exposed candidate: `fdfd73070e862c2dcbb3acb2408cce88119c47fc`
- decisive run: `35363332966`
- decisive job: `105659688779`
- result: PASS

## Disposition

**SUPPORTED_EXTERNALLY_BOUND_CAUSAL_JURISDICTION_CARRIER_RC1.**

The frozen weak strategy showed that an unbound caller-supplied jurisdiction label is not authority: the same causal-assertion subject can simply be relabeled `ordinary_categorical_support` and routed into the generic supported-claim policy.

The qualified RC1 candidate instead requires exact jurisdiction-manifest bytes plus an independently supplied expected manifest digest.

## Clean behavior

Ordinary categorical support:

- exact Contract C2 ingress passes;
- exact manifest binds the C2 whole-object SHA, proposition ID, and proposition content hash;
- jurisdiction is `ordinary_categorical_support`;
- route = `generic_supported_claim`;
- maintained supported-claim Decision remains `CLEAR`.

Explicit-source-causal-assertion support:

- exact Contract C2 ingress passes;
- exact manifest binds the same authority dimensions;
- jurisdiction is `explicit_source_assertion_only`;
- route = `dedicated_causal_required`;
- no generic supported-claim Decision is emitted through the gated path.

## Hostile controls

All 10 frozen attacks were rejected:

1. causal relabeled ordinary;
2. ordinary relabeled causal;
3. wrong manifest digest;
4. stale manifest from another exact C2 object;
5. wrong Contract C2 binding;
6. wrong proposition ID;
7. wrong proposition content hash;
8. unknown jurisdiction;
9. extra manifest field;
10. missing manifest.

Observed rejected count: `10/10`.

## Authority boundary

The decisive property is not the manifest field name. It is the external authority binding:

- exact manifest bytes;
- independently expected manifest SHA-256;
- exact Contract C2 whole-object binding;
- exact proposition ID/hash binding;
- closed jurisdiction vocabulary.

If the same untrusted caller can replace both manifest bytes and the independently expected digest, this protection collapses. RC1 therefore establishes a bounded representation strategy, not a self-authenticating sidecar.

## Architecture consequence

This result shows that widening Contract C is **not yet necessary** to close the specific downstream causal-jurisdiction information gap.

A separately bound immutable jurisdiction artifact is sufficient under the tested authority model.

That does not make the external artifact the preferred production architecture. It introduces another authority object whose issuer, lifecycle, supersession, and producer conformance would need independent qualification.

## Non-events

- no raw proposition-text interpretation;
- no causal inference;
- no maintained Decision `src/` mutation;
- no Contract C change;
- no Authorization;
- no operational execution.

## Next boundary

Before selecting external-manifest architecture, establish who can legitimately issue the jurisdiction authority without making a second semantic judgment.

Because the explicit causal family is still research machinery rather than a production CAL plugin, producer conformance is premature until one family/module is selected for runtime promotion.

The next programme step should therefore reconcile the now-complete family/composition campaign and choose the smallest family/module promotion candidate for runtime/plugin/compiler/full-pipeline conformance. Causal promotion must retain this downstream jurisdiction gate.

No merge, release, production policy change, Contract C change, Authorization, or execution is authorized.
