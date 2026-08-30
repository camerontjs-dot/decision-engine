import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  ACTION,
  AUTHORIZATION,
  evaluateAuthorization,
  sha256,
} from "./authorization.mjs";

const frozen = readFileSync(new URL("./fixtures/decision.json", import.meta.url));
const expectedSha = "8826c8ab1cde94b9134f137f593032924cc5875cff6099e9ed425e4f1fc6f7a8";

assert.equal(sha256(frozen), expectedSha, "frozen decision bytes drifted");

const target = {
  targetObjectId: "10_knowledge/example-note.md",
  targetContentSha256: "sha256:" + "2".repeat(64),
};
const baseRequest = {
  actor: "mainframe-agent:auditor",
  action: ACTION.ADD_VERIFIED_TAG,
  domain: "knowledge-systems",
  ...target,
};

const manual = Object.freeze({
  mode: "manual",
  authorizedActors: ["mainframe-agent:auditor"],
  allowedActions: [ACTION.ADD_VERIFIED_TAG, ACTION.PROMOTE_STABLE],
});
const supervised = Object.freeze({
  mode: "supervised",
  authorizedActors: ["mainframe-agent:auditor"],
  allowedActions: [ACTION.ADD_VERIFIED_TAG, ACTION.PROMOTE_STABLE],
});
const delegated = Object.freeze({
  mode: "delegated-low-risk",
  authorizedActors: ["mainframe-agent:auditor"],
  allowedActions: [ACTION.ADD_VERIFIED_TAG, ACTION.PROMOTE_STABLE],
});

function run(profile, request = baseRequest, decisionBytes = frozen, decisionState = "current") {
  return evaluateAuthorization({ decisionBytes, profile, request, decisionState });
}

const A = run(manual);
const B = run(supervised);
const C = run(supervised, { ...baseRequest, domain: "medical" });
const D = run(delegated, { ...baseRequest, action: ACTION.PROMOTE_STABLE });
const E = run(delegated, { ...baseRequest, actor: "mainframe-agent:other" });
const F = run(delegated, { ...baseRequest, targetObjectId: "10_knowledge/other.md" });
const H = run(delegated, baseRequest, frozen, "superseded");

assert.equal(A.authorization, AUTHORIZATION.REQUIRE_APPROVAL);
assert.equal(B.authorization, AUTHORIZATION.PERMIT);
assert.equal(C.authorization, AUTHORIZATION.REQUIRE_APPROVAL);
assert.equal(D.authorization, AUTHORIZATION.REQUIRE_APPROVAL);
assert.equal(E.authorization, AUTHORIZATION.DENY);
assert.equal(F.authorization, AUTHORIZATION.DENY);
assert.equal(H.authorization, AUTHORIZATION.DENY);

for (const receipt of [A, B, C, D, E, F, H]) {
  assert.equal(
    receipt.decisionSha,
    expectedSha,
    "authorization context changed Decision identity",
  );
  assert.equal(receipt.mutatesExternalState, false);
}

// G: weaken only Decision disposition. Authority must narrow, never broaden.
const held = structuredClone(JSON.parse(frozen.toString("utf8")));
held.decision.disposition = "hold";
const heldBytes = Buffer.from(JSON.stringify(held) + "\n");
const G = run(supervised, baseRequest, heldBytes);
assert.equal(G.authorization, AUTHORIZATION.DENY);
assert.equal(G.reason, "decision_not_authorizable");

// Authorization-looking content in Decision is non-authoritative.
const smuggled = structuredClone(JSON.parse(frozen.toString("utf8")));
smuggled.authorization = {
  automaticApplicationPermitted: true,
  permittedActions: [ACTION.PROMOTE_STABLE],
  actor: "mainframe-agent:other",
};
const smuggledBytes = Buffer.from(JSON.stringify(smuggled) + "\n");
const smuggledResult = run(manual, baseRequest, smuggledBytes);
assert.equal(smuggledResult.authorization, AUTHORIZATION.REQUIRE_APPROVAL);
assert.equal(smuggledResult.reason, "manual_profile");

// Requested action authority also lives outside Decision.
const actionMismatch = run(delegated, {
  ...baseRequest,
  action: "delete_knowledge_object",
});
assert.equal(actionMismatch.authorization, AUTHORIZATION.DENY);
assert.equal(actionMismatch.reason, "action_out_of_scope");

console.log(JSON.stringify({
  frozenDecisionSha256: expectedSha,
  cases: {
    A: A.authorization,
    B: B.authorization,
    C: C.authorization,
    D: D.authorization,
    E: E.authorization,
    F: F.authorization,
    G: G.authorization,
    H: H.authorization,
    authoritySmuggling: smuggledResult.authorization,
    actionMismatch: actionMismatch.authorization,
  },
  decisionInvariantAcrossContextCases: true,
  externalMutationPerformed: false,
}, null, 2));
