import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { canonicalBytes, sha256Bytes, sha256Json } from "../release-qualification-assessment-authority-kernel/canonical.mjs";

function sourceSha() {
  return sha256Bytes(readFileSync(fileURLToPath(import.meta.url)));
}

function passedRun(run, candidateSha) {
  return run?.head_sha === candidateSha && run?.conclusion === "success" &&
    Array.isArray(run.jobs) && run.jobs.length > 0 && run.jobs.every((job) => job.endsWith(":success"));
}

function evidenceItem(id, kind, status, detail) {
  return {
    id,
    kind,
    immutable_id: sha256Json(detail),
    status,
    detail_sha256: sha256Json(detail),
  };
}

export function produceTaskResultAssessment(fixture) {
  if (fixture?.fixture_version !== "agent-result-verification-evidence/research-0") {
    throw new TypeError("unexpected agent-result fixture version");
  }
  const task = fixture.task;
  const result = fixture.result;
  if (!task || !result) throw new TypeError("task and result are required");

  const patch = Buffer.from(result.patch_base64, "base64");
  const patchSha = sha256Bytes(patch);
  const patchText = patch.toString("utf8");
  const patchIdentityPass = result.patch_encoding === "base64" &&
    patch.length === result.patch_bytes && patchSha === result.patch_sha256;

  const changedFiles = result.changed_files;
  const allowed = new Set(task.allowed_paths);
  const scopePass = Array.isArray(changedFiles) && changedFiles.length > 0 &&
    changedFiles.every((file) => allowed.has(file)) &&
    changedFiles.every((file) => !task.forbidden_prefixes.some((prefix) => file.startsWith(prefix)));

  const markersPass = Array.isArray(task.required_patch_markers) &&
    task.required_patch_markers.length > 0 &&
    task.required_patch_markers.every((marker) => patchText.includes(marker));

  const runs = new Map((fixture.verification_runs ?? []).map((run) => [run.id, run]));
  const ciPass = passedRun(runs.get("required-ci"), task.candidate_sha);
  const conformancePass = passedRun(runs.get("contract-first-cli-conformance"), task.candidate_sha);

  const evidence = [
    evidenceItem("exact-result-patch", "task_result_patch", patchIdentityPass ? "passed" : "adverse", {
      patch_sha256: patchSha,
      expected_patch_sha256: result.patch_sha256,
      patch_bytes: patch.length,
      expected_patch_bytes: result.patch_bytes,
    }),
    evidenceItem("scope-conformance", "task_scope_verification", scopePass ? "passed" : "adverse", {
      changed_files: changedFiles,
      allowed_paths: task.allowed_paths,
      forbidden_prefixes: task.forbidden_prefixes,
    }),
    evidenceItem("required-regression-behavior", "task_patch_semantic_marker_verification", markersPass ? "passed" : "adverse", {
      required_patch_markers: task.required_patch_markers,
      exact_patch_sha256: patchSha,
    }),
    evidenceItem("required-ci", "verification_run", ciPass ? "passed" : "adverse", runs.get("required-ci") ?? { missing: true }),
    evidenceItem("contract-first-cli-conformance", "verification_run", conformancePass ? "passed" : "adverse", runs.get("contract-first-cli-conformance") ?? { missing: true }),
  ];

  for (const extra of fixture.additional_observations ?? []) {
    evidence.push(evidenceItem(extra.id, extra.kind, extra.status, extra));
  }

  const requiredIds = [
    "exact-result-patch",
    "scope-conformance",
    "required-regression-behavior",
    "required-ci",
    "contract-first-cli-conformance",
  ];
  const byId = new Map(evidence.map((item) => [item.id, item]));
  const verified = requiredIds.every((id) => byId.get(id)?.status === "passed");
  const subjectContent = {
    task_id: task.id,
    repository: task.repository,
    candidate_sha: task.candidate_sha,
    candidate_tree_sha: task.candidate_tree_sha,
    objective_sha256: sha256Bytes(Buffer.from(task.objective, "utf8")),
  };

  return {
    assessment_authority_version: "assessment-authority/research-0",
    authority: {
      logical_id: `task-result-verification:${task.id}@${task.candidate_sha}`,
      producer: {
        id: "decision-engine.task-result-verifier",
        version: "research-0",
        implementation_sha256: sourceSha(),
      },
    },
    subject: {
      kind: "task_result_candidate",
      id: `${task.id}@${task.candidate_sha}`,
      content_sha256: sha256Json(subjectContent),
    },
    subject_content: subjectContent,
    execution: { state: "completed" },
    completion: { state: "assessed" },
    state: {
      outcome: verified ? "task_result_verified" : "task_result_adverse",
      basis: requiredIds,
      residual: evidence.map((item) => item.id).filter((id) => !requiredIds.includes(id)),
      unknowns: byId.get("independent-review")?.status === "passed" ? [] : ["independent-review"],
    },
    evidence,
  };
}

export function produceCanonicalTaskResultAssessment(fixture) {
  return canonicalBytes(produceTaskResultAssessment(fixture));
}
