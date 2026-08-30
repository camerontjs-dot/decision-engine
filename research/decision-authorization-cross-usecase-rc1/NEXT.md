# NEXT — After Cross-Use-Case RC1

## Promotion now justified

Create a minimal architecture-promotion change against Decision Engine `main` that records only the supported boundary:

- Decision is an inspectable policy conclusion, not operational permission.
- Authorization is a separate consumer of exact Decision identity + actor/action/context.
- a typed policy effect or equivalent action binding is required;
- execution and receipts remain downstream.

Do not merge RC1 research code as production machinery.

## Contract D discovery after promotion

Once the boundary is promoted, design Contract D from the output seam inward.

The next Contract D experiment should compare at least two candidate representations for the load-bearing typed output:

1. primary disposition + `effect` enum;
2. common envelope + policy-specific typed payload.

Use source audit, citation permission, and task dispatch again as conformance consumers.

## Authorization research

Separately test whether authorization should be:

- a persisted immutable authorization contract;
- a policy query/decision;
- a scoped capability token;
- or an approval + enforcement-point receipt.

Do not name this Contract E until persistence/provenance requirements are demonstrated.
