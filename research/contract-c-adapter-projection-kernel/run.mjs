import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  ContractCDecisionError,
  SUPPORTED_CLAIM_VERIFICATION_POLICY,
  decideContractCToContractD,
} from "../../src/contractCDecision.js";
import {
  CAUSAL_BASIS_CITATION_POLICY,
  citationTargetForContractC,
  decideContractCBasisCitationToContractD,
} from "../../src/contractCBasisCitationDecision.js";
import { canonicalizeContractDWithAuthority } from "../../src/contractDCanonicalOutput.js";
import { projectDecision } from "./projectionKernel.mjs";
import {
  admitExactContractC,
  resolveCitationTarget,
  resolveClaimTarget,
} from "./contractCAdapter.mjs";
import { CONTRACT_C_PROJECTION_POLICY_REGISTRY } from "./contractCPolicies.mjs";

import {
  evaluateAuthorityBoundPolicy,
} from "../release-qualification-assessment-authority-kernel/kernel.mjs";
import { produceCanonicalAssessmentAuthority } from "../release-qualification-assessment-authority-kernel/producer.mjs";
import {
  REGRESSION_REVIEW_POLICY,
  RELEASE_POLICY_REGISTRY,
} from "../release-qualification-assessment-authority-kernel/releasePolicies.mjs";
import {
  canonicalBytes,
  sha256Bytes,
} from "../release-qualification-assessment-authority-kernel/canonical.mjs";
import { produceCanonicalTaskResultAssessment } from "../agent-result-assessment-authority-kernel/producer.mjs";
import {
  TASK_RESULT_POLICY_REGISTRY,
  VERIFIED_RESULT_CONTINUATION_POLICY,
} from "../agent-result-assessment-authority-kernel/policies.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

function args() {
  const values = new Map();
  for (let index = 2; index < process.argv.length; index += 2) {
    values.set(process.argv[index], process.argv[index + 1]);
  }
  for (const key of ["--contract-c-root", "--contract-d-root", "--rc1-root", "--out"]) {
    if (!values.get(key)) throw new Error(`missing ${key}`);
  }
  return {
    contractCRoot: values.get("--contract-c-root"),
    contractDRoot: values.get("--contract-d-root"),
    rc1Root: values.get("--rc1-root"),
    outDir: values.get("--out"),
  };
}

