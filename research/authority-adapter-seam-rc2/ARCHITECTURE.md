# Tested authority-adapter architecture

The RC2 result supports this boundary for the tested authority domains:

```text
raw external authority
        ↓
trusted domain authority adapter
        ↓
trusted domain target resolver
        ↓
trusted domain policy semantics
        ↓
unchanged domain-neutral Decision projection
        ↓
exact Contract D
```

## Boundary rule

The common seam begins **after domain-specific authority admission**. Raw upstream artifacts do not share a universal Decision Engine ingress schema.

Adapter selection, adapter implementation, trust roots, target resolution, policy dispatch, and policy implementation are trusted/bound machinery. They are not caller-selected metadata.

## Tested authority domains

- CAL / Contract C2 with independently reconstructed Contract-B evidence-world authority and immutable producer-resolver authority;
- externally Git-bound artifact manifest;
- Ed25519-signed content-addressed authority with a fixed trusted signer and version.

## Deliberately unsupported by RC2

- arbitrary plugins;
- caller-installed adapters or policy implementations;
- a generic raw authority blob;
- treating self-declared hashes as independent authority;
- mutable remote API freshness/revocation semantics;
- a production locator for the exact real CAL Contract-B artifact.

The Contract-B receipt/locator idea remains a possible CAL-adapter mechanism if no stronger existing independent artifact locator is available. It is not part of the generic Decision Engine seam.
