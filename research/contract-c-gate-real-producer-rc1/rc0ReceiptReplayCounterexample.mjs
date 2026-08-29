import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  evaluateContractCShadow,
  sha256Hex,
} from "../contract-c-gate-shadow/contractCGateShadowAdapter.mjs";

const mutationDir = resolve(process.argv[2]);
const receiptDir = resolve(process.argv[3]);
const rc0BarsPath = resolve(process.argv[4] ?? "research/contract-c-gate-shadow/bars.json");

const clearBytes = readFileSync(resolve(mutationDir, "clear-positive.json"));
const adverseBytes = readFileSync(resolve(mutationDir, "explicit-adverse-assessment.json"));
const adverse = JSON.parse(adverseBytes);
const strongReceiptA = JSON.parse(readFileSync(resolve(receiptDir, "clear-positive.receipt.json"), "utf8"));
const bars = JSON.parse(readFileSync(rc0BarsPath, "utf8"));
const strictBar = bars.bars.find((bar) => bar.id === "cal-contract-c-shadow-strict-v1");
if (!strictBar) throw new Error("RC0 strict bar not found");
if (strongReceiptA.valid !== true) throw new Error("clear-positive must validate before replay test");

// Down-convert the actual authoritative validation of A into the exact receipt
// shape RC0 trusted. The extra source-object hash is evidence only: RC0 ignores it.
const legacyReceiptFromA = {
  valid: true,
  authority: {
    repository: strongReceiptA.authority.repository,
    sha: strongReceiptA.authority.main_sha,
    contract_c_version: strongReceiptA.authority.contract_c_version,
  },
  validated_object_sha256_ignored_by_rc0: strongReceiptA.object_sha256,
};

const result = evaluateContractCShadow({
  contractC: adverse,
  validationReceipt: legacyReceiptFromA,
  propositionId: "clm-md",
  barSpec: strictBar,
});

if (strongReceiptA.object_sha256 === sha256Hex(adverseBytes)) {
  throw new Error("counterexample requires different object bytes");
}
if (result.finalDecision !== "reject") {
  throw new Error(`expected RC0 replay to acquire adverse authority and reject, got ${result.finalDecision}`);
}
if (result.contractC.validatorReceipt.valid !== true) {
  throw new Error("legacy receipt unexpectedly lost valid state");
}

const receipt = {
  status: "COUNTEREXAMPLE_CONFIRMED",
  claim: "RC0 receipt valid for object A can be replayed onto different object B because RC0 does not bind receipt to exact bytes",
  object_a: {
    fixture: "clear-positive",
    authoritative_receipt_object_sha256: strongReceiptA.object_sha256,
  },
  object_b: {
    fixture: "explicit-adverse-assessment",
    actual_sha256: sha256Hex(adverseBytes),
  },
  rc0_result_on_object_b_with_receipt_a: {
    finalDecision: result.finalDecision,
    blockingFailures: result.blockingFailures,
    conformanceCriterion: result.criteriaEvaluated.find((row) => row.id === "contract-c-conformance"),
  },
  preservation: "This is new RC1 evidence. It does not rewrite the frozen RC0 terminal record; it narrows the authority claim for successor work.",
};
process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
