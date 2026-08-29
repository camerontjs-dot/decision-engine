import { createHash } from "node:crypto";

function clone(value) {
  return structuredClone(value);
}

function canonicalBytes(value) {
  const sort = (entry) => {
    if (Array.isArray(entry)) return entry.map(sort);
    if (entry && typeof entry === "object") {
      return Object.fromEntries(Object.keys(entry).sort().map((key) => [key, sort(entry[key])]));
    }
    return entry;
  };
  return Buffer.from(`${JSON.stringify(sort(value))}\n`, "utf8");
}

function withResultSetId(value) {
  const object = clone(value);
  delete object.result_set_id;
  const digest = createHash("sha256").update(canonicalBytes(object)).digest("hex");
  object.result_set_id = `result-set:${digest}`;
  return object;
}

const POLICY = Object.freeze({
  canonical: {
    candidate_admission: 0.4,
    config_id: "cal-rules-v1.2.0",
    counterevidence_weight: 0.3,
    false_caution_detection: true,
    false_caution_threshold: 0.85,
    needs_source_detection: true,
    overstated_detection: true,
    partial_support: 0.55,
    require_passage_level_match: true,
    sourced_support: 0.8,
  },
  sha256: "88f007c96f3acf63a191556fe7fa46b80b37e9fcb5224ec1e90fb626a061104d",
});

const CONTRIBUTION_A = Object.freeze({
  contribution_id: "contribution:32d3816b8706ac75adeb7e6333eded808d2411f7107c7456a87a747012647431",
  channel: "support",
  evidence_ref: {
    source_id: "src-md",
    passage_id: "auto-src-md-947b3344e6db",
    passage_sha256: "sha256:7d8968f45e479f53674ab916aca5d6653e81a13555b53d88ec3e681d2767e40d",
  },
});

const CONTRIBUTION_B = Object.freeze({
  contribution_id: "contribution:438fda008996923dc0d0a1b05b81fcb87c40560facf828b6883ef7526b0e9384",
  channel: "counterevidence",
  evidence_ref: {
    source_id: "src-md",
    passage_id: "auto-src-md-8c9a661c168a",
    passage_sha256: "sha256:2f47759502a48d6f5899e3973b22cef34afa5dd6055d5ef15f8b3792e2a341d8",
  },
});

function assessments() {
  return {
    eligibility: { state: "not_applicable" },
    semantic_validity: { state: "not_applicable" },
    aperture_completeness: { state: "not_applicable" },
    temporal_applicability: { state: "not_applicable" },
  };
}

function proposition(reportedVerdict = "supported") {
  return {
    proposition: {
      proposition_id: "clm-md",
      text_sha256: "f3def40d37574fefac4394afc24840423ec1cfa3545870ea05c1da7446d53fab",
    },
    execution: { state: "completed", completion: "assessed" },
    assessments: assessments(),
    contributions: [clone(CONTRIBUTION_A)],
    measurement: {
      kind: "cal_v0_2_aggregate_support_signal",
      value: 0.6075,
      basis_contribution_ids: [CONTRIBUTION_A.contribution_id],
    },
    conclusion: {
      reported_verdict: reportedVerdict,
      terminal_branch: `synthetic_${reportedVerdict}`,
      causal_form: "single_necessary",
      basis_members: [{ namespace: "contribution", id: CONTRIBUTION_A.contribution_id }],
      residual_contribution_ids: [],
      rule_roles: [],
    },
  };
}

function resultSet(prop = proposition()) {
  return {
    contract_c_version: "1.0.0",
    input: {
      contract_b: {
        contract_version: "1.2.0",
        bundle_id: "85f8f6dc-f46f-5efa-b7e7-6e049da84591",
        bundle_hash: "sha256:a40fe687c19944248fe77d044801dca02bba56259198b297b897f6a5a304f2fa",
      },
    },
    producer: {
      semantic_implementation_sha: "33a928db97316a3652d57df9cafb8ca240305233",
      policy: clone(POLICY),
    },
    execution: { state: "completed" },
    propositions: [prop],
  };
}

export function buildSyntheticFixture(id) {
  let object;
  switch (id) {
    case "clear-positive":
      object = resultSet();
      break;
    case "explicit-adverse": {
      const prop = proposition();
      prop.assessments.semantic_validity = { state: "performed", value: "adverse" };
      object = resultSet(prop);
      break;
    }
    case "epistemic-unknown": {
      const prop = proposition();
      prop.assessments.semantic_validity = { state: "performed", value: "unknown" };
      object = resultSet(prop);
      break;
    }
    case "evidence-insufficiency": {
      const prop = proposition("not_checkable");
      prop.execution = { state: "completed", completion: "not_checkable" };
      prop.contributions = [];
      prop.measurement = null;
      prop.conclusion = {
        reported_verdict: "not_checkable",
        terminal_branch: "synthetic_not_checkable",
        causal_form: "redundant_non_deciding",
        basis_members: [],
        residual_contribution_ids: [],
        rule_roles: [],
      };
      object = resultSet(prop);
      break;
    }
    case "execution-failure": {
      const prop = proposition();
      prop.execution = { state: "failed" };
      prop.contributions = [];
      prop.measurement = null;
      prop.conclusion = null;
      object = resultSet(prop);
      break;
    }
    case "missing-required-field": {
      const prop = proposition();
      delete prop.assessments.semantic_validity;
      object = resultSet(prop);
      break;
    }
    case "malformed-field": {
      const prop = proposition();
      prop.assessments.semantic_validity = { state: "performed", value: "banana" };
      object = resultSet(prop);
      break;
    }
    case "mixed-support-refutation": {
      const prop = proposition("supported");
      prop.contributions.push(clone(CONTRIBUTION_B));
      prop.conclusion.residual_contribution_ids = [CONTRIBUTION_B.contribution_id];
      object = resultSet(prop);
      break;
    }
    case "extra-field":
      object = resultSet();
      object.extension_probe = true;
      break;
    case "contradicted":
      object = resultSet(proposition("contradicted"));
      break;
    case "irrelevant-producer-identity-mutation":
      object = resultSet();
      object.producer.semantic_implementation_sha = "1111111111111111111111111111111111111111";
      break;
    default:
      throw new Error(`unknown synthetic fixture: ${id}`);
  }
  return withResultSetId(object);
}
