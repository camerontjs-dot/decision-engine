import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { evaluateContractCDecision } from "../../src/contractCDecisionRuntime.js";
import {
  CAUSAL_BASIS_CITATION_POLICY,
  citationTargetForContractC,
} from "../../src/contractCBasisCitationDecision.js";
import { SUPPORTED_CLAIM_VERIFICATION_POLICY } from "../../src/contractCDecision.js";
import { canonicalizeContractDWithAuthority } from "../../src/contractDCanonicalOutput.js";

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) out[argv[i]] = argv[i + 1];
  for (const key of ["--manifest", "--contract-c-authority", "--contract-d-authority", "--out-dir"]) {
    if (!out[key]) throw new Error(`missing ${key}`);
  }
  return out;
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function stable(value) {
  return JSON.stringify(value);
}

function policyIdentity(policy) {
  return { id: policy.id, version: policy.version };
}

function expectError(code, fn) {
  try {
    fn();
  } catch (error) {
    expect(error?.code === code, `expected ${code}, got ${error?.code}: ${error?.message}`);
    return { code, message: error.message };
  }
  throw new Error(`expected ${code} but call succeeded`);
}

function targetProposition(contractC, propositionId) {
  const rows = contractC.propositions.filter(
    (row) => row.proposition.proposition_id === propositionId,
  );
  expect(rows.length === 1, `expected exactly one target proposition ${propositionId}`);
  return rows[0];
}

function claimContext(contractC, propositionId) {
  const row = targetProposition(contractC, propositionId);
  return {
    policy: policyIdentity(SUPPORTED_CLAIM_VERIFICATION_POLICY),
    proposition_id: propositionId,
    target: {
      kind: "claim",
      id: propositionId,
      content_sha256: `sha256:${row.proposition.text_sha256}`,
    },
  };
}

function citationContext(contractC, propositionId, contributionId) {
  const target = citationTargetForContractC(contractC, propositionId, contributionId);
  expect(target, `could not derive citation target for ${propositionId}/${contributionId}`);
  return {
    policy: policyIdentity(CAUSAL_BASIS_CITATION_POLICY),
    proposition_id: propositionId,
    contribution_id: contributionId,
    target,
  };
}

// Dependency means a change in the actual policy decision, not a diagnostic echo.
function policyCore(decision) {
  return {
    evaluation: decision.evaluation,
    effect: decision.effect ?? null,
    reason_codes: decision.metadata?.reason_codes ?? [],
  };
}

function diagnostics(decision) {
  return decision.metadata?.diagnostics ?? null;
}

const EXPECTED = {
  baseline_supported: {
    claim: ["clear", "contract_c_supported"],
    citation: ["clear", "contract_c_contribution_in_causal_basis"],
  },
  producer_semantic_identity: {
    claim: ["clear", "contract_c_supported"],
    citation: ["clear", "contract_c_contribution_in_causal_basis"],
  },
  producer_policy_identity: {
    claim: ["clear", "contract_c_supported"],
    citation: ["clear", "contract_c_contribution_in_causal_basis"],
  },
  assessment_eligibility_adverse: {
    claim: ["clear", "contract_c_supported"],
    citation: ["clear", "contract_c_contribution_in_causal_basis"],
  },
  assessment_semantic_validity_adverse: {
    claim: ["clear", "contract_c_supported"],
    citation: ["clear", "contract_c_contribution_in_causal_basis"],
  },
  assessment_aperture_unknown: {
    claim: ["clear", "contract_c_supported"],
    citation: ["clear", "contract_c_contribution_in_causal_basis"],
  },
  assessment_temporal_failed: {
    claim: ["clear", "contract_c_supported"],
    citation: ["clear", "contract_c_contribution_in_causal_basis"],
  },
  measurement_toggle: {
    claim: ["clear", "contract_c_supported"],
    citation: ["clear", "contract_c_contribution_in_causal_basis"],
  },
  terminal_branch_identity: {
    claim: ["clear", "contract_c_supported"],
    citation: ["clear", "contract_c_contribution_in_causal_basis"],
  },
  reported_verdict_contradicted: {
    claim: ["hold", "contract_c_reported_verdict_not_supported"],
    citation: ["clear", "contract_c_contribution_in_causal_basis"],
  },
  contribution_channel_counterevidence: {
    claim: ["clear", "contract_c_supported"],
    citation: ["clear", "contract_c_contribution_in_causal_basis"],
  },
  basis_membership_to_residual: {
    claim: ["clear", "contract_c_supported"],
    citation: ["hold", "contract_c_contribution_residual_non_deciding"],
  },
  proposition_not_checkable: {
    claim: ["hold", "contract_c_proposition_not_checkable"],
    citation: ["hold", "contract_c_proposition_not_checkable"],
  },
  proposition_execution_incomplete: {
    claim: ["hold", "contract_c_proposition_execution_incomplete"],
    citation: ["hold", "contract_c_proposition_execution_incomplete"],
  },
  result_execution_incomplete: {
    claim: ["hold", "contract_c_result_execution_incomplete"],
    citation: ["hold", "contract_c_result_execution_incomplete"],
  },
};

