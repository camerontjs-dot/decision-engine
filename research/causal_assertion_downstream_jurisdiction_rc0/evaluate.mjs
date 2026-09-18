import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

import {
  SUPPORTED_CLAIM_VERIFICATION_POLICY,
  decideContractC2ToContractD,
} from "../../src/contractC2Decision.js";
import { CONTRACT_C2_AUTHORITY } from "../../src/contractC2Ingress.js";

const AUTHORITY_ROOT = process.env.APPARATUS_CONTRACT_C2_DIR;
const OUTPUT = process.env.CAUSAL_JURISDICTION_OUTPUT || "build/causal-jurisdiction-rc0.json";
const PYTHON = process.env.PYTHON || "python3";

assert.ok(AUTHORITY_ROOT, "APPARATUS_CONTRACT_C2_DIR is required");
assert.equal(
  CONTRACT_C2_AUTHORITY.exactHead,
  "b42c827acb0a9fe65353354d709add0e27bab307",
);

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
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
    "if kind == 'ordinary':",
    "    pid, h, sym = 'Q-ordinary-supported', '1', 'O1'",
    "elif kind == 'causal_assertion':",
    "    pid, h, sym = 'Q-causal-assertion-supported', '2', 'C1'",
    "else:",
    "    raise SystemExit('bad kind')",
    "v = {",
    "  'profile': PROD.PROFILE,",
    "  'contract_b': {'contract_version': '1.2.0', 'bundle_id': f'bundle-{kind}', 'bundle_hash': 'sha256:' + h*64},",
    "  'producer': {'semantic_implementation_sha': PROD.CAL_RC1_IMPLEMENTATION, 'policy_sha256': PROD.CAL_RC1_POLICY_SHA256, 'policy_resolver_commit_sha': PROD.POLICY_RESOLVER_FIXTURE_COMMIT},",
    "  'execution': {'state': 'completed'},",
    "  'propositions': [{",
    "    'proposition': {'proposition_id': pid, 'content_sha256': 'sha256:' + h*64},",
    "    'execution': {'state': 'completed', 'completion': 'assessed'},",
    "    'terminal': {'verdict': 'supported', 'reason': 'categorical_support'},",
    "    'participants': [P(sym)],",
    "    'basis_groups': [[R(sym)]],",
    "  }],",
    "}",
    "sealed = PROD.seal(v)",
    "PROD.validate_object(sealed)",
    "sys.stdout.write(json.dumps(sealed))",
  ].join("\n");
  const out = spawnSync(
    PYTHON,
    ["-c", program, AUTHORITY_ROOT, kind],
    { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
  );
  assert.equal(out.status, 0, out.stderr || out.stdout);
  return JSON.parse(out.stdout);
}

function canonicalBytes(value) {
  return Buffer.from(JSON.stringify(value) + "\n", "utf8");
}

