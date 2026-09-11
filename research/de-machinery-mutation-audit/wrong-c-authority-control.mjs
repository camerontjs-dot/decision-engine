import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  SUPPORTED_CLAIM_VERIFICATION_POLICY,
  decideContractCToContractD,
} from "../../src/contractCDecision.js";

const REAL_C_ROOT = process.env.APPARATUS_CONTRACT_C_DIR;
const FAKE_C_ROOT = process.env.FAKE_CONTRACT_C_DIR;
const RC1_ROOT = process.env.CONTRACT_C_RC1_EVIDENCE_DIR;
assert.ok(REAL_C_ROOT && FAKE_C_ROOT && RC1_ROOT);

const path = resolve(RC1_ROOT, "supported-tied-alternatives.json");
const bytes = readFileSync(path);
const value = JSON.parse(bytes.toString("utf8"));
const sha = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
const proposition = value.propositions[0];
const context = {
  policy: {
    id: SUPPORTED_CLAIM_VERIFICATION_POLICY.id,
    version: SUPPORTED_CLAIM_VERIFICATION_POLICY.version,
  },
  proposition_id: proposition.proposition.proposition_id,
  target: {
    kind: "claim",
    id: proposition.proposition.proposition_id,
    content_sha256: `sha256:${proposition.proposition.text_sha256}`,
  },
};

let observed = null;
try {
  const decision = decideContractCToContractD({
    contractCBytes: bytes,
    expectedContractCSha256: sha,
    contractCAuthorityRoot: FAKE_C_ROOT,
    expectedContractB: structuredClone(value.input.contract_b),
    decisionContext: context,
    pythonExecutable: process.env.PYTHON || "python3",
  });
  observed = { kind: "decision", evaluation: decision.evaluation };
} catch (error) {
  observed = { kind: "error", code: error?.code || null };
}

assert.deepEqual(observed, { kind: "error", code: "authority_identity_mismatch" });
console.log(JSON.stringify({ status: "PASS", wrong_contract_c_authority_rejected: true }));
