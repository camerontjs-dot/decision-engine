import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";

import { SUPPORTED_CLAIM_VERIFICATION_POLICY } from "../src/contractCDecision.js";
import { decideParentBoundContractCToContractD } from "../src/parentBoundContractCDecision.js";
import {
  EPISTEMIC_AUDIT_STAGE_PENDING_REVIEW_POLICY,
  decideParentBoundPolicy,
} from "../src/parentBoundPolicyDispatch.js";

const [fixtureRoot, consumerRoot, outputPath] = process.argv.slice(2);
if (!fixtureRoot || !consumerRoot || !outputPath) {
  throw new Error("usage: node tests/parent-bound-policy-dispatch-adversarial.mjs <fixtures> <consumer> <receipt>");
}

const manifest = JSON.parse(readFileSync(`${fixtureRoot}/MANIFEST.json`, "utf8"));
const expected = {
  PIPE01: { parent: "supported", disposition: "clear" },
  PIPE02: { parent: "contradicted", disposition: "hold" },
  PIPE03: { parent: "not_checkable", disposition: "hold" },
};

const receipt = {
  schema: "parent-bound-policy-dispatch-hardening-v1",
  subject_commit: process.env.GITHUB_SHA ?? null,
  subject_dispatch_blob: process.env.SUBJECT_DISPATCH_BLOB ?? null,
  predecessor_subject_commit: "816374379ba7eb23f5bfdadaf203b7e287c052db",
  baseline_equivalence: {},
  policy_reconstruction: {},
  negative_controls: {},
  adversarial_controls: {},
  failures: [],
};

function fail(name, detail) {
  receipt.failures.push({ name, detail: String(detail) });
}

function loadCase(caseId) {
  const info = manifest.cases[caseId];
  const raw = readFileSync(`${fixtureRoot}/${caseId}/contract-c.json`);
  const consumerInputs = JSON.parse(
    readFileSync(`${fixtureRoot}/${caseId}/consumer-inputs.json`, "utf8"),
  );
  const target = {
    kind: "claim",
    id: info.root.proposition_id,
    content_sha256: info.root.text_sha256,
  };
  return {
    raw,
    consumerInputs,
    target,
    contractCSha256: info.whole_object_sha256,
  };
}

function callPolicy(loaded, policy, target = loaded.target, extraContext = {}) {
  return decideParentBoundPolicy({
    contractCBytes: loaded.raw,
    expectedContractCSha256: loaded.contractCSha256,
    consumerRoot,
    consumerInputs: loaded.consumerInputs,
    decisionContext: {
      policy,
      target,
      ...extraContext,
    },
    pythonExecutable: "python3",
  });
}

function expectReject(name, fn, expectedCode = null) {
  try {
    const value = fn();
    receipt.negative_controls[name] = {
      rejected: false,
      emitted_policy: value?.policy ?? null,
      emitted_effect: value?.effect ?? null,
    };
    fail(name, "emitted a Decision");
  } catch (error) {
    const code = error?.code ?? error?.name ?? "UNKNOWN";
    receipt.negative_controls[name] = { rejected: true, error_code: code };
    if (expectedCode && code !== expectedCode) {
      fail(name, `expected ${expectedCode}, got ${code}`);
    }
  }
}

for (const caseId of Object.keys(expected)) {
  const loaded = loadCase(caseId);
  const frozen = decideParentBoundContractCToContractD({
    contractCBytes: loaded.raw,
    expectedContractCSha256: loaded.contractCSha256,
    consumerRoot,
    consumerInputs: loaded.consumerInputs,
    decisionContext: { target: loaded.target },
    pythonExecutable: "python3",
  });
  const supported = callPolicy(
    loaded,
    {
      id: SUPPORTED_CLAIM_VERIFICATION_POLICY.id,
      version: SUPPORTED_CLAIM_VERIFICATION_POLICY.version,
    },
  );
  try {
    assert.deepEqual(supported, frozen);
    receipt.baseline_equivalence[caseId] = true;
  } catch (error) {
    receipt.baseline_equivalence[caseId] = false;
    fail(`${caseId}:baseline_equivalence`, error.message);
  }

  const ers = callPolicy(
    loaded,
    {
      id: EPISTEMIC_AUDIT_STAGE_PENDING_REVIEW_POLICY.id,
      version: EPISTEMIC_AUDIT_STAGE_PENDING_REVIEW_POLICY.version,
    },
  );
  const ok =
    ers.policy?.id === EPISTEMIC_AUDIT_STAGE_PENDING_REVIEW_POLICY.id &&
    ers.policy?.version === EPISTEMIC_AUDIT_STAGE_PENDING_REVIEW_POLICY.version &&
    ers.effect?.type === "epistemic_audit.stage_pending_review" &&
    ers.effect?.version === "1" &&
    JSON.stringify(ers.effect?.params) === "{}" &&
    ers.metadata?.diagnostics?.parent_conclusion === expected[caseId].parent &&
    ers.evaluation?.disposition === expected[caseId].disposition;
  receipt.policy_reconstruction[caseId] = {
    passed: ok,
    policy: ers.policy,
    effect: ers.effect,
    parent_conclusion: ers.metadata?.diagnostics?.parent_conclusion ?? null,
    disposition: ers.evaluation?.disposition ?? null,
  };
  if (!ok) fail(`${caseId}:policy_reconstruction`, JSON.stringify(receipt.policy_reconstruction[caseId]));
}

