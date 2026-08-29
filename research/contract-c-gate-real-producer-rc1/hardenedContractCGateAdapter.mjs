import { createHash } from "node:crypto";

import {
  OUTCOME,
  SEVERITY,
  defineBar,
  evaluateGate,
} from "../../src/gate/gateHead.js";

export const RC1_ADAPTER_ID = "contract-c-gate-exact-object-shadow-adapter";
export const RC1_ADAPTER_VERSION = "0.2.0-rc1";

export const RC1_AUTHORITY = Object.freeze({
  repository: "camerontjs-dot/apparatus-contracts",
  main_sha: "00bdf9546a877f9f6c1d7fd227fd959e1d7aa99e",
  release_tag: "contract-c-v1.0.0",
  release_commit: "5fe55f9ed5d0ee9f026ca1b077e9d70ce0487ea1",
  contract_c_version: "1.0.0",
  validator_blob_sha: "9c75ccfbf2223578a8d1a7bf0c39673b394fbea4",
});

function sortJson(value) {
  if (Array.isArray(value)) return value.map(sortJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortJson(value[key])]),
    );
  }
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new TypeError("non-finite JSON number is not canonicalizable");
  }
  return value;
}

export function canonicalJsonBytes(value) {
  return Buffer.from(`${JSON.stringify(sortJson(value))}\n`, "utf8");
}

