import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const cliPath = join(repoRoot, "scripts/decision-engine-parent-bound-policy-evaluate.mjs");

import { SUPPORTED_CLAIM_VERIFICATION_POLICY } from "../src/contractCDecision.js";
import { canonicalizeContractDWithAuthority } from "../src/contractDCanonicalOutput.js";
import { decideParentBoundContractCToContractD } from "../src/parentBoundContractCDecision.js";
import {
  EPISTEMIC_AUDIT_STAGE_PENDING_REVIEW_POLICY,
  decideParentBoundPolicy,
} from "../src/parentBoundPolicyDispatch.js";

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) {
  args.set(process.argv[i], process.argv[i + 1]);
}

const fixtureRoot = args.get("--fixtures");
const consumerRoot = args.get("--consumer");
const contractDRoot = args.get("--contract-d");
const pythonExecutable = args.get("--python") || "python3";
const outputPath = args.get("--out");

const CASES = ["PIPE01", "PIPE02", "PIPE03"];
const EXPECTED = {
  PIPE01: { parent: "supported", disposition: "clear" },
  PIPE02: { parent: "contradicted", disposition: "hold" },
  PIPE03: { parent: "not_checkable", disposition: "hold" },
};

const receipt = {
  schema: "parent-bound-ers-policy-dispatch-phase-a/1",
  policies: {
    supported_claim: {
      id: SUPPORTED_CLAIM_VERIFICATION_POLICY.id,
      version: SUPPORTED_CLAIM_VERIFICATION_POLICY.version,
      effect: SUPPORTED_CLAIM_VERIFICATION_POLICY.effect,
    },
    ers_staging: {
      id: EPISTEMIC_AUDIT_STAGE_PENDING_REVIEW_POLICY.id,
      version: EPISTEMIC_AUDIT_STAGE_PENDING_REVIEW_POLICY.version,
      effect: EPISTEMIC_AUDIT_STAGE_PENDING_REVIEW_POLICY.effect,
    },
  },
  cases: {},
  negative_controls: {},
  failures: [],
};

function sha256(raw) {
  return createHash("sha256").update(raw).digest("hex");
}

function digestId(raw) {
  return "sha256:" + sha256(raw);
}

function fail(name, detail) {
  receipt.failures.push({ name, detail: String(detail) });
}

function loadCase(caseId) {
  const raw = readFileSync(`${fixtureRoot}/${caseId}/cal/contract-c.json`);
  const consumerInputs = JSON.parse(
    readFileSync(`${fixtureRoot}/${caseId}/consumer-inputs.json`, "utf8"),
  );
  const target = JSON.parse(
    readFileSync(`${fixtureRoot}/${caseId}/decision-target.json`, "utf8"),
  );
  return { raw, consumerInputs, target, contractCSha256: digestId(raw) };
}

function contextFor(policy, target) {
  return {
    policy: { id: policy.id, version: policy.version },
    target,
  };
}

function decide(policy, loaded) {
  return decideParentBoundPolicy({
    contractCBytes: loaded.raw,
    expectedContractCSha256: loaded.contractCSha256,
    consumerRoot,
    consumerInputs: loaded.consumerInputs,
    decisionContext: contextFor(policy, loaded.target),
    pythonExecutable,
  });
}

function expectReject(name, fn) {
  try {
    const value = fn();
    receipt.negative_controls[name] = {
      rejected: false,
      returned_effect: value?.effect?.type ?? null,
    };
    fail(name, "returned a decision");
  } catch (error) {
    receipt.negative_controls[name] = {
      rejected: true,
      error_code: error?.code ?? "UNKNOWN",
    };
  }
}

