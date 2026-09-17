import assert from "node:assert/strict";
import {
  createHash,
  createPrivateKey,
  createPublicKey,
  sign as cryptoSign,
  verify as cryptoVerify,
} from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

import {
  SUPPORTED_CLAIM_VERIFICATION_POLICY,
  decideContractC2ToContractD,
} from "../../src/contractC2Decision.js";
import {
  contractC2InputAuthority,
  loadExactContractC2ForDecision,
} from "../../src/contractC2Ingress.js";
import { canonicalizeContractDWithAuthority } from "../../src/contractDCanonicalOutput.js";
import { projectDecision } from "./projectionKernel.mjs";

const C2_ROOT = process.env.APPARATUS_CONTRACT_C2_DIR;
const CAL_AUTHORITY_ROOT = process.env.CAL_CONTRACT_B_AUTHORITY_DIR;
const RESOLVER_ROOT = process.env.APPARATUS_RESOLVER_AUTHORITY_DIR;
const CONTRACT_D_ROOT = process.env.CONTRACT_D_AUTHORITY_DIR;
const RC1_RESULT = process.env.RC1_RESULT_PATH;
const LEGACY_RESULT = process.env.LEGACY_MANIFEST_RESULT_PATH;
const OUT = process.env.AUTHORITY_ADAPTER_RC2_OUTPUT_DIR || "build/authority-adapter-seam-rc2";
const PYTHON = process.env.PYTHON || "python3";

for (const [name, value] of Object.entries({
  APPARATUS_CONTRACT_C2_DIR: C2_ROOT,
  CAL_CONTRACT_B_AUTHORITY_DIR: CAL_AUTHORITY_ROOT,
  APPARATUS_RESOLVER_AUTHORITY_DIR: RESOLVER_ROOT,
  CONTRACT_D_AUTHORITY_DIR: CONTRACT_D_ROOT,
  RC1_RESULT_PATH: RC1_RESULT,
  LEGACY_MANIFEST_RESULT_PATH: LEGACY_RESULT,
})) assert.ok(value, `${name} is required`);

const EXACT_CAL_COMMIT = "d03d0e960ad82d889e6763fd4fb53cd24babd187";
const EXACT_C2_COMMIT = "b42c827acb0a9fe65353354d709add0e27bab307";
const EXACT_RESOLVER_COMMIT = "1d33e0612befcf8016816197c90c062373796df9";
const EXACT_RESOLVER_BLOB = "1a408246fd3bef0758a958ae716b44ea74bc0689";
const CURRENT_CAL_SEMANTIC_IMPLEMENTATION = "847cc970642bb648dc994b929c2053b5c9d4648c";
const BUNDLE_REL = "tests/fixtures/cb/evidence-bundle-minimal";
const RESOLVER_REL = "research/contract_c2_current_cal_resolver_successor_rc0/RESOLVER.json";
const EXPECTED_PROJECTION_KERNEL_SHA256 = "e12d53020b3a6a046f4ee7688db0a5ea5c5e0a63e758b1c1e5711e7b227759e3";

const SIGNED_POLICY = Object.freeze({
  id: "decision-engine.research.signed-artifact-eligibility",
  version: "0.1.0",
});
const SIGNED_EFFECT = Object.freeze({
  type: "knowledge.add_verified_tag",
  version: "1",
  params: Object.freeze({ scope: "claim" }),
});
const TRUSTED_SIGNER = "research-signer.example";
const TRUSTED_SIGNED_VERSION = "1";
const TRUSTED_PRIVATE_KEY_PEM = `-----BEGIN PRIVATE KEY-----\nMC4CAQAwBQYDK2VwBCIEIADDSxr5PN2RgQIBlKh1mnOxlzKKHtJB6bV2dALrPW3j\n-----END PRIVATE KEY-----\n`;
const TRUSTED_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAKqCi0IxYrfVx+J56KWPfPSHdg94621jpCP3WL9F88XQ=\n-----END PUBLIC KEY-----\n`;
const ATTACKER_PRIVATE_KEY_PEM = `-----BEGIN PRIVATE KEY-----\nMC4CAQAwBQYDK2VwBCIEIB179b9QcJkqXVfP7WywyQbxIfgNX4RMACvELex/Xv/T\n-----END PRIVATE KEY-----\n`;
const ATTACKER_PUBLIC_KEY_PEM = createPublicKey(createPrivateKey(ATTACKER_PRIVATE_KEY_PEM)).export({ type: "spki", format: "pem" });

class AuthorityAdmissionError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "AuthorityAdmissionError";
    this.code = code;
  }
}
function fail(code, message) { throw new AuthorityAdmissionError(code, message); }
function sha256Hex(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
function sha256Id(bytes) { return `sha256:${sha256Hex(bytes)}`; }
function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((x) => canonicalJson(x)).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
}
function exactKeys(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("invalid_input", `${label} must be object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) fail("invalid_input", `${label} keys mismatch`);
}
function runPython(program, args, input = Buffer.alloc(0), root = C2_ROOT) {
  return spawnSync(PYTHON, ["-c", program, root, ...args], { input, encoding: null, maxBuffer: 32 * 1024 * 1024 });
}

