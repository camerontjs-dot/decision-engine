import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

import {
  CAUSAL_BASIS_CITATION_POLICY,
  citationTargetForContractC2,
} from "../src/contractC2BasisCitationDecision.js";
import { SUPPORTED_CLAIM_VERIFICATION_POLICY } from "../src/contractC2Decision.js";
import { CONTRACT_C2_AUTHORITY } from "../src/contractC2Ingress.js";

const CONTRACT_C2_ROOT = process.env.APPARATUS_CONTRACT_C2_DIR;
const CONTRACT_C_ROOT = process.env.APPARATUS_CONTRACT_C_DIR;
const CONTRACT_D_ROOT = process.env.APPARATUS_CONTRACT_D_DIR;
const OUTPUT_DIR = process.env.DECISION_C2_OUTPUT_DIR || "build/decision-c2-ingress";
const PYTHON = process.env.PYTHON || "python3";
const CLI2 = resolve("scripts/decision-engine-evaluate-c2.mjs");
const CLI1 = resolve("scripts/decision-engine-evaluate.mjs");

assert.ok(CONTRACT_C2_ROOT, "APPARATUS_CONTRACT_C2_DIR is required");
assert.ok(CONTRACT_C_ROOT, "APPARATUS_CONTRACT_C_DIR is required");
assert.ok(CONTRACT_D_ROOT, "APPARATUS_CONTRACT_D_DIR is required");

assert.equal(CONTRACT_C2_AUTHORITY.version, "2.0.0");
assert.equal(CONTRACT_C2_AUTHORITY.wireProfile, "contract-c-successor-candidate-a-rc2-research");
assert.equal(CONTRACT_C2_AUTHORITY.exactHead, "b42c827acb0a9fe65353354d709add0e27bab307");

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function writeJson(name, value) {
  const path = resolve(OUTPUT_DIR, name);
  writeFileSync(path, `${JSON.stringify(value)}\n`, "utf8");
  return path;
}

function runCli2({ contractC2Path, contractC2Sha, expectedBPath, policy, contextPath, c2Root = CONTRACT_C2_ROOT, dRoot = CONTRACT_D_ROOT }) {
  return spawnSync(
    process.execPath,
    [
      CLI2,
      "--contract-c2",
      contractC2Path,
      "--contract-c2-sha256",
      contractC2Sha,
      "--contract-c2-authority",
      c2Root,
      "--contract-d-authority",
      dRoot,
      "--expected-contract-b",
      expectedBPath,
      "--policy",
      policy,
      "--context",
      contextPath,
      "--python",
      PYTHON,
    ],
    { encoding: null, maxBuffer: 16 * 1024 * 1024 },
  );
}

function runCli1({ contractCPath, contractCSha, expectedBPath, policy, contextPath }) {
  return spawnSync(
    process.execPath,
    [
      CLI1,
      "--contract-c",
      contractCPath,
      "--contract-c-sha256",
      contractCSha,
      "--contract-c-authority",
      CONTRACT_C_ROOT,
      "--contract-d-authority",
      CONTRACT_D_ROOT,
      "--expected-contract-b",
      expectedBPath,
      "--policy",
      policy,
      "--context",
      contextPath,
      "--python",
      PYTHON,
    ],
    { encoding: null, maxBuffer: 16 * 1024 * 1024 },
  );
}

function stderrJson(result) {
  const text = Buffer.from(result.stderr || Buffer.alloc(0)).toString("utf8").trim();
  assert.ok(text, "expected JSON error on stderr");
  return JSON.parse(text);
}

function stdoutDecision(result) {
  assert.equal(result.status, 0, Buffer.from(result.stderr || Buffer.alloc(0)).toString("utf8"));
  assert.equal(Buffer.from(result.stderr || Buffer.alloc(0)).length, 0);
  const raw = Buffer.from(result.stdout);
  assert.ok(raw.length > 0);
  assert.equal(raw.at(-1), 0x0a, "canonical Contract D output must end in LF");
  return { raw, value: JSON.parse(raw.toString("utf8")) };
}