function contextFor(value) {
  const p = value.propositions[0].proposition;
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

function decide(value) {
  const bytes = canonicalBytes(value);
  return decideContractC2ToContractD({
    contractC2Bytes: bytes,
    expectedContractC2Sha256: "sha256:" + sha256(bytes),
    contractC2AuthorityRoot: AUTHORITY_ROOT,
    expectedContractB: value.contract_b,
    decisionContext: contextFor(value),
    pythonExecutable: PYTHON,
  });
}

function semanticShape(value) {
  const p = value.propositions[0];
  return {
    result_execution: value.execution.state,
    proposition_execution: p.execution,
    terminal: p.terminal,
    participant_relation_role: p.participants.map((x) => ({
      relation: x.relation,
      role: x.role,
    })),
    basis_cardinalities: p.basis_groups.map((g) => g.length),
  };
}

function validateMutatedC2Rejects(value) {
  const mutated = structuredClone(value);
  mutated.propositions[0].semantic_jurisdiction = "explicit_source_assertion_only";
  const program = [
    "import json, sys",
    "root = sys.argv[1]",
    "sys.path.insert(0, root)",
    "from validators.contract_c_v2 import validate_object",
    "v = json.load(sys.stdin)",
    "try:",
    "    validate_object(v)",
    "except Exception as exc:",
    "    print(str(exc))",
    "    raise SystemExit(0)",
    "raise SystemExit(9)",
  ].join("\n");
  const out = spawnSync(
    PYTHON,
    ["-c", program, AUTHORITY_ROOT],
    {
      input: JSON.stringify(mutated),
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  assert.equal(out.status, 0, out.stderr || out.stdout);
  return (out.stdout || "").trim();
}

function decisionContextRejectsJurisdiction(value) {
  const bytes = canonicalBytes(value);
  const ctx = {
    ...contextFor(value),
    semantic_jurisdiction: "explicit_source_assertion_only",
  };
  try {
    decideContractC2ToContractD({
      contractC2Bytes: bytes,
      expectedContractC2Sha256: "sha256:" + sha256(bytes),
      contractC2AuthorityRoot: AUTHORITY_ROOT,
      expectedContractB: value.contract_b,
      decisionContext: ctx,
      pythonExecutable: PYTHON,
    });
  } catch (error) {
    assert.equal(error.code, "invalid_context");
    return String(error.message);
  }
  assert.fail("Decision context unexpectedly accepted semantic_jurisdiction");
}

const ordinary = buildC2("ordinary");
const causal = buildC2("causal_assertion");

const ordinaryDecision = decide(ordinary);
const causalDecision = decide(causal);

assert.deepEqual(ordinaryDecision.evaluation, {
  state: "completed",
  disposition: "clear",
});
assert.deepEqual(causalDecision.evaluation, {
  state: "completed",
  disposition: "clear",
});

assert.deepEqual(ordinaryDecision.effect, causalDecision.effect);
assert.deepEqual(semanticShape(ordinary), semanticShape(causal));

const manifest = JSON.parse(
  readFileSync(
    resolve("research/causal_assertion_downstream_jurisdiction_rc0/jurisdiction_manifest.json"),
    "utf8",
  ),
);
assert.notEqual(
  manifest.cases["Q-ordinary-supported"].jurisdiction,
  manifest.cases["Q-causal-assertion-supported"].jurisdiction,
);

const schema = JSON.parse(
  readFileSync(resolve(AUTHORITY_ROOT, "schema/contract-c/2.0.0/schema.json"), "utf8"),
);
const propositionSchema = schema.$defs.propositionResult;
assert.equal(propositionSchema.additionalProperties, false);
assert.equal(
  Object.hasOwn(propositionSchema.properties, "semantic_jurisdiction"),
  false,
);

const c2Rejection = validateMutatedC2Rejects(causal);
const decisionContextRejection = decisionContextRejectsJurisdiction(causal);

const result = {
  disposition: "SUPPORTED_BOUNDED_CAUSAL_JURISDICTION_INFORMATION_GAP",
  exact_decision_parent: "b1bcc33e2b5ef0707b8cbf7dd8e821b2d34d1b55",
  exact_contract_c2_authority: CONTRACT_C2_AUTHORITY.exactHead,
  ordinary_supported_disposition: ordinaryDecision.evaluation.disposition,
  causal_assertion_supported_disposition: causalDecision.evaluation.disposition,
  same_supported_policy_effect:
    JSON.stringify(ordinaryDecision.effect) === JSON.stringify(causalDecision.effect),
  same_normative_semantic_shape:
    JSON.stringify(semanticShape(ordinary)) === JSON.stringify(semanticShape(causal)),
  manifest_distinguishes_jurisdiction: true,
  contract_c2_has_in_band_jurisdiction_slot: false,
  contract_c2_extra_jurisdiction_rejected: true,
  decision_context_has_in_band_jurisdiction_slot: false,
  decision_context_extra_jurisdiction_rejected: true,
  contract_c2_rejection_detail: c2Rejection,
  decision_context_rejection_detail: decisionContextRejection,
  causal_inference_performed: false,
  authorization_performed: false,
  execution_performed: false,
};

writeFileSync(OUTPUT, JSON.stringify(result, null, 2) + "\n", "utf8");
console.log(JSON.stringify(result, null, 2));