function digest(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function expectContractCError(code, fn) {
  try {
    fn();
  } catch (error) {
    assert.ok(error instanceof ContractCDecisionError, `unexpected error type: ${error}`);
    assert.equal(error.code, code);
    return;
  }
  assert.fail(`expected ${code}`);
}

function loadFixture(filePath) {
  const bytes = readFileSync(filePath);
  return {
    bytes,
    value: JSON.parse(bytes.toString("utf8")),
    sha: digest(bytes),
  };
}

function expectedB(value) {
  return structuredClone(value.input.contract_b);
}

function claimContext(value, propositionId = value.propositions[0].proposition.proposition_id) {
  const proposition = value.propositions.find(
    (item) => item.proposition.proposition_id === propositionId,
  );
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

function projectClaim({ fixture, context, contractCRoot, contractDRoot, expectedContractB = expectedB(fixture.value) }) {
  const admitted = admitExactContractC({
    contractCBytes: fixture.bytes,
    expectedContractCSha256: fixture.sha,
    contractCAuthorityRoot: contractCRoot,
    expectedContractB,
    pythonExecutable: "python3",
  });
  const resolution = resolveClaimTarget({
    authority: admitted.authority,
    propositionId: context.proposition_id,
    target: context.target,
  });
  return projectDecision({
    admittedAuthority: admitted.authority,
    inputAuthority: admitted.inputAuthority,
    resolvedTarget: resolution,
    policy: context.policy,
    policyRegistry: CONTRACT_C_PROJECTION_POLICY_REGISTRY,
    contractDAuthorityRoot: contractDRoot,
  });
}

function projectCitation({ fixture, context, contractCRoot, contractDRoot, expectedContractB = expectedB(fixture.value) }) {
  const admitted = admitExactContractC({
    contractCBytes: fixture.bytes,
    expectedContractCSha256: fixture.sha,
    contractCAuthorityRoot: contractCRoot,
    expectedContractB,
    pythonExecutable: "python3",
  });
  const resolution = resolveCitationTarget({
    authority: admitted.authority,
    propositionId: context.proposition_id,
    contributionId: context.contribution_id,
    target: context.target,
  });
  return projectDecision({
    admittedAuthority: admitted.authority,
    inputAuthority: admitted.inputAuthority,
    resolvedTarget: resolution,
    policy: context.policy,
    policyRegistry: CONTRACT_C_PROJECTION_POLICY_REGISTRY,
    contractDAuthorityRoot: contractDRoot,
  });
}

function maintainedClaimBytes({ fixture, context, contractCRoot, contractDRoot, expectedContractB = expectedB(fixture.value) }) {
  const decision = decideContractCToContractD({
    contractCBytes: fixture.bytes,
    expectedContractCSha256: fixture.sha,
    contractCAuthorityRoot: contractCRoot,
    expectedContractB,
    decisionContext: context,
    pythonExecutable: "python3",
  });
  return {
    decision,
    bytes: canonicalizeContractDWithAuthority({ decision, contractDAuthorityRoot: contractDRoot }),
  };
}

function maintainedCitationBytes({ fixture, context, contractCRoot, contractDRoot, expectedContractB = expectedB(fixture.value) }) {
  const decision = decideContractCBasisCitationToContractD({
    contractCBytes: fixture.bytes,
    expectedContractCSha256: fixture.sha,
    contractCAuthorityRoot: contractCRoot,
    expectedContractB,
    decisionContext: context,
    pythonExecutable: "python3",
  });
  return {
    decision,
    bytes: canonicalizeContractDWithAuthority({ decision, contractDAuthorityRoot: contractDRoot }),
  };
}

function compareExact(name, maintained, projected, outDir) {
  assert.ok(maintained.bytes.equals(projected.bytes), `${name}: Contract D bytes differ`);
  assert.deepEqual(maintained.decision, projected.decision, `${name}: Decision object differs`);
  writeFileSync(path.join(outDir, `${name}.maintained.contract-d.json`), maintained.bytes);
  writeFileSync(path.join(outDir, `${name}.projected.contract-d.json`), projected.bytes);
  return {
    exact_bytes_equal: true,
    contract_d_sha256: digest(maintained.bytes),
    evaluation: maintained.decision.evaluation,
    reason_codes: maintained.decision.metadata?.reason_codes ?? [],
  };
}

function wrapRegistry(registry) {
  return new Map(
    [...registry.entries()].map(([key, evaluator]) => [
      key,
      ({ authority }) => evaluator(authority),
    ]),
  );
}

function nonCalRegression({ contractDRoot }) {
  const releaseFixture = JSON.parse(
    readFileSync(path.resolve(HERE, "../release-qualification-assessment-authority-kernel/evidence.json"), "utf8"),
  );
  const releaseBytes = produceCanonicalAssessmentAuthority(releaseFixture);
  const releaseAuthority = JSON.parse(releaseBytes.toString("utf8"));
  const releaseSha = sha256Bytes(releaseBytes);
  const releaseTarget = releaseAuthority.subject;
  const releaseOld = evaluateAuthorityBoundPolicy({
    authorityBytes: releaseBytes,
    expectedAuthoritySha256: releaseSha,
    target: releaseTarget,
    policy: REGRESSION_REVIEW_POLICY,
    policyRegistry: RELEASE_POLICY_REGISTRY,
    contractDAuthorityRoot: contractDRoot,
  });
  const releaseNew = projectDecision({
    admittedAuthority: releaseAuthority,
    inputAuthority: {
      kind: "assessment_authority",
      id: releaseAuthority.authority.logical_id,
      immutable_id: releaseSha,
    },
    resolvedTarget: { target: releaseTarget },
    policy: REGRESSION_REVIEW_POLICY,
    policyRegistry: wrapRegistry(RELEASE_POLICY_REGISTRY),
    contractDAuthorityRoot: contractDRoot,
  });
  assert.ok(releaseOld.bytes.equals(releaseNew.bytes));

  const taskFixture = JSON.parse(
    readFileSync(path.resolve(HERE, "../agent-result-assessment-authority-kernel/evidence.json"), "utf8"),
  );
  const taskBytes = produceCanonicalTaskResultAssessment(taskFixture);
  const taskAuthority = JSON.parse(taskBytes.toString("utf8"));
  const taskSha = sha256Bytes(taskBytes);
  const taskTarget = taskAuthority.subject;
  const taskOld = evaluateAuthorityBoundPolicy({
    authorityBytes: taskBytes,
    expectedAuthoritySha256: taskSha,
    target: taskTarget,
    policy: VERIFIED_RESULT_CONTINUATION_POLICY,
    policyRegistry: TASK_RESULT_POLICY_REGISTRY,
    contractDAuthorityRoot: contractDRoot,
  });
  const taskNew = projectDecision({
    admittedAuthority: taskAuthority,
    inputAuthority: {
      kind: "assessment_authority",
      id: taskAuthority.authority.logical_id,
      immutable_id: taskSha,
    },
    resolvedTarget: { target: taskTarget },
    policy: VERIFIED_RESULT_CONTINUATION_POLICY,
    policyRegistry: wrapRegistry(TASK_RESULT_POLICY_REGISTRY),
    contractDAuthorityRoot: contractDRoot,
  });
  assert.ok(taskOld.bytes.equals(taskNew.bytes));

  return {
    release_qualification_exact_bytes_equal: true,
    release_contract_d_sha256: digest(releaseOld.bytes),
    task_result_exact_bytes_equal: true,
    task_result_contract_d_sha256: digest(taskOld.bytes),
  };
}

function assertProjectionKernelDomainNeutral() {
  const source = readFileSync(path.resolve(HERE, "projectionKernel.mjs"), "utf8");
  const forbidden = [
    /\bcal\b/i,
    /contract[-_ ]?c\b/i,
    /\bproposition\b/i,
    /\bcontribution\b/i,
    /\bqualification\b/i,
    /\brelease\b/i,
    /\bgithub\b/i,
    /\bworkflow\b/i,
    /\bci\b/i,
    /\btask[-_ ]?result\b/i,
  ];
  for (const regex of forbidden) {
    assert.equal(regex.test(source), false, `projection kernel leaked domain vocabulary: ${regex}`);
  }
  return digest(Buffer.from(source, "utf8"));
}

const { contractCRoot, contractDRoot, rc1Root, outDir } = args();
mkdirSync(outDir, { recursive: true });
const projectionKernelSha = assertProjectionKernelDomainNeutral();

const supported = loadFixture(path.resolve(rc1Root, "supported-tied-alternatives.json"));
const unsupported = loadFixture(path.resolve(rc1Root, "unsupported-residual.json"));
const notCheckable = loadFixture(path.resolve(rc1Root, "not-checkable-unclassified.json"));
const canonical = loadFixture(path.resolve(contractCRoot, "fixtures/contract-c/1.0.0/valid-canonical.json"));

const cases = {};
for (const [name, fixture] of [
  ["supported-claim", supported],
  ["unsupported-claim", unsupported],
  ["not-checkable-claim", notCheckable],
]) {
  const context = claimContext(fixture.value);
  cases[name] = compareExact(
    name,
    maintainedClaimBytes({ fixture, context, contractCRoot, contractDRoot }),
    projectClaim({ fixture, context, contractCRoot, contractDRoot }),
    outDir,
  );
}

const missingClaimContext = claimContext(supported.value);
missingClaimContext.proposition_id = "absent-proposition";
missingClaimContext.target = {
  kind: "claim",
  id: "absent-proposition",
  content_sha256: `sha256:${"7".repeat(64)}`,
};
cases["missing-proposition"] = compareExact(
  "missing-proposition",
  maintainedClaimBytes({ fixture: supported, context: missingClaimContext, contractCRoot, contractDRoot }),
  projectClaim({ fixture: supported, context: missingClaimContext, contractCRoot, contractDRoot }),
  outDir,
);

const proposition = canonical.value.propositions[0];
const propositionId = proposition.proposition.proposition_id;
const causalContributionId = proposition.conclusion.basis_members.find(
  (member) => member.namespace === "contribution",
).id;
const residualContributionId = proposition.conclusion.residual_contribution_ids[0];

function citationContext(contributionId) {
  const target = citationTargetForContractC(canonical.value, propositionId, contributionId);
  assert.ok(target);
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

for (const [name, contributionId] of [
  ["causal-contribution", causalContributionId],
  ["residual-contribution", residualContributionId],
]) {
  const context = citationContext(contributionId);
  cases[name] = compareExact(
    name,
    maintainedCitationBytes({ fixture: canonical, context, contractCRoot, contractDRoot }),
    projectCitation({ fixture: canonical, context, contractCRoot, contractDRoot }),
    outDir,
  );
}

const missingContributionId = `contribution:${"7".repeat(64)}`;
const missingContributionContext = {
  policy: {
    id: CAUSAL_BASIS_CITATION_POLICY.id,
    version: CAUSAL_BASIS_CITATION_POLICY.version,
  },
  proposition_id: propositionId,
  contribution_id: missingContributionId,
  target: {
    kind: "claim-evidence-link",
    id: `claim-evidence-link:${propositionId}:${missingContributionId}`,
    content_sha256: `sha256:${"8".repeat(64)}`,
  },
};
cases["missing-contribution"] = compareExact(
  "missing-contribution",
  maintainedCitationBytes({ fixture: canonical, context: missingContributionContext, contractCRoot, contractDRoot }),
  projectCitation({ fixture: canonical, context: missingContributionContext, contractCRoot, contractDRoot }),
  outDir,
);

const admittedSupported = admitExactContractC({
  contractCBytes: supported.bytes,
  expectedContractCSha256: supported.sha,
  contractCAuthorityRoot: contractCRoot,
  expectedContractB: expectedB(supported.value),
  pythonExecutable: "python3",
});
const wrongB = expectedB(supported.value);
wrongB.bundle_id += "-substituted";
expectContractCError("contract_b_binding_mismatch", () =>
  admitExactContractC({
    contractCBytes: supported.bytes,
    expectedContractCSha256: supported.sha,
    contractCAuthorityRoot: contractCRoot,
    expectedContractB: wrongB,
    pythonExecutable: "python3",
  }),
);
expectContractCError("contract_c_whole_object_mismatch", () =>
  admitExactContractC({
    contractCBytes: supported.bytes,
    expectedContractCSha256: `sha256:${"0".repeat(64)}`,
    contractCAuthorityRoot: contractCRoot,
    expectedContractB: expectedB(supported.value),
    pythonExecutable: "python3",
  }),
);
expectContractCError("authority_identity_mismatch", () =>
  admitExactContractC({
    contractCBytes: supported.bytes,
    expectedContractCSha256: supported.sha,
    contractCAuthorityRoot: contractDRoot,
    expectedContractB: expectedB(supported.value),
    pythonExecutable: "python3",
  }),
);
const wrongClaimTarget = claimContext(supported.value);
wrongClaimTarget.target.content_sha256 = `sha256:${"9".repeat(64)}`;
expectContractCError("target_binding_mismatch", () =>
  resolveClaimTarget({
    authority: admittedSupported.authority,
    propositionId: wrongClaimTarget.proposition_id,
    target: wrongClaimTarget.target,
  }),
);
const admittedCanonical = admitExactContractC({
  contractCBytes: canonical.bytes,
  expectedContractCSha256: canonical.sha,
  contractCAuthorityRoot: contractCRoot,
  expectedContractB: expectedB(canonical.value),
  pythonExecutable: "python3",
});
const wrongCitationContext = citationContext(causalContributionId);
wrongCitationContext.target.content_sha256 = `sha256:${"6".repeat(64)}`;
expectContractCError("target_binding_mismatch", () =>
  resolveCitationTarget({
    authority: admittedCanonical.authority,
    propositionId: wrongCitationContext.proposition_id,
    contributionId: wrongCitationContext.contribution_id,
    target: wrongCitationContext.target,
  }),
);

const nonCal = nonCalRegression({ contractDRoot });

const result = {
  status: "PASS",
  checkpoint: "contract_c_adapter_to_domain_neutral_projection_kernel_exact_byte_equivalence",
  exact_base_main: "358c2bb20f490bf25e808434394b26a70a16a123",
  projection_kernel_sha256: projectionKernelSha,
  cases,
  controls: {
    contract_c_whole_object_binding_preserved: true,
    exact_contract_c_authority_root_preserved: true,
    exact_contract_b_binding_preserved: true,
    claim_target_binding_preserved: true,
    citation_target_binding_preserved: true,
  },
  non_cal_regression: nonCal,
  interpretation: {
    generic_raw_ingress_supported: false,
    domain_specific_authority_adapter_supported: true,
    domain_specific_target_resolver_supported: true,
    domain_specific_policy_semantics_supported: true,
    domain_neutral_projection_kernel_supported_for_tested_cases: true,
    contract_c_can_remain_cal_epistemic_contract_without_becoming_generic_decision_input: true,
  },
  non_claims: [
    "this does not establish universal Decision input interoperability",
    "this does not prove Contract C is minimal for arbitrary future CAL output",
    "this does not authorize maintained refactoring or Contract C revision",
    "this does not make raw authority admission generic",
    "this does not move CAL or Contract C semantics into the projection kernel",
  ],
};

writeFileSync(path.join(outDir, "RESULT.json"), canonicalBytes(result));
console.log(JSON.stringify(result, null, 2));
