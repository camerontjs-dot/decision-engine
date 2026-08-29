"""Emit one controlled partially-supported Contract C object through current CAL.

This is a reachability supplement, not production traffic. It uses the pinned
current CAL rule and exporter implementations unchanged, with a bounded input
mirroring CAL's own numeric-mismatch rule test and Contract-C exporter test
construction conventions.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from dataclasses import replace
from pathlib import Path
from typing import Any

from claim_audit_lab.contracts.adapter import adapt_bundle_to_pipeline
from claim_audit_lab.contracts.bundle_loader import load_bundle
from claim_audit_lab.contracts.contract_c import export_contract_c, export_contract_c_bytes
from claim_audit_lab.models import Claim, EvidenceCandidate, EvidenceExcerpt
from claim_audit_lab.policy import CAL_RULES_V1_2_0
from claim_audit_lab.rules import assess_claim_support

CAL_MAIN_SHA = "53f0885b111676794d1bd20e10b91aa58b07e9d4"
CAL_RULES_BLOB_SHA = "4e2c7ebb1a7866d941fc2570757e64098359413a"
CAL_RULE_TEST_BLOB_SHA = "ed42acb8c21843676028ccd8c2b9ecc776ad2154"
CAL_EXPORTER_BLOB_SHA = "d6b32a44ef11109fe0ee91efa212d3904badf58c"
CAL_EXPORTER_TEST_BLOB_SHA = "bb7f128bdc089c1635a6f487a0c6861920ec5c9f"


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def build_contract_b_index(contents: Any) -> dict[str, Any]:
    propositions = {
        claim.claim_id: sha256(claim.claim_text.encode("utf-8"))
        for claim in contents.claims
    }
    passages: dict[str, dict[str, str]] = {}
    for source_id, source_passages in contents.passages.items():
        for passage in source_passages:
            passages[passage.passage_id] = {
                "source_id": source_id,
                "passage_sha256": passage.passage_hash,
            }
    return {
        "contract_version": contents.manifest.schema_version,
        "bundle_id": contents.manifest.bundle_id,
        "bundle_hash": contents.manifest.bundle.bundle_hash,
        "propositions": propositions,
        "passages": passages,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("cal_root", type=Path)
    parser.add_argument("output_dir", type=Path)
    args = parser.parse_args()
    cal_root = args.cal_root.resolve()
    out = args.output_dir.resolve()
    out.mkdir(parents=True, exist_ok=True)

    fixture = cal_root / "tests" / "fixtures" / "cb" / "evidence-bundle-minimal"
    contents = load_bundle(fixture, deviations_dir=out / "deviations")
    _claims, evidence_bundle, audit_config = adapt_bundle_to_pipeline(contents)

    claim = Claim(
        id="clm-partial",
        text="The test set included 99 workflow outputs.",
        claim_type="numeric",
    )
    evidence_text = "The test set included 52 workflow outputs."
    source = evidence_bundle.sources[0]
    excerpt = EvidenceExcerpt(
        id="src-001/pass-partial",
        text=evidence_text,
    )
    partial_bundle = evidence_bundle.model_copy(
        update={
            "sources": [
                source.model_copy(
                    update={"excerpts": [excerpt]}
                )
            ]
        }
    )
    candidate = EvidenceCandidate(
        source_id="src-001",
        excerpt_id=excerpt.id,
        score=0.69,
        source_reliability="high",
    )
    assessment = assess_claim_support(
        claim,
        partial_bundle,
        [candidate],
        audit_config,
        policy=CAL_RULES_V1_2_0,
    )
    if assessment.support_label != "partially_supported":
        raise RuntimeError(
            f"current CAL no longer reaches partially_supported for frozen control: {assessment.support_label}"
        )
    codes = {flag.code for flag in assessment.rule_flags}
    if codes != {"numeric_mismatch"}:
        raise RuntimeError(f"unexpected current CAL rule flags: {sorted(codes)}")

    base_passage = contents.passages["src-001"][0]
    passage_hash = "sha256:" + sha256(evidence_text.encode("utf-8"))
    partial_contents = replace(
        contents,
        claims=[
            contents.claims[0].model_copy(
                update={
                    "claim_id": claim.id,
                    "claim_text": claim.text,
                }
            )
        ],
        passages={
            "src-001": [
                base_passage.model_copy(
                    update={
                        "passage_id": "pass-partial",
                        "passage_text": evidence_text,
                        "passage_hash": passage_hash,
                    }
                )
            ]
        },
    )

    raw = export_contract_c_bytes(
        contents=partial_contents,
        assessments=[assessment],
        evidence_bundle=partial_bundle,
        audit_config=audit_config,
    )
    result = export_contract_c(
        contents=partial_contents,
        assessments=[assessment],
        evidence_bundle=partial_bundle,
        audit_config=audit_config,
    )
    proposition = result["propositions"][0]
    if proposition["conclusion"]["reported_verdict"] != "partially_supported":
        raise RuntimeError("current Contract C exporter did not preserve partially_supported")

    object_path = out / "partially-supported-numeric-mismatch.json"
    index_path = out / "partially-supported-numeric-mismatch.contract-b-index.json"
    object_path.write_bytes(raw)
    index_path.write_text(
        json.dumps(build_contract_b_index(partial_contents), sort_keys=True, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )

    manifest = {
        "classification": "controlled current-CAL exporter reachability supplement; not production traffic",
        "case_id": "partially-supported-numeric-mismatch",
        "reachability": "observed_from_current_CAL_rule_and_exporter_control",
        "cal": {
            "repository": "camerontjs-dot/claim-audit-lab",
            "main_sha": CAL_MAIN_SHA,
            "rules_blob_sha": CAL_RULES_BLOB_SHA,
            "rule_test_blob_sha": CAL_RULE_TEST_BLOB_SHA,
            "contract_c_exporter_blob_sha": CAL_EXPORTER_BLOB_SHA,
            "contract_c_exporter_test_blob_sha": CAL_EXPORTER_TEST_BLOB_SHA,
        },
        "control_basis": {
            "semantic_claim": claim.text,
            "semantic_claim_type": claim.claim_type,
            "contract_b_claim_type_preserved": partial_contents.claims[0].claim_type,
            "evidence": evidence_text,
            "candidate_score": 0.69,
            "expected_current_rule_label": "partially_supported",
            "expected_rule_flags": ["numeric_mismatch"],
            "source_rule_test": "test_numeric_mismatch_is_partially_supported_and_high_risk",
        },
        "contract_c_file": object_path.name,
        "contract_b_index_file": index_path.name,
        "sha256": sha256(raw),
        "result_set_id": result["result_set_id"],
        "proposition_id": proposition["proposition"]["proposition_id"],
        "execution": proposition["execution"],
        "reported_verdict": proposition["conclusion"]["reported_verdict"],
        "assessment_states": {
            name: value.get("state")
            for name, value in proposition["assessments"].items()
        },
        "explicit_nonclaims": [
            "This controlled reachability case is not evidence of production traffic frequency.",
            "CAL source code, rules, thresholds, and exporter were not modified to create the state.",
            "The Contract-B claim_type handoff role is preserved and is not overwritten by CAL semantic claim type.",
            "The input was selected before observing the Gate result from current CAL's already-frozen rule behavior.",
        ],
    }
    (out / "MANIFEST.json").write_text(
        json.dumps(manifest, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
