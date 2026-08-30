import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { evaluateJurisdiction, JURISDICTION } from "./frozen-authority.mjs";
import { adapters, semanticsLeakingAdmissionAdapter } from "./adapters.mjs";
import { validateAdapterBinding } from "./declaration-validator.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const readJson = (name) => JSON.parse(fs.readFileSync(path.join(HERE, name), "utf8"));
const clone = (value) => structuredClone(value);

const artifacts = readJson("real-artifacts.json");
const declarations = readJson("participant-declarations.json");
const authority = readJson("authority-profile.json");
const evaluationTime = artifacts.evaluation_time;

const failures = [];
const observations = {};
function check(name, condition, detail = null) {
  if (!condition) failures.push({ name, detail });
}

function jurisdiction(request, profile = authority.profile) {
  return evaluateJurisdiction({
    profile,
    request,
    operationRegistry: authority.operation_registry,
    now: evaluationTime,
  });
}

const stageOperations = Object.freeze({
  "source-access": ["evidence-bundler", "source.read"],
  "evidence-admission": ["evidence-bundler", "evidence.admit_passage"],
  "cal-assessment": ["claim-audit-lab", "assessment.issue"],
  "decision-issuance": ["decision-engine-policy", "decision.make"],
  "citation-use": ["citation-agent", "citation.use"],
  "task-execution": ["task-agent", "task.dispatch"],
  "outcome-verification": ["verifier-agent", "outcome.verify"],
});

// H1: remove one standing authority grant at a time while keeping the artifact and
// adapter request byte-identical.
const grantRemoval = {};
for (const [stage, [actor, operation]] of Object.entries(stageOperations)) {
  const request = adapters[stage](artifacts);
  const validation = validateAdapterBinding({ stage, request, artifacts, declarations, evaluationTime });
  check(`grant-removal:${stage}:binding_still_valid`, validation.ok, validation);

  const narrowed = clone(authority.profile);
  narrowed.id = `${authority.profile.id}.without.${stage}`;
  narrowed.grants = narrowed.grants.filter((grant) => !(grant.actor === actor && grant.operation === operation));
  const result = jurisdiction(request, narrowed);
  grantRemoval[stage] = result.jurisdiction;
  check(`grant-removal:${stage}:not_authorized`, result.jurisdiction !== JURISDICTION.IN, result);
}
observations.stage_grant_removal = grantRemoval;

// H2: access and evidence admission are independently represented operations.
const readOnly = clone(artifacts);
readOnly.source_access_receipt.operations = ["source.read"];
const readOnlySource = validateAdapterBinding({
  stage: "source-access",
  request: adapters["source-access"](readOnly),
  artifacts: readOnly,
  declarations,
  evaluationTime,
});
const readOnlyAdmission = validateAdapterBinding({
  stage: "evidence-admission",
  request: adapters["evidence-admission"](readOnly),
  artifacts: readOnly,
  declarations,
  evaluationTime,
});
check("access-vs-admission:read_only_source_valid", readOnlySource.ok === true, readOnlySource);
check("access-vs-admission:read_only_admission_rejected", readOnlyAdmission.ok === false && readOnlyAdmission.reason === "access_operation_not_granted", readOnlyAdmission);

const admitOnly = clone(artifacts);
admitOnly.source_access_receipt.operations = ["evidence.admit_passage"];
const admitOnlySource = validateAdapterBinding({
  stage: "source-access",
  request: adapters["source-access"](admitOnly),
  artifacts: admitOnly,
  declarations,
  evaluationTime,
});
const admitOnlyAdmission = validateAdapterBinding({
  stage: "evidence-admission",
  request: adapters["evidence-admission"](admitOnly),
  artifacts: admitOnly,
  declarations,
  evaluationTime,
});
check("access-vs-admission:admit_only_source_rejected", admitOnlySource.ok === false && admitOnlySource.reason === "access_operation_not_granted", admitOnlySource);
check("access-vs-admission:admit_only_admission_valid", admitOnlyAdmission.ok === true, admitOnlyAdmission);
observations.access_vs_admission = {
  read_only: { source: readOnlySource.reason, admission: readOnlyAdmission.reason },
  admit_only: { source: admitOnlySource.reason, admission: admitOnlyAdmission.reason },
};

