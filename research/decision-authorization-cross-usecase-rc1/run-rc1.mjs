import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  AUTHORIZATION,
  conformsCommonEnvelope,
  evaluateAuthorization,
  sha256,
  weakDispositionOnlyAuthorization,
} from "./authorization.mjs";

const fixtures = {
  source: {
    bytes: readFileSync(new URL("./fixtures/source-audit.json", import.meta.url)),
    sha: "599945c366c0dfb806afc3bed5be57d5e5fbff62cc1d220077b7caf56e72fe91",
  },
  citation: {
    bytes: readFileSync(new URL("./fixtures/citation.json", import.meta.url)),
    sha: "11c5e39e18a27f07d1f7b9f7b0e0cef2950a73e6d1adf8af65c781173fd2b895",
  },
  task: {
    bytes: readFileSync(new URL("./fixtures/task-dispatch.json", import.meta.url)),
    sha: "9115ff9868101d9e53c2c721901357a4677051029d1f1621233425a05f3c8e9e",
  },
};

for (const fixture of Object.values(fixtures)) {
  assert.equal(sha256(fixture.bytes), fixture.sha, "frozen Decision specimen drifted");
  assert.equal(
    conformsCommonEnvelope(JSON.parse(fixture.bytes.toString("utf8"))),
    true,
    "specimen failed common envelope",
  );
}

const currentManual = Object.freeze({
  mode: "current-mainframe-manual",
  authorizedActors: ["mainframe-agent:auditor", "mainframe-agent:researcher"],
});
const delegatedLowRisk = Object.freeze({
  mode: "research-delegated-low-risk",
  authorizedActors: ["mainframe-agent:auditor", "mainframe-agent:researcher"],
});

function targetOf(bytes) {
  const d = JSON.parse(bytes.toString("utf8"));
  return {
    targetObjectId: d.target.object_id,
    targetContentSha256: d.target.content_sha256,
  };
}

function run(fixture, request, profile = currentManual, decisionState = "current") {
  return evaluateAuthorization({
    decisionBytes: fixture.bytes,
    request,
    authorizationProfile: profile,
    decisionState,
  });
}

const sourceBase = {
  actor: "mainframe-agent:auditor",
  action: "add_verified_tag",
  domain: "knowledge-systems",
  humanApproval: false,
  ...targetOf(fixtures.source.bytes),
};
const citationBase = {
  actor: "mainframe-agent:researcher",
  action: "cite_as_evidence",
  humanApproval: false,
  ...targetOf(fixtures.citation.bytes),
};
const taskBase = {
  actor: "mainframe-agent:auditor",
  action: "dispatch_task",
  humanApproval: false,
  ...targetOf(fixtures.task.bytes),
};

// Source-audit: same Decision, operational authority varies.
const S1 = run(fixtures.source, sourceBase);
const S2 = run(fixtures.source, { ...sourceBase, humanApproval: true });
const S3 = run(fixtures.source, sourceBase, delegatedLowRisk);
const S4 = run(fixtures.source, { ...sourceBase, domain: "medical" }, delegatedLowRisk);
const S5 = run(fixtures.source, { ...sourceBase, action: "promote_stable" });
const S6 = run(fixtures.source, { ...sourceBase, targetObjectId: "10_knowledge/other.md" });

assert.equal(S1.authorization, AUTHORIZATION.REQUIRE_APPROVAL);
assert.equal(S2.authorization, AUTHORIZATION.PERMIT);
assert.equal(S3.authorization, AUTHORIZATION.PERMIT);
assert.equal(S4.authorization, AUTHORIZATION.REQUIRE_APPROVAL);
assert.equal(S5.authorization, AUTHORIZATION.DENY);
assert.equal(S6.authorization, AUTHORIZATION.DENY);

// Citation: citable Decision permits only its typed citation effect.
const C1 = run(fixtures.citation, citationBase);
const C2 = run(fixtures.citation, { ...citationBase, action: "mutate_knowledge_status" });
const C3 = run(fixtures.citation, { ...citationBase, targetObjectId: "mindgraph:result:other" });

assert.equal(C1.authorization, AUTHORIZATION.PERMIT);
assert.equal(C2.authorization, AUTHORIZATION.DENY);
assert.equal(C3.authorization, AUTHORIZATION.DENY);

const heldCitation = structuredClone(JSON.parse(fixtures.citation.bytes.toString("utf8")));
heldCitation.decision.disposition = "hold";
const heldCitationBytes = Buffer.from(JSON.stringify(heldCitation) + "\n");
const C4 = evaluateAuthorization({
  decisionBytes: heldCitationBytes,
  request: citationBase,
  authorizationProfile: currentManual,
});
assert.equal(C4.authorization, AUTHORIZATION.DENY);

