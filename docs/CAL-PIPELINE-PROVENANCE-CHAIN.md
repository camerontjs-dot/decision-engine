# CAL Pipeline Provenance Chain

**Status:** cross-repo architecture pointer / local obligation record. No maintained Decision policy, Contract C/D schema, Authorization, execution permission, release, or production behavior is changed by this document.

## Canonical blueprint

The canonical proposed architecture is maintained in `camerontjs-dot/apparatus-contracts` Draft PR #101:

- `docs/architecture/CAL-PIPELINE-PROVENANCE-CHAIN-BLUEPRINT.md`
- canonical proposal head at this pointer's creation: `d16e5e14cab55ed23bdeee4cdeecf48724c542db`

Apparatus Contracts owns the cross-pipeline blueprint. Decision Engine owns authority admission, target resolution, fixed Decision policy evaluation, Decision projection, Contract D production, and conformance to any later-qualified provenance schema.

## Local requirement

Decision Engine should not re-audit claim semantics. It should be able to establish that the CAL result it is about to act on is bound to the exact upstream evidence world and exact producer authority it claims, then apply the exact Decision policy and produce an auditable Contract D.

### Decision Engine must eventually attest

- exact Contract C/C2 digest as `causal_input`;
- exact independently selected expected upstream B commitment as `authority_input` where participant authority must be verified;
- exact raw/presented B artifact digest used to derive participant authority;
- successful/failed recomputation of the whole-B commitment;
- exact Contract C validator/profile authority;
- exact CAL implementation/policy/resolver authority used to validate producer identity;
- exact Decision Engine implementation identity;
- exact Decision policy implementation, ID and version;
- exact target kind/logical ID/content identity;
- pre-policy provenance/authority verification outcome;
- exact Contract D byte digest and semantic identity;
- final Decision evaluation state/disposition;
- durable locators for reconstruction-required C, B, authority, target and D artifacts;
- explicit non-Authorization boundary.

## Trust-root rule

Decision Engine must not accept a candidate object's own declaration as the sole authority for the commitment used to authenticate that same candidate chain. The research discriminator remains:

```text
independently trusted expected commitment + presented bytes -> meaningful verification
caller-selected expected commitment + caller-presented bytes -> circular and unsafe
```

## Supported narrow mechanism

Current research supports the smaller Contract-B integrity mechanism:

```text
trusted B commitment + presented raw B bytes
  -> recompute whole-bundle commitment
  -> exact equality
  -> derive participant authority
  -> canonical C verification
  -> existing trusted Decision path
```

The artifact locator itself need not be trusted for integrity. Selection of the expected commitment still must be independently bound.

## Decision boundary

Provenance should prove which exact CAL result and authority chain the Decision consumed. It must not reinterpret CAL epistemic meaning, and Contract D remains only a candidate-for-Authorization/hold/evaluation-failure record under its own consumer semantics.

## Nonclaims

This pointer does not qualify a production attestation schema, promote the C2 ingress research path, authorize a dynamic adapter/plugin framework, change Contract D, or authorize any action/execution surface.