function deriveIndependentAuthority() {
  const program = String.raw`
import hashlib, json, subprocess, sys
from pathlib import Path
import yaml
_, cal_root_raw, resolver_root_raw = sys.argv[1:4]
cal_root = Path(cal_root_raw); resolver_root = Path(resolver_root_raw)
CAL_COMMIT = "d03d0e960ad82d889e6763fd4fb53cd24babd187"
RESOLVER_COMMIT = "1d33e0612befcf8016816197c90c062373796df9"
RESOLVER_BLOB = "1a408246fd3bef0758a958ae716b44ea74bc0689"
BUNDLE_REL = "tests/fixtures/cb/evidence-bundle-minimal"
RESOLVER_REL = "research/contract_c2_current_cal_resolver_successor_rc0/RESOLVER.json"
def git(root, *args): return subprocess.check_output(["git", "-C", str(root), *args], text=True).strip()
assert git(cal_root, "rev-parse", "HEAD") == CAL_COMMIT
assert git(resolver_root, "rev-parse", "HEAD") == RESOLVER_COMMIT
assert git(resolver_root, "rev-parse", f"HEAD:{RESOLVER_REL}") == RESOLVER_BLOB
bundle = cal_root / BUNDLE_REL; assert bundle.is_dir()
checked = []
for raw_line in (bundle / "SHA256SUMS").read_text(encoding="utf-8").splitlines():
    line = raw_line.strip()
    if not line: continue
    digest, rel = line.split(None, 1); rel = rel.strip().lstrip("*")
    target = bundle / rel; assert target.is_file(); assert hashlib.sha256(target.read_bytes()).hexdigest() == digest; checked.append(rel)
manifest = yaml.safe_load((bundle / "bundle_manifest.yaml").read_text(encoding="utf-8"))
exact_b = {"contract_version": (bundle / "CONTRACT_VERSION").read_text(encoding="utf-8").strip(), "bundle_id": str(manifest["bundle_id"]), "bundle_hash": str(manifest["bundle"]["bundle_hash"])}
evidence_index = []
for path in sorted(bundle.glob("evidence/*/passages/*.yaml")):
    row = yaml.safe_load(path.read_text(encoding="utf-8")); evidence_index.append([str(row["source_id"]), str(row["passage_id"])])
resolver = json.loads((resolver_root / RESOLVER_REL).read_text(encoding="utf-8"))
print(json.dumps({"contract_b": exact_b, "evidence_index": evidence_index, "resolver_commit": RESOLVER_COMMIT, "resolver_entries": resolver["entries"], "receipt": {"cal_commit": CAL_COMMIT, "contract_b_tree": git(cal_root, "rev-parse", f"HEAD:{BUNDLE_REL}"), "sha256sums_checked": len(checked), "resolver_blob": RESOLVER_BLOB}}, sort_keys=True, separators=(",", ":")))
`;
  const result = runPython(program, [CAL_AUTHORITY_ROOT, RESOLVER_ROOT]);
  assert.equal(result.status, 0, Buffer.from(result.stderr || Buffer.alloc(0)).toString("utf8"));
  return JSON.parse(Buffer.from(result.stdout).toString("utf8"));
}

const authority = deriveIndependentAuthority();
const EXACT_B = Object.freeze(authority.contract_b);
const FIXED_EVIDENCE_INDEX = Object.freeze(authority.evidence_index.map((x) => Object.freeze(x)));
const FIXED_RESOLVER_ENTRIES = Object.freeze(authority.resolver_entries.map((x) => Object.freeze(x)));
const currentRows = FIXED_RESOLVER_ENTRIES.filter((row) => row.semantic_implementation_sha === CURRENT_CAL_SEMANTIC_IMPLEMENTATION);
assert.equal(currentRows.length, 1);
const CURRENT_ROW = currentRows[0];