{
  const loaded = loadCase("PIPE01");
  const exactPolicy = {
    id: EPISTEMIC_AUDIT_STAGE_PENDING_REVIEW_POLICY.id,
    version: EPISTEMIC_AUDIT_STAGE_PENDING_REVIEW_POLICY.version,
  };

  expectReject(
    "direct_policy_effect",
    () =>
      callPolicy(loaded, {
        ...exactPolicy,
        effect: { type: "caller.smuggled_operation", version: "1", params: {} },
      }),
    "invalid_context",
  );

  expectReject(
    "direct_requested_operation",
    () =>
      callPolicy(loaded, exactPolicy, loaded.target, {
        requested_operation: "caller.smuggled_operation@1",
      }),
    "invalid_context",
  );

  expectReject(
    "unknown_policy",
    () => callPolicy(loaded, { id: "decision-engine.contract-c.unknown", version: "1.0.0" }),
    "unsupported_policy",
  );

  expectReject(
    "wrong_policy_version",
    () =>
      callPolicy(loaded, {
        id: EPISTEMIC_AUDIT_STAGE_PENDING_REVIEW_POLICY.id,
        version: "9.9.9",
      }),
    "unsupported_policy",
  );

  expectReject(
    "prototype_name_policy",
    () => callPolicy(loaded, { id: "__proto__", version: "1.0.0" }),
    "unsupported_policy",
  );

  expectReject(
    "non_cloneable_policy_context",
    () =>
      callPolicy(
        loaded,
        new Proxy(exactPolicy, {}),
      ),
    "invalid_context",
  );

  let idReads = 0;
  const driftingTarget = {};
  Object.defineProperties(driftingTarget, {
    kind: {
      enumerable: true,
      get() {
        return loaded.target.kind;
      },
    },
    id: {
      enumerable: true,
      get() {
        idReads += 1;
        return idReads <= 2 ? loaded.target.id : "attacker-substituted-target";
      },
    },
    content_sha256: {
      enumerable: true,
      get() {
        return loaded.target.content_sha256;
      },
    },
  });

  try {
    const value = callPolicy(loaded, exactPolicy, driftingTarget);
    const safe = value?.target?.id === loaded.target.id;
    receipt.adversarial_controls.validation_materialization_drift = {
      emitted: true,
      safe,
      observed_target_id: value?.target?.id ?? null,
      getter_reads: idReads,
    };
    if (!safe) {
      fail(
        "validation_materialization_drift",
        `validated target was replaced during materialization: ${value?.target?.id}`,
      );
    }
  } catch (error) {
    receipt.adversarial_controls.validation_materialization_drift = {
      emitted: false,
      safe: true,
      error_code: error?.code ?? error?.name ?? "UNKNOWN",
      getter_reads: idReads,
    };
  }

  const saved = {
    id: Object.id,
    version: Object.version,
    effect: Object.effect,
    hasId: Object.prototype.hasOwnProperty.call(Object, "id"),
    hasVersion: Object.prototype.hasOwnProperty.call(Object, "version"),
    hasEffect: Object.prototype.hasOwnProperty.call(Object, "effect"),
  };
  try {
    Object.id = "constructor";
    Object.version = "1.0.0";
    Object.effect = {
      type: "caller.smuggled_operation",
      version: "1",
      params: { source: "inherited-registry-name" },
    };
    try {
      const value = callPolicy(loaded, { id: "constructor", version: "1.0.0" });
      const safe = value?.effect?.type !== "caller.smuggled_operation";
      receipt.adversarial_controls.inherited_registry_injection = {
        emitted: true,
        safe,
        emitted_policy: value?.policy ?? null,
        emitted_effect: value?.effect ?? null,
      };
      if (!safe) {
        fail(
          "inherited_registry_injection",
          "registry prototype resolved an unmaintained policy and emitted caller-controlled effect",
        );
      }
    } catch (error) {
      receipt.adversarial_controls.inherited_registry_injection = {
        emitted: false,
        safe: true,
        error_code: error?.code ?? error?.name ?? "UNKNOWN",
      };
    }
  } finally {
    for (const [key, had, value] of [
      ["id", saved.hasId, saved.id],
      ["version", saved.hasVersion, saved.version],
      ["effect", saved.hasEffect, saved.effect],
    ]) {
      if (had) Object[key] = value;
      else delete Object[key];
    }
  }
}

receipt.passed = receipt.failures.length === 0;
receipt.disposition = receipt.passed
  ? "SUPPORTED_FAIL_CLOSED_DISPATCH_BOUNDARY"
  : "FALSIFIED_CANDIDATE_BOUNDARY";
writeFileSync(outputPath, JSON.stringify(receipt, null, 2) + "\n");
process.stdout.write(receipt.disposition + "\n");
if (!receipt.passed) {
  process.stderr.write(JSON.stringify(receipt.failures, null, 2) + "\n");
  process.exitCode = 1;
}
