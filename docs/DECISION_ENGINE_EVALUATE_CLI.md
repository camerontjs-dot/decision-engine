# Decision Engine evaluate invocation surface

**Status:** stacked engineering candidate. This surface depends on the two-policy promotion candidate and does not authorize release, Authorization, execution, or mutation.

## Purpose

The invocation surface exposes the smallest demonstrated common Decision Engine runtime boundary:

1. exact Contract C bytes and immutable whole-object identity enter through the shared Contract C ingress;
2. one exact Decision policy implementation is selected by explicit ID/version;
3. policy-specific context and target binding remain inside that policy;
4. the resulting Decision is validated and canonicalized using the exact released Contract D 1.0.0 authority;
5. canonical Contract D bytes are emitted to stdout.

The runtime is an explicit two-case dispatch, not a policy framework.

## Library API

`src/contractCDecisionRuntime.js` exports:

```text
evaluateContractCDecision(options)
```

`options` is the same exact authority/context input accepted by the maintained policy functions and includes `decisionContext.policy.id` and `decisionContext.policy.version`.

The runtime recognizes only:

- `decision-engine.contract-c.supported-claim-verification@1.0.0`
- `decision-engine.contract-c.causal-basis-citation@1.0.0`

Unknown policy identity fails closed. The runtime does not own target or disposition semantics.

## CLI

```text
node scripts/decision-engine-evaluate.mjs \
  --contract-c <path> \
  --contract-c-sha256 <sha256:...> \
  --contract-c-authority <exact Contract C 1.0.0 checkout> \
  --contract-d-authority <exact Contract D 1.0.0 checkout> \
  --expected-contract-b <JSON path> \
  --policy <id@version> \
  --context <policy-specific JSON path> \
  [--python <python executable>]
```

`--expected-contract-b` contains exactly the expected Contract B binding:

```json
{
  "contract_version": "1.2.0",
  "bundle_id": "...",
  "bundle_hash": "sha256:..."
}
```

`--context` intentionally omits the policy identity because policy is supplied separately and explicitly by `--policy`.

Supported-claim context shape:

```json
{
  "proposition_id": "...",
  "target": {
    "kind": "claim",
    "id": "...",
    "content_sha256": "sha256:..."
  }
}
```

Causal-basis citation context shape:

```json
{
  "proposition_id": "...",
  "contribution_id": "contribution:...",
  "target": {
    "kind": "claim-evidence-link",
    "id": "claim-evidence-link:...",
    "content_sha256": "sha256:..."
  }
}
```

The policy implementations remain the authority for exact context keys and target binding.

## Success output

On success, stdout contains exactly one canonical Contract D 1.0.0 JSON object encoded according to the released Contract D JCS+LF rule.

The CLI verifies the exact Contract D release commit/tag plus the exact `contract_d_core.py` and effect-registry blobs before accepting the output boundary. It then calls the exact released Contract D validator and canonicalizer.

A Decision with `evaluation.state=failed` is still a valid successful Contract D emission and therefore exits zero if Contract C evaluation completed far enough to produce that valid failed Decision.

## Failure output

Invalid authority or context exits nonzero, emits no Decision bytes on stdout, and writes a single machine-readable JSON error object to stderr:

```json
{"status":"error","code":"...","message":"..."}
```

Examples include:

- stale Contract C whole-object hash;
- wrong Contract C or D release authority;
- wrong Contract B binding;
- unsupported policy identity;
- target substitution;
- malformed or duplicate-key JSON context.

The CLI's JSON context reader rejects duplicate object keys and non-finite JSON constants before policy evaluation.

## Contract D consumer boundary

The CLI stops at canonical Contract D output. It does not call the Contract D consumer to decide requested-operation applicability because requested operation belongs to separate downstream Authorization context and is not stored Decision state.

Conformance tests independently run the exact Contract D consumer against emitted outputs to prove expected applicability:

- CLEAR -> `candidate_for_authorization` when exact;
- HOLD -> `hold` when exact;
- failed evaluation -> `evaluation_failed` when exact.

`candidate_for_authorization` remains strictly weaker than Authorization.

## Non-actions

The invocation surface performs no:

- operational Authorization;
- actor selection;
- approval or delegation;
- autonomy/trust decision;
- task dispatch;
- network mutation;
- external knowledge mutation;
- execution;
- execution receipt;
- outcome verification.

The conformance gate verifies that invocation leaves the checked-out repositories' tracked state unchanged.

## Why there is no generic policy registry

Two materially different policies demonstrate only the need to select one exact implementation from explicit policy identity. A switch removes the immediate invocation duplication without hiding policy semantics.

A registry, plugin system, DSL, class hierarchy, generic rule engine, or configuration language would add architecture without removing an observed failure mode, so none is introduced.