const NON_LOAD_BEARING = {
  claim: [
    "producer_semantic_identity",
    "producer_policy_identity",
    "assessment_eligibility_adverse",
    "assessment_semantic_validity_adverse",
    "assessment_aperture_unknown",
    "assessment_temporal_failed",
    "measurement_toggle",
    "terminal_branch_identity",
    "contribution_channel_counterevidence",
    "basis_membership_to_residual",
  ],
  citation: [
    "producer_semantic_identity",
    "producer_policy_identity",
    "assessment_eligibility_adverse",
    "assessment_semantic_validity_adverse",
    "assessment_aperture_unknown",
    "assessment_temporal_failed",
    "measurement_toggle",
    "terminal_branch_identity",
    "reported_verdict_contradicted",
    "contribution_channel_counterevidence",
  ],
};

function assertExpected(rowName, policyName, decision) {
  const [disposition, reason] = EXPECTED[rowName][policyName];
  expect(decision.evaluation?.state === "completed", `${rowName}/${policyName}: not completed`);
  expect(
    decision.evaluation?.disposition === disposition,
    `${rowName}/${policyName}: expected ${disposition}, got ${decision.evaluation?.disposition}`,
  );
  expect(
    (decision.metadata?.reason_codes ?? []).includes(reason),
    `${rowName}/${policyName}: expected reason ${reason}`,
  );
}

function evaluateRow({ row, family, propositionId, expectedContractB, contractCAuthorityRoot, contractDAuthorityRoot }) {
  const path = resolve(row.path);
  const contractCBytes = readFileSync(path);
  const exactContractCSha256 = sha256(contractCBytes);
  expect(exactContractCSha256 === row.contract_c_sha256, `${family}/${row.row}: C SHA drift`);
  const contractC = JSON.parse(contractCBytes.toString("utf8"));
  const proposition = targetProposition(contractC, propositionId);
  expect(proposition.contributions.length >= 1, `${family}/${row.row}: target contribution missing`);
  expect(row.target_contribution_id, `${family}/${row.row}: contribution id absent`);

  const claimDecision = evaluateContractCDecision({
    contractCBytes,
    expectedContractCSha256: exactContractCSha256,
    contractCAuthorityRoot,
    expectedContractB,
    decisionContext: claimContext(contractC, propositionId),
  });
  const citationDecision = evaluateContractCDecision({
    contractCBytes,
    expectedContractCSha256: exactContractCSha256,
    contractCAuthorityRoot,
    expectedContractB,
    decisionContext: citationContext(contractC, propositionId, row.target_contribution_id),
  });

  assertExpected(row.row, "claim", claimDecision);
  assertExpected(row.row, "citation", citationDecision);

  const claimD = canonicalizeContractDWithAuthority({ decision: claimDecision, contractDAuthorityRoot });
  const citationD = canonicalizeContractDWithAuthority({ decision: citationDecision, contractDAuthorityRoot });

  return {
    row: row.row,
    classification: row.classification,
    contract_c_sha256: exactContractCSha256,
    claim: {
      core: policyCore(claimDecision),
      diagnostics: diagnostics(claimDecision),
      contract_d_sha256: sha256(claimD),
    },
    citation: {
      core: policyCore(citationDecision),
      diagnostics: diagnostics(citationDecision),
      contract_d_sha256: sha256(citationD),
    },
  };
}