// Task dispatch: reviewed eligibility still needs separate operator approval.
const T1 = run(fixtures.task, taskBase);
const T2 = run(fixtures.task, { ...taskBase, humanApproval: true });
const T3 = run(fixtures.task, { ...taskBase, actor: "mainframe-agent:researcher" }, {
  ...currentManual,
  authorizedActors: ["mainframe-agent:auditor"],
});
const T4 = run(fixtures.task, { ...taskBase, targetObjectId: "other-task" });
const T5 = run(fixtures.task, taskBase, currentManual, "superseded");

assert.equal(T1.authorization, AUTHORIZATION.REQUIRE_APPROVAL);
assert.equal(T2.authorization, AUTHORIZATION.PERMIT);
assert.equal(T3.authorization, AUTHORIZATION.DENY);
assert.equal(T4.authorization, AUTHORIZATION.DENY);
assert.equal(T5.authorization, AUTHORIZATION.DENY);

// Every context-only variant must preserve the exact frozen specimen identity.
for (const [expectedSha, receipts] of [
  [fixtures.source.sha, [S1, S2, S3, S4, S5, S6]],
  [fixtures.citation.sha, [C1, C2, C3]],
  [fixtures.task.sha, [T1, T2, T3, T4, T5]],
]) {
  for (const receipt of receipts) {
    assert.equal(receipt.decisionSha, expectedSha);
    assert.equal(receipt.mutatesExternalState, false);
  }
}

// Cross-use-case effect substitution: same target identity, wrong action.
// Strong consumer must deny because Decision effect is typed.
const citationAsDispatchRequest = {
  ...citationBase,
  action: "dispatch_task",
};
const strongCross1 = run(fixtures.citation, citationAsDispatchRequest);
assert.equal(strongCross1.authorization, AUTHORIZATION.DENY);
assert.equal(strongCross1.reason, "action_effect_mismatch");

const taskAsVerifiedRequest = {
  ...taskBase,
  action: "add_verified_tag",
};
const strongCross2 = run(fixtures.task, taskAsVerifiedRequest);
assert.equal(strongCross2.authorization, AUTHORIZATION.DENY);
assert.equal(strongCross2.reason, "action_effect_mismatch");

// Weak disposition-only control fails those same attacks by permitting them.
const weakCross1 = weakDispositionOnlyAuthorization({
  decisionBytes: fixtures.citation.bytes,
  request: citationAsDispatchRequest,
});
const weakCross2 = weakDispositionOnlyAuthorization({
  decisionBytes: fixtures.task.bytes,
  request: taskAsVerifiedRequest,
});
assert.equal(weakCross1.authorization, AUTHORIZATION.PERMIT);
assert.equal(weakCross2.authorization, AUTHORIZATION.PERMIT);

// Remove the typed effect: strong consumer must refuse.
const noEffect = structuredClone(JSON.parse(fixtures.citation.bytes.toString("utf8")));
delete noEffect.decision.effect;
const noEffectResult = evaluateAuthorization({
  decisionBytes: Buffer.from(JSON.stringify(noEffect) + "\n"),
  request: citationBase,
  authorizationProfile: currentManual,
});
assert.equal(noEffectResult.authorization, AUTHORIZATION.DENY);
assert.equal(noEffectResult.reason, "decision_shape_invalid");

// Authority smuggling makes the common envelope invalid; it cannot grant.
const smuggled = structuredClone(JSON.parse(fixtures.source.bytes.toString("utf8")));
smuggled.actor = "mainframe-agent:auditor";
smuggled.authorizationProfile = "fully-autonomous";
smuggled.automaticApplicationPermitted = true;
const smuggledResult = evaluateAuthorization({
  decisionBytes: Buffer.from(JSON.stringify(smuggled) + "\n"),
  request: sourceBase,
  authorizationProfile: currentManual,
});
assert.equal(smuggledResult.authorization, AUTHORIZATION.DENY);
assert.equal(smuggledResult.reason, "decision_shape_invalid");

console.log(JSON.stringify({
  commonEnvelopeConformance: {
    sourceAudit: true,
    citationPermission: true,
    taskDispatch: true,
  },
  sourceAudit: {
    manual: S1.authorization,
    approved: S2.authorization,
    delegatedLowRisk: S3.authorization,
    delegatedHighRisk: S4.authorization,
    wrongAction: S5.authorization,
    wrongTarget: S6.authorization,
  },
  citationPermission: {
    citable: C1.authorization,
    wrongAction: C2.authorization,
    wrongTarget: C3.authorization,
    weakenedDecision: C4.authorization,
  },
  taskDispatch: {
    pendingApproval: T1.authorization,
    approved: T2.authorization,
    wrongActor: T3.authorization,
    wrongTarget: T4.authorization,
    supersededDecision: T5.authorization,
  },
  crossUseCase: {
    strongCitationAsDispatch: strongCross1.authorization,
    weakCitationAsDispatch: weakCross1.authorization,
    strongTaskAsVerified: strongCross2.authorization,
    weakTaskAsVerified: weakCross2.authorization,
  },
  authoritySmuggling: smuggledResult.authorization,
  missingEffect: noEffectResult.authorization,
  externalMutationPerformed: false,
}, null, 2));