function sealC2(unsealed) {
  const program = ["import json, sys", "root = sys.argv[1]", "sys.path.insert(0, root)", "from validators import contract_c_v2 as PROD", "value = json.loads(sys.stdin.buffer.read().decode('utf-8'))", "sealed = PROD.seal(value)", "sys.stdout.buffer.write(PROD.canonical_bytes(sealed))"].join("\n");
  const result = runPython(program, [], Buffer.from(JSON.stringify(unsealed), "utf8"));
  assert.equal(result.status, 0, Buffer.from(result.stderr || Buffer.alloc(0)).toString("utf8"));
  return Buffer.from(result.stdout);
}
function strictVerifyC2(raw, overrides = {}) {
  const payload = { candidate: JSON.parse(raw.toString("utf8")), exact_contract_b: EXACT_B, evidence_index: overrides.evidenceIndex || FIXED_EVIDENCE_INDEX, resolver_commit: overrides.resolverCommit || EXACT_RESOLVER_COMMIT, resolver_entries: overrides.resolverEntries || FIXED_RESOLVER_ENTRIES, expected_whole_object_sha256: sha256Id(raw) };
  const program = ["import json, sys", "root = sys.argv[1]", "sys.path.insert(0, root)", "from validators import contract_c_v2 as PROD", "p = json.loads(sys.stdin.buffer.read().decode('utf-8'))", "try:", "  PROD.verify_candidate(p['candidate'], exact_contract_b=p['exact_contract_b'], evidence_index=[tuple(x) for x in p['evidence_index']], independently_selected_resolver_commit_sha=p['resolver_commit'], resolver_entries=p['resolver_entries'], expected_whole_object_sha256=p['expected_whole_object_sha256'])", "except Exception as exc:", "  print(json.dumps({'ok':False,'error':str(exc)}, separators=(',', ':')))", "  raise SystemExit(1)", "print(json.dumps({'ok':True}, separators=(',', ':')))"].join("\n");
  const result = runPython(program, [], Buffer.from(JSON.stringify(payload), "utf8"));
  const text = Buffer.from(result.stdout || Buffer.alloc(0)).toString("utf8").trim();
  let detail = null; try { detail = text ? JSON.parse(text) : null; } catch { detail = { raw: text }; }
  return { ok: result.status === 0, detail };
}
function currentC2Decision(raw) {
  const value = JSON.parse(raw.toString("utf8")); const proposition = value.propositions[0];
  return decideContractC2ToContractD({ contractC2Bytes: raw, expectedContractC2Sha256: sha256Id(raw), contractC2AuthorityRoot: C2_ROOT, expectedContractB: EXACT_B, decisionContext: { policy: { id: SUPPORTED_CLAIM_VERIFICATION_POLICY.id, version: SUPPORTED_CLAIM_VERIFICATION_POLICY.version }, proposition_id: proposition.proposition.proposition_id, target: { kind: "claim", id: proposition.proposition.proposition_id, content_sha256: proposition.proposition.content_sha256 } }, pythonExecutable: PYTHON });
}
function admitC2(raw) {
  const strong = strictVerifyC2(raw);
  if (!strong.ok) fail("c2_external_authority_rejected", strong.detail?.error || "strict C2 authority verification failed");
  const value = loadExactContractC2ForDecision({ contractC2Bytes: raw, expectedContractC2Sha256: sha256Id(raw), contractC2AuthorityRoot: C2_ROOT, expectedContractB: EXACT_B, pythonExecutable: PYTHON });
  return { authorityType: "cal-c2", inputAuthority: contractC2InputAuthority(value, sha256Id(raw)), admittedAuthority: { authority_type: "cal-c2", contract_c2: value, external_authority: authority } };
}
function resolveC2(admitted, requestedTarget) {
  const value = admitted.admittedAuthority.contract_c2;
  const proposition = value.propositions.find((item) => item.proposition.proposition_id === requestedTarget.id);
  if (!proposition) fail("target_not_found", "C2 proposition missing");
  if (requestedTarget.kind !== "claim" || requestedTarget.content_sha256 !== proposition.proposition.content_sha256) fail("target_binding_mismatch", "C2 target mismatch");
  return { target: structuredClone(requestedTarget), proposition };
}
function c2Policy({ authority: admitted, resolution }) {
  const contractC2 = admitted.contract_c2; const proposition = resolution.proposition; let holdReason = null;
  if (contractC2.execution.state !== "completed") holdReason = `contract_c_result_execution_${contractC2.execution.state}`;
  else if (proposition.execution.state !== "completed") holdReason = `contract_c_proposition_execution_${proposition.execution.state}`;
  else if (proposition.terminal?.verdict === "not_checkable" && proposition.terminal?.reason === "UNSUPPORTED_SEMANTIC_FAMILY") holdReason = "contract_c_unsupported_semantic_family_not_supported";
  else if (proposition.terminal?.verdict === "not_checkable" && proposition.terminal?.reason === "no_deciding_relation") holdReason = "contract_c_no_deciding_relation_not_supported";
  else if (proposition.execution.completion !== "assessed") holdReason = `contract_c_proposition_${proposition.execution.completion}`;
  else if (!proposition.terminal || proposition.terminal.verdict !== "supported") holdReason = "contract_c_terminal_verdict_not_supported";
  else if (proposition.terminal.reason !== "categorical_support") holdReason = "contract_c_terminal_reason_not_categorical_support";
  return { state: "completed", disposition: holdReason ? "hold" : "clear", effect: structuredClone(SUPPORTED_CLAIM_VERIFICATION_POLICY.effect), metadata: { reason_codes: [holdReason || "contract_c_supported"], diagnostics: { contract_c_state: { contract_c_version: "2.0.0", wire_profile: "contract-c-successor-candidate-a-rc2-research", result_execution: contractC2.execution.state, proposition_execution: proposition.execution.state, proposition_completion: proposition.execution.state === "completed" ? proposition.execution.completion : null, terminal_verdict: proposition.terminal?.verdict ?? null, terminal_reason: proposition.terminal?.reason ?? null } } } };
}

