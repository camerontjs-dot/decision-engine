import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  OUTCOME,
  SEVERITY,
  defineBar,
  evaluateGate,
} from "../../src/gate/gateHead.js";

export const ADAPTER_ID = "contract-c-gate-shadow-adapter";
export const ADAPTER_VERSION = "0.1.0-rc0";

export const CONTRACT_C_AUTHORITY = Object.freeze({
  repository: "camerontjs-dot/apparatus-contracts",
  sha: "00bdf9546a877f9f6c1d7fd227fd959e1d7aa99e",
  contract_c_version: "1.0.0",
  schema_path: "schema/contract-c/1.0.0/schema.json",
  validator_path: "validators/contract_c.py",
});

const ASSESSMENT_STAGES = new Set([
  "eligibility",
  "semantic_validity",
  "aperture_completeness",
  "temporal_applicability",
]);

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

export function canonicalObjectSha256(value) {
  return sha256Hex(canonicalJsonBytes(value));
}

export function adapterImplementationSha256() {
  return sha256Hex(readFileSync(fileURLToPath(import.meta.url)));
}

function present(sourceFields, sourceState, rawValue) {
  return { sourceFields, sourceStatus: "present", sourceState, rawValue };
}
function missing(sourceFields) {
  return { sourceFields, sourceStatus: "missing", sourceState: null, rawValue: null };
}
function malformed(sourceFields, rawValue) {
  return { sourceFields, sourceStatus: "malformed", sourceState: null, rawValue };
}

function exactAuthority(receipt) {
  const authority = receipt?.authority;
  return Boolean(
    authority &&
      authority.repository === CONTRACT_C_AUTHORITY.repository &&
      authority.sha === CONTRACT_C_AUTHORITY.sha &&
      authority.contract_c_version === CONTRACT_C_AUTHORITY.contract_c_version,
  );
}

function findTargetProposition(contractC, propositionId) {
  if (!Array.isArray(contractC?.propositions) || typeof propositionId !== "string" || propositionId.length === 0) {
    return { status: "missing", proposition: null };
  }
  const matches = contractC.propositions.filter(
    (entry) => entry?.proposition?.proposition_id === propositionId,
  );
  if (matches.length === 0) return { status: "missing", proposition: null };
  if (matches.length > 1) return { status: "malformed", proposition: null };
  return { status: "present", proposition: matches[0] };
}

function extractConformance(item) {
  const fields = [
    "validation_receipt.valid",
    "validation_receipt.authority.repository",
    "validation_receipt.authority.sha",
    "validation_receipt.authority.contract_c_version",
  ];
  const receipt = item.validationReceipt;
  if (receipt == null) return missing(fields);
  if (typeof receipt !== "object" || typeof receipt.valid !== "boolean") return malformed(fields, receipt);
  if (!exactAuthority(receipt)) return present(fields, "unverified", receipt);
  if (item.contractC?.contract_c_version !== CONTRACT_C_AUTHORITY.contract_c_version) {
    return present(fields, "unverified", receipt);
  }
  return present(fields, receipt.valid ? "valid" : "invalid", receipt);
}

function extractResultSetExecution(item) {
  const fields = ["execution.state"];
  const execution = item.contractC?.execution;
  if (execution == null) return missing(fields);
  if (typeof execution !== "object") return malformed(fields, execution);
  if (["completed", "failed", "incomplete"].includes(execution.state)) {
    return present(fields, execution.state, execution);
  }
  return malformed(fields, execution);
}

function extractPropositionExecution(item) {
  const fields = [
    "propositions[proposition_id].execution.state",
    "propositions[proposition_id].execution.completion",
  ];
  const target = findTargetProposition(item.contractC, item.propositionId);
  if (target.status === "missing") return missing(fields);
  if (target.status === "malformed") return malformed(fields, null);
  const execution = target.proposition.execution;
  if (execution == null) return missing(fields);
  if (typeof execution !== "object") return malformed(fields, execution);
  if (execution.state === "completed" && ["assessed", "not_checkable"].includes(execution.completion)) {
    return present(fields, `completed:${execution.completion}`, execution);
  }
  if (["failed", "incomplete"].includes(execution.state) && execution.completion === undefined) {
    return present(fields, execution.state, execution);
  }
  return malformed(fields, execution);
}

function extractAssessment(item, stage) {
  const fields = [
    `propositions[proposition_id].assessments.${stage}.state`,
    `propositions[proposition_id].assessments.${stage}.value`,
  ];
  if (!ASSESSMENT_STAGES.has(stage)) return malformed(fields, stage);
  const target = findTargetProposition(item.contractC, item.propositionId);
  if (target.status === "missing") return missing(fields);
  if (target.status === "malformed") return malformed(fields, null);
  const assessment = target.proposition?.assessments?.[stage];
  if (assessment == null) return missing(fields);
  if (typeof assessment !== "object") return malformed(fields, assessment);
  if (["not_performed", "not_applicable", "failed"].includes(assessment.state) && assessment.value === undefined) {
    return present(fields, assessment.state, assessment);
  }
  if (assessment.state === "performed" && ["unknown", "adverse"].includes(assessment.value)) {
    return present(fields, `performed:${assessment.value}`, assessment);
  }
  return malformed(fields, assessment);
}

function extractReportedVerdict(item) {
  const fields = ["propositions[proposition_id].conclusion.reported_verdict"];
  const target = findTargetProposition(item.contractC, item.propositionId);
  if (target.status === "missing") return missing(fields);
  if (target.status === "malformed") return malformed(fields, null);
  const conclusion = target.proposition.conclusion;
  if (conclusion == null) return missing(fields);
  if (typeof conclusion !== "object") return malformed(fields, conclusion);
  const verdict = conclusion.reported_verdict;
  if (typeof verdict === "string" && verdict.length > 0) return present(fields, verdict, verdict);
  return malformed(fields, verdict);
}