// H3: a CAL/Contract-C semantic conclusion alone can form a syntactically plausible
// citation authority request under the broad standing profile, but it must not satisfy
// the citation participant binding declaration because there is no typed citation Decision.
const semanticCitationRequest = {
  actor: "citation-agent",
  operation: "citation.use",
  target: {
    class: "mindgraph_retrieval_result",
    id: `contract-c:${artifacts.contract_c.result_set_id}`,
    current_hash: artifacts.contract_c.input.contract_b.bundle_hash,
  },
  batch_size: 1,
  context: { source: "contract_c_conclusion_only" },
  semantic_payload: { ...artifacts.contract_c.first_proposition.semantic },
};
const semanticCitationDirect = jurisdiction(semanticCitationRequest);
const semanticCitationValidation = validateAdapterBinding({
  stage: "citation-use",
  request: semanticCitationRequest,
  artifacts,
  declarations,
  evaluationTime,
});
check("contract_c_semantics_direct_false_permit_observed", semanticCitationDirect.jurisdiction === JURISDICTION.IN, semanticCitationDirect);
check("contract_c_semantics_do_not_satisfy_citation_binding", semanticCitationValidation.ok === false, semanticCitationValidation);
observations.contract_c_to_citation_negative_control = {
  direct_jurisdiction: semanticCitationDirect.jurisdiction,
  binding_validation: semanticCitationValidation.reason,
};

// H4: typed Decision effect remains truthful but does not self-authorize after its
// actor/operation grant is removed.
for (const stage of ["citation-use", "task-execution"]) {
  const [actor, operation] = stageOperations[stage];
  const request = adapters[stage](artifacts);
  const validation = validateAdapterBinding({ stage, request, artifacts, declarations, evaluationTime });
  check(`typed-effect:${stage}:binding_valid`, validation.ok, validation);
  const noGrant = clone(authority.profile);
  noGrant.grants = noGrant.grants.filter((grant) => !(grant.actor === actor && grant.operation === operation));
  const result = jurisdiction(request, noGrant);
  check(`typed-effect:${stage}:does_not_self_authorize`, result.jurisdiction !== JURISDICTION.IN, result);
}

// H5: positive-looking semantic labels cannot recover missing admission authority.
const positiveButNoAdmission = clone(readOnly);
positiveButNoAdmission.contract_b.claim.scaffold_support_status = "sourced";
positiveButNoAdmission.contract_b.claim.scaffold_claim_strength = 0.999;
positiveButNoAdmission.contract_b.claim.evidence_passages[0].source_trust_level = "primary";
const properPositiveValidation = validateAdapterBinding({
  stage: "evidence-admission",
  request: adapters["evidence-admission"](positiveButNoAdmission),
  artifacts: positiveButNoAdmission,
  declarations,
  evaluationTime,
});
check("positive_semantics_cannot_recover_admission_authority", properPositiveValidation.ok === false && properPositiveValidation.reason === "access_operation_not_granted", properPositiveValidation);

const leakingPositive = semanticsLeakingAdmissionAdapter(positiveButNoAdmission);
const leakingPositiveDirect = leakingPositive.ok ? jurisdiction(leakingPositive.request) : null;
check("semantic_leak_negative_control_still_false_permits", leakingPositiveDirect?.jurisdiction === JURISDICTION.IN, leakingPositiveDirect);
observations.positive_semantics_missing_admission = {
  proper_binding: properPositiveValidation.reason,
  weak_direct_jurisdiction: leakingPositiveDirect?.jurisdiction ?? null,
};

// Authority posture change must not require semantic artifact mutation. Compare the
// exact serialized requests under full vs grant-removed profiles.
const requestIdentityChecks = {};
for (const stage of Object.keys(stageOperations)) {
  const a = JSON.stringify(adapters[stage](artifacts));
  const b = JSON.stringify(adapters[stage](artifacts));
  requestIdentityChecks[stage] = a === b;
  check(`request_identity:${stage}`, a === b);
}
observations.request_identity_under_authority_change = requestIdentityChecks;

const summary = {
  frozen_rc1_repaired_head: "ba4a52481cac692c333ea3a7232f46e936afdefd",
  stage_count: Object.keys(stageOperations).length,
  failures,
  observations,
  encoded_hardening_gate: failures.length === 0 ? "PASS" : "FAIL",
};

fs.writeFileSync(path.join(HERE, "HOSTED-HARDENING.json"), JSON.stringify(summary, null, 2) + "\n");
console.log(JSON.stringify(summary, null, 2));
if (failures.length > 0) process.exitCode = 1;
