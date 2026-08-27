# Results 01: Contract C seam shadow

**Status:** structural shadow passed; real CAL/Contract-B conformance still required  
**Branch:** `research/contract-c-seam-shadow`  
**Initial certified workflow run:** GitHub Actions `33036962596`

## Observed CI result

The branch workflow completed successfully.

Successful steps included:

- parsing `src/auditDecisionEngine.js`;
- Contract-C metamorphic and policy checks;
- the existing engine invariant sweep;
- the existing output-quality sweep;
- the existing combination-matrix sweep;
- the existing Gate-head tests.

This establishes that the experimental audit-policy surface can coexist with the current public Career Decision Engine without changing its existing implementation path.

## What the shadow established

### S1. Minimal lineage can be preserved without exposing raw CAL telemetry

The RC0 projection retains:

- C-B bundle identity/hash;
- exact claim ID/text/hash;
- CAL/rules/config identity;
- final audit support state;
- flags, citation state, confidence, unknowns;
- decision-basis identity;
- CAL result identity.

The projection deliberately ignores research-fixture fields representing raw retrieval scores, NLI logits, and support-probability telemetry.

### S2. Incidental telemetry is non-controlling in the shadow

Mutating the fixture's retrieval score, raw logits, and best-entail telemetry left the canonical Contract-C projection unchanged.

Changing free-form rule explanation prose while retaining the same material rule ID also left the projection unchanged.

This supports the candidate seam:

> downstream policy should depend on audit state, not incidental implementation telemetry.

### S3. Decision-relevant mutations remain visible

Mutating each of the following changed the Contract-C projection:

- support verdict;
- audit flags;
- citation status;
- explicit unknown state;
- upstream C-B bundle identity;
- claim identity.

This is the complementary property required by S2: irrelevant detail is hidden, material state is not.

### S4. Abstention remains first-class

`not_checkable` without an explicit reason fails closed in the research adapter.

A valid `not_checkable` result is mapped by the shadow destination policy to `retain_synthesized`, preserving the abstention reason rather than converting missing support into a favorable or adverse default.

### S5. The audited claim is not laundered

An `overstated` flag blocks the claim **as written** under the shadow policy.

The decision layer does not weaken or rewrite proposition text in order to produce a passing result.

### S6. MainFrame authority remains downstream

Even the strongest positive shadow result is only:

```text
promotion_candidate
```

The receipt records:

```text
operatorRequired: true
mainframeStatusMutation: null
```

The decision layer therefore cannot turn a model/audit result directly into a `stable` MainFrame note.

### S7. Replay is deterministic in the structural test

Identical audit state plus identical policy produced the same canonical decision receipt.

No clock, random input, model call, retrieval call, or hidden state participates in the shadow decision path.

## Current shadow policy

RC0 is intentionally conservative and exists to exercise the seam, not to assert the final MainFrame policy.

- `supported` + high audit confidence + acceptable citation + no unresolved state/flags → `promotion_candidate`;
- `partially_supported` → `human_review_required`;
- `not_checkable` → `retain_synthesized`;
- `unsupported` or `contradicted` → `blocked`;
- blocking audit flags such as `overstated` → `blocked`;
- review-only states such as `inferred` → `human_review_required`.

Every path remains non-destructive.

## What is supported by this result

**Supported structural candidate:** a minimal CAL → Decision Engine Contract-C surface can be smaller than the implementation-rich CAL trace while retaining the state exercised by the current downstream policy.

**Supported boundary:** CAL audit state can remain distinct from downstream destination policy.

**Supported MainFrame safety property:** the destination policy can stop at a promotion candidate and preserve a separate operator/lifecycle gate.

## What is not established

This test did **not** use a real CAL-produced Contract-C artifact.

It has not established:

- that RC0 contains every state a real CAL audit will need downstream;
- that the candidate decision-basis representation matches the eventual Contract-B/CAL assessment receipt shape;
- that `audit_confidence` should remain a long-term destination-policy input;
- that the shadow policy thresholds are correct;
- that a real MainFrame note/source fixture can traverse the whole chain;
- that Contract C is ready to lock or version.

## Next discriminating experiment

Run the real chain with one frozen case:

```text
MainFrame synthesized note + preserved raw/source material
    → Evidence Bundler
    → Contract-B candidate
    → apparatus validation
    → real CAL audit
    → Contract-C RC0 projection
    → Decision Engine
    → decision receipt
```

Compare the minimal C-C input against the full CAL result package.

The candidate survives only if both produce the same legitimate downstream disposition while the minimal representation remains independent of irrelevant CAL implementation telemetry.

## Current disposition

- **ADOPT for further testing:** Contract C is the CAL → Decision Engine seam.
- **ADOPT for further testing:** exact claim/C-B/CAL-result lineage crosses C-C.
- **ADOPT for further testing:** audit verdict/flags/citation/unknowns remain separate from destination policy.
- **ADOPT for further testing:** no automatic MainFrame lifecycle mutation.
- **DO NOT LOCK:** run the real cross-repository conformance path first.
- **DO NOT PROPAGATE:** the old single-axis apparatus audit vocabulary into C-C.
