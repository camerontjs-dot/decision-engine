import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

import {
  SUPPORTED_CLAIM_VERIFICATION_POLICY,
  decideContractC2ToContractD,
} from "../../src/contractC2Decision.js";
import {
  gateSupportedClaimByJurisdiction,
} from "./candidate.mjs";

const AUTHORITY_ROOT = process.env.APPARATUS_CONTRACT_C2_DIR;
const PYTHON = process.env.PYTHON || "python3";
assert.ok(AUTHORITY_ROOT);

function sha(bytes) {
  return "sha256:" + createHash("sha256").update(bytes).digest("hex");
}

function canonical(value) {
  return Buffer.from(JSON.stringify(value) + "\n", "utf8");
}

function buildC2(kind) {
  const program = [
    "import json, sys",
    "root, kind = sys.argv[1], sys.argv[2]",
    "sys.path.insert(0, root)",
    "from validators import contract_c_v2 as PROD",
    "def P(sym):",
    "    return {'evidence_ref': {'source_id': f'src-{sym}', 'passage_id': sym}, 'relation': 'supports', 'role': 'causal'}",
    "def R(sym):",
    "    return {'source_id': f'src-{sym}', 'passage_id': sym}",
    "pid = 'Q-ordinary-supported' if kind == 'ordinary' else 'Q-causal-assertion-supported'",
    "h = '1' if kind == 'ordinary' else '2'",
    "sym = 'O1' if kind == 'ordinary' else 'C1'",
    "v = {",
    " 'profile': PROD.PROFILE,",
    " 'contract_b': {'contract_version': '1.2.0', 'bundle_id': f'bundle-{kind}', 'bundle_hash': 'sha256:' + h*64},",
    " 'producer': {'semantic_implementation_sha': PROD.CAL_RC1_IMPLEMENTATION, 'policy_sha256': PROD.CAL_RC1_POLICY_SHA256, 'policy_resolver_commit_sha': PROD.POLICY_RESOLVER_FIXTURE_COMMIT},",
    " 'execution': {'state': 'completed'},",
    " 'propositions': [{",
    "   'proposition': {'proposition_id': pid, 'content_sha256': 'sha256:' + h*64},",
    "   'execution': {'state': 'completed', 'completion': 'assessed'},",
    "   'terminal': {'verdict': 'supported', 'reason': 'categorical_support'},",
    "   'participants': [P(sym)],",
    "   'basis_groups': [[R(sym)]],",
    " }],",
    "}",
    "sealed = PROD.seal(v)",
    "PROD.validate_object(sealed)",
    "sys.stdout.write(json.dumps(sealed))",
  ].join("\n");
  const r = spawnSync(PYTHON, ["-c", program, AUTHORITY_ROOT, kind], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  return JSON.parse(r.stdout);
}

function decisionContext(c2) {
  const p = c2.propositions[0].proposition;
  return {
    policy: {
      id: SUPPORTED_CLAIM_VERIFICATION_POLICY.id,
      version: SUPPORTED_CLAIM_VERIFICATION_POLICY.version,
    },
    proposition_id: p.proposition_id,
    target: {
      kind: "claim",
      id: p.proposition_id,
      content_sha256: p.content_sha256,
    },
  };
}

function manifest(c2, jurisdiction) {
  const bytes = canonical(c2);
  const p = c2.propositions[0].proposition;
  return {
    profile: "causal-jurisdiction-manifest-rc1",
    contract_c2_sha256: sha(bytes),
    proposition_id: p.proposition_id,
    content_sha256: p.content_sha256,
    semantic_jurisdiction: jurisdiction,
  };
}

function mbytes(value) {
  return canonical(value);
}

function runGate(c2, m, expectedManifestSha) {
  const bytes = canonical(c2);
  return gateSupportedClaimByJurisdiction({
    contractC2Bytes: bytes,
    expectedContractC2Sha256: sha(bytes),
    contractC2AuthorityRoot: AUTHORITY_ROOT,
    expectedContractB: c2.contract_b,
    decisionContext: decisionContext(c2),
    manifestBytes: mbytes(m),
    expectedManifestSha256: expectedManifestSha,
    pythonExecutable: PYTHON,
  });
}

function genericDecision(c2) {
  const bytes = canonical(c2);
  return decideContractC2ToContractD({
    contractC2Bytes: bytes,
    expectedContractC2Sha256: sha(bytes),
    contractC2AuthorityRoot: AUTHORITY_ROOT,
    expectedContractB: c2.contract_b,
    decisionContext: decisionContext(c2),
    pythonExecutable: PYTHON,
  });
}

const ordinary = buildC2("ordinary");
const causal = buildC2("causal_assertion");
const ordinaryManifest = manifest(ordinary, "ordinary_categorical_support");
const causalManifest = manifest(causal, "explicit_source_assertion_only");
const ordinaryExpected = sha(mbytes(ordinaryManifest));
const causalExpected = sha(mbytes(causalManifest));

assert.deepEqual(genericDecision(ordinary).evaluation, {
  state: "completed",
  disposition: "clear",
});
assert.deepEqual(genericDecision(causal).evaluation, {
  state: "completed",
  disposition: "clear",
});

const ordinaryGate = runGate(ordinary, ordinaryManifest, ordinaryExpected);
assert.equal(ordinaryGate.route, "generic_supported_claim");
assert.deepEqual(ordinaryGate.decision.evaluation, {
  state: "completed",
  disposition: "clear",
});

const causalGate = runGate(causal, causalManifest, causalExpected);
assert.equal(causalGate.route, "dedicated_causal_required");
assert.equal(causalGate.decision, null);

const attacks = [];

function expectReject(name, fn) {
  try {
    fn();
  } catch (error) {
    attacks.push({ name, rejected: true, code: error.code || error.name });
    return;
  }
  assert.fail(name + " was accepted");
}

const relabeledCausal = {
  ...causalManifest,
  semantic_jurisdiction: "ordinary_categorical_support",
};
expectReject("causal_relabel_to_ordinary", () =>
  runGate(causal, relabeledCausal, causalExpected),
);

const relabeledOrdinary = {
  ...ordinaryManifest,
  semantic_jurisdiction: "explicit_source_assertion_only",
};
expectReject("ordinary_relabel_to_causal", () =>
  runGate(ordinary, relabeledOrdinary, ordinaryExpected),
);

expectReject("wrong_manifest_digest", () =>
  runGate(causal, causalManifest, "sha256:" + "0".repeat(64)),
);

expectReject("stale_manifest_other_c2", () =>
  runGate(causal, ordinaryManifest, ordinaryExpected),
);

expectReject("wrong_contract_c_binding", () => {
  const x = { ...causalManifest, contract_c2_sha256: ordinaryManifest.contract_c2_sha256 };
  runGate(causal, x, causalExpected);
});

expectReject("wrong_proposition_id", () => {
  const x = { ...causalManifest, proposition_id: "Q-other" };
  runGate(causal, x, causalExpected);
});

expectReject("wrong_content_hash", () => {
  const x = { ...causalManifest, content_sha256: "sha256:" + "9".repeat(64) };
  runGate(causal, x, causalExpected);
});

expectReject("unknown_jurisdiction", () => {
  const x = { ...causalManifest, semantic_jurisdiction: "causal_truth" };
  runGate(causal, x, causalExpected);
});

expectReject("extra_field", () => {
  const x = { ...causalManifest, extra: true };
  runGate(causal, x, causalExpected);
});

expectReject("missing_manifest", () =>
  gateSupportedClaimByJurisdiction({
    contractC2Bytes: canonical(causal),
    expectedContractC2Sha256: sha(canonical(causal)),
    contractC2AuthorityRoot: AUTHORITY_ROOT,
    expectedContractB: causal.contract_b,
    decisionContext: decisionContext(causal),
    manifestBytes: null,
    expectedManifestSha256: causalExpected,
    pythonExecutable: PYTHON,
  }),
);

assert.equal(attacks.length, 10);

console.log(JSON.stringify({
  disposition: "SUPPORTED_EXTERNALLY_BOUND_CAUSAL_JURISDICTION_CARRIER_RC1",
  ordinary_route: ordinaryGate.route,
  ordinary_disposition: ordinaryGate.decision.evaluation.disposition,
  causal_route: causalGate.route,
  causal_generic_decision_emitted: causalGate.decision !== null,
  hostile_controls_rejected: attacks.length,
  attacks,
  raw_text_interpretation: false,
  causal_inference_performed: false,
  authorization_performed: false,
  execution_performed: false,
}, null, 2));
