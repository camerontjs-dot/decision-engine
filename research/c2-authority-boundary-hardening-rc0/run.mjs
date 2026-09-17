import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

import {
  SUPPORTED_CLAIM_VERIFICATION_POLICY,
  decideContractC2ToContractD,
} from "../../src/contractC2Decision.js";

const C2_ROOT = process.env.APPARATUS_CONTRACT_C2_DIR;
const PYTHON = process.env.PYTHON || "python3";
const OUT = process.env.DECISION_C2_AUTHORITY_OUTPUT_DIR || "build/c2-authority-boundary-hardening-rc0";

assert.ok(C2_ROOT, "APPARATUS_CONTRACT_C2_DIR is required");

const EXACT_B = Object.freeze({
  contract_version: "1.2.0",
  bundle_id: "bundle-c2-authority-hardening-001",
  bundle_hash: `sha256:${"a".repeat(64)}`,
});
const FIXED_EVIDENCE_INDEX = Object.freeze([["src-S1", "S1"]]);
const FIXED_RESOLVER_COMMIT = "43b571464734325277374ee81098553fb7c1b944";
const FIXED_SEMANTIC_IMPLEMENTATION = "a902621e8baea3063dddd7f92ba975aade305464";
const FIXED_POLICY_SHA256 = "44ecc33519fa8911079595d322f5f0decbf0389af42e153ac32214931798e42c";
const FIXED_RESOLVER_ENTRIES = Object.freeze([
  Object.freeze({
    semantic_implementation_sha: FIXED_SEMANTIC_IMPLEMENTATION,
    policy_sha256: FIXED_POLICY_SHA256,
  }),
]);