function signingMessage(unsigned) { return Buffer.from(canonicalJson(unsigned), "utf8"); }
function makeSignedEnvelope(payload, { privateKeyPem = TRUSTED_PRIVATE_KEY_PEM, producer = TRUSTED_SIGNER, subject = "signed-subject-1", version = TRUSTED_SIGNED_VERSION, type = "signed-content-v1" } = {}) {
  const payloadBytes = Buffer.from(canonicalJson(payload), "utf8");
  const unsigned = { type, producer, subject, version, artifact_sha256: sha256Id(payloadBytes), payload_base64: payloadBytes.toString("base64") };
  const signature = cryptoSign(null, signingMessage(unsigned), createPrivateKey(privateKeyPem));
  return Buffer.from(canonicalJson({ ...unsigned, signature_base64: signature.toString("base64") }), "utf8");
}
function parseSignedEnvelope(raw) {
  let value; try { value = JSON.parse(Buffer.from(raw).toString("utf8")); } catch { fail("signed_schema_mismatch", "signed authority is not JSON"); }
  exactKeys(value, ["artifact_sha256", "payload_base64", "producer", "signature_base64", "subject", "type", "version"], "signed envelope"); return value;
}
function admitSignedArtifact(raw) {
  const value = parseSignedEnvelope(raw);
  if (value.type !== "signed-content-v1") fail("signed_type_mismatch", "wrong signed authority type");
  if (value.producer !== TRUSTED_SIGNER) fail("signed_producer_mismatch", "untrusted producer");
  if (value.version !== TRUSTED_SIGNED_VERSION) fail("signed_version_mismatch", "unexpected signed authority version");
  const payloadBytes = Buffer.from(value.payload_base64, "base64");
  if (sha256Id(payloadBytes) !== value.artifact_sha256) fail("signed_artifact_digest_mismatch", "artifact digest mismatch");
  const unsigned = { type: value.type, producer: value.producer, subject: value.subject, version: value.version, artifact_sha256: value.artifact_sha256, payload_base64: value.payload_base64 };
  const ok = cryptoVerify(null, signingMessage(unsigned), createPublicKey(TRUSTED_PUBLIC_KEY_PEM), Buffer.from(value.signature_base64, "base64"));
  if (!ok) fail("signed_signature_invalid", "signature does not match configured trusted key");
  let payload; try { payload = JSON.parse(payloadBytes.toString("utf8")); } catch { fail("signed_payload_invalid", "payload is not JSON"); }
  return { authorityType: "signed-artifact", inputAuthority: { kind: "signed-artifact", id: `${value.producer}:${value.subject}:${value.version}`, immutable_id: sha256Id(Buffer.from(raw)) }, admittedAuthority: { authority_type: "signed-artifact", producer: value.producer, subject: value.subject, version: value.version, artifact_sha256: value.artifact_sha256, payload } };
}
function resolveSignedTarget(admitted, requestedTarget) {
  const a = admitted.admittedAuthority;
  if (requestedTarget.kind !== "claim") fail("signed_target_kind_mismatch", "signed research target must be claim");
  if (requestedTarget.id !== a.subject || requestedTarget.content_sha256 !== a.artifact_sha256) fail("signed_target_binding_mismatch", "signed target does not bind exact admitted subject/content");
  return { target: structuredClone(requestedTarget), payload: structuredClone(a.payload) };
}
function signedPolicy({ resolution }) {
  const eligible = resolution.payload?.eligible === true;
  return { state: "completed", disposition: eligible ? "clear" : "hold", effect: structuredClone(SIGNED_EFFECT), metadata: { reason_codes: [eligible ? "signed_authority_eligible" : "signed_authority_not_eligible"], diagnostics: { signed_authority: { eligible } } } };
}

