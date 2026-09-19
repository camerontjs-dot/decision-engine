import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { decideContractCToContractD, ContractCDecisionError } from "../../src/contractCDecision.js";
import { canonicalizeContractDWithAuthority } from "../../src/contractDCanonicalOutput.js";
import {
  ParentBoundDecisionError,
  decideParentBoundContractCToContractD,
  readFixture,
} from "./parentBoundContractCDecision.mjs";

const fixtureRoot = process.argv[2];
const consumerRoot = process.env.CONSUMER_ROOT;
const contractC1Root = process.env.CONTRACT_C1_ROOT;
const contractDRoot = process.env.CONTRACT_D_ROOT;
const outputPath = process.argv[3];

const expectedWhole = {
  PIPE01: "sha256:a0e2f77b48a9a9fe8347df345e5f112cfe76bde19cc82986c2efaccf90730524",
  PIPE02: "sha256:f2a1c54ea5e7eb9aaeca256d035247b79b563d3a4dbb19fd580362d2065a6e24",
  PIPE03: "sha256:bfad4513810c30ab7e17c2dd6779a04e19733c3e297a58374d646d7a912b7eff",
  PIPE04: "sha256:0e9f6e028685e5ed5e739e71cc78e88058aeb47734db284322240e2de8ca1304",
};

const manifest = readFixture(join(fixtureRoot, "MANIFEST.json"));
const observed = {
  schema: "contract-c-parent-bound-de-qualification-result-v1",
  direct_v1_ingress: {},
  adapter_cases: {},
  negative_controls: {},
  maintained_source_changed: false,
};

for (const caseId of Object.keys(expectedWhole)) {
  const info = manifest.cases[caseId];
  assert.equal(info.whole_object_sha256, expectedWhole[caseId]);
  const raw = readFileSync(join(fixtureRoot, caseId, "contract-c.json"));
  const inputs = readFixture(join(fixtureRoot, caseId, "consumer-inputs.json"));
  const target = {
    kind: "claim",
    id: info.root.proposition_id,
    content_sha256: info.root.text_sha256,
  };

  let directRejected = false;
  let directCode = null;
  try {
    decideContractCToContractD({
      contractCBytes: raw,
      expectedContractCSha256: expectedWhole[caseId],
      contractCAuthorityRoot: contractC1Root,
      expectedContractB: info.contract_b,
      decisionContext: {
        policy: {
          id: "decision-engine.contract-c.supported-claim-verification",
          version: "1.0.0",
        },
        proposition_id: info.root.proposition_id,
        target,
      },
    });
  } catch (error) {
    directRejected = error instanceof ContractCDecisionError;
    directCode = error?.code ?? error?.name ?? "UNKNOWN";
  }
  assert.equal(directRejected, true, `${caseId}: frozen C1 ingress unexpectedly accepted parent-bound Contract C`);
  observed.direct_v1_ingress[caseId] = { rejected: true, error_code: directCode };

  const decision = decideParentBoundContractCToContractD({
    contractCBytes: raw,
    expectedContractCSha256: expectedWhole[caseId],
    consumerRoot,
    consumerInputs: inputs,
    decisionContext: { target },
  });
  const expectedDisposition = info.expected_parent === "supported" ? "clear" : "hold";
  assert.equal(decision.evaluation.state, "completed");
  assert.equal(decision.evaluation.disposition, expectedDisposition);
  assert.equal(decision.target.id, info.root.proposition_id);
  assert.equal(decision.input_authority.immutable_id, expectedWhole[caseId]);
  const canonicalD = canonicalizeContractDWithAuthority({
    decision,
    contractDAuthorityRoot: contractDRoot,
  });
  assert.ok(canonicalD.length > 0);
  observed.adapter_cases[caseId] = {
    parent_conclusion: info.expected_parent,
    disposition: decision.evaluation.disposition,
    contract_d_canonical: true,
  };
}

function expectReject(name, fn) {
  try {
    fn();
    observed.negative_controls[name] = { rejected: false };
    throw new Error(`${name}: false accept`);
  } catch (error) {
    if (error?.message === `${name}: false accept`) throw error;
    observed.negative_controls[name] = {
      rejected: true,
      error_code: error?.code ?? error?.name ?? "UNKNOWN",
    };
  }
}

{
  const caseId = "PIPE01";
  const info = manifest.cases[caseId];
  const raw = readFileSync(join(fixtureRoot, caseId, "contract-c.json"));
  const inputs = readFixture(join(fixtureRoot, caseId, "consumer-inputs.json"));
  const target = { kind: "claim", id: info.root.proposition_id, content_sha256: info.root.text_sha256 };

  const mutatedRaw = Buffer.concat([raw, Buffer.from(" ")]);
  expectReject("raw_byte_mutation_fixed_authority", () =>
    decideParentBoundContractCToContractD({
      contractCBytes: mutatedRaw,
      expectedContractCSha256: expectedWhole[caseId],
      consumerRoot,
      consumerInputs: inputs,
      decisionContext: { target },
    }),
  );

  const missingNative = structuredClone(inputs);
  delete missingNative.native_child_results_b64[Object.keys(missingNative.native_child_results_b64)[0]];
  expectReject("missing_native_child", () =>
    decideParentBoundContractCToContractD({
      contractCBytes: raw,
      expectedContractCSha256: expectedWhole[caseId],
      consumerRoot,
      consumerInputs: missingNative,
      decisionContext: { target },
    }),
  );

  expectReject("root_target_substitution", () =>
    decideParentBoundContractCToContractD({
      contractCBytes: raw,
      expectedContractCSha256: expectedWhole[caseId],
      consumerRoot,
      consumerInputs: inputs,
      decisionContext: {
        target: { ...target, id: target.id + "-substituted" },
      },
    }),
  );

  const pipe03 = readFixture(join(fixtureRoot, "PIPE03", "consumer-inputs.json"));
  const replay = structuredClone(inputs);
  const common = Object.keys(replay.native_child_results_b64).find((key) =>
    Object.prototype.hasOwnProperty.call(pipe03.native_child_results_b64, key),
  );
  assert.ok(common, "no common child for replay control");
  replay.native_child_results_b64[common] = pipe03.native_child_results_b64[common];
  expectReject("cross_run_native_child_replay", () =>
    decideParentBoundContractCToContractD({
      contractCBytes: raw,
      expectedContractCSha256: expectedWhole[caseId],
      consumerRoot,
      consumerInputs: replay,
      decisionContext: { target },
    }),
  );

  const wrongAuthority = structuredClone(inputs);
  wrongAuthority.expected_authority.whole_object_sha256 = "sha256:" + "0".repeat(64);
  expectReject("consumer_authority_mismatch", () =>
    decideParentBoundContractCToContractD({
      contractCBytes: raw,
      expectedContractCSha256: expectedWhole[caseId],
      consumerRoot,
      consumerInputs: wrongAuthority,
      decisionContext: { target },
    }),
  );
}

const falseAccepts = Object.entries(observed.negative_controls)
  .filter(([, value]) => !value.rejected)
  .map(([key]) => key);
assert.deepEqual(falseAccepts, []);

observed.disposition = "SUPPORTED_FROZEN_DECISION_CORE_WITH_ADDITIVE_PARENT_BOUND_INGRESS";
observed.production_change_required = {
  frozen_v1_release_mutation: false,
  decision_policy_kernel_change: false,
  contract_d_change: false,
  additive_parent_bound_ingress_required_for_direct_support: true,
};

writeFileSync(outputPath, JSON.stringify(observed, null, 2) + "\n");
console.log(JSON.stringify(observed));