function sha256Id(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function python(program, input) {
  const result = spawnSync(PYTHON, ["-c", program, C2_ROOT], {
    input,
    encoding: null,
    maxBuffer: 32 * 1024 * 1024,
  });
  return result;
}

function seal(unsealed) {
  const program = [
    "import json, sys",
    "root = sys.argv[1]",
    "sys.path.insert(0, root)",
    "from validators import contract_c_v2 as PROD",
    "value = json.loads(sys.stdin.buffer.read().decode('utf-8'))",
    "sealed = PROD.seal(value)",
    "sys.stdout.buffer.write(PROD.canonical_bytes(sealed))",
  ].join("\n");
  const result = python(program, Buffer.from(JSON.stringify(unsealed), "utf8"));
  assert.equal(result.status, 0, Buffer.from(result.stderr || Buffer.alloc(0)).toString("utf8"));
  return Buffer.from(result.stdout);
}

function strictVerify(raw, { evidenceIndex = FIXED_EVIDENCE_INDEX, resolverCommit = FIXED_RESOLVER_COMMIT, resolverEntries = FIXED_RESOLVER_ENTRIES } = {}) {
  const payload = {
    candidate: JSON.parse(raw.toString("utf8")),
    exact_contract_b: EXACT_B,
    evidence_index: evidenceIndex,
    resolver_commit: resolverCommit,
    resolver_entries: resolverEntries,
    expected_whole_object_sha256: sha256Id(raw),
  };
  const program = [
    "import json, sys",
    "root = sys.argv[1]",
    "sys.path.insert(0, root)",
    "from validators import contract_c_v2 as PROD",
    "p = json.loads(sys.stdin.buffer.read().decode('utf-8'))",
    "try:",
    "    PROD.verify_candidate(",
    "        p['candidate'],",
    "        exact_contract_b=p['exact_contract_b'],",
    "        evidence_index=[tuple(x) for x in p['evidence_index']],",
    "        independently_selected_resolver_commit_sha=p['resolver_commit'],",
    "        resolver_entries=p['resolver_entries'],",
    "        expected_whole_object_sha256=p['expected_whole_object_sha256'],",
    "    )",
    "except Exception as exc:",
    "    print(json.dumps({'ok': False, 'error': str(exc)}, separators=(',', ':')))",
    "    raise SystemExit(1)",
    "print(json.dumps({'ok': True}, separators=(',', ':')))",
  ].join("\n");
  const result = python(program, Buffer.from(JSON.stringify(payload), "utf8"));
  const text = Buffer.from(result.stdout || Buffer.alloc(0)).toString("utf8").trim();
  let detail = null;
  if (text) {
    try { detail = JSON.parse(text); } catch { detail = { raw: text }; }
  }
  return { ok: result.status === 0, status: result.status, detail };
}

function currentDecision(raw) {
  const value = JSON.parse(raw.toString("utf8"));
  const proposition = value.propositions[0];
  return decideContractC2ToContractD({
    contractC2Bytes: raw,
    expectedContractC2Sha256: sha256Id(raw),
    contractC2AuthorityRoot: C2_ROOT,
    expectedContractB: EXACT_B,
    decisionContext: {
      policy: {
        id: SUPPORTED_CLAIM_VERIFICATION_POLICY.id,
        version: SUPPORTED_CLAIM_VERIFICATION_POLICY.version,
      },
      proposition_id: proposition.proposition.proposition_id,
      target: {
        kind: "claim",
        id: proposition.proposition.proposition_id,
        content_sha256: proposition.proposition.content_sha256,
      },
    },
    pythonExecutable: PYTHON,
  });
}

function unsealedFrom(raw) {
  const value = JSON.parse(raw.toString("utf8"));
  delete value.result_set_id;
  return value;
}

function mutate(raw, name) {
  const value = unsealedFrom(raw);
  const participant = value.propositions[0].participants[0];
  const basisRef = value.propositions[0].basis_groups[0][0];
  if (name === "source_substitution") {
    participant.evidence_ref.source_id = "src-X";
    basisRef.source_id = "src-X";
  } else if (name === "passage_substitution") {
    participant.evidence_ref.passage_id = "PX";
    basisRef.passage_id = "PX";
  } else if (name === "resolver_commit_substitution") {
    value.producer.policy_resolver_commit_sha = "b".repeat(40);
  } else if (name === "semantic_implementation_substitution") {
    value.producer.semantic_implementation_sha = "b".repeat(40);
  } else {
    throw new Error(`unknown mutation ${name}`);
  }
  return seal(value);
}

const baselineUnsealed = {
  profile: "contract-c-successor-candidate-a-rc2-research",
  contract_b: EXACT_B,
  producer: {
    semantic_implementation_sha: FIXED_SEMANTIC_IMPLEMENTATION,
    policy_sha256: FIXED_POLICY_SHA256,
    policy_resolver_commit_sha: FIXED_RESOLVER_COMMIT,
  },
  execution: { state: "completed" },
  propositions: [
    {
      proposition: {
        proposition_id: "Q-c2-authority-hardening-001",
        content_sha256: `sha256:${"2".repeat(64)}`,
      },
      execution: { state: "completed", completion: "assessed" },
      terminal: { verdict: "supported", reason: "categorical_support" },
      participants: [
        {
          evidence_ref: { source_id: "src-S1", passage_id: "S1" },
          relation: "supports",
          role: "causal",
        },
      ],
      basis_groups: [[{ source_id: "src-S1", passage_id: "S1" }]],
    },
  ],
};

const baselineRaw = seal(baselineUnsealed);
const baselineDecision = currentDecision(baselineRaw);
const baselineStrict = strictVerify(baselineRaw);

const mutationNames = [
  "source_substitution",
  "passage_substitution",
  "resolver_commit_substitution",
  "semantic_implementation_substitution",
];

const mutations = {};
for (const name of mutationNames) {
  const raw = mutate(baselineRaw, name);
  let decision;
  let currentError = null;
  try {
    decision = currentDecision(raw);
  } catch (error) {
    currentError = { name: error.name, code: error.code || null, message: error.message };
  }
  const strict = strictVerify(raw);
  mutations[name] = {
    sha256: sha256Id(raw),
    current_ingress_reached_policy: currentError === null,
    current_disposition: decision?.evaluation?.disposition || null,
    current_error: currentError,
    strict_fixed_authority_ok: strict.ok,
    strict_fixed_authority_detail: strict.detail,
  };
}

const sourceRaw = mutate(baselineRaw, "source_substitution");
const resolverRaw = mutate(baselineRaw, "resolver_commit_substitution");
const implementationRaw = mutate(baselineRaw, "semantic_implementation_substitution");

const collusion = {
  source_index_collusion: strictVerify(sourceRaw, { evidenceIndex: [["src-X", "S1"]] }),
  resolver_commit_collusion: strictVerify(resolverRaw, { resolverCommit: "b".repeat(40) }),
  resolver_row_collusion: strictVerify(implementationRaw, {
    resolverEntries: [{ semantic_implementation_sha: "b".repeat(40), policy_sha256: FIXED_POLICY_SHA256 }],
  }),
};

const acceptance = {
  baseline_clear: baselineDecision.evaluation?.disposition === "clear",
  baseline_strict_pass: baselineStrict.ok,
  mutations_reach_current_policy: mutationNames.every((name) => mutations[name].current_ingress_reached_policy),
  mutations_current_clear: mutationNames.every((name) => mutations[name].current_disposition === "clear"),
  strict_kills_all_mutations: mutationNames.every((name) => !mutations[name].strict_fixed_authority_ok),
  colluding_authority_can_pass: Object.values(collusion).some((row) => row.ok),
};

const supported = Object.values(acceptance).every(Boolean);
const result = {
  experiment: "c2-authority-boundary-hardening-rc0",
  subject: {
    decision_engine_base: "b1bcc33e2b5ef0707b8cbf7dd8e821b2d34d1b55",
    contract_c2_authority: "b42c827acb0a9fe65353354d709add0e27bab307",
  },
  frozen_authority_inputs: {
    exact_contract_b: EXACT_B,
    evidence_index: FIXED_EVIDENCE_INDEX,
    resolver_commit: FIXED_RESOLVER_COMMIT,
    resolver_entries: FIXED_RESOLVER_ENTRIES,
  },
  baseline: {
    sha256: sha256Id(baselineRaw),
    current_disposition: baselineDecision.evaluation?.disposition || null,
    strict_verification: baselineStrict,
  },
  mutations,
  collusion,
  acceptance,
  disposition: supported ? "SUPPORTED_WITH_BOUNDARY" : "INCONCLUSIVE_OR_FALSIFIED",
};

mkdirSync(OUT, { recursive: true });
writeFileSync(resolve(OUT, "RESULT.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

assert.equal(supported, true, "preregistered acceptance condition not satisfied; preserve RESULT.json and the failed run");