const TRUSTED_POLICIES = new Map([
  [`${SUPPORTED_CLAIM_VERIFICATION_POLICY.id}@${SUPPORTED_CLAIM_VERIFICATION_POLICY.version}`, c2Policy],
  [`${SIGNED_POLICY.id}@${SIGNED_POLICY.version}`, signedPolicy],
]);
function trustedEvaluate(request) {
  exactKeys(request, ["adapter_id", "bytes", "policy", "target"], "trusted request");
  let admitted; let resolved;
  if (request.adapter_id === "cal-c2") { admitted = admitC2(request.bytes); resolved = resolveC2(admitted, request.target); }
  else if (request.adapter_id === "signed-artifact") { admitted = admitSignedArtifact(request.bytes); resolved = resolveSignedTarget(admitted, request.target); }
  else fail("unknown_adapter", `unknown adapter ${request.adapter_id}`);
  return projectDecision({ admittedAuthority: admitted.admittedAuthority, inputAuthority: admitted.inputAuthority, resolvedTarget: resolved, policy: request.policy, policyRegistry: TRUSTED_POLICIES, contractDAuthorityRoot: CONTRACT_D_ROOT });
}
function expectReject(fn, expectedCode = null) {
  try { fn(); } catch (error) { if (expectedCode !== null) assert.equal(error.code, expectedCode); return { rejected: true, code: error.code || error.name, message: error.message }; }
  assert.fail(`expected rejection${expectedCode ? ` ${expectedCode}` : ""}`);
}
function unsealedFrom(raw) { const value = JSON.parse(raw.toString("utf8")); delete value.result_set_id; return value; }
function mutateC2(raw, name) {
  const value = unsealedFrom(raw); const participant = value.propositions[0].participants[0]; const basisRef = value.propositions[0].basis_groups[0][0];
  if (name === "source_substitution") { participant.evidence_ref.source_id = "src-attacker"; basisRef.source_id = "src-attacker"; }
  else if (name === "passage_substitution") { participant.evidence_ref.passage_id = "pass-attacker"; basisRef.passage_id = "pass-attacker"; }
  else if (name === "resolver_commit_substitution") value.producer.policy_resolver_commit_sha = "b".repeat(40);
  else if (name === "semantic_implementation_substitution") value.producer.semantic_implementation_sha = "b".repeat(40);
  else if (name === "policy_digest_substitution") value.producer.policy_sha256 = "b".repeat(64);
  else throw new Error(`unknown C2 mutation ${name}`);
  return sealC2(value);
}

const [SOURCE_ID, PASSAGE_ID] = FIXED_EVIDENCE_INDEX[0];
const baselineRaw = sealC2({ profile: "contract-c-successor-candidate-a-rc2-research", contract_b: EXACT_B, producer: { semantic_implementation_sha: CURRENT_CAL_SEMANTIC_IMPLEMENTATION, policy_sha256: CURRENT_ROW.policy_sha256, policy_resolver_commit_sha: EXACT_RESOLVER_COMMIT }, execution: { state: "completed" }, propositions: [{ proposition: { proposition_id: "Q-authority-adapter-rc2", content_sha256: `sha256:${"3".repeat(64)}` }, execution: { state: "completed", completion: "assessed" }, terminal: { verdict: "supported", reason: "categorical_support" }, participants: [{ evidence_ref: { source_id: SOURCE_ID, passage_id: PASSAGE_ID }, relation: "supports", role: "causal" }], basis_groups: [[{ source_id: SOURCE_ID, passage_id: PASSAGE_ID }]] }] });
const baselineValue = JSON.parse(baselineRaw.toString("utf8"));
const c2Target = { kind: "claim", id: baselineValue.propositions[0].proposition.proposition_id, content_sha256: baselineValue.propositions[0].proposition.content_sha256 };
const currentDecision = currentC2Decision(baselineRaw);
const seamDecision = trustedEvaluate({ adapter_id: "cal-c2", bytes: baselineRaw, policy: { id: SUPPORTED_CLAIM_VERIFICATION_POLICY.id, version: SUPPORTED_CLAIM_VERIFICATION_POLICY.version }, target: c2Target });
const currentBytes = canonicalizeContractDWithAuthority({ decision: currentDecision, contractDAuthorityRoot: CONTRACT_D_ROOT });
assert.deepEqual(seamDecision.decision, currentDecision); assert.equal(Buffer.compare(seamDecision.bytes, currentBytes), 0);

