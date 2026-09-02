import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

import {
  CAUSAL_BASIS_CITATION_POLICY,
  citationTargetForContractC,
} from "../src/contractCBasisCitationDecision.js";
import { SUPPORTED_CLAIM_VERIFICATION_POLICY } from "../src/contractCDecision.js";

const CONTRACT_C_ROOT = process.env.APPARATUS_CONTRACT_C_DIR;
const CONTRACT_D_ROOT = process.env.APPARATUS_CONTRACT_D_DIR;
const RC1_ROOT = process.env.CONTRACT_C_RC1_EVIDENCE_DIR;
const OUTPUT_DIR = process.env.DECISION_EVALUATE_CLI_OUTPUT_DIR || "build/decision-evaluate-cli";
const PYTHON = process.env.PYTHON || "python3";
const CLI = resolve("scripts/decision-engine-evaluate.mjs");

assert.ok(CONTRACT_C_ROOT, "APPARATUS_CONTRACT_C_DIR is required");
assert.ok(CONTRACT_D_ROOT, "APPARATUS_CONTRACT_D_DIR is required");
assert.ok(RC1_ROOT, "CONTRACT_C_RC1_EVIDENCE_DIR is required");

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function writeJson(name, value) {
  const path = resolve(OUTPUT_DIR, name);
  writeFileSync(path, JSON.stringify(value) + "\n", "utf8");
  return path;
}

function writeRaw(name, raw) {
  const path = resolve(OUTPUT_DIR, name);
  writeFileSync(path, raw, "utf8");
  return path;
}