for (const caseId of CASES) {
  const loaded = loadCase(caseId);
  const expected = EXPECTED[caseId];
  const frozen = decideParentBoundContractCToContractD({
    contractCBytes: loaded.raw,
    expectedContractCSha256: loaded.contractCSha256,
    consumerRoot,
    consumerInputs: loaded.consumerInputs,
    decisionContext: { target: loaded.target },
    pythonExecutable,
  });
  const supported = decide(SUPPORTED_CLAIM_VERIFICATION_POLICY, loaded);
  const ers = decide(EPISTEMIC_AUDIT_STAGE_PENDING_REVIEW_POLICY, loaded);
  let supportedEqual = false;
  try {
    assert.deepEqual(supported, frozen);
    supportedEqual = true;
  } catch (error) {
    fail(`${caseId}:supported_equals_frozen`, error.message);
  }

  const supportedCanonical = canonicalizeContractDWithAuthority({
    decision: supported,
    contractDAuthorityRoot: contractDRoot,
    pythonExecutable,
  });
  const stored = readFileSync(`${fixtureRoot}/${caseId}/contract-d.json`);
  const supportedMatchesStored = Buffer.compare(supportedCanonical, stored) === 0;
  if (!supportedMatchesStored) {
    fail(`${caseId}:supported_canonical`, "canonical bytes differ from frozen v3 Contract D");
  }

  let ersReleasedCode = null;
  try {
    canonicalizeContractDWithAuthority({
      decision: ers,
      contractDAuthorityRoot: contractDRoot,
      pythonExecutable,
    });
    fail(`${caseId}:ers_released_rejection`, "released Contract D accepted the ERS effect");
  } catch (error) {
    ersReleasedCode = error?.code ?? "UNKNOWN";
    const message = String(error?.message ?? "");
    if (!message.includes("unknown_effect_type")) {
      fail(`${caseId}:ers_released_code`, message);
    }
  }

  const parent = ers.metadata?.diagnostics?.parent_conclusion;
  if (parent !== expected.parent || ers.evaluation.disposition !== expected.disposition) {
    fail(`${caseId}:ers_disposition`, `${parent}/${ers.evaluation.disposition}`);
  }
  if (ers.evaluation.state !== "completed") {
    fail(`${caseId}:ers_state`, ers.evaluation.state);
  }
  if (ers.effect.type !== "epistemic_audit.stage_pending_review" || ers.effect.version !== "1") {
    fail(`${caseId}:ers_effect`, JSON.stringify(ers.effect));
  }
  try {
    assert.deepEqual(ers.effect.params, {});
  } catch (error) {
    fail(`${caseId}:ers_params`, error.message);
  }
  if (supported.effect.type !== "knowledge.add_verified_tag" || supported.effect.version !== "1") {
    fail(`${caseId}:supported_effect`, JSON.stringify(supported.effect));
  }
  try {
    assert.deepEqual(supported.effect.params, { scope: "claim" });
  } catch (error) {
    fail(`${caseId}:supported_params`, error.message);
  }

  receipt.cases[caseId] = {
    parent_conclusion: parent,
    contract_c_sha256: loaded.contractCSha256,
    supported_disposition: supported.evaluation.disposition,
    supported_effect: `${supported.effect.type}@${supported.effect.version}`,
    supported_equals_frozen_decision: supportedEqual,
    supported_canonical_sha256: digestId(supportedCanonical),
    supported_matches_frozen_v3_contract_d: supportedMatchesStored,
    ers_evaluation_state: ers.evaluation.state,
    ers_disposition: ers.evaluation.disposition,
    ers_effect: `${ers.effect.type}@${ers.effect.version}`,
    ers_effect_params: ers.effect.params,
    ers_policy: ers.policy,
    ers_released_contract_d_code: ersReleasedCode,
    ers_released_contract_d_rejected: ersReleasedCode === "contract_d_validation_failed",
    candidate_for_authorization: ers.evaluation.disposition === "clear",
  };
}

