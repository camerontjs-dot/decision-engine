import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

import { SUPPORTED_CLAIM_VERIFICATION_POLICY } from "../src/contractCDecision.js";
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
const pythonExecutable = args.get("--python") || "python3";
const outputPath = args.get("--out");

if (!fixtureRoot || !consumerRoot || !outputPath) {
  throw new Error("--fixtures, --consumer, and --out are required");
}

const receipt = {
  schema: "parent-bound-policy-dispatch-pressure/1",
  frozen_subject: {
    decision_engine_commit: "816374379ba7eb23f5bfdadaf203b7e287c052db",
    dispatch_blob: "9948b0dba9f77d2ad7c71d74b27d2684985ecc70",
    parent_baseline: "6cdb59c2ba41779ac954af56dd077574ba090013",
  },
  controls: {},
  falsifiers: [],
  apparatus_errors: [],
};

function digestId(raw) {
  return "sha256:" + createHash("sha256").update(raw).digest("hex");
}

function loadCase(caseId) {
  const raw = readFileSync(`${fixtureRoot}/${caseId}/contract-c.json`);
  const consumerInputs = JSON.parse(
    readFileSync(`${fixtureRoot}/${caseId}/consumer-inputs.json`, "utf8"),
  );
  const manifest = JSON.parse(readFileSync(`${fixtureRoot}/MANIFEST.json`, "utf8"));
  const root = manifest.cases[caseId].root;
  const target = {
    kind: "claim",
    id: root.proposition_id,
    content_sha256: root.text_sha256,
  };
  return { raw, consumerInputs, target, contractCSha256: digestId(raw) };
}

function contextFor(policy, target) {
  return {
    policy: { id: policy.id, version: policy.version },
    target,
  };
}

function decide(policy, loaded, context = contextFor(policy, loaded.target)) {
  return decideParentBoundPolicy({
    contractCBytes: loaded.raw,
    expectedContractCSha256: loaded.contractCSha256,
    consumerRoot,
    consumerInputs: loaded.consumerInputs,
    decisionContext: context,
    pythonExecutable,
  });
}

function record(name, value) {
  receipt.controls[name] = value;
}

function falsify(name, detail) {
  receipt.falsifiers.push({ name, detail });
}

function expectReject(name, loaded, context) {
  try {
    const value = decide(EPISTEMIC_AUDIT_STAGE_PENDING_REVIEW_POLICY, loaded, context);
    record(name, {
      rejected: false,
      returned_policy: value?.policy ?? null,
      returned_effect: value?.effect ?? null,
      returned_target: value?.target ?? null,
    });
    falsify(name, "caller-controlled input emitted a Decision");
  } catch (error) {
    record(name, {
      rejected: true,
      error_code: error?.code ?? error?.name ?? "UNKNOWN",
    });
  }
}

const maintained = new Map([
  [
    `${SUPPORTED_CLAIM_VERIFICATION_POLICY.id}@${SUPPORTED_CLAIM_VERIFICATION_POLICY.version}`,
    SUPPORTED_CLAIM_VERIFICATION_POLICY.effect,
  ],
  [
    `${EPISTEMIC_AUDIT_STAGE_PENDING_REVIEW_POLICY.id}@${EPISTEMIC_AUDIT_STAGE_PENDING_REVIEW_POLICY.version}`,
    EPISTEMIC_AUDIT_STAGE_PENDING_REVIEW_POLICY.effect,
  ],
]);

function reconstructEffect(decision) {
  const key = `${decision?.policy?.id}@${decision?.policy?.version}`;
  if (!maintained.has(key)) {
    throw new Error(`unresolvable policy identity: ${key}`);
  }
  const expected = structuredClone(maintained.get(key));
  assert.deepEqual(decision.effect, expected);
  return expected;
}