function runCli({ contractCPath, contractCSha, expectedBPath, policy, contextPath, contractDRoot = CONTRACT_D_ROOT }) {
  return spawnSync(
    process.execPath,
    [
      CLI,
      "--contract-c",
      contractCPath,
      "--contract-c-sha256",
      contractCSha,
      "--contract-c-authority",
      CONTRACT_C_ROOT,
      "--contract-d-authority",
      contractDRoot,
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

mkdirSync(OUTPUT_DIR, { recursive: true });

const canonicalPath = resolve(CONTRACT_C_ROOT, "fixtures/contract-c/1.0.0/valid-canonical.json");
const canonicalBytes = readFileSync(canonicalPath);
const canonicalValue = JSON.parse(canonicalBytes.toString("utf8"));
const canonicalSha = `sha256:${sha256(canonicalBytes)}`;
assert.equal(
  canonicalSha,
  "sha256:7a66583e332be4901d13ba9f2d7e12419938c77a41b83223a4b0946ad529b7a1",
);
const canonicalExpectedBPath = writeJson("canonical.expected-b.json", canonicalValue.input.contract_b);

const proposition = canonicalValue.propositions[0];
const propositionId = proposition.proposition.proposition_id;
const causalContributionId = proposition.conclusion.basis_members.find(
  (member) => member.namespace === "contribution",
).id;
const residualContributionId = proposition.conclusion.residual_contribution_ids[0];

const causalContextPath = writeJson("basis-causal.context.json", {
  proposition_id: propositionId,
  contribution_id: causalContributionId,
  target: citationTargetForContractC(canonicalValue, propositionId, causalContributionId),
});
const residualContextPath = writeJson("basis-residual.context.json", {
  proposition_id: propositionId,
  contribution_id: residualContributionId,
  target: citationTargetForContractC(canonicalValue, propositionId, residualContributionId),
});

const causalResult = runCli({
  contractCPath: canonicalPath,
  contractCSha: canonicalSha,
  expectedBPath: canonicalExpectedBPath,
  policy: `${CAUSAL_BASIS_CITATION_POLICY.id}@${CAUSAL_BASIS_CITATION_POLICY.version}`,
  contextPath: causalContextPath,
});
const causalDecision = stdoutDecision(causalResult);
assertCanonicalUnderExactD(causalDecision.raw);
assert.deepEqual(causalDecision.value.evaluation, { state: "completed", disposition: "clear" });
assert.deepEqual(causalDecision.value.effect, {
  type: "knowledge.cite_as_evidence",
  version: "1",
  params: {},
});

const residualResult = runCli({
  contractCPath: canonicalPath,
  contractCSha: canonicalSha,
  expectedBPath: canonicalExpectedBPath,
  policy: `${CAUSAL_BASIS_CITATION_POLICY.id}@${CAUSAL_BASIS_CITATION_POLICY.version}`,
  contextPath: residualContextPath,
});
const residualDecision = stdoutDecision(residualResult);
assertCanonicalUnderExactD(residualDecision.raw);
assert.deepEqual(residualDecision.value.evaluation, { state: "completed", disposition: "hold" });
assert.equal(causalDecision.value.input_authority.immutable_id, residualDecision.value.input_authority.immutable_id);
assert.notDeepEqual(causalDecision.value.target, residualDecision.value.target);

// The existing policy also traverses the same explicit runtime/CLI boundary.
const supportedPath = resolve(RC1_ROOT, "supported-tied-alternatives.json");
const supportedBytes = readFileSync(supportedPath);
const supportedValue = JSON.parse(supportedBytes.toString("utf8"));
const supportedSha = `sha256:${sha256(supportedBytes)}`;
const supportedExpectedBPath = writeJson("supported.expected-b.json", supportedValue.input.contract_b);
const supportedProposition = supportedValue.propositions[0];
const supportedContextPath = writeJson("supported.context.json", {
  proposition_id: supportedProposition.proposition.proposition_id,
  target: {
    kind: "claim",
    id: supportedProposition.proposition.proposition_id,
    content_sha256: `sha256:${supportedProposition.proposition.text_sha256}`,
  },
});
const supportedResult = runCli({
  contractCPath: supportedPath,
  contractCSha: supportedSha,
  expectedBPath: supportedExpectedBPath,
  policy: `${SUPPORTED_CLAIM_VERIFICATION_POLICY.id}@${SUPPORTED_CLAIM_VERIFICATION_POLICY.version}`,
  contextPath: supportedContextPath,
});
const supportedDecision = stdoutDecision(supportedResult);
assertCanonicalUnderExactD(supportedDecision.raw);
assert.deepEqual(supportedDecision.value.evaluation, { state: "completed", disposition: "clear" });
assert.equal(supportedDecision.value.effect.type, "knowledge.add_verified_tag");

// Evaluation failure remains a valid canonical Contract D output, not a CLI/runtime crash.
const missingContributionId = `contribution:${"7".repeat(64)}`;
const missingContextPath = writeJson("missing-contribution.context.json", {
  proposition_id: propositionId,
  contribution_id: missingContributionId,
  target: {
    kind: "claim-evidence-link",
    id: `claim-evidence-link:${propositionId}:${missingContributionId}`,
    content_sha256: `sha256:${"8".repeat(64)}`,
  },
});
const missingResult = runCli({
  contractCPath: canonicalPath,
  contractCSha: canonicalSha,
  expectedBPath: canonicalExpectedBPath,
  policy: `${CAUSAL_BASIS_CITATION_POLICY.id}@${CAUSAL_BASIS_CITATION_POLICY.version}`,
  contextPath: missingContextPath,
});
const missingDecision = stdoutDecision(missingResult);
assertCanonicalUnderExactD(missingDecision.raw);
assert.deepEqual(missingDecision.value.evaluation, { state: "failed" });
assert.equal("effect" in missingDecision.value, false);

// Fail-closed transport, policy, target, and Contract D authority controls emit no Decision bytes.
const wrongShaResult = runCli({
  contractCPath: canonicalPath,
  contractCSha: `sha256:${"0".repeat(64)}`,
  expectedBPath: canonicalExpectedBPath,
  policy: `${CAUSAL_BASIS_CITATION_POLICY.id}@${CAUSAL_BASIS_CITATION_POLICY.version}`,
  contextPath: causalContextPath,
});
assert.notEqual(wrongShaResult.status, 0);
assert.equal(Buffer.from(wrongShaResult.stdout || Buffer.alloc(0)).length, 0);
assert.equal(stderrJson(wrongShaResult).code, "contract_c_whole_object_mismatch");

const unknownPolicyResult = runCli({
  contractCPath: canonicalPath,
  contractCSha: canonicalSha,
  expectedBPath: canonicalExpectedBPath,
  policy: "decision-engine.contract-c.unknown@1.0.0",
  contextPath: causalContextPath,
});
assert.notEqual(unknownPolicyResult.status, 0);
assert.equal(Buffer.from(unknownPolicyResult.stdout || Buffer.alloc(0)).length, 0);
assert.equal(stderrJson(unknownPolicyResult).code, "unsupported_policy");

const wrongTargetContext = JSON.parse(readFileSync(causalContextPath, "utf8"));
wrongTargetContext.target.content_sha256 = `sha256:${"1".repeat(64)}`;
const wrongTargetContextPath = writeJson("wrong-target.context.json", wrongTargetContext);
const wrongTargetResult = runCli({
  contractCPath: canonicalPath,
  contractCSha: canonicalSha,
  expectedBPath: canonicalExpectedBPath,
  policy: `${CAUSAL_BASIS_CITATION_POLICY.id}@${CAUSAL_BASIS_CITATION_POLICY.version}`,
  contextPath: wrongTargetContextPath,
});
assert.notEqual(wrongTargetResult.status, 0);
assert.equal(Buffer.from(wrongTargetResult.stdout || Buffer.alloc(0)).length, 0);
assert.equal(stderrJson(wrongTargetResult).code, "target_binding_mismatch");

const wrongDAuthorityResult = runCli({
  contractCPath: canonicalPath,
  contractCSha: canonicalSha,
  expectedBPath: canonicalExpectedBPath,
  policy: `${CAUSAL_BASIS_CITATION_POLICY.id}@${CAUSAL_BASIS_CITATION_POLICY.version}`,
  contextPath: causalContextPath,
  contractDRoot: CONTRACT_C_ROOT,
});
assert.notEqual(wrongDAuthorityResult.status, 0);
assert.equal(Buffer.from(wrongDAuthorityResult.stdout || Buffer.alloc(0)).length, 0);
assert.equal(stderrJson(wrongDAuthorityResult).code, "contract_d_authority_identity_mismatch");

// CLI context JSON is a fail-closed typed boundary: duplicate keys and hidden policy injection reject.
const duplicateContextPath = writeRaw(
  "duplicate.context.json",
  `{"proposition_id":"${propositionId}","proposition_id":"substituted","contribution_id":"${causalContributionId}","target":${JSON.stringify(citationTargetForContractC(canonicalValue, propositionId, causalContributionId))}}\n`,
);
const duplicateResult = runCli({
  contractCPath: canonicalPath,
  contractCSha: canonicalSha,
  expectedBPath: canonicalExpectedBPath,
  policy: `${CAUSAL_BASIS_CITATION_POLICY.id}@${CAUSAL_BASIS_CITATION_POLICY.version}`,
  contextPath: duplicateContextPath,
});
assert.notEqual(duplicateResult.status, 0);
assert.equal(stderrJson(duplicateResult).code, "invalid_json_context");

const hiddenPolicyContextPath = writeJson("hidden-policy.context.json", {
  policy: { id: CAUSAL_BASIS_CITATION_POLICY.id, version: CAUSAL_BASIS_CITATION_POLICY.version },
  proposition_id: propositionId,
  contribution_id: causalContributionId,
  target: citationTargetForContractC(canonicalValue, propositionId, causalContributionId),
});
const hiddenPolicyResult = runCli({
  contractCPath: canonicalPath,
  contractCSha: canonicalSha,
  expectedBPath: canonicalExpectedBPath,
  policy: `${CAUSAL_BASIS_CITATION_POLICY.id}@${CAUSAL_BASIS_CITATION_POLICY.version}`,
  contextPath: hiddenPolicyContextPath,
});
assert.notEqual(hiddenPolicyResult.status, 0);
assert.equal(stderrJson(hiddenPolicyResult).code, "invalid_json_context");

for (const [name, decision] of [
  ["basis-clear.contract-d.json", causalDecision.raw],
  ["basis-hold.contract-d.json", residualDecision.raw],
  ["basis-failed.contract-d.json", missingDecision.raw],
  ["supported-clear.contract-d.json", supportedDecision.raw],
]) {
  writeFileSync(resolve(OUTPUT_DIR, name), decision);
}

const summary = {
  status: "PASS",
  policies_dispatched: [
    `${SUPPORTED_CLAIM_VERIFICATION_POLICY.id}@${SUPPORTED_CLAIM_VERIFICATION_POLICY.version}`,
    `${CAUSAL_BASIS_CITATION_POLICY.id}@${CAUSAL_BASIS_CITATION_POLICY.version}`,
  ],
  canonical_contract_d_stdout: true,
  supported_clear: true,
  basis_clear: true,
  basis_hold: true,
  evaluation_failed_is_valid_decision: true,
  wrong_contract_c_identity_rejected: true,
  unknown_policy_rejected: true,
  target_substitution_rejected: true,
  wrong_contract_d_authority_rejected: true,
  duplicate_context_keys_rejected: true,
  hidden_policy_context_rejected: true,
  authorization_performed: false,
  execution_performed: false,
};
writeFileSync(resolve(OUTPUT_DIR, "integration-summary.json"), JSON.stringify(summary, null, 2) + "\n");
console.log(JSON.stringify(summary));