{
  const loaded = loadCase("PIPE01");
  const base = contextFor(EPISTEMIC_AUDIT_STAGE_PENDING_REVIEW_POLICY, loaded.target);

  expectReject("unknown_policy", () =>
    decideParentBoundPolicy({
      contractCBytes: loaded.raw,
      expectedContractCSha256: loaded.contractCSha256,
      consumerRoot,
      consumerInputs: loaded.consumerInputs,
      decisionContext: {
        policy: { id: "decision-engine.contract-c.not-a-policy", version: "1.0.0" },
        target: loaded.target,
      },
      pythonExecutable,
    }),
  );

  expectReject("unsupported_policy_version", () =>
    decideParentBoundPolicy({
      contractCBytes: loaded.raw,
      expectedContractCSha256: loaded.contractCSha256,
      consumerRoot,
      consumerInputs: loaded.consumerInputs,
      decisionContext: {
        policy: {
          id: EPISTEMIC_AUDIT_STAGE_PENDING_REVIEW_POLICY.id,
          version: "9.9.9",
        },
        target: loaded.target,
      },
      pythonExecutable,
    }),
  );

  expectReject("extra_context_field", () =>
    decideParentBoundPolicy({
      contractCBytes: loaded.raw,
      expectedContractCSha256: loaded.contractCSha256,
      consumerRoot,
      consumerInputs: loaded.consumerInputs,
      decisionContext: { ...base, note: "extra" },
      pythonExecutable,
    }),
  );

  expectReject("caller_requested_operation", () =>
    decideParentBoundPolicy({
      contractCBytes: loaded.raw,
      expectedContractCSha256: loaded.contractCSha256,
      consumerRoot,
      consumerInputs: loaded.consumerInputs,
      decisionContext: {
        ...base,
        requested_operation: "epistemic_audit.stage_pending_review@1",
      },
      pythonExecutable,
    }),
  );

  expectReject("caller_effect", () =>
    decideParentBoundPolicy({
      contractCBytes: loaded.raw,
      expectedContractCSha256: loaded.contractCSha256,
      consumerRoot,
      consumerInputs: loaded.consumerInputs,
      decisionContext: {
        policy: {
          ...base.policy,
          effect: { type: "knowledge.add_verified_tag", version: "1", params: { scope: "claim" } },
        },
        target: loaded.target,
      },
      pythonExecutable,
    }),
  );

  const mutated = {
    ...loaded.target,
    content_sha256: "sha256:" + "ab".repeat(32),
  };
  expectReject("mutated_target_hash", () =>
    decideParentBoundPolicy({
      contractCBytes: loaded.raw,
      expectedContractCSha256: loaded.contractCSha256,
      consumerRoot,
      consumerInputs: loaded.consumerInputs,
      decisionContext: contextFor(EPISTEMIC_AUDIT_STAGE_PENDING_REVIEW_POLICY, mutated),
      pythonExecutable,
    }),
  );

  expectReject("raw_byte_mutation", () =>
    decideParentBoundPolicy({
      contractCBytes: Buffer.concat([loaded.raw, Buffer.from(" ")]),
      expectedContractCSha256: loaded.contractCSha256,
      consumerRoot,
      consumerInputs: loaded.consumerInputs,
      decisionContext: base,
      pythonExecutable,
    }),
  );

  const pipe03 = loadCase("PIPE03");
  const replay = structuredClone(loaded.consumerInputs);
  const common = Object.keys(replay.native_child_results_b64).find((key) =>
    Object.prototype.hasOwnProperty.call(pipe03.consumerInputs.native_child_results_b64, key),
  );
  if (!common) {
    fail("cross_run_native_child_replay", "no shared native child");
  } else {
    replay.native_child_results_b64[common] = pipe03.consumerInputs.native_child_results_b64[common];
    expectReject("cross_run_native_child_replay", () =>
      decideParentBoundPolicy({
        contractCBytes: loaded.raw,
        expectedContractCSha256: loaded.contractCSha256,
        consumerRoot,
        consumerInputs: replay,
        decisionContext: base,
        pythonExecutable,
      }),
    );
  }

  expectReject("consumer_checkout_substitution", () =>
    decideParentBoundPolicy({
      contractCBytes: loaded.raw,
      expectedContractCSha256: loaded.contractCSha256,
      consumerRoot: contractDRoot,
      consumerInputs: loaded.consumerInputs,
      decisionContext: base,
      pythonExecutable,
    }),
  );

  const cli = spawnSync(
    process.execPath,
    [
      cliPath,
      "--contract-c",
      `${fixtureRoot}/PIPE01/cal/contract-c.json`,
      "--contract-c-sha256",
      loaded.contractCSha256,
      "--consumer-authority",
      consumerRoot,
      "--consumer-inputs",
      `${fixtureRoot}/PIPE01/consumer-inputs.json`,
      "--policy-id",
      EPISTEMIC_AUDIT_STAGE_PENDING_REVIEW_POLICY.id,
      "--policy-version",
      EPISTEMIC_AUDIT_STAGE_PENDING_REVIEW_POLICY.version,
      "--target",
      `${fixtureRoot}/PIPE01/decision-target.json`,
      "--requested-operation",
      "epistemic_audit.stage_pending_review@1",
      "--python",
      pythonExecutable,
    ],
    { encoding: "utf8" },
  );
  let cliCode = null;
  try {
    cliCode = JSON.parse(cli.stderr || "{}").code ?? null;
  } catch {
    cliCode = null;
  }
  const cliRejected = cli.status === 1 && cli.stdout === "" && cliCode === "invalid_cli_arguments";
  receipt.negative_controls.cli_requested_operation = {
    rejected: cliRejected,
    error_code: cliCode,
    stdout_empty: cli.stdout === "",
  };
  if (!cliRejected) fail("cli_requested_operation", cli.stderr || cli.stdout);

  const effectCli = spawnSync(
    process.execPath,
    [
      cliPath,
      "--effect",
      "epistemic_audit.stage_pending_review@1",
    ],
    { encoding: "utf8" },
  );
  let effectCode = null;
  try {
    effectCode = JSON.parse(effectCli.stderr || "{}").code ?? null;
  } catch {
    effectCode = null;
  }
  const effectRejected = effectCli.status === 1 && effectCli.stdout === "" && effectCode === "invalid_cli_arguments";
  receipt.negative_controls.cli_effect = {
    rejected: effectRejected,
    error_code: effectCode,
    stdout_empty: effectCli.stdout === "",
  };
  if (!effectRejected) fail("cli_effect", effectCli.stderr || effectCli.stdout);
}

receipt.disposition =
  receipt.failures.length === 0
    ? "SUPPORTED_NATIVE_ERS_OPERATION_DECISION_CANDIDATE"
    : "PHASE_A_DISCRIMINATOR_FAILED";
receipt.passed = receipt.failures.length === 0;

if (outputPath) writeFileSync(outputPath, JSON.stringify(receipt, null, 2) + "\n");
if (!receipt.passed) {
  process.stderr.write(JSON.stringify(receipt.failures, null, 2) + "\n");
  process.exitCode = 1;
} else {
  process.stdout.write(receipt.disposition + "\n");
}