const c2MutationNames = ["source_substitution", "passage_substitution", "resolver_commit_substitution", "semantic_implementation_substitution", "policy_digest_substitution"];
const c2Mutations = {};
for (const name of c2MutationNames) {
  const raw = mutateC2(baselineRaw, name); const current = currentC2Decision(raw);
  const rejection = expectReject(() => trustedEvaluate({ adapter_id: "cal-c2", bytes: raw, policy: { id: SUPPORTED_CLAIM_VERIFICATION_POLICY.id, version: SUPPORTED_CLAIM_VERIFICATION_POLICY.version }, target: c2Target }), "c2_external_authority_rejected");
  c2Mutations[name] = { current_disposition: current.evaluation.disposition, strong_rejection: rejection };
}

const signedGood = makeSignedEnvelope({ eligible: true, note: "legitimate favorable fact" });
const signedGoodParsed = parseSignedEnvelope(signedGood);
const signedTarget = { kind: "claim", id: signedGoodParsed.subject, content_sha256: signedGoodParsed.artifact_sha256 };
const signedGoodDecision = trustedEvaluate({ adapter_id: "signed-artifact", bytes: signedGood, policy: SIGNED_POLICY, target: signedTarget });
assert.equal(signedGoodDecision.decision.evaluation.disposition, "clear");
const signedHold = makeSignedEnvelope({ eligible: false, note: "legitimate unfavorable fact" });
const signedHoldParsed = parseSignedEnvelope(signedHold);
const signedHoldDecision = trustedEvaluate({ adapter_id: "signed-artifact", bytes: signedHold, policy: SIGNED_POLICY, target: { kind: "claim", id: signedHoldParsed.subject, content_sha256: signedHoldParsed.artifact_sha256 } });
assert.equal(signedHoldDecision.decision.evaluation.disposition, "hold");

const wrongSigner = makeSignedEnvelope({ eligible: true }, { privateKeyPem: ATTACKER_PRIVATE_KEY_PEM, producer: TRUSTED_SIGNER });
const wrongSignerReject = expectReject(() => admitSignedArtifact(wrongSigner), "signed_signature_invalid");
const staleDigestValue = parseSignedEnvelope(signedGood);
const stalePayload = Buffer.from(canonicalJson({ eligible: false, note: "tampered" }), "utf8");
staleDigestValue.payload_base64 = stalePayload.toString("base64");
const staleDigest = Buffer.from(canonicalJson(staleDigestValue), "utf8");
const staleDigestReject = expectReject(() => admitSignedArtifact(staleDigest), "signed_artifact_digest_mismatch");
const reboundStaleSigValue = parseSignedEnvelope(signedGood); reboundStaleSigValue.payload_base64 = stalePayload.toString("base64"); reboundStaleSigValue.artifact_sha256 = sha256Id(stalePayload);
const reboundStaleSig = Buffer.from(canonicalJson(reboundStaleSigValue), "utf8");
const reboundStaleSigReject = expectReject(() => admitSignedArtifact(reboundStaleSig), "signed_signature_invalid");
const wrongVersionReject = expectReject(() => admitSignedArtifact(makeSignedEnvelope({ eligible: true }, { version: "2" })), "signed_version_mismatch");
const relabeledReject = expectReject(() => admitSignedArtifact(makeSignedEnvelope({ eligible: true }, { type: "contract-c2" })), "signed_type_mismatch");
const targetSubstitutionReject = expectReject(() => resolveSignedTarget(admitSignedArtifact(signedGood), { ...signedTarget, id: "attacker-target" }), "signed_target_binding_mismatch");
const c2ThroughSignedReject = expectReject(() => trustedEvaluate({ adapter_id: "signed-artifact", bytes: baselineRaw, policy: SIGNED_POLICY, target: signedTarget }));
const signedThroughC2Reject = expectReject(() => trustedEvaluate({ adapter_id: "cal-c2", bytes: signedGood, policy: { id: SUPPORTED_CLAIM_VERIFICATION_POLICY.id, version: SUPPORTED_CLAIM_VERIFICATION_POLICY.version }, target: c2Target }));
const callerPolicyInjectionReject = expectReject(() => trustedEvaluate({ adapter_id: "cal-c2", bytes: baselineRaw, policy: { id: SUPPORTED_CLAIM_VERIFICATION_POLICY.id, version: SUPPORTED_CLAIM_VERIFICATION_POLICY.version }, target: c2Target, policyRegistry: new Map() }), "invalid_input");
const callerAdapterInjectionReject = expectReject(() => trustedEvaluate({ adapter_id: "cal-c2", bytes: baselineRaw, policy: { id: SUPPORTED_CLAIM_VERIFICATION_POLICY.id, version: SUPPORTED_CLAIM_VERIFICATION_POLICY.version }, target: c2Target, adapter: () => ({ malicious: true }) }), "invalid_input");