function runInvalidControls({ family, propositionId, expectedContractB, contractCAuthorityRoot }) {
  const baseline = family.rows.find((row) => row.row === "baseline_supported");
  expect(baseline, `${family.family}: baseline missing`);
  const bytes = readFileSync(resolve(baseline.path));
  const exactSha = sha256(bytes);
  const value = JSON.parse(bytes.toString("utf8"));
  const claim = claimContext(value, propositionId);
  const citation = citationContext(value, propositionId, baseline.target_contribution_id);

  const wrongSha = expectError("contract_c_whole_object_mismatch", () =>
    evaluateContractCDecision({
      contractCBytes: bytes,
      expectedContractCSha256: `sha256:${"0".repeat(64)}`,
      contractCAuthorityRoot,
      expectedContractB,
      decisionContext: claim,
    }),
  );
  const wrongB = expectError("contract_b_binding_mismatch", () =>
    evaluateContractCDecision({
      contractCBytes: bytes,
      expectedContractCSha256: exactSha,
      contractCAuthorityRoot,
      expectedContractB: { ...expectedContractB, bundle_hash: `sha256:${"0".repeat(64)}` },
      decisionContext: claim,
    }),
  );
  const wrongClaimTarget = expectError("target_binding_mismatch", () =>
    evaluateContractCDecision({
      contractCBytes: bytes,
      expectedContractCSha256: exactSha,
      contractCAuthorityRoot,
      expectedContractB,
      decisionContext: {
        ...claim,
        target: { ...claim.target, content_sha256: `sha256:${"0".repeat(64)}` },
      },
    }),
  );
  const wrongCitationTarget = expectError("target_binding_mismatch", () =>
    evaluateContractCDecision({
      contractCBytes: bytes,
      expectedContractCSha256: exactSha,
      contractCAuthorityRoot,
      expectedContractB,
      decisionContext: {
        ...citation,
        target: { ...citation.target, content_sha256: `sha256:${"0".repeat(64)}` },
      },
    }),
  );

  const invalid = family.invalid_control;
  const invalidBytes = readFileSync(resolve(invalid.path));
  const invalidPolicyHash = expectError("contract_c_validation_failed", () =>
    evaluateContractCDecision({
      contractCBytes: invalidBytes,
      expectedContractCSha256: invalid.contract_c_sha256,
      contractCAuthorityRoot,
      expectedContractB,
      decisionContext: claim,
    }),
  );

  return {
    wrong_contract_c_sha: wrongSha.code,
    wrong_contract_b_binding: wrongB.code,
    wrong_claim_target_hash: wrongClaimTarget.code,
    wrong_citation_target_hash: wrongCitationTarget.code,
    invalid_producer_policy_hash: invalidPolicyHash.code,
  };
}

function runFamily({ family, manifest, contractCAuthorityRoot, contractDAuthorityRoot, outRoot }) {
  const propositionId = family.proposition_id;
  const expectedContractB = manifest.contract_b;
  const rows = family.rows.map((row) =>
    evaluateRow({
      row,
      family: family.family,
      propositionId,
      expectedContractB,
      contractCAuthorityRoot,
      contractDAuthorityRoot,
    }),
  );
  const baseline = rows.find((row) => row.row === "baseline_supported");
  expect(baseline, `${family.family}: evaluated baseline missing`);

  const invariants = { claim: [], citation: [] };
  for (const policyName of ["claim", "citation"]) {
    for (const rowName of NON_LOAD_BEARING[policyName]) {
      const row = rows.find((item) => item.row === rowName);
      expect(row, `${family.family}: missing ${rowName}`);
      const coreInvariant = stable(row[policyName].core) === stable(baseline[policyName].core);
      expect(coreInvariant, `${family.family}/${rowName}: ${policyName} policy core changed unexpectedly`);
      invariants[policyName].push({
        row: rowName,
        core_invariant: true,
        diagnostics_changed: stable(row[policyName].diagnostics) !== stable(baseline[policyName].diagnostics),
      });
    }
  }

  const invalidControls = runInvalidControls({
    family,
    propositionId,
    expectedContractB,
    contractCAuthorityRoot,
  });

  const familyOut = join(outRoot, family.family);
  mkdirSync(familyOut, { recursive: true });
  const result = {
    family: family.family,
    proposition_id: propositionId,
    rows,
    non_load_bearing_invariants: invariants,
    invalid_controls: invalidControls,
  };
  writeFileSync(join(familyOut, "observations.json"), `${JSON.stringify(result, null, 2)}\n`);
  return result;
}

