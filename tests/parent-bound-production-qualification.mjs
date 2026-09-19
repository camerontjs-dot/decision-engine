import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import {
  ParentBoundDecisionError,
  decideParentBoundContractCToContractD,
} from "../src/parentBoundContractCDecision.js";
import { canonicalizeContractDWithAuthority } from "../src/contractDCanonicalOutput.js";

const fixtureRoot = process.argv[2];
const attackRoot = process.argv[3];
const outputPath = process.argv[4];
const consumerRoot = process.env.CONSUMER_ROOT;
const contractDRoot = process.env.CONTRACT_D_ROOT;
const researchRoot = process.env.RESEARCH_DE_ROOT;
const wrongConsumerRoot = process.env.WRONG_CONSUMER_ROOT;

const researchModule = await import(
  pathToFileURL(
    join(
      researchRoot,
      "research/contract-c-parent-bound-de-qualification-20260919/parentBoundContractCDecision.mjs",
    ),
  )
);

const manifest = JSON.parse(readFileSync(join(fixtureRoot, "MANIFEST.json"), "utf8"));
const attackManifest = JSON.parse(readFileSync(join(attackRoot, "MANIFEST.json"), "utf8"));

const expectedParents = {
  PIPE01: "supported",
  PIPE02: "contradicted",
  PIPE03: "not_checkable",
  PIPE04: "contradicted",
};

const expectedDispositions = {
  PIPE01: "clear",
  PIPE02: "hold",
  PIPE03: "hold",
  PIPE04: "hold",
};

const result = {
  schema: "decision-parent-bound-production-qualification-v1",
  cases: {},
  negative_controls: {},
  protected_core: {},
  failures: [],
};

function sha256(raw) {
  return "sha256:" + createHash("sha256").update(raw).digest("hex");
}

function targetFor(info) {
  return {
    kind: "claim",
    id: info.root.proposition_id,
    content_sha256: info.root.text_sha256,
  };
}

function expectReject(name, fn) {
  try {
    fn();
    result.negative_controls[name] = { rejected: false };
    result.failures.push(name);
  } catch (error) {
    result.negative_controls[name] = {
      rejected: true,
      error_code: error?.code ?? error?.name ?? "UNKNOWN",
    };
  }
}

for (const caseId of Object.keys(expectedParents)) {
  const info = manifest.cases[caseId];
  assert.equal(info.expected_parent, expectedParents[caseId]);
  const raw = readFileSync(join(fixtureRoot, caseId, "contract-c.json"));
  assert.equal(sha256(raw), info.whole_object_sha256);
  const consumerInputs = JSON.parse(
    readFileSync(join(fixtureRoot, caseId, "consumer-inputs.json"), "utf8"),
  );
  const decisionContext = { target: targetFor(info) };

  const production = decideParentBoundContractCToContractD({
    contractCBytes: raw,
    expectedContractCSha256: info.whole_object_sha256,
    consumerRoot,
    consumerInputs,
    decisionContext,
  });
  const research = researchModule.decideParentBoundContractCToContractD({
    contractCBytes: raw,
    expectedContractCSha256: info.whole_object_sha256,
    consumerRoot,
    consumerInputs,
    decisionContext,
  });
  assert.deepEqual(production, research, `${caseId}: production ingress differs from PR #85`);
  assert.equal(production.evaluation.state, "completed");
  assert.equal(production.evaluation.disposition, expectedDispositions[caseId]);
  assert.equal(production.target.id, info.root.proposition_id);
  assert.equal(production.input_authority.immutable_id, info.whole_object_sha256);

  const canonicalD = canonicalizeContractDWithAuthority({
    decision: production,
    contractDAuthorityRoot: contractDRoot,
  });
  assert.ok(canonicalD.length > 0);

  result.cases[caseId] = {
    parent_conclusion: info.expected_parent,
    disposition: production.evaluation.disposition,
    equal_to_pr85_ingress: true,
    contract_d_canonical: true,
    contract_c_sha256: info.whole_object_sha256,
  };
}

