import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  ContractCDecisionError,
  SUPPORTED_CLAIM_VERIFICATION_POLICY,
  decideContractCToContractD,
} from "../../src/contractCDecision.js";
import { canonicalBytes, resultSetIdentity } from "./consumer.mjs";

const ROOT = resolve("research/contract-c-non-deciding-consumer-rc0");
const HANDOFF = resolve(ROOT, "handoff");
const OUT = resolve("build/contract-c-non-deciding-consumer-rc0");
const AUTHORITY = process.env.APPARATUS_CONTRACT_C_DIR;
assert.ok(AUTHORITY, "APPARATUS_CONTRACT_C_DIR required");

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function materialize(value) {
  const clone = structuredClone(value);
  delete clone.result_set_id;
  clone.result_set_id = resultSetIdentity(clone);
  const bytes = canonicalBytes(clone);
  return { value: clone, bytes, sha: `sha256:${sha256(bytes)}` };
}

function contextFor(value, propositionId = value.propositions[0].proposition.proposition_id) {
  const proposition = value.propositions.find((item) => item.proposition.proposition_id === propositionId);
  assert.ok(proposition);
  return {
    policy: {
      id: SUPPORTED_CLAIM_VERIFICATION_POLICY.id,
      version: SUPPORTED_CLAIM_VERIFICATION_POLICY.version,
    },
    proposition_id: propositionId,
    target: {
      kind: "claim",
      id: propositionId,
      content_sha256: `sha256:${proposition.proposition.text_sha256}`,
    },
  };
}

function expectedB(value) {
  return structuredClone(value.input.contract_b);
}

const shadowBytes = readFileSync(resolve(HANDOFF, "valid-shadow.json"));
const shadow = JSON.parse(shadowBytes.toString("utf8"));
const shadowSha = `sha256:${sha256(shadowBytes)}`;
let shadowRejectionCode = null;
try {
  decideContractCToContractD({
    contractCBytes: shadowBytes,
    expectedContractCSha256: shadowSha,
    contractCAuthorityRoot: AUTHORITY,
    expectedContractB: expectedB(shadow),
    decisionContext: contextFor(shadow, "temporal-p1"),
    pythonExecutable: process.env.PYTHON || "python3",
  });
  assert.fail("released maintained Contract C ingress accepted research shadow");
} catch (error) {
  assert.ok(error instanceof ContractCDecisionError, `unexpected shadow rejection error ${error}`);
  shadowRejectionCode = error.code;
  assert.equal(shadowRejectionCode, "contract_c_validation_failed");
}

const releasedBytes = readFileSync(resolve(AUTHORITY, "fixtures/contract-c/1.0.0/valid-canonical.json"));
const releasedBase = JSON.parse(releasedBytes.toString("utf8"));
const supportedValue = structuredClone(releasedBase);
supportedValue.propositions[0].conclusion.reported_verdict = "supported";
const supported = materialize(supportedValue);
const clear = decideContractCToContractD({
  contractCBytes: supported.bytes,
  expectedContractCSha256: supported.sha,
  contractCAuthorityRoot: AUTHORITY,
  expectedContractB: expectedB(supported.value),
  decisionContext: contextFor(supported.value),
  pythonExecutable: process.env.PYTHON || "python3",
});
assert.deepEqual(clear.evaluation, { state: "completed", disposition: "clear" });
assert.deepEqual(clear.metadata.reason_codes, ["contract_c_supported"]);
assert.equal(clear.input_authority.immutable_id, supported.sha);

mkdirSync(OUT, { recursive: true });
const result = {
  maintained_decision_engine_base: "358c2bb20f490bf25e808434394b26a70a16a123",
  maintained_contract_c_ingress_blob: "f57a8067dadc04afb459f1d0342b2b786ec775e6",
  maintained_supported_claim_blob: "3529b75f75936fffb9b2d9e2972cb7117b526661",
  released_contract_c_authority: "5fe55f9ed5d0ee9f026ca1b077e9d70ce0487ea1",
  checks: {
    released_1_0_ingress_rejects_shadow: shadowRejectionCode === "contract_c_validation_failed",
    ordinary_released_1_0_supported_control_clear:
      clear.evaluation.state === "completed" && clear.evaluation.disposition === "clear",
    ordinary_released_control_reason_unchanged:
      JSON.stringify(clear.metadata.reason_codes) === JSON.stringify(["contract_c_supported"]),
  },
  observed: {
    shadow_rejection_code: shadowRejectionCode,
    released_supported_control: {
      exact_contract_c_sha256: supported.sha,
      result_set_id: supported.value.result_set_id,
      evaluation: clear.evaluation,
      reason_codes: clear.metadata.reason_codes,
    },
  },
};
assert.ok(Object.values(result.checks).every(Boolean));
writeFileSync(resolve(OUT, "MAINTAINED_CONTROLS.json"), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result));