const admittedForWeak = admitC2(baselineRaw);
const maliciousPolicy = () => ({ state: "completed", disposition: "hold", effect: structuredClone(SUPPORTED_CLAIM_VERIFICATION_POLICY.effect), metadata: { reason_codes: ["caller_substituted_policy"], diagnostics: {} } });
const directKernelWeakControl = projectDecision({ admittedAuthority: admittedForWeak.admittedAuthority, inputAuthority: admittedForWeak.inputAuthority, resolvedTarget: resolveC2(admittedForWeak, c2Target), policy: { id: SUPPORTED_CLAIM_VERIFICATION_POLICY.id, version: SUPPORTED_CLAIM_VERIFICATION_POLICY.version }, policyRegistry: new Map([[`${SUPPORTED_CLAIM_VERIFICATION_POLICY.id}@${SUPPORTED_CLAIM_VERIFICATION_POLICY.version}`, maliciousPolicy]]), contractDAuthorityRoot: CONTRACT_D_ROOT });
assert.equal(directKernelWeakControl.decision.evaluation.disposition, "hold"); assert.equal(seamDecision.decision.evaluation.disposition, "clear");
function weakSignedAdmissionWithCallerKey(raw, callerPublicKeyPem) {
  const value = parseSignedEnvelope(raw); const payloadBytes = Buffer.from(value.payload_base64, "base64"); if (sha256Id(payloadBytes) !== value.artifact_sha256) return false;
  const unsigned = { type: value.type, producer: value.producer, subject: value.subject, version: value.version, artifact_sha256: value.artifact_sha256, payload_base64: value.payload_base64 };
  return cryptoVerify(null, signingMessage(unsigned), createPublicKey(callerPublicKeyPem), Buffer.from(value.signature_base64, "base64"));
}
const weakCallerKeyPass = weakSignedAdmissionWithCallerKey(wrongSigner, ATTACKER_PUBLIC_KEY_PEM);

const rc1 = JSON.parse(readFileSync(RC1_RESULT, "utf8"));
assert.equal(rc1.disposition, "SUPPORTED_ARTIFACT_DERIVED_AUTHORITY");
assert.equal(rc1.acceptance.artifact_derived_authority_kills_all, true);
assert.equal(rc1.acceptance.weak_evidence_collusion_passes, true);
assert.equal(rc1.acceptance.weak_producer_collusion_passes, true);
const legacy = JSON.parse(readFileSync(LEGACY_RESULT, "utf8"));
assert.equal(legacy.status, "PASS"); assert.equal(legacy.exact_projection_kernel_sha256, EXPECTED_PROJECTION_KERNEL_SHA256);
assert.equal(legacy.interpretation.exact_pr58_projection_kernel_reused_without_modification, true);
assert.equal(legacy.interpretation.heterogeneous_raw_authority_supported_for_tested_decisions, true);
assert.equal(legacy.interpretation.valid_domain_incompleteness_expressed_as_policy_hold_not_ingress_failure, true);
assert.equal(legacy.interpretation.cross_domain_adapter_laundering_rejected, true);
const projectionKernelSha = sha256Hex(readFileSync(resolve(new URL("./projectionKernel.mjs", import.meta.url).pathname)));
assert.equal(projectionKernelSha, EXPECTED_PROJECTION_KERNEL_SHA256);

