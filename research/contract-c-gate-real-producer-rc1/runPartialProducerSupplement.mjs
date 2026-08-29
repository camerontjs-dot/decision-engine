import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { evaluateExactContractCShadow } from "./exactByteContractCGateAdapter.mjs";

const corpusDir = resolve(process.argv[2]);
const receiptDir = resolve(process.argv[3]);
const bar = JSON.parse(readFileSync(resolve(process.argv[4]), "utf8"));
const manifest = JSON.parse(readFileSync(resolve(corpusDir, "MANIFEST.json"), "utf8"));
const bytes = readFileSync(resolve(corpusDir, manifest.contract_c_file));
const receipt = JSON.parse(
  readFileSync(resolve(receiptDir, "partially-supported-numeric-mismatch.receipt.json"), "utf8"),
);

if (manifest.reported_verdict !== "partially_supported") {
  throw new Error(`expected current CAL partial supplement, got ${manifest.reported_verdict}`);
}
if (receipt.valid !== true) {
  throw new Error("authoritative Contract C validator rejected current CAL partial supplement");
}

const result = evaluateExactContractCShadow({
  contractCBytes: bytes,
  validationReceipt: receipt,
  propositionId: manifest.proposition_id,
  barSpec: bar,
});

if (result.contractC.conformance_state !== "valid_exact_object") {
  throw new Error(`exact Contract C authority not established: ${result.contractC.conformance_state}`);
}
if (result.finalDecision !== "hold") {
  throw new Error(`frozen bar must HOLD partially_supported, got ${result.finalDecision}`);
}
if (!result.blockingUnknowns.includes("reported-verdict")) {
  throw new Error("partially_supported must remain a blocking verdict UNKNOWN under the frozen bar");
}
if (
  result.requiresHumanApproval !== true ||
  result.automaticApplicationPermitted !== false ||
  result.appliedAutomatically !== false ||
  result.selectRankUsed !== false
) {
  throw new Error("operator-control or Select/Rank invariant violated");
}

const report = {
  status: "PASS",
  case_id: manifest.case_id,
  reachability: manifest.reachability,
  exact_object_sha256: receipt.object_sha256,
  result_set_id: receipt.result_set_id,
  proposition_id: manifest.proposition_id,
  reported_verdict: manifest.reported_verdict,
  finalDecision: result.finalDecision,
  blockingFailures: result.blockingFailures,
  blockingUnknowns: result.blockingUnknowns,
  sourceFieldsConsumed: result.sourceFieldsConsumed,
  operator: {
    requiresHumanApproval: result.requiresHumanApproval,
    automaticApplicationPermitted: result.automaticApplicationPermitted,
    appliedAutomatically: result.appliedAutomatically,
  },
  selectRankUsed: result.selectRankUsed,
  interpretation: "Current CAL can emit partially_supported through an unmodified rule/exporter control, and the preregistered RC1 bar preserves it as blocking UNKNOWN/HOLD.",
};
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
