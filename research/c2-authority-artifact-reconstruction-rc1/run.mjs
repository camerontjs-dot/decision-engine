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
const CAL_AUTHORITY_ROOT = process.env.CAL_CONTRACT_B_AUTHORITY_DIR;
const RESOLVER_ROOT = process.env.APPARATUS_RESOLVER_AUTHORITY_DIR;
const PYTHON = process.env.PYTHON || "python3";
const OUT =
  process.env.DECISION_C2_ARTIFACT_AUTHORITY_OUTPUT_DIR ||
  "build/c2-authority-artifact-reconstruction-rc1";

assert.ok(C2_ROOT, "APPARATUS_CONTRACT_C2_DIR is required");
assert.ok(CAL_AUTHORITY_ROOT, "CAL_CONTRACT_B_AUTHORITY_DIR is required");
assert.ok(RESOLVER_ROOT, "APPARATUS_RESOLVER_AUTHORITY_DIR is required");

const EXACT_CAL_COMMIT = "d03d0e960ad82d889e6763fd4fb53cd24babd187";
const EXACT_C2_COMMIT = "b42c827acb0a9fe65353354d709add0e27bab307";
const EXACT_RESOLVER_COMMIT = "1d33e0612befcf8016816197c90c062373796df9";
const EXACT_RESOLVER_BLOB = "1a408246fd3bef0758a958ae716b44ea74bc0689";
const CURRENT_CAL_SEMANTIC_IMPLEMENTATION = "847cc970642bb648dc994b929c2053b5c9d4648c";
const BUNDLE_REL = "tests/fixtures/cb/evidence-bundle-minimal";
const RESOLVER_REL = "research/contract_c2_current_cal_resolver_successor_rc0/RESOLVER.json";