try {
  const loaded = loadCase("PIPE01");
  const policy = EPISTEMIC_AUDIT_STAGE_PENDING_REVIEW_POLICY;
  const base = contextFor(policy, loaded.target);

  const first = decide(policy, loaded);
  const second = decide(policy, loaded);

  try {
    assert.deepEqual(first, second);
    record("deterministic_replay", { passed: true });
  } catch (error) {
    record("deterministic_replay", { passed: false, detail: error.message });
    falsify("deterministic_replay", error.message);
  }

  try {
    const reconstructed = reconstructEffect(first);
    record("policy_effect_reconstruction", {
      passed: true,
      policy: first.policy,
      effect: reconstructed,
    });
  } catch (error) {
    record("policy_effect_reconstruction", { passed: false, detail: error.message });
    falsify("policy_effect_reconstruction", error.message);
  }

  const mutatedReceipt = structuredClone(first);
  mutatedReceipt.effect = {
    type: "caller.mutated_effect",
    version: "1",
    params: {},
  };
  let mutatedReceiptRejected = false;
  try {
    reconstructEffect(mutatedReceipt);
  } catch {
    mutatedReceiptRejected = true;
  }
  record("reconstruction_oracle_mutated_effect", { rejected: mutatedReceiptRejected });
  if (!mutatedReceiptRejected) {
    receipt.apparatus_errors.push({
      name: "reconstruction_oracle_mutated_effect",
      detail: "reconstruction oracle accepted a changed effect under the same policy id/version",
    });
  }

  const callerEffect = {
    type: "caller.smuggled_effect",
    version: "1",
    params: { requested: true },
  };

  expectReject("top_level_effect", loaded, { ...base, effect: callerEffect });
  expectReject("top_level_requested_operation", loaded, {
    ...base,
    requested_operation: "caller.smuggled_effect@1",
  });
  expectReject("policy_effect", loaded, {
    policy: { ...base.policy, effect: callerEffect },
    target: loaded.target,
  });
  expectReject("policy_requested_operation", loaded, {
    policy: { ...base.policy, requested_operation: "caller.smuggled_effect@1" },
    target: loaded.target,
  });
  expectReject("target_effect", loaded, {
    policy: base.policy,
    target: { ...loaded.target, effect: callerEffect },
  });
  expectReject("target_requested_operation", loaded, {
    policy: base.policy,
    target: { ...loaded.target, requested_operation: "caller.smuggled_effect@1" },
  });

  for (const [name, id] of [
    ["policy_id_trailing_space", policy.id + " "],
    ["policy_id_uppercase", policy.id.toUpperCase()],
    ["policy_id_fullwidth_dot", policy.id.replace(".", "．")],
    ["policy_id_proto_name", "__proto__"],
    ["policy_id_constructor_name", "constructor"],
    ["policy_id_to_string_name", "toString"],
  ]) {
    expectReject(name, loaded, {
      policy: { id, version: policy.version },
      target: loaded.target,
    });
  }

  expectReject("policy_version_whitespace", loaded, {
    policy: { id: policy.id, version: policy.version + " " },
    target: loaded.target,
  });

  {
    const reads = { kind: 0, id: 0, content_sha256: 0 };
    const shiftingTarget = {};
    Object.defineProperties(shiftingTarget, {
      kind: {
        enumerable: true,
        configurable: true,
        get() {
          reads.kind += 1;
          return "claim";
        },
      },
      id: {
        enumerable: true,
        configurable: true,
        get() {
          reads.id += 1;
          return reads.id <= 2 ? loaded.target.id : "caller-rebound-target";
        },
      },
      content_sha256: {
        enumerable: true,
        configurable: true,
        get() {
          reads.content_sha256 += 1;
          return reads.content_sha256 <= 2
            ? loaded.target.content_sha256
            : "sha256:" + "ab".repeat(32);
        },
      },
    });

    try {
      const value = decide(policy, loaded, contextFor(policy, shiftingTarget));
      const remainedBound =
        value.target?.kind === loaded.target.kind &&
        value.target?.id === loaded.target.id &&
        value.target?.content_sha256 === loaded.target.content_sha256;
      record("dynamic_target_rebind", {
        rejected: false,
        remained_bound: remainedBound,
        reads,
        emitted_target: value.target,
      });
      if (!remainedBound) {
        falsify(
          "dynamic_target_rebind",
          "accessor-backed target changed after validation and the changed target was emitted",
        );
      }
    } catch (error) {
      record("dynamic_target_rebind", {
        rejected: true,
        error_code: error?.code ?? error?.name ?? "UNKNOWN",
        reads,
      });
    }
  }

  {
    const keys = ["id", "version", "effect"];
    const previous = new Map(keys.map((key) => [key, Object.getOwnPropertyDescriptor(Object.prototype, key)]));
    try {
      Object.defineProperty(Object.prototype, "id", {
        value: "caller.prototype.policy",
        writable: true,
        configurable: true,
        enumerable: false,
      });
      Object.defineProperty(Object.prototype, "version", {
        value: policy.version,
        writable: true,
        configurable: true,
        enumerable: false,
      });
      Object.defineProperty(Object.prototype, "effect", {
        value: callerEffect,
        writable: true,
        configurable: true,
        enumerable: false,
      });

      try {
        const value = decide(policy, loaded, {
          policy: { id: "__proto__", version: policy.version },
          target: loaded.target,
        });
        record("prototype_inherited_policy_smuggling", {
          rejected: false,
          returned_policy: value.policy,
          returned_effect: value.effect,
        });
        falsify(
          "prototype_inherited_policy_smuggling",
          "inherited registry entry emitted a Decision and supplied caller-controlled policy/effect state",
        );
      } catch (error) {
        record("prototype_inherited_policy_smuggling", {
          rejected: true,
          error_code: error?.code ?? error?.name ?? "UNKNOWN",
        });
      }
    } finally {
      for (const key of keys) {
        const descriptor = previous.get(key);
        if (descriptor) Object.defineProperty(Object.prototype, key, descriptor);
        else delete Object.prototype[key];
      }
    }
  }

  const supported = decide(SUPPORTED_CLAIM_VERIFICATION_POLICY, loaded);
  try {
    reconstructEffect(supported);
    record("supported_policy_reconstruction", {
      passed: true,
      policy: supported.policy,
      effect: supported.effect,
    });
  } catch (error) {
    record("supported_policy_reconstruction", { passed: false, detail: error.message });
    falsify("supported_policy_reconstruction", error.message);
  }

  receipt.disposition =
    receipt.apparatus_errors.length > 0
      ? "INCONCLUSIVE"
      : receipt.falsifiers.length > 0
        ? "FALSIFIED"
        : "SUPPORTED FOR PROMOTION";
} catch (error) {
  receipt.apparatus_errors.push({
    name: "pressure_harness_execution",
    detail: error?.stack ?? String(error),
  });
  receipt.disposition = "INCONCLUSIVE";
}

receipt.passed_apparatus = receipt.apparatus_errors.length === 0;
writeFileSync(outputPath, JSON.stringify(receipt, null, 2) + "\n");
process.stdout.write(receipt.disposition + "\n");
if (!receipt.passed_apparatus) process.exitCode = 2;
