#!/usr/bin/env python3
"""Run the non-empty vertical slice through CAL audit and preserve C-export failure.

This diagnostic does not repair or reinterpret current CAL output. It freezes the
valid finalized Contract B object, the CAL-native assessments immediately before
Contract C export, and the exact exporter result.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from evidence_bundler.models.retrieval import RetrievalConfig

from claim_audit_lab.auditor import audit_claims
from claim_audit_lab.contracts.adapter import adapt_bundle_to_pipeline, build_claim_evidence_scopes
from claim_audit_lab.contracts.bundle_loader import load_bundle
from claim_audit_lab.contracts.contract_c import ContractCExportError, export_contract_c_bytes

import prepare_cases as pc


def assessment_receipt(assessment):
    return {
        "claim_id": assessment.claim.id,
        "claim_text_sha256": pc.sha256_bytes(assessment.claim.text.encode("utf-8")),
        "semantic_claim_type": assessment.claim.claim_type,
        "support_label": assessment.support_label,
        "risk_label": assessment.risk_label,
        "support_signal": assessment.support_signal,
        "candidate_evidence": [
            {
                "source_id": item.source_id,
                "excerpt_id": item.excerpt_id,
                "score": item.score,
            }
            for item in assessment.candidate_evidence
        ],
        "counterevidence": [
            {
                "source_id": item.source_id,
                "excerpt_id": item.excerpt_id,
                "score": item.score,
            }
            for item in assessment.counterevidence
        ],
        "rule_codes": sorted(flag.code for flag in assessment.rule_flags),
        "explanation": assessment.explanation,
        "limitations": list(assessment.limitations),
    }


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: diagnose_nonempty_vertical.py <evidence-bundler-root> <output-root>", file=sys.stderr)
        return 2

    eb_root = Path(sys.argv[1]).resolve()
    out = Path(sys.argv[2]).resolve()
    case = out / "vertical-nonempty"
    pc.clean(case)

    scaffold = eb_root / "examples/handoff-demo/scaffold-run-bm25-handoff-demo"
    final_dir, meta = pc.retrieve_review_finalize(
        scaffold=scaffold,
        case=case,
        config=RetrievalConfig(retrieval_method="bm25", top_k=5, lexical_score_floor=0.0),
    )
    if meta["evidence_bundler_validation_errors"]:
        raise RuntimeError(
            "Evidence Bundler local validation failed before CAL: "
            + "; ".join(meta["evidence_bundler_validation_errors"])
        )
    if not meta["final_evidence_directory_exists"] or meta["final_total_evidence_passages"] <= 0:
        raise RuntimeError("non-empty discriminator unexpectedly produced an empty evidence handoff")

    b_summary = {
        "status": "FINALIZED_NONEMPTY_B",
        "source_fixture": "examples/handoff-demo/scaffold-run-bm25-handoff-demo",
        "source_fixture_claim_semantics": "maintained synthetic legacy-A BM25 handoff demo",
        "b_writer": "bm25-floor-0-plus-synthetic-review-finalization",
        **meta,
    }
    pc.write_json(case / "b-summary.json", b_summary)

    contents = load_bundle(final_dir, deviations_dir=case / "cal-deviations")
    claims, evidence_bundle, audit_config = adapt_bundle_to_pipeline(contents)
    assessments = audit_claims(
        claims,
        evidence_bundle,
        audit_config,
        evidence_scopes=build_claim_evidence_scopes(contents),
    )
    assessment_rows = [assessment_receipt(item) for item in assessments]
    pc.write_json(case / "cal-assessments-pre-contract-c.json", assessment_rows)

    blockers = [
        item["claim_id"]
        for item in assessment_rows
        if item["semantic_claim_type"] == "unclassified"
        and item["support_label"] == "not_checkable"
        and (item["candidate_evidence"] or item["counterevidence"])
    ]

    try:
        raw = export_contract_c_bytes(
            contents=contents,
            assessments=assessments,
            evidence_bundle=evidence_bundle,
            audit_config=audit_config,
        )
    except ContractCExportError as exc:
        export_result = {
            "accepted": False,
            "exception_type": type(exc).__name__,
            "message": str(exc),
            "blocking_assessment_ids": blockers,
            "contract_c_written": False,
        }
    else:
        (case / "unexpected-contract-c.json").write_bytes(raw)
        export_result = {
            "accepted": True,
            "exception_type": None,
            "message": None,
            "blocking_assessment_ids": blockers,
            "contract_c_written": True,
            "contract_c_sha256": pc.sha256_bytes(raw),
        }

    pc.write_json(case / "cal-contract-c-export-diagnostic.json", export_result)
    print(json.dumps({"contract_b": b_summary, "assessments": assessment_rows, "contract_c_export": export_result}, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
