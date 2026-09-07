import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

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
  for (const key of ["--pipeline-out", "--contract-c-authority", "--contract-d-authority"]) {
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

function expectError(code, fn) {
  try {
    fn();
  } catch (error) {
    expect(error?.code === code, `expected ${code}, got ${error?.code}: ${error?.message}`);
    return { code, message: error.message };
  }
  throw new Error(`expected ${code} but call succeeded`);
}

function decisionSummary(decision) {
  return {
    policy: decision.policy,
    target: decision.target,
    evaluation: decision.evaluation,
    effect: decision.effect ?? null,
    reason_codes: decision.metadata?.reason_codes ?? [],
  };
}

const args = parseArgs(process.argv.slice(2));
const pipelineOut = resolve(args["--pipeline-out"]);
const contractCAuthorityRoot = resolve(args["--contract-c-authority"]);
const contractDAuthorityRoot = resolve(args["--contract-d-authority"]);
const receipt = JSON.parse(readFileSync(join(pipelineOut, "PIPELINE-RECEIPT.json"), "utf8"));

expect(receipt.pipeline_status === "PASS", "upstream CAL pipeline receipt is not PASS");
expect(receipt.contract_b?.validation?.status === "PASS", "upstream Contract B validation is not PASS");
expect(receipt.production_promotion_authorized === false, "upstream receipt unexpectedly authorizes promotion");

const expectedContractB = {
  contract_version: receipt.contract_b.validation.contract_version,
  bundle_id: receipt.contract_b.bundle_id,
  bundle_hash: receipt.contract_b.bundle_hash,
};
const children = receipt.cal?.children;
expect(Array.isArray(children) && children.length >= 2, "expected at least two CAL child outputs");

const loaded = [];
const observations = [];

for (const child of children) {
  const contractCPath = join(pipelineOut, child.contract_c_path);
  const contractCBytes = readFileSync(contractCPath);
  const contractC = JSON.parse(contractCBytes.toString("utf8"));
  const exactContractCSha256 = sha256(contractCBytes);
  const proposition = contractC.propositions.find(
    (row) => row.proposition.proposition_id === child.proposition_id,
  );
  expect(proposition, `Contract C missing proposition ${child.proposition_id}`);
  expect(
    proposition.proposition.text_sha256 === child.claim_text_sha256,
    `pipeline receipt / Contract C text hash mismatch for ${child.proposition_id}`,
  );

  const claimContext = {
    policy: SUPPORTED_CLAIM_VERIFICATION_POLICY,
    proposition_id: child.proposition_id,
    target: {
      kind: "claim",
      id: child.proposition_id,
      content_sha256: `sha256:${child.claim_text_sha256}`,
    },
  };
  const claimDecision = evaluateContractCDecision({
    contractCBytes,
    expectedContractCSha256: exactContractCSha256,
    contractCAuthorityRoot,
    expectedContractB,
    decisionContext: claimContext,
  });
  const claimCanonical = canonicalizeContractDWithAuthority({
    decision: claimDecision,
    contractDAuthorityRoot,
  });
  expect(claimDecision.evaluation.state === "completed", "claim policy did not complete");
  expect(claimDecision.evaluation.disposition === "clear", "supported CAL claim did not CLEAR");
  expect(
    claimDecision.metadata.reason_codes.includes("contract_c_supported"),
    "supported claim clear lacked contract_c_supported reason",
  );

  const basisMembers = proposition.conclusion.basis_members.filter(
    (member) => member.namespace === "contribution",
  );
  expect(basisMembers.length === 1, `expected one basis contribution for ${child.proposition_id}`);
  const contributionId = basisMembers[0].id;
  const citationTarget = citationTargetForContractC(contractC, child.proposition_id, contributionId);
  expect(citationTarget, `could not derive citation target for ${child.proposition_id}`);
  const citationContext = {
    policy: CAUSAL_BASIS_CITATION_POLICY,
    proposition_id: child.proposition_id,
    contribution_id: contributionId,
    target: citationTarget,
  };
  const citationDecision = evaluateContractCDecision({
    contractCBytes,
    expectedContractCSha256: exactContractCSha256,
    contractCAuthorityRoot,
    expectedContractB,
    decisionContext: citationContext,
  });
  const citationCanonical = canonicalizeContractDWithAuthority({
    decision: citationDecision,
    contractDAuthorityRoot,
  });
  expect(citationDecision.evaluation.state === "completed", "citation policy did not complete");
  expect(citationDecision.evaluation.disposition === "clear", "causal basis contribution did not CLEAR");
  expect(
    citationDecision.metadata.reason_codes.includes("contract_c_contribution_in_causal_basis"),
    "causal-basis clear lacked basis reason",
  );

  const badHash = expectError("contract_c_whole_object_mismatch", () =>
    evaluateContractCDecision({
      contractCBytes,
      expectedContractCSha256: `sha256:${"0".repeat(64)}`,
      contractCAuthorityRoot,
      expectedContractB,
      decisionContext: claimContext,
    }),
  );
  const badB = expectError("contract_b_binding_mismatch", () =>
    evaluateContractCDecision({
      contractCBytes,
      expectedContractCSha256: exactContractCSha256,
      contractCAuthorityRoot,
      expectedContractB: { ...expectedContractB, bundle_hash: `sha256:${"0".repeat(64)}` },
      decisionContext: claimContext,
    }),
  );
  const badTarget = expectError("target_binding_mismatch", () =>
    evaluateContractCDecision({
      contractCBytes,
      expectedContractCSha256: exactContractCSha256,
      contractCAuthorityRoot,
      expectedContractB,
      decisionContext: {
        ...claimContext,
        target: { ...claimContext.target, content_sha256: `sha256:${"0".repeat(64)}` },
      },
    }),
  );

  loaded.push({
    child,
    contractCPath,
    contractCBytes,
    contractC,
    exactContractCSha256,
    claimContext,
    citationContext,
  });
  observations.push({
    proposition_id: child.proposition_id,
    contract_c_sha256: exactContractCSha256,
    claim_policy: decisionSummary(claimDecision),
    claim_contract_d_sha256: sha256(claimCanonical),
    citation_policy: decisionSummary(citationDecision),
    citation_contract_d_sha256: sha256(citationCanonical),
    fail_closed: {
      wrong_contract_c_sha256: badHash.code,
      wrong_contract_b_binding: badB.code,
      wrong_claim_target_hash: badTarget.code,
    },
  });
}

const first = loaded[0];
const second = loaded[1];

const crossClaimDecision = evaluateContractCDecision({
  contractCBytes: first.contractCBytes,
  expectedContractCSha256: first.exactContractCSha256,
  contractCAuthorityRoot,
  expectedContractB,
  decisionContext: second.claimContext,
});
expect(crossClaimDecision.evaluation.state === "failed", "cross-child claim replay did not fail");
expect(
  crossClaimDecision.metadata.reason_codes.includes("target_proposition_not_found"),
  "cross-child claim replay failed for an unexpected reason",
);
canonicalizeContractDWithAuthority({ decision: crossClaimDecision, contractDAuthorityRoot });

const crossCitationDecision = evaluateContractCDecision({
  contractCBytes: first.contractCBytes,
  expectedContractCSha256: first.exactContractCSha256,
  contractCAuthorityRoot,
  expectedContractB,
  decisionContext: second.citationContext,
});
expect(crossCitationDecision.evaluation.state === "failed", "cross-child citation replay did not fail");
expect(
  crossCitationDecision.metadata.reason_codes.includes("target_proposition_not_found"),
  "cross-child citation replay failed for an unexpected reason",
);
canonicalizeContractDWithAuthority({ decision: crossCitationDecision, contractDAuthorityRoot });

const scratch = mkdtempSync(join(tmpdir(), "de-cal-real-"));
const expectedBPath = join(scratch, "expected-b.json");
const contextPath = join(scratch, "context.json");
writeFileSync(expectedBPath, JSON.stringify(expectedContractB));
writeFileSync(
  contextPath,
  JSON.stringify({ proposition_id: first.claimContext.proposition_id, target: first.claimContext.target }),
);
const cli = spawnSync(
  process.execPath,
  [
    "scripts/decision-engine-evaluate.mjs",
    "--contract-c", first.contractCPath,
    "--contract-c-sha256", first.exactContractCSha256,
    "--contract-c-authority", contractCAuthorityRoot,
    "--contract-d-authority", contractDAuthorityRoot,
    "--expected-contract-b", expectedBPath,
    "--policy", `${SUPPORTED_CLAIM_VERIFICATION_POLICY.id}@${SUPPORTED_CLAIM_VERIFICATION_POLICY.version}`,
    "--context", contextPath,
  ],
  { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
);
expect(cli.status === 0, `maintained CLI failed: ${cli.stderr}`);
const cliDecision = JSON.parse(cli.stdout);
expect(cliDecision.evaluation?.disposition === "clear", "maintained CLI did not emit CLEAR");

const result = {
  schema: "decision-engine-cal-real-output-pressure-test-v1",
  decision_engine_head: process.env.DECISION_ENGINE_RESEARCH_HEAD ?? null,
  upstream: {
    cal_head: process.env.CAL_HEAD ?? null,
    pipeline_status: receipt.pipeline_status,
    contract_b: expectedContractB,
    contract_c_authority: receipt.pins?.contract_c_authority ?? null,
  },
  observed: {
    child_count: children.length,
    both_maintained_policies_clear_on_each_supported_child: observations.every(
      (row) =>
        row.claim_policy.evaluation.disposition === "clear" &&
        row.citation_policy.evaluation.disposition === "clear",
    ),
    exact_authority_and_binding_mutations_fail_closed: true,
    cross_child_replays_produce_no_clear_decision: true,
    maintained_cli_matches_programmatic_supported_claim_surface: true,
  },
  children: observations,
  cross_child_replay: {
    claim_policy: decisionSummary(crossClaimDecision),
    citation_policy: decisionSummary(crossCitationDecision),
  },
  nonclaims: [
    "This does not establish CAL semantic correctness beyond the upstream pipeline's own bounded evidence.",
    "This does not establish source legitimacy or corpus completeness.",
    "This does not establish Authorization or execution.",
    "This does not establish that all valid Contract C states are reachable from CAL.",
    "This does not establish a generic policy-counterfactual architecture for Contract C policies.",
  ],
  production_promotion_authorized: false,
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