function sha256Id(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function runPython(program, args, input = Buffer.alloc(0), root = C2_ROOT) {
  return spawnSync(PYTHON, ["-c", program, root, ...args], {
    input,
    encoding: null,
    maxBuffer: 32 * 1024 * 1024,
  });
}

function deriveIndependentAuthority() {
  const program = String.raw`
import hashlib, json, subprocess, sys
from pathlib import Path
import yaml

_, cal_root_raw, resolver_root_raw = sys.argv[1:4]
cal_root = Path(cal_root_raw)
resolver_root = Path(resolver_root_raw)
CAL_COMMIT = "d03d0e960ad82d889e6763fd4fb53cd24babd187"
RESOLVER_COMMIT = "1d33e0612befcf8016816197c90c062373796df9"
RESOLVER_BLOB = "1a408246fd3bef0758a958ae716b44ea74bc0689"
BUNDLE_REL = "tests/fixtures/cb/evidence-bundle-minimal"
RESOLVER_REL = "research/contract_c2_current_cal_resolver_successor_rc0/RESOLVER.json"

def git(root, *args):
    return subprocess.check_output(["git", "-C", str(root), *args], text=True).strip()

assert git(cal_root, "rev-parse", "HEAD") == CAL_COMMIT
assert git(resolver_root, "rev-parse", "HEAD") == RESOLVER_COMMIT
assert git(resolver_root, "rev-parse", f"HEAD:{RESOLVER_REL}") == RESOLVER_BLOB

bundle = cal_root / BUNDLE_REL
assert bundle.is_dir()

sums = bundle / "SHA256SUMS"
assert sums.is_file()
checked = []
for raw_line in sums.read_text(encoding="utf-8").splitlines():
    line = raw_line.strip()
    if not line:
        continue
    digest, rel = line.split(None, 1)
    rel = rel.strip()
    if rel.startswith("*"):
        rel = rel[1:]
    target = bundle / rel
    assert target.is_file(), f"SHA256SUMS target missing: {rel}"
    actual = hashlib.sha256(target.read_bytes()).hexdigest()
    assert actual == digest, f"SHA256SUMS mismatch: {rel}"
    checked.append(rel)
assert checked

contract_version = (bundle / "CONTRACT_VERSION").read_text(encoding="utf-8").strip()
manifest = yaml.safe_load((bundle / "bundle_manifest.yaml").read_text(encoding="utf-8"))
assert isinstance(manifest, dict) and isinstance(manifest.get("bundle"), dict)
exact_b = {
    "contract_version": contract_version,
    "bundle_id": str(manifest["bundle"]["bundle_id"]),
    "bundle_hash": str(manifest["bundle"]["bundle_hash"]),
}
assert exact_b["bundle_hash"].startswith("sha256:")

evidence_index = []
for path in sorted(bundle.glob("evidence/*/passages/*.yaml")):
    row = yaml.safe_load(path.read_text(encoding="utf-8"))
    assert isinstance(row, dict)
    source_id = str(row["source_id"])
    passage_id = str(row["passage_id"])
    evidence_index.append([source_id, passage_id])
assert evidence_index

resolver = json.loads((resolver_root / RESOLVER_REL).read_text(encoding="utf-8"))
entries = resolver.get("entries")
assert isinstance(entries, list) and entries

print(json.dumps({
    "contract_b": exact_b,
    "evidence_index": evidence_index,
    "resolver_commit": RESOLVER_COMMIT,
    "resolver_entries": entries,
    "authority_receipt": {
        "cal_commit": CAL_COMMIT,
        "contract_b_tree": git(cal_root, "rev-parse", f"HEAD:{BUNDLE_REL}"),
        "sha256sums_checked": len(checked),
        "resolver_commit": RESOLVER_COMMIT,
        "resolver_blob": RESOLVER_BLOB,
    },
}, sort_keys=True, separators=(",", ":")))
`;
  const result = runPython(program, [CAL_AUTHORITY_ROOT, RESOLVER_ROOT]);
  assert.equal(
    result.status,
    0,
    Buffer.from(result.stderr || Buffer.alloc(0)).toString("utf8"),
  );
  return JSON.parse(Buffer.from(result.stdout).toString("utf8"));
}

const authority = deriveIndependentAuthority();
const EXACT_B = Object.freeze(authority.contract_b);
const FIXED_EVIDENCE_INDEX = Object.freeze(authority.evidence_index.map((x) => Object.freeze(x)));
const FIXED_RESOLVER_COMMIT = authority.resolver_commit;
const FIXED_RESOLVER_ENTRIES = Object.freeze(authority.resolver_entries.map((x) => Object.freeze(x)));

assert.equal(authority.authority_receipt.cal_commit, EXACT_CAL_COMMIT);
assert.equal(authority.authority_receipt.resolver_commit, EXACT_RESOLVER_COMMIT);
assert.equal(authority.authority_receipt.resolver_blob, EXACT_RESOLVER_BLOB);
assert.ok(authority.authority_receipt.sha256sums_checked > 0);

const currentRows = FIXED_RESOLVER_ENTRIES.filter(
  (row) => row.semantic_implementation_sha === CURRENT_CAL_SEMANTIC_IMPLEMENTATION,
);
assert.equal(currentRows.length, 1, "exact resolver must contain one current-CAL row");
const CURRENT_ROW = currentRows[0];
assert.match(CURRENT_ROW.policy_sha256, /^[0-9a-f]{64}$/);

function c2Python(program, input) {
  return runPython(program, [], input);
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
  const result = c2Python(program, Buffer.from(JSON.stringify(unsealed), "utf8"));
  assert.equal(
    result.status,
    0,
    Buffer.from(result.stderr || Buffer.alloc(0)).toString("utf8"),
  );
  return Buffer.from(result.stdout);
}

function strictVerify(
  raw,
  {
    evidenceIndex = FIXED_EVIDENCE_INDEX,
    resolverCommit = FIXED_RESOLVER_COMMIT,
    resolverEntries = FIXED_RESOLVER_ENTRIES,
  } = {},
) {
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
  const result = c2Python(program, Buffer.from(JSON.stringify(payload), "utf8"));
  const text = Buffer.from(result.stdout || Buffer.alloc(0)).toString("utf8").trim();
  let detail = null;
  if (text) {
    try {
      detail = JSON.parse(text);
    } catch {
      detail = { raw: text };
    }
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
    participant.evidence_ref.source_id = "src-attacker";
    basisRef.source_id = "src-attacker";
  } else if (name === "passage_substitution") {
    participant.evidence_ref.passage_id = "pass-attacker";
    basisRef.passage_id = "pass-attacker";
  } else if (name === "resolver_commit_substitution") {
    value.producer.policy_resolver_commit_sha = "b".repeat(40);
  } else if (name === "semantic_implementation_substitution") {
    value.producer.semantic_implementation_sha = "b".repeat(40);
  } else if (name === "policy_digest_substitution") {
    value.producer.policy_sha256 = "b".repeat(64);
  } else {
    throw new Error(`unknown mutation ${name}`);
  }
  return seal(value);
}

const [SOURCE_ID, PASSAGE_ID] = FIXED_EVIDENCE_INDEX[0];
const baselineUnsealed = {
  profile: "contract-c-successor-candidate-a-rc2-research",
  contract_b: EXACT_B,
  producer: {
    semantic_implementation_sha: CURRENT_CAL_SEMANTIC_IMPLEMENTATION,
    policy_sha256: CURRENT_ROW.policy_sha256,
    policy_resolver_commit_sha: FIXED_RESOLVER_COMMIT,
  },
  execution: { state: "completed" },
  propositions: [
    {
      proposition: {
        proposition_id: "Q-c2-artifact-authority-rc1",
        content_sha256: `sha256:${"2".repeat(64)}`,
      },
      execution: { state: "completed", completion: "assessed" },
      terminal: { verdict: "supported", reason: "categorical_support" },
      participants: [
        {
          evidence_ref: { source_id: SOURCE_ID, passage_id: PASSAGE_ID },
          relation: "supports",
          role: "causal",
        },
      ],
      basis_groups: [[{ source_id: SOURCE_ID, passage_id: PASSAGE_ID }]],
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
  "policy_digest_substitution",
];

const mutations = {};
const mutationRaw = {};
for (const name of mutationNames) {
  const raw = mutate(baselineRaw, name);
  mutationRaw[name] = raw;
  let decision = null;
  let currentError = null;
  try {
    decision = currentDecision(raw);
  } catch (error) {
    currentError = {
      name: error.name,
      code: error.code || null,
      message: error.message,
    };
  }
  const strict = strictVerify(raw);
  mutations[name] = {
    sha256: sha256Id(raw),
    current_ingress_reached_policy: currentError === null,
    current_disposition: decision?.evaluation?.disposition || null,
    current_error: currentError,
    artifact_derived_authority_ok: strict.ok,
    artifact_derived_authority_detail: strict.detail,
  };
}

const collusion = {
  source_substitution: strictVerify(mutationRaw.source_substitution, {
    evidenceIndex: [["src-attacker", PASSAGE_ID]],
  }),
  passage_substitution: strictVerify(mutationRaw.passage_substitution, {
    evidenceIndex: [[SOURCE_ID, "pass-attacker"]],
  }),
  resolver_commit_substitution: strictVerify(mutationRaw.resolver_commit_substitution, {
    resolverCommit: "b".repeat(40),
  }),
  semantic_implementation_substitution: strictVerify(
    mutationRaw.semantic_implementation_substitution,
    {
      resolverEntries: [
        {
          semantic_implementation_sha: "b".repeat(40),
          policy_sha256: CURRENT_ROW.policy_sha256,
        },
      ],
    },
  ),
  policy_digest_substitution: strictVerify(mutationRaw.policy_digest_substitution, {
    resolverEntries: [
      {
        semantic_implementation_sha: CURRENT_CAL_SEMANTIC_IMPLEMENTATION,
        policy_sha256: "b".repeat(64),
      },
    ],
  }),
};

const acceptance = {
  independent_artifact_selection_verified:
    authority.authority_receipt.cal_commit === EXACT_CAL_COMMIT &&
    authority.authority_receipt.resolver_commit === EXACT_RESOLVER_COMMIT &&
    authority.authority_receipt.resolver_blob === EXACT_RESOLVER_BLOB &&
    authority.authority_receipt.sha256sums_checked > 0,
  baseline_current_clear: baselineDecision.evaluation?.disposition === "clear",
  baseline_artifact_derived_pass: baselineStrict.ok,
  all_mutations_reach_current_policy: mutationNames.every(
    (name) => mutations[name].current_ingress_reached_policy,
  ),
  all_mutations_current_clear: mutationNames.every(
    (name) => mutations[name].current_disposition === "clear",
  ),
  artifact_derived_authority_kills_all: mutationNames.every(
    (name) => !mutations[name].artifact_derived_authority_ok,
  ),
  weak_evidence_collusion_passes:
    collusion.source_substitution.ok && collusion.passage_substitution.ok,
  weak_producer_collusion_passes:
    collusion.resolver_commit_substitution.ok &&
    collusion.semantic_implementation_substitution.ok &&
    collusion.policy_digest_substitution.ok,
};

const supported = Object.values(acceptance).every(Boolean);
const result = {
  experiment: "c2-authority-artifact-reconstruction-rc1",
  subject: {
    decision_engine_parent: "153cd69c5a08ed0b86d0507ccc828acdad174afe",
    c2_integration_subject: "b1bcc33e2b5ef0707b8cbf7dd8e821b2d34d1b55",
    contract_c2_authority: EXACT_C2_COMMIT,
    contract_b_artifact_commit: EXACT_CAL_COMMIT,
    resolver_authority_commit: EXACT_RESOLVER_COMMIT,
  },
  derived_authority: authority,
  baseline: {
    sha256: sha256Id(baselineRaw),
    current_disposition: baselineDecision.evaluation?.disposition || null,
    artifact_derived_verification: baselineStrict,
  },
  mutations,
  weak_collusion: collusion,
  acceptance,
  disposition: supported
    ? "SUPPORTED_ARTIFACT_DERIVED_AUTHORITY"
    : "FALSIFIED_OR_INCONCLUSIVE",
  nonclaims: [
    "The frozen Contract-B fixture does not establish retrieval completeness or source truth.",
    "This experiment does not promote C2, Decision Engine, CAL, or Contract B.",
    "No Authorization or execution authority is created.",
  ],
};

mkdirSync(OUT, { recursive: true });
writeFileSync(resolve(OUT, "RESULT.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

assert.equal(
  supported,
  true,
  "preregistered acceptance condition not satisfied; preserve RESULT.json and the failing run",
);
