import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const SUBJECT = process.env.DECISION_ENGINE_SUBJECT_DIR;
const CONTRACT_C_ROOT = process.env.APPARATUS_CONTRACT_C_DIR;
const CONTRACT_D_ROOT = process.env.APPARATUS_CONTRACT_D_DIR;
const REAL_CAL_CONTRACT_C = process.env.REAL_CAL_CONTRACT_C;
const OUTPUT_DIR = process.env.PRESSURE_OUTPUT_DIR || "build/v1-pressure-rc0";
const PYTHON = process.env.PYTHON || "python3";

for (const [name, value] of Object.entries({
  DECISION_ENGINE_SUBJECT_DIR: SUBJECT,
  APPARATUS_CONTRACT_C_DIR: CONTRACT_C_ROOT,
  APPARATUS_CONTRACT_D_DIR: CONTRACT_D_ROOT,
  REAL_CAL_CONTRACT_C,
})) {
  assert.ok(value, `${name} is required`);
}

mkdirSync(resolve(OUTPUT_DIR, "decisions"), { recursive: true });
mkdirSync(resolve(OUTPUT_DIR, "cli"), { recursive: true });

const runtime = await import(pathToFileURL(resolve(SUBJECT, "src/contractCDecisionRuntime.js")));
const claimPolicyModule = await import(pathToFileURL(resolve(SUBJECT, "src/contractCDecision.js")));
const citationPolicyModule = await import(
  pathToFileURL(resolve(SUBJECT, "src/contractCBasisCitationDecision.js"))
);
const canonicalModule = await import(pathToFileURL(resolve(SUBJECT, "src/contractDCanonicalOutput.js")));
const ingressModule = await import(pathToFileURL(resolve(SUBJECT, "src/contractCIngress.js")));

const { evaluateContractCDecision } = runtime;
const { SUPPORTED_CLAIM_VERIFICATION_POLICY } = claimPolicyModule;
const { CAUSAL_BASIS_CITATION_POLICY, citationTargetForContractC } = citationPolicyModule;
const { canonicalizeContractDWithAuthority } = canonicalModule;
const { ContractCDecisionError } = ingressModule;

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
  }
  return value;
}

function canonicalBytes(value) {
  return Buffer.from(JSON.stringify(sortValue(value)) + "\n", "utf8");
}

function materialize(value) {
  const clone = structuredClone(value);
  delete clone.result_set_id;
  clone.result_set_id = `result-set:${sha256(canonicalBytes(clone))}`;
  const bytes = canonicalBytes(clone);
  return { value: clone, bytes, sha: `sha256:${sha256(bytes)}` };
}

function expectedContractB(value) {
  return structuredClone(value.input.contract_b);
}

