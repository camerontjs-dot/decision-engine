import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { evaluateExactContractCShadow } from "./exactByteContractCGateAdapter.mjs";
import { evaluateContractCShadow } from "../contract-c-gate-shadow/contractCGateShadowAdapter.mjs";

const corpusDir = resolve(process.argv[2]);
const receiptDir = resolve(process.argv[3]);
const bar = JSON.parse(readFileSync(resolve(process.argv[4]), "utf8"));
const rc0Bars = JSON.parse(readFileSync(resolve(process.argv[5] ?? "research/contract-c-gate-shadow/bars.json"), "utf8"));
const rc0Strict = rc0Bars.bars.find((row) => row.id === "cal-contract-c-shadow-strict-v1");
if (!rc0Strict) throw new Error("RC0 strict bar missing");
const manifest = JSON.parse(readFileSync(resolve(corpusDir, "MANIFEST.json"), "utf8"));

function expectedDecision(verdict) {
  if (verdict === "supported") return "promote";
  if (verdict === "overstated") return "reject";
  return "hold";
}

const rows = [];
for (const source of manifest.rows) {
  const bytes = readFileSync(resolve(corpusDir, source.contract_c_file));
  const object = JSON.parse(bytes);
  const validationReceipt = JSON.parse(
    readFileSync(resolve(receiptDir, `${source.case_id}.receipt.json`), "utf8"),
  );
  if (validationReceipt.valid !== true) {
    throw new Error(`${source.case_id}: authoritative validator did not validate real-producer object`);
  }
  const propositionId = source.propositions[0].proposition_id;
  const verdict = source.propositions[0].reported_verdict;

  const rc1 = evaluateExactContractCShadow({
    contractCBytes: bytes,
    validationReceipt,
    propositionId,
    barSpec: bar,
  });
  const expected = expectedDecision(verdict);
  if (rc1.finalDecision !== expected) {
    throw new Error(`${source.case_id}: expected RC1 ${expected} for ${verdict}, got ${rc1.finalDecision}`);
  }
  if (rc1.contractC.conformance_state !== "valid_exact_object") {
    throw new Error(`${source.case_id}: exact object conformance not established`);
  }
  if (rc1.requiresHumanApproval !== true || rc1.automaticApplicationPermitted !== false || rc1.appliedAutomatically !== false) {
    throw new Error(`${source.case_id}: operator invariants violated`);
  }
  const forbidden = ["assessments", "contributions", "measurement", "evidence_ref"];
  if (rc1.sourceFieldsConsumed.some((field) => forbidden.some((token) => field.includes(token)))) {
    throw new Error(`${source.case_id}: RC1 consumed forbidden CAL semantic internals`);
  }

  const legacyReceipt = {
    valid: true,
    authority: {
      repository: validationReceipt.authority.repository,
      sha: validationReceipt.authority.main_sha,
      contract_c_version: validationReceipt.authority.contract_c_version,
    },
  };
  const rc0 = evaluateContractCShadow({
    contractC: object,
    validationReceipt: legacyReceipt,
    propositionId,
    barSpec: rc0Strict,
  });
  if (rc0.finalDecision !== "hold") {
    throw new Error(`${source.case_id}: expected current CAL producer + RC0 strict bar to HOLD, got ${rc0.finalDecision}`);
  }

  rows.push({
    case_id: source.case_id,
    reachability: source.reachability,
    object_sha256: validationReceipt.object_sha256,
    result_set_id: object.result_set_id,
    proposition_id: propositionId,
    reported_verdict: verdict,
    proposition_execution: source.propositions[0].execution,
    assessment_states: source.propositions[0].assessment_states,
    rc0_strict_bar: {
      decision: rc0.finalDecision,
      blockingFailures: rc0.blockingFailures,
      blockingUnknowns: rc0.blockingUnknowns,
    },
    rc1_frozen_bar: {
      decision: rc1.finalDecision,
      blockingFailures: rc1.blockingFailures,
      blockingUnknowns: rc1.blockingUnknowns,
      sourceFieldsConsumed: rc1.sourceFieldsConsumed,
    },
    operator: {
      requiresHumanApproval: rc1.requiresHumanApproval,
      automaticApplicationPermitted: rc1.automaticApplicationPermitted,
      appliedAutomatically: rc1.appliedAutomatically,
    },
  });
}

const verdicts = [...new Set(rows.map((row) => row.reported_verdict))].sort();
const decisions = Object.fromEntries(
  ["promote", "hold", "reject"].map((decision) => [decision, rows.filter((row) => row.rc1_frozen_bar.decision === decision).length]),
);

const report = {
  status: "PASS",
  real_producer_cases: rows.length,
  observed_reported_verdicts: verdicts,
  rc1_decision_counts: decisions,
  rows,
  rc0_reconciliation: {
    all_current_cal_exporter_cases_hold_under_rc0_strict_bar: rows.every((row) => row.rc0_strict_bar.decision === "hold"),
    reason: "Current CAL Contract C exporter emits all four assessment slots as not_performed; RC0 strict bar maps those states to UNKNOWN. This is consistent with RC0's recorded canonical real-producer HOLD limitation.",
  },
  contract_c_sufficiency: {
    result: "WORKS_WITHOUT_GENERIC_PERFORMED_PASS",
    basis: "The preregistered real downstream bar consumes no assessment slots. Exact conformance, completed execution, and reported_verdict are sufficient for this bounded human-review admission question without reinterpreting not_performed as pass.",
  },
  select_rank: {
    used: false,
    comparative_choice_required: false,
  },
};
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);