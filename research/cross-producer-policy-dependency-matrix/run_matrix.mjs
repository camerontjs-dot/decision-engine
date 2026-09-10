import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

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

function sha256(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
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

function semanticSignature(decision) {
  return {
    evaluation: decision.evaluation,
    effect: decision.effect ?? null,
    reason_codes: decision.metadata?.reason_codes ?? [],
    diagnostics: decision.metadata?.diagnostics ?? null,
  };
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

function runFamily({ family, manifest, contractCAuthorityRoot, contractDAuthorityRoot, outRoot }) {
  const propositionId = family.proposition_id;
  const expectedContractB = manifest.contract_b;
  const familyOut = join(outRoot, family.family);
  mkdirSync(familyOut, { recursive: true });

  let baselineSha = null;
  const observations = [];
  for (const row of family.rows) {
    const path = resolve(row.path);
    const contractCBytes = readFileSync(path);
    const exactContractCSha256 = sha256(contractCBytes);
    expect(exactContractCSha256 === row.contract_c_sha256, `${family.family}/${row.row}: manifest SHA drift`);
    const contractC = JSON.parse(contractCBytes.toString("utf8"));
    const proposition = targetProposition(contractC, propositionId);
    expect(proposition.contributions.length >= 1, `${family.family}/${row.row}: target contribution missing`);
    const contributionId = row.target_contribution_id;
    expect(contributionId, `${family.family}/${row.row}: target contribution id absent`);

    const claimCtx = claimContext(contractC, propositionId);
    const citationCtx = citationContext(contractC, propositionId, contributionId);

    const claimDecision = evaluateContractCDecision({
      contractCBytes,
      expectedContractCSha256: exactContractCSha256,
      contractCAuthorityRoot,
      expectedContractB,
      decisionContext: claimCtx,
    });
    const citationDecision = evaluateContractCDecision({
      contractCBytes,
      expectedContractCSha256: exactContractCSha256,
      contractCAuthorityRoot,
      expectedContractB,
      decisionContext: citationCtx,
    });

    assertExpected(row.row, "claim", claimDecision);
    assertExpected(row.row, "citation", citationDecision);

    const claimD = canonicalizeContractDWithAuthority({
      decision: claimDecision,
      contractDAuthorityRoot,
    });
    const citationD = canonicalizeContractDWithAuthority({
      decision: citationDecision,
      contractDAuthorityRoot,
    });

    if (row.row === "baseline_supported") baselineSha = exactContractCSha256;
    observations.push({
      row: row.row,
      classification: row.classification,
      contract_c_sha256: exactContractCSha256,
      authority_changed_from_baseline:
        row.row === "baseline_supported" ? false : exactContractCSha256 !== baselineSha,
      claim: {
        semantic_signature: semanticSignature(claimDecision),
        contract_d_sha256: sha256(claimD),
      },
      citation: {
        semantic_signature: semanticSignature(citationDecision),
        contract_d_sha256: sha256(citationD),
      },
    });
  }

  const baseline = family.rows.find((row) => row.row === "baseline_supported");
  expect(baseline, `${family.family}: baseline missing`);
  const baselineBytes = readFileSync(resolve(baseline.path));
  const baselineC = JSON.parse(baselineBytes.toString("utf8"));
  const baselineShaExact = sha256(baselineBytes);
  const baselineClaim = claimContext(baselineC, propositionId);
  const baselineContribution = baseline.target_contribution_id;
  const baselineCitation = citationContext(baselineC, propositionId, baselineContribution);

  const wrongSha = expectError("contract_c_whole_object_mismatch", () =>
    evaluateContractCDecision({
      contractCBytes: baselineBytes,
      expectedContractCSha256: `sha256:${"0".repeat(64)}`,
      contractCAuthorityRoot,
      expectedContractB,
      decisionContext: baselineClaim,
    }),
  );
  const wrongB = expectError("contract_b_binding_mismatch", () =>
    evaluateContractCDecision({
      contractCBytes: baselineBytes,
      expectedContractCSha256: baselineShaExact,
      contractCAuthorityRoot,
      expectedContractB: { ...expectedContractB, bundle_hash: `sha256:${"0".repeat(64)}` },
      decisionContext: baselineClaim,
    }),
  );
  const wrongClaimTarget = expectError("target_binding_mismatch", () =>
    evaluateContractCDecision({
      contractCBytes: baselineBytes,
      expectedContractCSha256: baselineShaExact,
      contractCAuthorityRoot,
      expectedContractB,
      decisionContext: {
        ...baselineClaim,
        target: { ...baselineClaim.target, content_sha256: `sha256:${"0".repeat(64)}` },
      },
    }),
  );
  const wrongCitationTarget = expectError("target_binding_mismatch", () =>
    evaluateContractCDecision({
      contractCBytes: baselineBytes,
      expectedContractCSha256: baselineShaExact,
      contractCAuthorityRoot,
      expectedContractB,
      decisionContext: {
        ...baselineCitation,
        target: { ...baselineCitation.target, content_sha256: `sha256:${"0".repeat(64)}` },
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
      decisionContext: baselineClaim,
    }),
  );

  const result = {
    family: family.family,
    proposition_id: propositionId,
    rows: observations,
    invalid_controls: {
      wrong_contract_c_sha: wrongSha.code,
      wrong_contract_b_binding: wrongB.code,
      wrong_claim_target_hash: wrongClaimTarget.code,
      wrong_citation_target_hash: wrongCitationTarget.code,
      invalid_producer_policy_hash: invalidPolicyHash.code,
    },
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
  const claimEquivalent =
    JSON.stringify(calRow.claim.semantic_signature) === JSON.stringify(shadowRow.claim.semantic_signature);
  const citationEquivalent =
    JSON.stringify(calRow.citation.semantic_signature) === JSON.stringify(shadowRow.citation.semantic_signature);
  expect(claimEquivalent, `claim semantic signature diverged across producers: ${calRow.row}`);
  expect(citationEquivalent, `citation semantic signature diverged across producers: ${calRow.row}`);
  equivalence.push({ row: calRow.row, claim_equivalent: true, citation_equivalent: true });
}

const nonLoadBearingRows = [
  "producer_semantic_identity",
  "producer_policy_identity",
  "assessment_eligibility_adverse",
  "assessment_semantic_validity_adverse",
  "assessment_aperture_unknown",
  "assessment_temporal_failed",
  "measurement_toggle",
  "terminal_branch_identity",
  "contribution_channel_counterevidence",
];
const baselineCal = byName.cal.rows.find((row) => row.row === "baseline_supported");
const baselineShadow = byName.shadow.rows.find((row) => row.row === "baseline_supported");
for (const family of [byName.cal, byName.shadow]) {
  const baseline = family.rows.find((row) => row.row === "baseline_supported");
  for (const rowName of nonLoadBearingRows) {
    const row = family.rows.find((item) => item.row === rowName);
    expect(row, `${family.family}: missing non-load-bearing row ${rowName}`);
    expect(
      JSON.stringify(row.claim.semantic_signature) === JSON.stringify(baseline.claim.semantic_signature),
      `${family.family}/${rowName}: claim changed on preregistered non-load-bearing dimension`,
    );
    expect(
      JSON.stringify(row.citation.semantic_signature) === JSON.stringify(baseline.citation.semantic_signature),
      `${family.family}/${rowName}: citation changed on preregistered non-load-bearing dimension`,
    );
  }
}

const result = {
  schema: "cross-producer-policy-dependency-matrix-result-v1",
  status: "PASS",
  decision_engine_head: process.env.DECISION_ENGINE_RESEARCH_HEAD ?? null,
  decision_engine_base: process.env.DECISION_ENGINE_BASE ?? null,
  contract_b: manifest.contract_b,
  proposition: manifest.proposition,
  same_exact_contract_b: true,
  same_exact_proposition: true,
  normative_noncal_contract_c_conformance_claimed: false,
  cross_producer_semantic_equivalence: equivalence,
  preregistered_non_load_bearing_dimensions_invariant: true,
  observed_dependency_summary: {
    supported_claim_verification: {
      load_bearing: [
        "result_execution",
        "proposition_execution",
        "proposition_completion",
        "reported_verdict",
      ],
      observed_non_load_bearing: [
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
      load_bearing: [
        "result_execution",
        "proposition_execution",
        "proposition_completion",
        "causal_basis_membership",
      ],
      observed_non_load_bearing: [
        "producer_semantic_identity",
        "producer_policy_identity",
        "assessment_stages",
        "measurement",
        "terminal_branch",
        "reported_verdict",
        "contribution_channel",
      ],
    },
  },
  invalid_controls_passed: true,
  authorization_performed: false,
  execution_performed: false,
  families: familyResults,
  nonclaims: [
    "The independent shadow producer is not claimed to be a normatively conforming Contract C 1.0.0 producer.",
    "Validator-accepted counterfactual rows are not claims of producer reachability.",
    "This does not establish semantic correctness of either producer.",
    "This does not authorize a maintained Decision refactor.",
    "This does not establish Authorization or execution.",
  ],
};

writeFileSync(join(outRoot, "MATRIX-RESULT.json"), `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