function claimContext(value, propositionId = value.propositions[0].proposition.proposition_id) {
  const proposition = value.propositions.find((item) => item.proposition.proposition_id === propositionId);
  assert.ok(proposition, `missing proposition ${propositionId}`);
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

function citationContext(value, propositionId, contributionId) {
  const target = citationTargetForContractC(value, propositionId, contributionId);
  assert.ok(target, `missing citation target ${propositionId}/${contributionId}`);
  return {
    policy: {
      id: CAUSAL_BASIS_CITATION_POLICY.id,
      version: CAUSAL_BASIS_CITATION_POLICY.version,
    },
    proposition_id: propositionId,
    contribution_id: contributionId,
    target,
  };
}

function evaluate(fixture, decisionContext, extra = {}) {
  return evaluateContractCDecision({
    contractCBytes: fixture.bytes,
    expectedContractCSha256: fixture.sha,
    contractCAuthorityRoot: CONTRACT_C_ROOT,
    expectedContractB: expectedContractB(fixture.value),
    decisionContext,
    pythonExecutable: PYTHON,
    ...extra,
  });
}

function canonicalD(decision) {
  return canonicalizeContractDWithAuthority({
    decision,
    contractDAuthorityRoot: CONTRACT_D_ROOT,
    pythonExecutable: PYTHON,
  });
}

function expectError(code, fn) {
  assert.throws(fn, (error) => error instanceof ContractCDecisionError && error.code === code);
}

function writeJson(path, value) {
  mkdirSync(dirname(resolve(path)), { recursive: true });
  writeFileSync(resolve(path), JSON.stringify(value, null, 2) + "\n", "utf8");
}

function contribution(seed, channel = "support") {
  const digest = sha256(Buffer.from(`contribution:${seed}`, "utf8"));
  return {
    contribution_id: `contribution:${digest}`,
    channel,
    evidence_ref: {
      source_id: `source-${seed}`,
      passage_id: `passage-${seed}`,
      passage_sha256: `sha256:${sha256(Buffer.from(`passage:${seed}`, "utf8"))}`,
    },
  };
}

const canonicalTemplate = JSON.parse(
  readFileSync(resolve(CONTRACT_C_ROOT, "fixtures/contract-c/1.0.0/valid-canonical.json"), "utf8"),
);

function domainCase({
  name,
  domain,
  text,
  verdict,
  completion = "assessed",
  contributionSpecs = [],
  basisContributionIndexes = [],
  residualContributionIndexes = [],
  stateBasis = null,
  causalForm = null,
  assessmentOverrides = {},
}) {
  const value = structuredClone(canonicalTemplate);
  value.input.contract_b = {
    contract_version: "1.2.0",
    bundle_id: `pressure-${name}`,
    bundle_hash: `sha256:${sha256(Buffer.from(`bundle:${name}`, "utf8"))}`,
  };
  value.execution = { state: "completed" };
  const contributions = contributionSpecs.map((spec, index) =>
    contribution(`${name}-${index + 1}`, spec.channel || "support"),
  );
  const basisMembers = basisContributionIndexes.map((index) => ({
    namespace: "contribution",
    id: contributions[index].contribution_id,
  }));
  if (stateBasis) basisMembers.push({ namespace: "state", id: stateBasis });
  const residualIds = residualContributionIndexes.map((index) => contributions[index].contribution_id);
  const propositionId = `pressure:${name}`;
  const textHash = sha256(Buffer.from(text, "utf8"));
  const inferredCausalForm =
    causalForm ||
    (basisMembers.length === 0
      ? "redundant_non_deciding"
      : basisMembers.length === 1
        ? "single_necessary"
        : "jointly_sufficient");
  const assessments = {
    eligibility: { state: "not_performed" },
    semantic_validity: { state: "not_performed" },
    aperture_completeness: { state: "not_performed" },
    temporal_applicability: { state: "not_performed" },
    ...structuredClone(assessmentOverrides),
  };
  value.propositions = [
    {
      proposition: { proposition_id: propositionId, text_sha256: textHash },
      execution: { state: "completed", completion },
      assessments,
      contributions,
      measurement: null,
      conclusion: {
        reported_verdict: verdict,
        terminal_branch: `pressure_${name}`,
        causal_form: inferredCausalForm,
        basis_members: basisMembers,
        residual_contribution_ids: residualIds,
        rule_roles: [],
      },
    },
  ];
  const fixture = materialize(value);
  return { name, domain, text, fixture };
}

const cases = [
  domainCase({
    name: "mainframe-supported-single",
    domain: "mainframe-knowledge-synthesis",
    text: "The audited note records a supported atomic claim.",
    verdict: "supported",
    contributionSpecs: [{ channel: "support" }],
    basisContributionIndexes: [0],
  }),
  domainCase({
    name: "sop-supported-joint",
    domain: "sop-controlled-requirement",
    text: "The controlled procedure requires an independent review before approval.",
    verdict: "supported",
    contributionSpecs: [{ channel: "support" }, { channel: "support" }],
    basisContributionIndexes: [0, 1],
    causalForm: "jointly_sufficient",
  }),
  domainCase({
    name: "literature-supported-alternatives",
    domain: "source-literature",
    text: "Two independent publications report the same bounded finding.",
    verdict: "supported",
    contributionSpecs: [{ channel: "support" }, { channel: "support" }],
    basisContributionIndexes: [0, 1],
    causalForm: "independent_sufficient_alternatives",
  }),
  domainCase({
    name: "literature-contradicted",
    domain: "source-literature",
    text: "The literature supports the asserted directional effect.",
    verdict: "contradicted",
    contributionSpecs: [{ channel: "counterevidence" }],
    basisContributionIndexes: [0],
  }),
  domainCase({
    name: "quality-unsupported",
    domain: "regulated-quality",
    text: "The quality record establishes the claimed control effectiveness.",
    verdict: "unsupported",
    contributionSpecs: [{ channel: "counterevidence" }],
    basisContributionIndexes: [0],
  }),
  domainCase({
    name: "sop-overstated-residual",
    domain: "sop-controlled-requirement",
    text: "The procedure guarantees that every deviation is prevented.",
    verdict: "overstated",
    contributionSpecs: [{ channel: "support" }],
    residualContributionIndexes: [0],
    stateBasis: "state:absolute_lexical_trigger",
  }),
  domainCase({
    name: "credential-needs-source",
    domain: "regulated-credential",
    text: "The named reviewer is board certified.",
    verdict: "needs_source",
    stateBasis: "state:direct_support_contexts_empty",
  }),
  domainCase({
    name: "ambiguous-not-checkable",
    domain: "ambiguous-unclassified",
    text: "This may be preferable in some situations.",
    verdict: "not_checkable",
    completion: "not_checkable",
    stateBasis: "state:claim_type:unclassified",
  }),
  domainCase({
    name: "mainframe-supported-redundant",
    domain: "mainframe-knowledge-synthesis",
    text: "The atomic note claim is supported while one retained passage is non-deciding.",
    verdict: "supported",
    contributionSpecs: [{ channel: "support" }],
    residualContributionIndexes: [0],
    causalForm: "redundant_non_deciding",
  }),
];

const decisionIndex = [];
const matrix = [];

function recordDecision(caseName, policyName, decision, expectedDisposition, operation, params, sourceClass) {
  const bytes = canonicalD(decision);
  assert.deepEqual(decision.evaluation, expectedDisposition);
  const path = resolve(OUTPUT_DIR, "decisions", `${caseName}.${policyName}.json`);
  writeFileSync(path, bytes);
  decisionIndex.push({
    case: caseName,
    policy: policyName,
    source_class: sourceClass,
    path,
    evaluation: decision.evaluation,
    operation,
    params,
    contract_d_sha256: `sha256:${sha256(bytes)}`,
  });
  return bytes;
}

for (const testCase of cases) {
  const { fixture } = testCase;
  const proposition = fixture.value.propositions[0];
  const propositionId = proposition.proposition.proposition_id;
  const claimDecision = evaluate(fixture, claimContext(fixture.value));
  const expectedClaim = proposition.execution.completion === "assessed" && proposition.conclusion.reported_verdict === "supported"
    ? { state: "completed", disposition: "clear" }
    : { state: "completed", disposition: "hold" };
  const claimBytes = recordDecision(
    testCase.name,
    "claim",
    claimDecision,
    expectedClaim,
    "knowledge.add_verified_tag",
    { scope: "claim" },
    "consumer-valid-domain-case",
  );

  const contributionRows = [];
  for (const item of proposition.contributions) {
    const context = citationContext(fixture.value, propositionId, item.contribution_id);
    const decision = evaluate(fixture, context);
    const inBasis = proposition.conclusion.basis_members.some(
      (member) => member.namespace === "contribution" && member.id === item.contribution_id,
    );
    const expectedCitation = proposition.execution.completion === "assessed" && inBasis
      ? { state: "completed", disposition: "clear" }
      : { state: "completed", disposition: "hold" };
    const citationBytes = recordDecision(
      testCase.name,
      `citation-${item.contribution_id.slice(-8)}`,
      decision,
      expectedCitation,
      "knowledge.cite_as_evidence",
      {},
      "consumer-valid-domain-case",
    );
    contributionRows.push({
      contribution_id: item.contribution_id,
      channel: item.channel,
      causal_basis: inBasis,
      disposition: decision.evaluation.disposition,
      contract_d_sha256: `sha256:${sha256(citationBytes)}`,
    });
  }

  // Exact repeated inputs and context-key insertion order must not change canonical D bytes.
  for (let i = 0; i < 5; i += 1) {
    assert.deepEqual(canonicalD(evaluate(fixture, claimContext(fixture.value))), claimBytes);
  }
  const original = claimContext(fixture.value);
  const reordered = {
    target: structuredClone(original.target),
    proposition_id: original.proposition_id,
    policy: structuredClone(original.policy),
  };
  assert.deepEqual(canonicalD(evaluate(fixture, reordered)), claimBytes);

  matrix.push({
    case: testCase.name,
    domain: testCase.domain,
    source_class: "consumer-valid-domain-case",
    contract_c_sha256: fixture.sha,
    reported_verdict: proposition.conclusion.reported_verdict,
    completion: proposition.execution.completion,
    claim_disposition: claimDecision.evaluation.disposition,
    citations: contributionRows,
  });
}

// Real CAL v0.5.0 producer control. Expectations are derived from exact released policy predicates,
// not from a hand-authored desired verdict.
const realBytes = readFileSync(resolve(REAL_CAL_CONTRACT_C));
const realFixture = {
  bytes: realBytes,
  value: JSON.parse(realBytes.toString("utf8")),
  sha: `sha256:${sha256(realBytes)}`,
};
for (const proposition of realFixture.value.propositions) {
  const propositionId = proposition.proposition.proposition_id;
  const claimDecision = evaluate(realFixture, claimContext(realFixture.value, propositionId));
  const expectedClaim =
    proposition.execution.state === "completed" &&
    proposition.execution.completion === "assessed" &&
    proposition.conclusion?.reported_verdict === "supported"
      ? { state: "completed", disposition: "clear" }
      : { state: "completed", disposition: "hold" };
  recordDecision(
    `real-cal-${propositionId.replaceAll(/[^A-Za-z0-9_.-]/g, "_")}`,
    "claim",
    claimDecision,
    expectedClaim,
    "knowledge.add_verified_tag",
    { scope: "claim" },
    "real-cal-v0.5.0",
  );

  for (const item of proposition.contributions) {
    const context = citationContext(realFixture.value, propositionId, item.contribution_id);
    const decision = evaluate(realFixture, context);
    const causal = proposition.conclusion?.basis_members?.some(
      (member) => member.namespace === "contribution" && member.id === item.contribution_id,
    );
    const expected =
      proposition.execution.state === "completed" && proposition.execution.completion === "assessed" && causal
        ? { state: "completed", disposition: "clear" }
        : { state: "completed", disposition: "hold" };
    recordDecision(
      `real-cal-${propositionId.replaceAll(/[^A-Za-z0-9_.-]/g, "_")}`,
      `citation-${item.contribution_id.slice(-8)}`,
      decision,
      expected,
      "knowledge.cite_as_evidence",
      {},
      "real-cal-v0.5.0",
    );
  }
}

// Binding/authority attacks.
const caseA = cases[0];
const caseB = cases[1];
expectError("contract_c_whole_object_mismatch", () =>
  evaluateContractCDecision({
    contractCBytes: caseA.fixture.bytes,
    expectedContractCSha256: `sha256:${"0".repeat(64)}`,
    contractCAuthorityRoot: CONTRACT_C_ROOT,
    expectedContractB: expectedContractB(caseA.fixture.value),
    decisionContext: claimContext(caseA.fixture.value),
    pythonExecutable: PYTHON,
  }),
);
const wrongB = expectedContractB(caseA.fixture.value);
wrongB.bundle_hash = `sha256:${"9".repeat(64)}`;
expectError("contract_b_binding_mismatch", () =>
  evaluateContractCDecision({
    contractCBytes: caseA.fixture.bytes,
    expectedContractCSha256: caseA.fixture.sha,
    contractCAuthorityRoot: CONTRACT_C_ROOT,
    expectedContractB: wrongB,
    decisionContext: claimContext(caseA.fixture.value),
    pythonExecutable: PYTHON,
  }),
);
expectError("authority_identity_mismatch", () =>
  evaluateContractCDecision({
    contractCBytes: caseA.fixture.bytes,
    expectedContractCSha256: caseA.fixture.sha,
    contractCAuthorityRoot: CONTRACT_D_ROOT,
    expectedContractB: expectedContractB(caseA.fixture.value),
    decisionContext: claimContext(caseA.fixture.value),
    pythonExecutable: PYTHON,
  }),
);
const unknownPolicy = claimContext(caseA.fixture.value);
unknownPolicy.policy.version = "9.9.9";
expectError("unsupported_policy", () => evaluate(caseA.fixture, unknownPolicy));

// Cross-case claim replay is an evaluation failure and must carry no effect.
const crossClaim = evaluate(caseA.fixture, claimContext(caseB.fixture.value));
assert.deepEqual(crossClaim.evaluation, { state: "failed" });
assert.equal(Object.hasOwn(crossClaim, "effect"), false);
canonicalD(crossClaim);

// Cross-case citation replay is likewise non-positive.
const bContribution = caseB.fixture.value.propositions[0].contributions[0];
const crossCitation = evaluate(
  caseA.fixture,
  citationContext(caseB.fixture.value, caseB.fixture.value.propositions[0].proposition.proposition_id, bContribution.contribution_id),
);
assert.deepEqual(crossCitation.evaluation, { state: "failed" });
assert.equal(Object.hasOwn(crossCitation, "effect"), false);
canonicalD(crossCitation);

// Same logical proposition ID with changed immutable content rejects stale target replay.
const staleValue = structuredClone(caseA.fixture.value);
staleValue.propositions[0].proposition.text_sha256 = sha256(Buffer.from("changed immutable proposition text", "utf8"));
const staleFixture = materialize(staleValue);
expectError("target_binding_mismatch", () => evaluate(staleFixture, claimContext(caseA.fixture.value)));

// Same logical contribution ID with changed immutable evidence content rejects stale citation target replay.
const staleCitationValue = structuredClone(caseA.fixture.value);
staleCitationValue.propositions[0].contributions[0].evidence_ref.passage_sha256 = `sha256:${sha256(Buffer.from("changed passage", "utf8"))}`;
const staleCitationFixture = materialize(staleCitationValue);
const originalContribution = caseA.fixture.value.propositions[0].contributions[0].contribution_id;
expectError("target_binding_mismatch", () =>
  evaluate(
    staleCitationFixture,
    citationContext(caseA.fixture.value, caseA.fixture.value.propositions[0].proposition.proposition_id, originalContribution),
  ),
);

// Caller-controlled implementation substitution remains inert.
let substituted = false;
const baselineClaim = evaluate(caseA.fixture, claimContext(caseA.fixture.value));
const substitutionAttempt = evaluate(caseA.fixture, claimContext(caseA.fixture.value), {
  policyRegistry: new Proxy({}, { get() { substituted = true; return () => ({}); } }),
  evaluatorCallback: () => { substituted = true; return {}; },
});
assert.equal(substituted, false);
assert.deepEqual(substitutionAttempt, baselineClaim);

// Policy-critical metamorphic sensitivity: supported -> contradicted flips Policy A CLEAR -> HOLD.
const contradictedValue = structuredClone(caseA.fixture.value);
contradictedValue.propositions[0].conclusion.reported_verdict = "contradicted";
const contradictedFixture = materialize(contradictedValue);
assert.deepEqual(evaluate(contradictedFixture, claimContext(contradictedFixture.value)).evaluation, {
  state: "completed",
  disposition: "hold",
});

// Policy B sensitivity: move exact contribution from basis to residual while Policy A stays CLEAR.
const residualValue = structuredClone(caseA.fixture.value);
const residualId = residualValue.propositions[0].contributions[0].contribution_id;
residualValue.propositions[0].conclusion.causal_form = "redundant_non_deciding";
residualValue.propositions[0].conclusion.basis_members = [];
residualValue.propositions[0].conclusion.residual_contribution_ids = [residualId];
const residualFixture = materialize(residualValue);
assert.deepEqual(evaluate(residualFixture, claimContext(residualFixture.value)).evaluation, {
  state: "completed",
  disposition: "clear",
});
assert.deepEqual(
  evaluate(
    residualFixture,
    citationContext(residualFixture.value, residualFixture.value.propositions[0].proposition.proposition_id, residualId),
  ).evaluation,
  { state: "completed", disposition: "hold" },
);

// Known documented invariance: generic assessment adverse/failed does not change current V1 policy core.
const adverseValue = structuredClone(caseA.fixture.value);
adverseValue.propositions[0].assessments = {
  eligibility: { state: "performed", value: "adverse" },
  semantic_validity: { state: "failed" },
  aperture_completeness: { state: "performed", value: "adverse" },
  temporal_applicability: { state: "performed", value: "adverse" },
};
const adverseFixture = materialize(adverseValue);
assert.deepEqual(evaluate(adverseFixture, claimContext(adverseFixture.value)).evaluation, {
  state: "completed",
  disposition: "clear",
});
assert.deepEqual(
  evaluate(
    adverseFixture,
    citationContext(adverseFixture.value, adverseFixture.value.propositions[0].proposition.proposition_id, adverseFixture.value.propositions[0].contributions[0].contribution_id),
  ).evaluation,
  { state: "completed", disposition: "clear" },
);

// CLI/library parity on real CAL first proposition and one synthetic positive case.
function cliParity(fixture, context, label) {
  const cliDir = resolve(OUTPUT_DIR, "cli", label);
  mkdirSync(cliDir, { recursive: true });
  const cPath = resolve(cliDir, "contract-c.json");
  const bPath = resolve(cliDir, "expected-b.json");
  const contextPath = resolve(cliDir, "context.json");
  writeFileSync(cPath, fixture.bytes);
  writeJson(bPath, expectedContractB(fixture.value));
  const contextWithoutPolicy = structuredClone(context);
  const policy = contextWithoutPolicy.policy;
  delete contextWithoutPolicy.policy;
  writeJson(contextPath, contextWithoutPolicy);
  const args = [
    resolve(SUBJECT, "scripts/decision-engine-evaluate.mjs"),
    "--contract-c", cPath,
    "--contract-c-sha256", fixture.sha,
    "--contract-c-authority", CONTRACT_C_ROOT,
    "--contract-d-authority", CONTRACT_D_ROOT,
    "--expected-contract-b", bPath,
    "--policy", `${policy.id}@${policy.version}`,
    "--context", contextPath,
    "--python", PYTHON,
  ];
  const result = spawnSync(process.execPath, args, { encoding: null });
  assert.equal(result.status, 0, result.stderr?.toString("utf8") || `CLI failed for ${label}`);
  assert.equal(result.stderr.length, 0);
  const libraryBytes = canonicalD(evaluate(fixture, context));
  assert.deepEqual(result.stdout, libraryBytes);
  writeFileSync(resolve(cliDir, "contract-d.json"), result.stdout);
  return `sha256:${sha256(result.stdout)}`;
}
const realFirstId = realFixture.value.propositions[0].proposition.proposition_id;
const realCliSha = cliParity(realFixture, claimContext(realFixture.value, realFirstId), "real-cal-first-claim");
const syntheticCliSha = cliParity(caseA.fixture, claimContext(caseA.fixture.value), "synthetic-mainframe-claim");

const capabilityGaps = [
  ["mainframe_note_lifecycle_promotion", "Approve a complete MainFrame synthesis note for lifecycle promotion."],
  ["controlled_document_approval", "Approve or reject an SOP/controlled document as a document-level object."],
  ["regulated_publication_approval", "Approve a regulated claim or artifact for publication/use."],
  ["typed_human_review_required", "Emit a typed require-human-review decision/effect."],
  ["evidence_remediation_request", "Request retrieval, sourcing, or evidence remediation."],
  ["task_dispatch", "Dispatch a task from maintained V1 policy."],
  ["release_qualification_approval", "Approve a software/research release or qualification artifact."],
  ["aggregate_multiclaim_approval", "Approve a document/note based on aggregate state across multiple claims."],
  ["conditional_approval", "Represent approve-with-caveats or conditional approval as a maintained policy outcome."],
  ["explicit_negative_action", "Represent reject/remove/retract as a typed candidate effect rather than HOLD."],
].map(([id, question]) => ({
  id,
  question,
  classification: "CAPABILITY_GAP",
  reason: "Decision Engine v1.0.0 maintains only verified-claim tagging and causal-basis citation policies; no approximate substitution was used.",
}));

writeJson(resolve(OUTPUT_DIR, "domain-matrix.json"), matrix);
writeJson(resolve(OUTPUT_DIR, "decision-index.json"), decisionIndex);
writeJson(resolve(OUTPUT_DIR, "capability-gap-map.json"), capabilityGaps);

const receipt = {
  status: "PASS",
  subject: "decision-engine-v1.0.0-release-artifact",
  maintained_policy_count: 2,
  domain_case_count: cases.length,
  domain_families: [...new Set(cases.map((item) => item.domain))].sort(),
  real_cal_v0_5_0_contract_c_consumed: true,
  real_cal_contract_c_sha256: realFixture.sha,
  generated_decision_count: decisionIndex.length,
  exact_repeat_determinism: true,
  context_key_order_invariance: true,
  wrong_contract_c_identity_rejected: true,
  wrong_contract_b_binding_rejected: true,
  wrong_contract_c_authority_rejected: true,
  unknown_policy_rejected: true,
  cross_case_claim_replay_nonpositive: true,
  cross_case_citation_replay_nonpositive: true,
  stale_claim_target_rejected: true,
  stale_citation_target_rejected: true,
  caller_implementation_substitution_blocked: true,
  policy_a_verdict_sensitivity: true,
  policy_b_basis_membership_sensitivity: true,
  documented_assessment_stage_invariance_reproduced: true,
  cli_library_parity: true,
  real_cal_cli_sha256: realCliSha,
  synthetic_cli_sha256: syntheticCliSha,
  capability_gap_count: capabilityGaps.length,
  authorization_performed: false,
  execution_performed: false,
  maintained_runtime_modified: false,
};
writeJson(resolve(OUTPUT_DIR, "pressure-receipt.json"), receipt);
console.log(JSON.stringify(receipt));
