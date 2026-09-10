import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { canonicalBytes, sha256Bytes, sha256Json } from "./canonical.mjs";

const FIXTURE_VERSION = "release-qualification-evidence/research-0";
const REQUIRED_EVIDENCE_IDS = Object.freeze([
  "required-ci",
  "contract-first-cli-conformance",
]);

function assertObject(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
}

function assertString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string`);
  }
}

function observationStatus(observation) {
  const jobs = Array.isArray(observation.jobs) ? observation.jobs : [];
  const jobsPassed = jobs.every((job) => job?.conclusion === "success");
  return observation.conclusion === "success" && jobsPassed ? "passed" : "adverse";
}

function producerImplementationSha() {
  const source = readFileSync(fileURLToPath(import.meta.url));
  return sha256Bytes(source);
}

export function produceAssessmentAuthority(evidenceFixture) {
  assertObject(evidenceFixture, "evidenceFixture");
  if (evidenceFixture.fixture_version !== FIXTURE_VERSION) {
    throw new TypeError(`unexpected fixture_version: ${evidenceFixture.fixture_version}`);
  }

  const candidate = evidenceFixture.candidate;
  assertObject(candidate, "candidate");
  for (const key of ["repository", "base_sha", "commit_sha", "tree_sha"]) {
    assertString(candidate[key], `candidate.${key}`);
  }

  if (!Array.isArray(evidenceFixture.observations)) {
    throw new TypeError("observations must be an array");
  }

  const seen = new Set();
  const evidence = evidenceFixture.observations.map((observation, index) => {
    assertObject(observation, `observations[${index}]`);
    for (const key of ["id", "kind", "immutable_id", "conclusion"]) {
      assertString(observation[key], `observations[${index}].${key}`);
    }
    if (seen.has(observation.id)) {
      throw new TypeError(`duplicate observation id: ${observation.id}`);
    }
    seen.add(observation.id);
    if ("head_sha" in observation && observation.head_sha !== candidate.commit_sha) {
      throw new TypeError(`observation ${observation.id} is bound to a different candidate head`);
    }
    return {
      id: observation.id,
      kind: observation.kind,
      immutable_id: observation.immutable_id,
      status: observationStatus(observation),
      detail_sha256: sha256Json(observation),
    };
  });

  const evidenceById = new Map(evidence.map((item) => [item.id, item]));
  const requiredPresent = REQUIRED_EVIDENCE_IDS.every((id) => evidenceById.has(id));
  const requiredPassed = requiredPresent && REQUIRED_EVIDENCE_IDS.every((id) => evidenceById.get(id).status === "passed");

  const subjectContent = {
    repository: candidate.repository,
    base_sha: candidate.base_sha,
    commit_sha: candidate.commit_sha,
    tree_sha: candidate.tree_sha,
  };

  const evidenceIds = evidence.map((item) => item.id);
  const basis = REQUIRED_EVIDENCE_IDS.filter((id) => evidenceById.has(id));
  const residual = evidenceIds.filter((id) => !REQUIRED_EVIDENCE_IDS.includes(id));
  const hasIndependentReproduction = evidenceById.has("independent-reproduction");

  return {
    assessment_authority_version: "assessment-authority/research-0",
    authority: {
      logical_id: `release-qualification:${candidate.repository}@${candidate.commit_sha}`,
      producer: {
        id: "decision-engine.release-qualification-assessment-producer",
        version: "research-0",
        implementation_sha256: producerImplementationSha(),
      },
    },
    subject: {
      kind: "git_commit_candidate",
      id: `${candidate.repository}@${candidate.commit_sha}`,
      content_sha256: sha256Json(subjectContent),
    },
    subject_content: subjectContent,
    execution: {
      state: "completed",
    },
    completion: {
      state: "assessed",
    },
    state: {
      outcome: requiredPassed ? "bounded_qualification_supported" : "bounded_qualification_not_supported",
      basis,
      residual,
      unknowns: hasIndependentReproduction ? [] : ["independent-reproduction"],
    },
    evidence,
  };
}

export function produceCanonicalAssessmentAuthority(evidenceFixture) {
  return canonicalBytes(produceAssessmentAuthority(evidenceFixture));
}
