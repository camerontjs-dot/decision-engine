import assert from "node:assert/strict";

export const ORDINARY = "ordinary_categorical_support";
export const CAUSAL_ASSERTION = "explicit_source_assertion_only";

export function weakCallerRoute(jurisdiction) {
  if (jurisdiction === ORDINARY) return "generic_supported_claim";
  if (jurisdiction === CAUSAL_ASSERTION) return "dedicated_causal_required";
  return "reject";
}

assert.equal(weakCallerRoute(ORDINARY), "generic_supported_claim");
assert.equal(weakCallerRoute(CAUSAL_ASSERTION), "dedicated_causal_required");

// Decisive weak-strategy falsifier: the same causal subject can be relabeled by
// an untrusted caller and routed into the generic supported-claim policy.
assert.equal(
  weakCallerRoute(ORDINARY),
  "generic_supported_claim",
  "unbound caller routing is intentionally shown to be relabelable",
);

console.log(JSON.stringify({
  status: "PASS",
  weak_unbound_route_relabelable: true,
  conclusion: "UNBOUND_CALLER_ROUTING_FALSIFIED_AS_AUTHORITY",
}));