function assertCanonicalUnderExactD(raw) {
  const program = [
    "import json, sys",
    "root = sys.argv[1]",
    "sys.path.insert(0, root)",
    "from validators.contract_d_core import canonical_json_bytes, validate_decision",
    "raw = sys.stdin.buffer.read()",
    "value = json.loads(raw.decode('utf-8'))",
    "validate_decision(value)",
    "assert canonical_json_bytes(value) == raw",
  ].join("\n");
  const result = spawnSync(PYTHON, ["-c", program, CONTRACT_D_ROOT], {
    input: raw,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

function buildC2(program, builderName) {
  const out = spawnSync(
    PYTHON,
    ["-c", program, builderName],
    { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
  );
  assert.equal(out.status, 0, out.stderr || out.stdout);
  return JSON.parse(out.stdout);
}

mkdirSync(OUTPUT_DIR, { recursive: true });

const c2RootForBuilder = CONTRACT_C2_ROOT;
const makeProgram = [
  "import json, sys",
  `sys.path.insert(0, ${JSON.stringify(c2RootForBuilder)})`,
  "from validators import contract_c_v2 as PROD",
  "name = sys.argv[1]",
  "def base():",
  "    return {'profile': PROD.PROFILE, 'contract_b': {'contract_version': '1.2.0', 'bundle_id': 'bundle-c2-smoke-001', 'bundle_hash': 'sha256:' + 'a'*64}, 'producer': {'semantic_implementation_sha': PROD.CAL_RC1_IMPLEMENTATION, 'policy_sha256': PROD.CAL_RC1_POLICY_SHA256, 'policy_resolver_commit_sha': PROD.POLICY_RESOLVER_FIXTURE_COMMIT}, 'execution': {'state': 'completed'}, 'propositions': []}",
  "def P(sym, rel, role='causal'):",
  "    return {'evidence_ref': {'source_id': f'src-{sym}', 'passage_id': sym}, 'relation': rel, 'role': role}",
  "def R(sym):",
  "    return {'source_id': f'src-{sym}', 'passage_id': sym}",
  "v = base()",
  "if name == 'supported':",
  "    v['propositions'] = [{'proposition': {'proposition_id': 'Q-c2-supported', 'content_sha256': 'sha256:' + '2'*64}, 'execution': {'state': 'completed', 'completion': 'assessed'}, 'terminal': {'verdict': 'supported', 'reason': 'categorical_support'}, 'participants': [P('S1','supports')], 'basis_groups': [[R('S1')]]}]",
  "elif name == 'unsupported':",
  "    v['propositions'] = [{'proposition': {'proposition_id': 'Q-c2-unsupported', 'content_sha256': 'sha256:' + '4'*64}, 'execution': {'state': 'completed', 'completion': 'not_checkable'}, 'terminal': {'verdict': 'not_checkable', 'reason': 'UNSUPPORTED_SEMANTIC_FAMILY'}, 'participants': [P('U1','non_polarized','residual')], 'basis_groups': []}]",
  "elif name == 'nodeciding':",
  "    v['propositions'] = [{'proposition': {'proposition_id': 'Q-c2-nodeciding', 'content_sha256': 'sha256:' + '5'*64}, 'execution': {'state': 'completed', 'completion': 'not_checkable'}, 'terminal': {'verdict': 'not_checkable', 'reason': 'no_deciding_relation'}, 'participants': [P('N1','non_polarized','residual')], 'basis_groups': []}]",
  "else:",
  "    raise SystemExit(f'unknown builder {name}')",
  "sealed = PROD.seal(v)",
  "PROD.validate_object(sealed)",
  "sys.stdout.write(json.dumps(sealed))",
].join("\n");

const supported = buildC2(makeProgram, "supported");
const unsupported = buildC2(makeProgram, "unsupported");
const nodeciding = buildC2(makeProgram, "nodeciding");

const supportedBytes = Buffer.from(`${JSON.stringify(supported)}\n`, "utf8");
const unsupportedBytes = Buffer.from(`${JSON.stringify(unsupported)}\n`, "utf8");

const supportedPath = resolve(OUTPUT_DIR, "c2-supported.json");
writeFileSync(supportedPath, supportedBytes);
const unsupportedPath = resolve(OUTPUT_DIR, "c2-unsupported.json");
writeFileSync(unsupportedPath, unsupportedBytes);
const nodecidingPath = resolve(OUTPUT_DIR, "c2-nodeciding.json");
writeFileSync(nodecidingPath, Buffer.from(`${JSON.stringify(nodeciding)}\n`, "utf8"));

const supportedSha = `sha256:${sha256(supportedBytes)}`;
const unsupportedSha = `sha256:${sha256(unsupportedBytes)}`;

const supportedBPath = writeJson("c2-supported.expected-b.json", supported.contract_b);
const unsupportedBPath = writeJson("c2-unsupported.expected-b.json", unsupported.contract_b);

const supportedCtxPath = writeJson("c2-supported.context.json", {
  proposition_id: "Q-c2-supported",
  target: { kind: "claim", id: "Q-c2-supported", content_sha256: supported.propositions[0].proposition.content_sha256 },
});
const unsupportedCtxPath = writeJson("c2-unsupported.context.json", {
  proposition_id: "Q-c2-unsupported",
  target: { kind: "claim", id: "Q-c2-unsupported", content_sha256: unsupported.propositions[0].proposition.content_sha256 },
});

const causalContribution = "evidence:src-S1:S1";
const causalTarget = citationTargetForContractC2(supported, "Q-c2-supported", causalContribution);
assert.ok(causalTarget, "causal target must derive");
const causalCtxPath = writeJson("c2-causal.context.json", {
  proposition_id: "Q-c2-supported",
  contribution_id: causalContribution,
  target: causalTarget,
});
const residualContribution = "evidence:src-U1:U1";
const residualTarget = citationTargetForContractC2(unsupported, "Q-c2-unsupported", residualContribution);
assert.ok(residualTarget, "residual target must derive");
const residualCtxPath = writeJson("c2-residual.context.json", {
  proposition_id: "Q-c2-unsupported",
  contribution_id: residualContribution,
  target: residualTarget,
});

const supportedResult = runCli2({
  contractC2Path: supportedPath,
  contractC2Sha: supportedSha,
  expectedBPath: supportedBPath,
  policy: `${SUPPORTED_CLAIM_VERIFICATION_POLICY.id}@${SUPPORTED_CLAIM_VERIFICATION_POLICY.version}`,
  contextPath: supportedCtxPath,
});
const supportedDecision = stdoutDecision(supportedResult);
assertCanonicalUnderExactD(supportedDecision.raw);
assert.deepEqual(supportedDecision.value.evaluation, { state: "completed", disposition: "clear" });
assert.equal(supportedDecision.value.input_authority.kind, "contract-c2");
assert.equal(supportedDecision.value.input_authority.immutable_id, supportedSha);

const unsupportedResult = runCli2({
  contractC2Path: unsupportedPath,
  contractC2Sha: unsupportedSha,
  expectedBPath: unsupportedBPath,
  policy: `${SUPPORTED_CLAIM_VERIFICATION_POLICY.id}@${SUPPORTED_CLAIM_VERIFICATION_POLICY.version}`,
  contextPath: unsupportedCtxPath,
});
const unsupportedDecision = stdoutDecision(unsupportedResult);
assertCanonicalUnderExactD(unsupportedDecision.raw);
assert.deepEqual(unsupportedDecision.value.evaluation, { state: "completed", disposition: "hold" });
assert.ok(
  unsupportedDecision.value.metadata.reason_codes[0].includes("unsupported") ||
  unsupportedDecision.value.metadata.reason_codes[0].includes("not_supported"),
);

const causalResult = runCli2({
  contractC2Path: supportedPath,
  contractC2Sha: supportedSha,
  expectedBPath: supportedBPath,
  policy: `${CAUSAL_BASIS_CITATION_POLICY.id}@${CAUSAL_BASIS_CITATION_POLICY.version}`,
  contextPath: causalCtxPath,
});
const causalDecision = stdoutDecision(causalResult);
assertCanonicalUnderExactD(causalDecision.raw);
assert.deepEqual(causalDecision.value.evaluation, { state: "completed", disposition: "clear" });

const residualResult = runCli2({
  contractC2Path: unsupportedPath,
  contractC2Sha: unsupportedSha,
  expectedBPath: unsupportedBPath,
  policy: `${CAUSAL_BASIS_CITATION_POLICY.id}@${CAUSAL_BASIS_CITATION_POLICY.version}`,
  contextPath: residualCtxPath,
});
const residualDecision = stdoutDecision(residualResult);
assertCanonicalUnderExactD(residualDecision.raw);
assert.deepEqual(residualDecision.value.evaluation, { state: "completed", disposition: "hold" });

const missingCtxPath = writeJson("c2-missing.context.json", {
  proposition_id: "Q-c2-supported",
  contribution_id: "evidence:src-X:X9",
  target: { kind: "claim-evidence-link", id: "claim-evidence-link:Q-c2-supported:evidence:src-X:X9", content_sha256: `sha256:${"8".repeat(64)}` },
});
const missingResult = runCli2({
  contractC2Path: supportedPath,
  contractC2Sha: supportedSha,
  expectedBPath: supportedBPath,
  policy: `${CAUSAL_BASIS_CITATION_POLICY.id}@${CAUSAL_BASIS_CITATION_POLICY.version}`,
  contextPath: missingCtxPath,
});
const missingDecision = stdoutDecision(missingResult);
assertCanonicalUnderExactD(missingDecision.raw);
assert.deepEqual(missingDecision.value.evaluation, { state: "failed" });
assert.equal("effect" in missingDecision.value, false);

const staleResult = runCli2({
  contractC2Path: supportedPath,
  contractC2Sha: `sha256:${"0".repeat(64)}`,
  expectedBPath: supportedBPath,
  policy: `${SUPPORTED_CLAIM_VERIFICATION_POLICY.id}@${SUPPORTED_CLAIM_VERIFICATION_POLICY.version}`,
  contextPath: supportedCtxPath,
});
assert.notEqual(staleResult.status, 0);
assert.equal(Buffer.from(staleResult.stdout || Buffer.alloc(0)).length, 0);
assert.equal(stderrJson(staleResult).code, "contract_c_whole_object_mismatch");

const wrongB = { ...supported.contract_b, bundle_id: "bundle-wrong" };
const wrongBPath = writeJson("c2-wrong-b.json", wrongB);
const wrongBResult = runCli2({
  contractC2Path: supportedPath,
  contractC2Sha: supportedSha,
  expectedBPath: wrongBPath,
  policy: `${SUPPORTED_CLAIM_VERIFICATION_POLICY.id}@${SUPPORTED_CLAIM_VERIFICATION_POLICY.version}`,
  contextPath: supportedCtxPath,
});
assert.notEqual(wrongBResult.status, 0);
assert.equal(stderrJson(wrongBResult).code, "contract_b_binding_mismatch");

const subCtx = JSON.parse(readFileSync(supportedCtxPath, "utf8"));
subCtx.target.content_sha256 = `sha256:${"1".repeat(64)}`;
const subCtxPath = writeJson("c2-sub.context.json", subCtx);
const subResult = runCli2({
  contractC2Path: supportedPath,
  contractC2Sha: supportedSha,
  expectedBPath: supportedBPath,
  policy: `${SUPPORTED_CLAIM_VERIFICATION_POLICY.id}@${SUPPORTED_CLAIM_VERIFICATION_POLICY.version}`,
  contextPath: subCtxPath,
});
assert.notEqual(subResult.status, 0);
assert.equal(stderrJson(subResult).code, "target_binding_mismatch");

const unknownResult = runCli2({
  contractC2Path: supportedPath,
  contractC2Sha: supportedSha,
  expectedBPath: supportedBPath,
  policy: "decision-engine.contract-c.unknown@1.0.0",
  contextPath: supportedCtxPath,
});
assert.notEqual(unknownResult.status, 0);
assert.equal(stderrJson(unknownResult).code, "unsupported_policy");

const wrongC2AuthorityResult = runCli2({
  contractC2Path: supportedPath,
  contractC2Sha: supportedSha,
  expectedBPath: supportedBPath,
  policy: `${SUPPORTED_CLAIM_VERIFICATION_POLICY.id}@${SUPPORTED_CLAIM_VERIFICATION_POLICY.version}`,
  contextPath: supportedCtxPath,
  c2Root: CONTRACT_D_ROOT,
});
assert.notEqual(wrongC2AuthorityResult.status, 0);
assert.equal(stderrJson(wrongC2AuthorityResult).code, "authority_identity_mismatch");

const c1CanonicalPath = resolve(CONTRACT_C_ROOT, "fixtures/contract-c/1.0.0/valid-canonical.json");
const c1Bytes = readFileSync(c1CanonicalPath);
const c1Sha = `sha256:${sha256(c1Bytes)}`;
const c1Value = JSON.parse(c1Bytes.toString("utf8"));
const c1BPath = writeJson("c1-for-c2.expected-b.json", c1Value.input.contract_b);
const c1CtxPath = writeJson("c1-for-c2.context.json", {
  proposition_id: c1Value.propositions[0].proposition.proposition_id,
  target: { kind: "claim", id: c1Value.propositions[0].proposition.proposition_id, content_sha256: `sha256:${c1Value.propositions[0].proposition.text_sha256}` },
});
const c1ViaC2Result = runCli2({
  contractC2Path: c1CanonicalPath,
  contractC2Sha: c1Sha,
  expectedBPath: c1BPath,
  policy: `${SUPPORTED_CLAIM_VERIFICATION_POLICY.id}@${SUPPORTED_CLAIM_VERIFICATION_POLICY.version}`,
  contextPath: c1CtxPath,
});
assert.notEqual(c1ViaC2Result.status, 0);
assert.equal(Buffer.from(c1ViaC2Result.stdout || Buffer.alloc(0)).length, 0);

const c2ViaC1Result = runCli1({
  contractCPath: supportedPath,
  contractCSha: supportedSha,
  expectedBPath: supportedBPath,
  policy: `${SUPPORTED_CLAIM_VERIFICATION_POLICY.id}@${SUPPORTED_CLAIM_VERIFICATION_POLICY.version}`,
  contextPath: supportedCtxPath,
});
assert.notEqual(c2ViaC1Result.status, 0);
assert.equal(Buffer.from(c2ViaC1Result.stdout || Buffer.alloc(0)).length, 0);

const replayResult = runCli2({
  contractC2Path: unsupportedPath,
  contractC2Sha: supportedSha,
  expectedBPath: supportedBPath,
  policy: `${SUPPORTED_CLAIM_VERIFICATION_POLICY.id}@${SUPPORTED_CLAIM_VERIFICATION_POLICY.version}`,
  contextPath: supportedCtxPath,
});
assert.notEqual(replayResult.status, 0);

for (const [name, decision] of [
  ["c2-supported-clear.contract-d.json", supportedDecision.raw],
  ["c2-unsupported-hold.contract-d.json", unsupportedDecision.raw],
  ["c2-basis-clear.contract-d.json", causalDecision.raw],
  ["c2-basis-hold.contract-d.json", residualDecision.raw],
  ["c2-basis-failed.contract-d.json", missingDecision.raw],
]) {
  writeFileSync(resolve(OUTPUT_DIR, name), decision);
}

const summary = {
  status: "PASS",
  contract_c2_version: "2.0.0",
  wire_profile: CONTRACT_C2_AUTHORITY.wireProfile,
  exact_head: CONTRACT_C2_AUTHORITY.exactHead,
  supported_clear: true,
  unsupported_hold: true,
  basis_clear: true,
  basis_hold: true,
  evaluation_failed_is_valid_decision: true,
  stale_hash_rejected: true,
  wrong_contract_b_rejected: true,
  target_substitution_rejected: true,
  unknown_policy_rejected: true,
  wrong_c2_authority_rejected: true,
  c1_rejected_by_c2_ingress: true,
  c2_rejected_by_c1_ingress: true,
  replay_mismatch_rejected: true,
  non_deciding_not_support: true,
  no_downgrade: true,
  authorization_performed: false,
  execution_performed: false,
};
writeFileSync(resolve(OUTPUT_DIR, "integration-summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary));