const acceptance = {
  projection_kernel_frozen_exact: projectionKernelSha === EXPECTED_PROJECTION_KERNEL_SHA256,
  cal_c2_exact_decision_reproduction: JSON.stringify(seamDecision.decision) === JSON.stringify(currentDecision),
  cal_c2_exact_contract_d_bytes: Buffer.compare(seamDecision.bytes, currentBytes) === 0,
  cal_c2_all_five_substitutions_rejected_before_policy: c2MutationNames.every((name) => c2Mutations[name].strong_rejection.rejected),
  rc1_weak_collusion_control_preserved: rc1.acceptance.weak_evidence_collusion_passes && rc1.acceptance.weak_producer_collusion_passes,
  git_bound_manifest_replay_passed: legacy.status === "PASS",
  signed_authority_clear_baseline: signedGoodDecision.decision.evaluation.disposition === "clear",
  valid_unfavorable_signed_authority_becomes_policy_hold: signedHoldDecision.decision.evaluation.disposition === "hold",
  wrong_signer_rejected: wrongSignerReject.rejected,
  stale_digest_rejected: staleDigestReject.rejected,
  rebound_digest_with_stale_signature_rejected: reboundStaleSigReject.rejected,
  wrong_trusted_version_rejected: wrongVersionReject.rejected,
  signed_type_relabel_rejected: relabeledReject.rejected,
  signed_target_substitution_rejected: targetSubstitutionReject.rejected,
  c2_cannot_be_laundered_through_signed_adapter: c2ThroughSignedReject.rejected,
  signed_cannot_be_laundered_through_c2_adapter: signedThroughC2Reject.rejected,
  caller_policy_implementation_injection_rejected: callerPolicyInjectionReject.rejected,
  caller_adapter_implementation_injection_rejected: callerAdapterInjectionReject.rejected,
  raw_kernel_caller_registry_is_demonstrably_unsafe: directKernelWeakControl.decision.evaluation.disposition !== seamDecision.decision.evaluation.disposition,
  weak_caller_selected_signer_control_passes: weakCallerKeyPass === true,
};
const supported = Object.values(acceptance).every(Boolean);
const result = { experiment: "authority-adapter-seam-rc2", parent: "97727a7d2f61c46b4e7ef3e11279fb0af7b915cd", exact_projection_kernel_sha256: projectionKernelSha, exact_external_authorities: { contract_c2: EXACT_C2_COMMIT, contract_b_control: EXACT_CAL_COMMIT, resolver: EXACT_RESOLVER_COMMIT, resolver_blob: EXACT_RESOLVER_BLOB }, phases: { cal_c2_shadow: { current_disposition: currentDecision.evaluation.disposition, seam_disposition: seamDecision.decision.evaluation.disposition, exact_decision_equal: acceptance.cal_c2_exact_decision_reproduction, exact_contract_d_bytes_equal: acceptance.cal_c2_exact_contract_d_bytes, mutations: c2Mutations }, git_bound_manifest_replay: { status: legacy.status, projection_kernel_sha256: legacy.exact_projection_kernel_sha256, controls: legacy.controls }, signed_authority: { favorable_disposition: signedGoodDecision.decision.evaluation.disposition, unfavorable_valid_disposition: signedHoldDecision.decision.evaluation.disposition, attacks: { wrong_signer: wrongSignerReject, stale_digest: staleDigestReject, rebound_digest_stale_signature: reboundStaleSigReject, wrong_version: wrongVersionReject, relabeled_type: relabeledReject, target_substitution: targetSubstitutionReject } }, cross_adapter_and_implementation: { c2_through_signed: c2ThroughSignedReject, signed_through_c2: signedThroughC2Reject, policy_injection: callerPolicyInjectionReject, adapter_injection: callerAdapterInjectionReject, weak_direct_kernel_disposition: directKernelWeakControl.decision.evaluation.disposition, trusted_runtime_disposition: seamDecision.decision.evaluation.disposition, weak_caller_selected_signer_passes: weakCallerKeyPass, rc1_collusion: { weak_evidence_collusion_passes: rc1.acceptance.weak_evidence_collusion_passes, weak_producer_collusion_passes: rc1.acceptance.weak_producer_collusion_passes } } }, acceptance, disposition: supported ? "SUPPORTED_TRUSTED_AUTHORITY_ADAPTER_SEAM" : "FALSIFIED_OR_INCONCLUSIVE", nonclaims: ["No arbitrary plugin or caller-installed adapter support is established.", "No universal raw-ingress schema is established.", "The Contract-B fixture remains an authority-mechanism control, not evidence of retrieval completeness or source truth.", "No maintained Decision Engine, Contract C2, CAL, Contract B, Authorization, execution, tag, release, or production default is promoted by this research result."] };
mkdirSync(OUT, { recursive: true }); writeFileSync(resolve(OUT, "RESULT.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8"); process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
assert.equal(supported, true, "preregistered authority-adapter seam acceptance failed; preserve RESULT.json and failing run");