function extractSource(item, source) {
  switch (source?.kind) {
    case "contract_conformance":
      return extractConformance(item);
    case "result_set_execution":
      return extractResultSetExecution(item);
    case "proposition_execution":
      return extractPropositionExecution(item);
    case "assessment":
      return extractAssessment(item, source.stage);
    case "reported_verdict":
      return extractReportedVerdict(item);
    default:
      return malformed(["<unknown-source-kind>"], source);
  }
}

function validateCriterionSpec(spec) {
  if (!spec?.id || !spec?.source?.kind) throw new Error("criterion spec requires id and source.kind");
  if (![SEVERITY.BLOCKING, SEVERITY.ADVISORY].includes(spec.severity)) {
    throw new Error(`criterion ${spec.id} has invalid severity`);
  }
  if (!Array.isArray(spec.allowedSourceStates) || spec.allowedSourceStates.length === 0) {
    throw new Error(`criterion ${spec.id} requires allowedSourceStates`);
  }
  if (!spec.mapping || typeof spec.mapping !== "object") throw new Error(`criterion ${spec.id} requires mapping`);
  for (const [state, outcome] of Object.entries(spec.mapping)) {
    if (!spec.allowedSourceStates.includes(state)) {
      throw new Error(`criterion ${spec.id} maps undeclared state ${state}`);
    }
    if (![OUTCOME.PASS, OUTCOME.FAIL, OUTCOME.UNKNOWN].includes(outcome)) {
      throw new Error(`criterion ${spec.id} maps ${state} to invalid outcome ${outcome}`);
    }
  }
}

export function compileGateBar(barSpec) {
  if (!barSpec?.id || !Array.isArray(barSpec.criteria)) throw new Error("bar spec requires id and criteria");
  const criteria = barSpec.criteria.map((spec) => {
    validateCriterionSpec(spec);
    return {
      id: spec.id,
      description: spec.description,
      severity: spec.severity,
      evaluate(item) {
        const observed = extractSource(item, spec.source);
        const conformance = extractConformance(item);
        const conformanceEstablished =
          conformance.sourceStatus === "present" && conformance.sourceState === "valid";
        let outcome = OUTCOME.UNKNOWN;
        let mappingStatus = "not_applied";
        let note = null;
        if (spec.source.kind !== "contract_conformance" && !conformanceEstablished) {
          mappingStatus = "blocked_by_contract_conformance";
          note = "Contract C conformance was not established; source mapping was not applied";
        } else if (observed.sourceStatus === "missing") {
          note = "required mapped source state is missing";
        } else if (observed.sourceStatus === "malformed") {
          note = "mapped source state is malformed";
        } else if (!spec.allowedSourceStates.includes(observed.sourceState)) {
          mappingStatus = "unmapped";
          note = `well-formed source state is not declared by bar: ${JSON.stringify(observed.sourceState)}`;
        } else if (!Object.hasOwn(spec.mapping, observed.sourceState)) {
          mappingStatus = "unmapped";
          note = `bar declares but does not map source state: ${JSON.stringify(observed.sourceState)}`;
        } else {
          mappingStatus = "mapped";
          outcome = spec.mapping[observed.sourceState];
        }
        return {
          outcome,
          observed: {
            ...observed,
            mappingStatus,
            policyAuthority: spec.policyAuthority ?? null,
            automaticActionEligible: Boolean(spec.automaticActionEligible),
          },
          note,
        };
      },
    };
  });
  return defineBar({
    id: barSpec.id,
    version: barSpec.version,
    description: barSpec.description,
    criteria,
    requiresHumanApproval: Boolean(barSpec.requiresHumanApproval),
  });
}

export function evaluateContractCShadow({ contractC, validationReceipt, propositionId, barSpec }) {
  if (!contractC || typeof contractC !== "object") throw new Error("contractC must be an object");
  if (typeof propositionId !== "string" || propositionId.length === 0) throw new Error("propositionId is required");
  const bar = compileGateBar(barSpec);
  const objectSha256 = canonicalObjectSha256(contractC);
  const item = {
    id: `${contractC.result_set_id ?? `sha256:${objectSha256}`}#${propositionId}`,
    contractC,
    validationReceipt,
    propositionId,
  };
  const gate = evaluateGate(item, bar);
  const sourceFieldsConsumed = [...new Set(gate.criteria.flatMap((criterion) => criterion.observed?.sourceFields ?? []))];
  return {
    mode: "research_shadow",
    contractC: {
      contract_c_version: contractC.contract_c_version ?? null,
      result_set_id: contractC.result_set_id ?? null,
      canonical_sha256: objectSha256,
      validatorReceipt: validationReceipt ?? null,
    },
    target: { proposition_id: propositionId },
    gateBar: {
      id: barSpec.id,
      version: barSpec.version ?? null,
      canonical_spec_sha256: canonicalObjectSha256(barSpec),
    },
    adapter: {
      id: ADAPTER_ID,
      version: ADAPTER_VERSION,
      implementation_sha256: adapterImplementationSha256(),
    },
    criteriaEvaluated: gate.criteria,
    sourceFieldsConsumed,
    blockingFailures: gate.blockingFailures,
    blockingUnknowns: gate.blockingUnknowns,
    finalDecision: gate.decision,
    rationale: gate.rationale,
    requiresHumanApproval: gate.requiresHumanApproval,
    automaticApplicationPermitted: false,
    appliedAutomatically: gate.appliedAutomatically,
  };
}
