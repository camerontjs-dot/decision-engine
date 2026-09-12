import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const SUBJECT = process.env.DECISION_ENGINE_SUBJECT_DIR;
const CONTRACT_C_ROOT = process.env.APPARATUS_CONTRACT_C_DIR;
const CONTRACT_D_ROOT = process.env.APPARATUS_CONTRACT_D_DIR;
const OUTPUT_DIR = process.env.PRESSURE_OUTPUT_DIR || "build/v1-pressure-rc0";
const PYTHON = process.env.PYTHON || "python3";

for (const [name, value] of Object.entries({
  DECISION_ENGINE_SUBJECT_DIR: SUBJECT,
  APPARATUS_CONTRACT_C_DIR: CONTRACT_C_ROOT,
  APPARATUS_CONTRACT_D_DIR: CONTRACT_D_ROOT,
})) assert.ok(value, `${name} is required`);

const { evaluateContractCDecision } = await import(
  pathToFileURL(resolve(SUBJECT, "src/contractCDecisionRuntime.js"))
);
const { SUPPORTED_CLAIM_VERIFICATION_POLICY } = await import(
  pathToFileURL(resolve(SUBJECT, "src/contractCDecision.js"))
);
const { CAUSAL_BASIS_CITATION_POLICY } = await import(
  pathToFileURL(resolve(SUBJECT, "src/contractCBasisCitationDecision.js"))
);
const { canonicalizeContractDWithAuthority } = await import(
  pathToFileURL(resolve(SUBJECT, "src/contractDCanonicalOutput.js"))
);

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

const cPath = resolve(CONTRACT_C_ROOT, "fixtures/contract-c/1.0.0/valid-canonical.json");
const cBytes = readFileSync(cPath);
const cValue = JSON.parse(cBytes.toString("utf8"));
const cSha = `sha256:${sha256(cBytes)}`;
const expectedB = structuredClone(cValue.input.contract_b);

function evaluate(decisionContext) {
  return evaluateContractCDecision({
    contractCBytes: cBytes,
    expectedContractCSha256: cSha,
    contractCAuthorityRoot: CONTRACT_C_ROOT,
    expectedContractB: expectedB,
    decisionContext,
    pythonExecutable: PYTHON,
  });
}

function canonicalD(decision) {
  return canonicalizeContractDWithAuthority({
    decision,
    contractDAuthorityRoot: CONTRACT_D_ROOT,
    pythonExecutable: PYTHON,
  });
}

const missingProposition = "pressure:missing-proposition";
const claim = evaluate({
  policy: {
    id: SUPPORTED_CLAIM_VERIFICATION_POLICY.id,
    version: SUPPORTED_CLAIM_VERIFICATION_POLICY.version,
  },
  proposition_id: missingProposition,
  target: {
    kind: "claim",
    id: missingProposition,
    content_sha256: `sha256:${"7".repeat(64)}`,
  },
});
assert.deepEqual(claim.evaluation, { state: "failed" });
assert.equal(Object.hasOwn(claim, "effect"), false);

const propositionId = cValue.propositions[0].proposition.proposition_id;
const missingContribution = `contribution:${"8".repeat(64)}`;
const citation = evaluate({
  policy: {
    id: CAUSAL_BASIS_CITATION_POLICY.id,
    version: CAUSAL_BASIS_CITATION_POLICY.version,
  },
  proposition_id: propositionId,
  contribution_id: missingContribution,
  target: {
    kind: "claim-evidence-link",
    id: `claim-evidence-link:${propositionId}:${missingContribution}`,
    content_sha256: `sha256:${"9".repeat(64)}`,
  },
});
assert.deepEqual(citation.evaluation, { state: "failed" });
assert.equal(Object.hasOwn(citation, "effect"), false);

const out = resolve(OUTPUT_DIR, "failed-controls");
mkdirSync(out, { recursive: true });
const rows = [];
for (const [name, decision, operation, params] of [
  ["missing-claim-target", claim, "knowledge.add_verified_tag", { scope: "claim" }],
  ["missing-citation-target", citation, "knowledge.cite_as_evidence", {}],
]) {
  const bytes = canonicalD(decision);
  const path = resolve(out, `${name}.json`);
  writeFileSync(path, bytes);
  rows.push({
    case: name,
    policy: name.includes("claim") ? "claim" : "citation",
    source_class: "independent-failed-control",
    path,
    evaluation: decision.evaluation,
    operation,
    params,
    contract_d_sha256: `sha256:${sha256(bytes)}`,
  });
}
writeFileSync(
  resolve(OUTPUT_DIR, "failed-decision-index.json"),
  JSON.stringify(rows, null, 2) + "\n",
  "utf8",
);
console.log(JSON.stringify({ status: "PASS", failed_controls: rows.length }));