const args = parseArgs(process.argv.slice(2));
const manifest = JSON.parse(readFileSync(resolve(args["--manifest"]), "utf8"));
const contractCAuthorityRoot = resolve(args["--contract-c-authority"]);
const contractDAuthorityRoot = resolve(args["--contract-d-authority"]);
const outRoot = resolve(args["--out-dir"]);
mkdirSync(outRoot, { recursive: true });

expect(manifest.same_exact_contract_b === true, "producer families do not share exact Contract B");
expect(manifest.same_exact_proposition === true, "producer families do not share exact proposition");
expect(manifest.families.length === 2, "expected exactly two producer families");

const familyResults = manifest.families.map((family) =>
  runFamily({ family, manifest, contractCAuthorityRoot, contractDAuthorityRoot, outRoot }),
);
const byName = Object.fromEntries(familyResults.map((family) => [family.family, family]));
expect(byName.cal && byName.shadow, "expected cal and shadow families");

const equivalence = [];
for (const calRow of byName.cal.rows) {
  const shadowRow = byName.shadow.rows.find((row) => row.row === calRow.row);
  expect(shadowRow, `shadow row missing: ${calRow.row}`);
  const claimCoreEquivalent = stable(calRow.claim.core) === stable(shadowRow.claim.core);
  const citationCoreEquivalent = stable(calRow.citation.core) === stable(shadowRow.citation.core);
  const claimDiagnosticsEquivalent = stable(calRow.claim.diagnostics) === stable(shadowRow.claim.diagnostics);
  const citationDiagnosticsEquivalent = stable(calRow.citation.diagnostics) === stable(shadowRow.citation.diagnostics);
  expect(claimCoreEquivalent, `claim policy core diverged across producers: ${calRow.row}`);
  expect(citationCoreEquivalent, `citation policy core diverged across producers: ${calRow.row}`);
  expect(claimDiagnosticsEquivalent, `claim diagnostics diverged across producers: ${calRow.row}`);
  expect(citationDiagnosticsEquivalent, `citation diagnostics diverged across producers: ${calRow.row}`);
  equivalence.push({
    row: calRow.row,
    claim_core_equivalent: true,
    citation_core_equivalent: true,
    claim_diagnostics_equivalent: true,
    citation_diagnostics_equivalent: true,
  });
}

const result = {
  schema: "cross-producer-policy-dependency-matrix-result-v2",
  status: "PASS",
  decision_engine_head: process.env.DECISION_ENGINE_RESEARCH_HEAD ?? null,
  decision_engine_base: process.env.DECISION_ENGINE_BASE ?? null,
  contract_b: manifest.contract_b,
  proposition: manifest.proposition,
  same_exact_contract_b: true,
  same_exact_proposition: true,
  normative_noncal_contract_c_conformance_claimed: false,
  dependency_semantics: {
    policy_core: ["evaluation", "effect", "reason_codes"],
    diagnostics_recorded_separately: true,
  },
  cross_producer_equivalence: equivalence,
  preregistered_non_load_bearing_policy_core_invariant: true,
  observed_dependency_summary: {
    supported_claim_verification: {
      load_bearing_for_policy_core: [
        "result_execution",
        "proposition_execution",
        "proposition_completion",
        "reported_verdict",
      ],
      non_load_bearing_for_policy_core: [
        "producer_semantic_identity",
        "producer_policy_identity",
        "assessment_stages",
        "measurement",
        "terminal_branch",
        "contribution_channel",
        "causal_basis_membership",
      ],
    },
    causal_basis_citation: {
      load_bearing_for_policy_core: [
        "result_execution",
        "proposition_execution",
        "proposition_completion",
        "causal_basis_membership",
      ],
      non_load_bearing_for_policy_core: [
        "producer_semantic_identity",
        "producer_policy_identity",
        "assessment_stages",
        "measurement",
        "terminal_branch",
        "reported_verdict",
        "contribution_channel",
      ],
      diagnostic_only_observation: "contribution_channel is echoed in diagnostics but does not change disposition, effect, or reason",
    },
  },
  invalid_controls_passed: true,
  authorization_performed: false,
  execution_performed: false,
  families: familyResults,
  nonclaims: [
    "The shadow producer is not claimed to be a normatively conforming Contract C 1.0.0 producer.",
    "Validator-accepted counterfactual rows are not claims of producer reachability.",
    "This does not establish semantic correctness of either producer.",
    "This does not authorize a maintained Decision refactor.",
    "This does not establish Authorization or execution.",
  ],
};

writeFileSync(join(outRoot, "MATRIX-RESULT.json"), `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