{
  const caseId = "PIPE01";
  const info = manifest.cases[caseId];
  const raw = readFileSync(join(fixtureRoot, caseId, "contract-c.json"));
  const inputs = JSON.parse(
    readFileSync(join(fixtureRoot, caseId, "consumer-inputs.json"), "utf8"),
  );
  const target = targetFor(info);

  expectReject("raw_byte_mutation_fixed_whole_object_authority", () =>
    decideParentBoundContractCToContractD({
      contractCBytes: Buffer.concat([raw, Buffer.from(" ")]),
      expectedContractCSha256: info.whole_object_sha256,
      consumerRoot,
      consumerInputs: inputs,
      decisionContext: { target },
    }),
  );

  const missing = structuredClone(inputs);
  delete missing.native_child_results_b64[Object.keys(missing.native_child_results_b64)[0]];
  expectReject("missing_native_child", () =>
    decideParentBoundContractCToContractD({
      contractCBytes: raw,
      expectedContractCSha256: info.whole_object_sha256,
      consumerRoot,
      consumerInputs: missing,
      decisionContext: { target },
    }),
  );

  const pipe03 = JSON.parse(
    readFileSync(join(fixtureRoot, "PIPE03", "consumer-inputs.json"), "utf8"),
  );
  const replay = structuredClone(inputs);
  const common = Object.keys(replay.native_child_results_b64).find((key) =>
    Object.prototype.hasOwnProperty.call(pipe03.native_child_results_b64, key),
  );
  assert.ok(common);
  replay.native_child_results_b64[common] = pipe03.native_child_results_b64[common];
  expectReject("cross_run_native_child_replay", () =>
    decideParentBoundContractCToContractD({
      contractCBytes: raw,
      expectedContractCSha256: info.whole_object_sha256,
      consumerRoot,
      consumerInputs: replay,
      decisionContext: { target },
    }),
  );

  const wrongExpected = structuredClone(inputs);
  wrongExpected.expected_authority.whole_object_sha256 = "sha256:" + "0".repeat(64);
  expectReject("fixed_consumer_authority_substitution", () =>
    decideParentBoundContractCToContractD({
      contractCBytes: raw,
      expectedContractCSha256: info.whole_object_sha256,
      consumerRoot,
      consumerInputs: wrongExpected,
      decisionContext: { target },
    }),
  );

  expectReject("frozen_consumer_checkout_substitution", () =>
    decideParentBoundContractCToContractD({
      contractCBytes: raw,
      expectedContractCSha256: info.whole_object_sha256,
      consumerRoot: wrongConsumerRoot,
      consumerInputs: inputs,
      decisionContext: { target },
    }),
  );

  expectReject("root_target_substitution", () =>
    decideParentBoundContractCToContractD({
      contractCBytes: raw,
      expectedContractCSha256: info.whole_object_sha256,
      consumerRoot,
      consumerInputs: inputs,
      decisionContext: {
        target: { ...target, id: target.id + "-substituted" },
      },
    }),
  );

  for (const attackName of [
    "stale_receipt_coherent_reseal",
    "native_child_substitution_coherent_reseal",
  ]) {
    const attack = attackManifest[attackName];
    const attackRaw = readFileSync(join(attackRoot, attack.path));
    assert.equal(sha256(attackRaw), attack.whole_object_sha256);
    expectReject(attackName, () =>
      decideParentBoundContractCToContractD({
        contractCBytes: attackRaw,
        expectedContractCSha256: attack.whole_object_sha256,
        consumerRoot,
        consumerInputs: inputs,
        decisionContext: { target },
      }),
    );
  }
}

const falseAccepts = Object.entries(result.negative_controls)
  .filter(([, value]) => !value.rejected)
  .map(([name]) => name);
assert.deepEqual(falseAccepts, []);

result.disposition =
  result.failures.length === 0
    ? "QUALIFIED_ADDITIVE_PARENT_BOUND_INGRESS_FOR_CONTROLLED_LOCAL_PIPELINE_RUNS"
    : "FALSIFIED_PRODUCTION_INGRESS";
result.decision_policy_semantics_changed = false;
result.contract_d_changed = false;
result.authorization_performed = false;

writeFileSync(outputPath, JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result));
if (result.failures.length) process.exitCode = 3;