export function sha256Hex(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function exactBarSafety(barSpec) {
  return Boolean(
    barSpec &&
      barSpec.requiresHumanApproval === true &&
      barSpec.automaticApplicationPermitted === false &&
      barSpec.appliedAutomatically === false &&
      barSpec.selectRankPermitted === false &&
      barSpec.allCriteriaBlocking === true &&
      barSpec.unknownsBlockPromotion === true &&
      Array.isArray(barSpec.consumedAssessmentStages) &&
      barSpec.consumedAssessmentStages.length === 0 &&
      Array.isArray(barSpec.consumedContributionFields) &&
      barSpec.consumedContributionFields.length === 0 &&
      Array.isArray(barSpec.consumedMeasurements) &&
      barSpec.consumedMeasurements.length === 0,
  );
}

export function assertOperatorOnlyBar(barSpec) {
  if (!exactBarSafety(barSpec)) {
    throw new Error("unsafe RC1 research bar: operator-control or minimality invariant violated");
  }
}

function parseContractC(rawBytes) {
  try {
    const value = JSON.parse(rawBytes.toString("utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return { status: "malformed", value: null, error: "top level is not an object" };
    }
    return { status: "present", value, error: null };
  } catch (error) {
    return { status: "malformed", value: null, error: String(error?.message ?? error) };
  }
}

function receiptFields() {
  return [
    "validation_receipt.valid",
    "validation_receipt.authority.repository",
    "validation_receipt.authority.main_sha",
    "validation_receipt.authority.release_tag",
    "validation_receipt.authority.release_commit",
    "validation_receipt.authority.contract_c_version",
    "validation_receipt.authority.validator_blob_sha",
    "validation_receipt.object_sha256",
    "validation_receipt.canonical_sha256",
    "validation_receipt.result_set_id",
  ];
}

function exactAuthority(receipt) {
  const authority = receipt?.authority;
  return Boolean(
    authority &&
      authority.repository === RC1_AUTHORITY.repository &&
      authority.main_sha === RC1_AUTHORITY.main_sha &&
      authority.release_tag === RC1_AUTHORITY.release_tag &&
      authority.release_commit === RC1_AUTHORITY.release_commit &&
      authority.contract_c_version === RC1_AUTHORITY.contract_c_version &&
      authority.validator_blob_sha === RC1_AUTHORITY.validator_blob_sha,
  );
}

export function establishExactContractC({ contractCBytes, validationReceipt }) {
  if (!(Buffer.isBuffer(contractCBytes) || contractCBytes instanceof Uint8Array)) {
    throw new TypeError("contractCBytes must be exact bytes, not a parsed object");
  }
  const rawBytes = Buffer.from(contractCBytes);
  const rawSha256 = sha256Hex(rawBytes);
  const parsed = parseContractC(rawBytes);
  const receipt = validationReceipt;

  if (receipt == null) {
    return {
      state: "unverified",
      sourceStatus: "missing",
      sourceFields: receiptFields(),
      rawSha256,
      canonicalSha256: null,
      contractC: parsed.value,
      reason: "validator receipt missing",
    };
  }
  if (typeof receipt !== "object" || typeof receipt.valid !== "boolean") {
    return {
      state: "unverified",
      sourceStatus: "malformed",
      sourceFields: receiptFields(),
      rawSha256,
      canonicalSha256: null,
      contractC: parsed.value,
      reason: "validator receipt malformed",
    };
  }
  if (!exactAuthority(receipt)) {
    return {
      state: "mismatched",
      sourceStatus: "present",
      sourceFields: receiptFields(),
      rawSha256,
      canonicalSha256: null,
      contractC: parsed.value,
      reason: "validator/release authority identity mismatch",
    };
  }
  if (parsed.status !== "present") {
    return {
      state: receipt.valid ? "mismatched" : "invalid",
      sourceStatus: "present",
      sourceFields: receiptFields(),
      rawSha256,
      canonicalSha256: null,
      contractC: null,
      reason: parsed.error ?? "Contract C bytes could not be parsed",
    };
  }

  let canonicalSha256 = null;
  try {
    canonicalSha256 = sha256Hex(canonicalJsonBytes(parsed.value));
  } catch (error) {
    return {
      state: receipt.valid ? "mismatched" : "invalid",
      sourceStatus: "present",
      sourceFields: receiptFields(),
      rawSha256,
      canonicalSha256: null,
      contractC: parsed.value,
      reason: `canonicalization failed: ${String(error?.message ?? error)}`,
    };
  }

  const bindingMismatch =
    receipt.object_sha256 !== rawSha256 ||
    receipt.canonical_sha256 !== canonicalSha256 ||
    receipt.result_set_id !== parsed.value.result_set_id ||
    parsed.value.contract_c_version !== RC1_AUTHORITY.contract_c_version;

  if (bindingMismatch) {
    return {
      state: "mismatched",
      sourceStatus: "present",
      sourceFields: receiptFields(),
      rawSha256,
      canonicalSha256,
      contractC: parsed.value,
      reason: "receipt is not bound to these exact Contract C bytes/identity",
    };
  }
  if (receipt.valid !== true) {
    return {
      state: "invalid",
      sourceStatus: "present",
      sourceFields: receiptFields(),
      rawSha256,
      canonicalSha256,
      contractC: parsed.value,
      reason: "authoritative validator did not establish Contract C validity",
    };
  }
  if (!rawBytes.equals(canonicalJsonBytes(parsed.value))) {
    return {
      state: "mismatched",
      sourceStatus: "present",
      sourceFields: receiptFields(),
      rawSha256,
      canonicalSha256,
      contractC: parsed.value,
      reason: "exact bytes are not canonical Contract C bytes",
    };
  }

  return {
    state: "valid_exact_object",
    sourceStatus: "present",
    sourceFields: receiptFields(),
    rawSha256,
    canonicalSha256,
    contractC: parsed.value,
    reason: null,
  };
}

function findTarget(contractC, propositionId) {
  if (!Array.isArray(contractC?.propositions) || typeof propositionId !== "string" || propositionId.length === 0) {
    return { status: "missing", value: null };
  }
  const matches = contractC.propositions.filter(
    (row) => row?.proposition?.proposition_id === propositionId,
  );
  if (matches.length === 0) return { status: "missing", value: null };
  if (matches.length !== 1) return { status: "malformed", value: null };
  return { status: "present", value: matches[0] };
}

function mappedOutcome(mapping, sourceState, fallback = OUTCOME.UNKNOWN) {
  const value = mapping?.[sourceState];
  if (value === "PASS") return OUTCOME.PASS;
  if (value === "FAIL") return OUTCOME.FAIL;
  if (value === "UNKNOWN") return OUTCOME.UNKNOWN;
  return fallback;
}

function criterion(id, description, evaluate) {
  return { id, description, severity: SEVERITY.BLOCKING, evaluate };
}

function blockedObserved(sourceFields, sourceStatus, sourceState, rawValue, mappingStatus, extra = {}) {
  return {
    sourceFields,
    sourceStatus,
    sourceState,
    rawValue,
    mappingStatus,
    automaticActionEligible: false,
    ...extra,
  };
}

function compileMinimalBar({ barSpec, exact, propositionId }) {
  assertOperatorOnlyBar(barSpec);
  const mappings = barSpec.mappings ?? {};
  const conformanceEstablished = exact.state === "valid_exact_object";
  const contractC = exact.contractC;

  const criteria = [
    criterion("contract-c-conformance", "Exact authoritative Contract C object is established before policy mapping.", () => ({
      outcome: mappedOutcome(mappings.contractConformance, exact.state),
      observed: blockedObserved(
        exact.sourceFields,
        exact.sourceStatus,
        exact.state,
        { raw_sha256: exact.rawSha256, canonical_sha256: exact.canonicalSha256 },
        "mapped",
        { authorityEstablished: conformanceEstablished },
      ),
      note: exact.reason,
    })),
    criterion("result-set-execution", "CAL result-set execution completed.", () => {
      const fields = ["execution.state"];
      if (!conformanceEstablished) {
        return {
          outcome: OUTCOME.UNKNOWN,
          observed: blockedObserved(fields, "blocked", null, null, "blocked_by_contract_conformance"),
          note: "exact Contract C authority not established; semantic mapping not applied",
        };
      }
      const state = contractC?.execution?.state;
      const present = typeof state === "string";
      return {
        outcome: present ? mappedOutcome(mappings.resultExecution, state) : OUTCOME.UNKNOWN,
        observed: blockedObserved(fields, present ? "present" : "missing", present ? state : null, state ?? null, present && Object.hasOwn(mappings.resultExecution ?? {}, state) ? "mapped" : "unmapped"),
        note: present ? null : "result execution state missing/malformed",
      };
    }),
    criterion("proposition-execution", "Target proposition completed an assessed execution.", () => {
      const fields = [
        "propositions[proposition_id].proposition.proposition_id",
        "propositions[proposition_id].execution.state",
        "propositions[proposition_id].execution.completion",
      ];
      if (!conformanceEstablished) {
        return {
          outcome: OUTCOME.UNKNOWN,
          observed: blockedObserved(fields, "blocked", null, null, "blocked_by_contract_conformance"),
          note: "exact Contract C authority not established; proposition mapping not applied",
        };
      }
      const target = findTarget(contractC, propositionId);
      if (target.status !== "present") {
        return {
          outcome: OUTCOME.UNKNOWN,
          observed: blockedObserved(fields, target.status, null, null, "not_applied"),
          note: "target proposition identity was not uniquely established",
        };
      }
      const execution = target.value.execution;
      let state = null;
      if (execution?.state === "completed" && typeof execution.completion === "string") {
        state = `completed:${execution.completion}`;
      } else if (typeof execution?.state === "string") {
        state = execution.state;
      }
      const mapped = state != null && Object.hasOwn(mappings.propositionExecution ?? {}, state);
      return {
        outcome: state == null ? OUTCOME.UNKNOWN : mappedOutcome(mappings.propositionExecution, state),
        observed: blockedObserved(fields, state == null ? "malformed" : "present", state, execution ?? null, mapped ? "mapped" : "unmapped"),
        note: state == null ? "proposition execution state missing/malformed" : null,
      };
    }),
    criterion("reported-verdict", "CAL-reported verdict clears the frozen downstream review bar.", () => {
      const fields = [
        "propositions[proposition_id].proposition.proposition_id",
        "propositions[proposition_id].conclusion.reported_verdict",
      ];
      if (!conformanceEstablished) {
        return {
          outcome: OUTCOME.UNKNOWN,
          observed: blockedObserved(fields, "blocked", null, null, "blocked_by_contract_conformance"),
          note: "exact Contract C authority not established; verdict mapping not applied",
        };
      }
      const target = findTarget(contractC, propositionId);
      if (target.status !== "present") {
        return {
          outcome: OUTCOME.UNKNOWN,
          observed: blockedObserved(fields, target.status, null, null, "not_applied"),
          note: "target proposition identity was not uniquely established",
        };
      }
      const verdict = target.value?.conclusion?.reported_verdict;
      const present = typeof verdict === "string" && verdict.length > 0;
      const mapped = present && Object.hasOwn(mappings.reportedVerdict ?? {}, verdict);
      return {
        outcome: present ? mappedOutcome(mappings.reportedVerdict, verdict) : OUTCOME.UNKNOWN,
        observed: blockedObserved(fields, present ? "present" : "missing", present ? verdict : null, verdict ?? null, mapped ? "mapped" : present ? "unmapped" : "not_applied"),
        note: mapped ? null : present ? "future/unmapped reported_verdict remains UNKNOWN" : "reported verdict missing",
      };
    }),
  ];

  return defineBar({
    id: barSpec.barId,
    version: "1.0.0-rc1",
    description: barSpec.policyQuestion,
    criteria,
    requiresHumanApproval: true,
  });
}

export function evaluateExactContractCShadow({ contractCBytes, validationReceipt, propositionId, barSpec }) {
  assertOperatorOnlyBar(barSpec);
  const exact = establishExactContractC({ contractCBytes, validationReceipt });
  const bar = compileMinimalBar({ barSpec, exact, propositionId });
  const item = {
    id: `${exact.contractC?.result_set_id ?? `sha256:${exact.rawSha256}`}#${propositionId}`,
    propositionId,
  };
  const gate = evaluateGate(item, bar);
  const sourceFieldsConsumed = [...new Set(gate.criteria.flatMap((row) => row.observed?.sourceFields ?? []))];
  return {
    mode: "research_shadow_rc1",
    contractC: {
      contract_c_version: exact.contractC?.contract_c_version ?? null,
      result_set_id: exact.contractC?.result_set_id ?? null,
      exact_bytes_sha256: exact.rawSha256,
      canonical_sha256: exact.canonicalSha256,
      conformance_state: exact.state,
      validatorReceipt: validationReceipt ?? null,
    },
    target: { proposition_id: propositionId },
    gateBar: {
      id: barSpec.barId,
      canonical_spec_sha256: sha256Hex(canonicalJsonBytes(barSpec)),
    },
    adapter: {
      id: RC1_ADAPTER_ID,
      version: RC1_ADAPTER_VERSION,
    },
    criteriaEvaluated: gate.criteria,
    sourceFieldsConsumed,
    blockingFailures: gate.blockingFailures,
    blockingUnknowns: gate.blockingUnknowns,
    finalDecision: gate.decision,
    rationale: gate.rationale,
    requiresHumanApproval: true,
    automaticApplicationPermitted: false,
    appliedAutomatically: false,
    selectRankUsed: false,
  };
}
