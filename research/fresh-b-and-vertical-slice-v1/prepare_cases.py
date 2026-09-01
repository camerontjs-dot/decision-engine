#!/usr/bin/env python3
"""Prepare bounded fresh-B and vertical-slice experiment cases.

The cases are intentionally separate so a vertical-slice failure cannot erase or
mask the fresh Contract-B -> C -> D compatibility result.

- unit2: fixture-only B writer on a different maintained legacy-A fixture.
- vertical-diagnostic: default BM25 on that same fixture, preserving the observed
  empty-evidence handoff and CAL intake failure without repairing it.
- vertical-nonempty: the maintained BM25 handoff demo with lexical floor 0.0,
  followed by deterministic accept-all review, excerpt refinement, finalization,
  and current CAL. The synthetic review is wiring apparatus only and is not a
  truth judgment.
"""

from __future__ import annotations

import hashlib
import json
import shutil
import sys
from pathlib import Path
from typing import Any

from evidence_bundler.contracts.writer import (
    build_fixture_bundle,
    build_retrieval_bundle,
    validate_bundle_tree,
)
from evidence_bundler.contracts.yaml_io import load_model_yaml
from evidence_bundler.models.cb import BundleManifest, ClaimAuditUnit, PassageRecord
from evidence_bundler.models.retrieval import RetrievalConfig
from evidence_bundler.output.finalizer import finalize_bundle
from evidence_bundler.output.refiner import refine_excerpts, write_excerpt_refinement
from evidence_bundler.review.annotator import apply_decision_to_annotations
from evidence_bundler.review.io import scaffold_annotations_from_bundle, write_review_annotations

from claim_audit_lab.auditor import audit_claims
from claim_audit_lab.contracts.adapter import adapt_bundle_to_pipeline, build_claim_evidence_scopes
from claim_audit_lab.contracts.bundle_loader import BundleIntegrityError, load_bundle
from claim_audit_lab.contracts.contract_c import export_contract_c_bytes


POLICY = {
    "id": "decision-engine.contract-c.supported-claim-verification",
    "version": "1.0.0",
}


def sha256_bytes(raw: bytes) -> str:
    return "sha256:" + hashlib.sha256(raw).hexdigest()


def clean(path: Path) -> None:
    if path.exists():
        shutil.rmtree(path)
    path.mkdir(parents=True)


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def load_claim_units(bundle_dir: Path) -> list[ClaimAuditUnit]:
    return [
        load_model_yaml(ClaimAuditUnit, path)
        for path in sorted((bundle_dir / "claims").glob("*.yaml"))
    ]


def make_b_index(bundle_dir: Path) -> dict[str, object]:
    manifest = load_model_yaml(BundleManifest, bundle_dir / "bundle_manifest.yaml")
    propositions: dict[str, str] = {}
    for claim in load_claim_units(bundle_dir):
        propositions[claim.claim_id] = hashlib.sha256(claim.claim_text.encode("utf-8")).hexdigest()

    passages: dict[str, dict[str, str]] = {}
    for path in sorted((bundle_dir / "evidence").glob("*/passages/*.yaml")):
        passage = load_model_yaml(PassageRecord, path)
        passages[passage.passage_id] = {
            "source_id": passage.source_id,
            "passage_sha256": passage.passage_hash,
        }

    return {
        "contract_version": manifest.schema_version,
        "bundle_id": manifest.bundle_id,
        "bundle_hash": manifest.bundle.bundle_hash,
        "propositions": propositions,
        "passages": passages,
    }


def make_expected_b(bundle_dir: Path) -> dict[str, str]:
    manifest = load_model_yaml(BundleManifest, bundle_dir / "bundle_manifest.yaml")
    return {
        "contract_version": manifest.schema_version,
        "bundle_id": manifest.bundle_id,
        "bundle_hash": manifest.bundle.bundle_hash,
    }


def summarize_c(c_obj: dict[str, object]) -> dict[str, object]:
    propositions = []
    for record in c_obj["propositions"]:  # type: ignore[index]
        conclusion = record.get("conclusion")
        propositions.append(
            {
                "proposition_id": record["proposition"]["proposition_id"],
                "proposition_text_sha256": record["proposition"]["text_sha256"],
                "execution": record["execution"],
                "reported_verdict": conclusion.get("reported_verdict") if conclusion else None,
                "terminal_branch": conclusion.get("terminal_branch") if conclusion else None,
                "causal_form": conclusion.get("causal_form") if conclusion else None,
                "basis_namespaces": sorted(
                    {member["namespace"] for member in conclusion.get("basis_members", [])}
                )
                if conclusion
                else [],
                "rule_roles": conclusion.get("rule_roles", []) if conclusion else [],
                "contribution_channels": [item["channel"] for item in record.get("contributions", [])],
                "contribution_count": len(record.get("contributions", [])),
                "measurement": record.get("measurement"),
                "assessments": record["assessments"],
            }
        )
    return {
        "contract_c_version": c_obj["contract_c_version"],
        "execution": c_obj["execution"],
        "producer": c_obj["producer"],
        "propositions": propositions,
    }


def run_cal(bundle_dir: Path, case_dir: Path) -> dict[str, object]:
    deviations = case_dir / "cal-deviations"
    contents = load_bundle(bundle_dir, deviations_dir=deviations)
    claims, evidence_bundle, audit_config = adapt_bundle_to_pipeline(contents)
    assessments = audit_claims(
        claims,
        evidence_bundle,
        audit_config,
        evidence_scopes=build_claim_evidence_scopes(contents),
    )
    raw = export_contract_c_bytes(
        contents=contents,
        assessments=assessments,
        evidence_bundle=evidence_bundle,
        audit_config=audit_config,
    )
    (case_dir / "contract-c.json").write_bytes(raw)
    (case_dir / "contract-c.sha256").write_text(sha256_bytes(raw) + "\n", encoding="utf-8")

    expected_b = make_expected_b(bundle_dir)
    write_json(case_dir / "expected-contract-b.json", expected_b)
    index = make_b_index(bundle_dir)
    (case_dir / "contract-b-index.json").write_text(
        json.dumps(index, sort_keys=True, separators=(",", ":")) + "\n", encoding="utf-8"
    )

    source_claims = {claim.id: claim for claim in claims}
    c_obj = json.loads(raw)
    contexts_dir = case_dir / "contexts"
    contexts_dir.mkdir(exist_ok=False)
    for proposition in c_obj["propositions"]:
        proposition_id = proposition["proposition"]["proposition_id"]
        claim = source_claims[proposition_id]
        context = {
            "policy": POLICY,
            "proposition_id": proposition_id,
            "target": {
                "kind": "claim",
                "id": proposition_id,
                "content_sha256": sha256_bytes(claim.text.encode("utf-8")),
            },
        }
        write_json(contexts_dir / f"{proposition_id}.json", context)

    summary = summarize_c(c_obj)
    summary.update(
        {
            "contract_b": expected_b,
            "contract_b_extension_present": (
                bundle_dir / "extensions/contract-b-factual-context-v1.json"
            ).exists(),
            "contract_c_sha256": sha256_bytes(raw),
        }
    )
    return summary


def build_unit2(scaffold: Path, out: Path) -> dict[str, object]:
    case = out / "unit2"
    clean(case)
    bundle_dir = case / "contract-b"
    result = build_fixture_bundle(scaffold, bundle_dir)
    errors = validate_bundle_tree(bundle_dir)
    if errors:
        raise RuntimeError("unit2 Evidence Bundler validation failed: " + "; ".join(errors))
    summary = run_cal(bundle_dir, case)
    summary.update(
        {
            "status": "PREPARED",
            "source_fixture": "tests/fixtures/scaffold-run-minimal",
            "source_fixture_claim_semantics": "synthetic maintained legacy-A fixture",
            "b_writer": "fixture-only",
            "bundle_id": result.manifest.bundle_id,
            "evidence_bundler_validation_errors": errors,
        }
    )
    write_json(case / "prepared-summary.json", summary)
    return summary


def retrieve_review_finalize(
    *,
    scaffold: Path,
    case: Path,
    config: RetrievalConfig,
) -> tuple[Path, dict[str, object]]:
    draft = case / "draft-b"
    retrieval_report = case / "retrieval-report.md"
    result = build_retrieval_bundle(scaffold, draft, config=config, report_out=retrieval_report)
    draft_errors = validate_bundle_tree(draft)
    if draft_errors:
        raise RuntimeError("draft Evidence Bundler validation failed: " + "; ".join(draft_errors))

    annotations_path = case / "review_annotations.yaml"
    annotations = scaffold_annotations_from_bundle(draft)
    reviewed, count = apply_decision_to_annotations(
        annotations,
        decision="accepted",
        role=None,
        claim_id=None,
        source_id=None,
        sample=None,
        notes=(
            "Synthetic deterministic accept-all review for cross-repository wiring only; "
            "not a semantic truth judgment."
        ),
    )
    if count != len(annotations.annotations):
        raise RuntimeError(
            f"synthetic review did not cover every retrieval nomination: {count}/{len(annotations.annotations)}"
        )
    write_review_annotations(reviewed, annotations_path)

    refinement_path = case / "excerpt_refinement.yaml"
    refinement, refinement_summary = refine_excerpts(draft, annotations_path)
    write_excerpt_refinement(refinement, refinement_path)

    final_dir = case / "contract-b"
    finalized = finalize_bundle(draft, annotations_path, refinement_path, final_dir)
    final_errors = validate_bundle_tree(final_dir)

    manifest = load_model_yaml(BundleManifest, final_dir / "bundle_manifest.yaml")
    meta: dict[str, object] = {
        "draft_bundle_id": result.manifest.bundle_id,
        "bundle_id": finalized.manifest.bundle_id,
        "retrieval_no_candidate_claim_ids": (
            result.retrieval_report.no_candidate_claim_ids if result.retrieval_report else []
        ),
        "synthetic_review": {
            "policy": "accept-all-retrieval-nominations",
            "annotation_count": count,
            "truth_claim": False,
        },
        "refinement": {
            "candidates": refinement_summary.candidates,
            "clusters": refinement_summary.clusters,
            "collapsed_members": refinement_summary.collapsed_members,
            "decision_conflicts": refinement_summary.decision_conflicts,
        },
        "final_evidence_directory_exists": (final_dir / "evidence").is_dir(),
        "final_total_evidence_passages": manifest.bundle.total_evidence_passages,
        "final_quality_gates": manifest.quality_gates.model_dump(mode="json"),
        "evidence_bundler_validation_errors": final_errors,
    }
    return final_dir, meta


def build_vertical_diagnostic(scaffold: Path, out: Path) -> dict[str, object]:
    case = out / "vertical-diagnostic"
    clean(case)
    final_dir, meta = retrieve_review_finalize(
        scaffold=scaffold,
        case=case,
        config=RetrievalConfig(retrieval_method="bm25"),
    )
    cal_intake: dict[str, object]
    try:
        load_bundle(final_dir, deviations_dir=case / "cal-deviations")
    except BundleIntegrityError as exc:
        cal_intake = {
            "accepted": False,
            "exception_type": type(exc).__name__,
            "message": str(exc),
        }
    else:
        cal_intake = {"accepted": True, "exception_type": None, "message": None}

    summary = {
        "status": "DIAGNOSTIC_COMPLETE",
        "source_fixture": "tests/fixtures/scaffold-run-minimal",
        "b_writer": "bm25-default-plus-synthetic-review-finalization",
        **meta,
        "cal_intake": cal_intake,
    }
    write_json(case / "diagnostic-summary.json", summary)
    return summary


def build_vertical_nonempty(scaffold: Path, out: Path) -> dict[str, object]:
    case = out / "vertical-nonempty"
    clean(case)
    final_dir, meta = retrieve_review_finalize(
        scaffold=scaffold,
        case=case,
        config=RetrievalConfig(retrieval_method="bm25", top_k=5, lexical_score_floor=0.0),
    )
    if meta["evidence_bundler_validation_errors"]:
        raise RuntimeError(
            "vertical-nonempty Evidence Bundler validation failed: "
            + "; ".join(meta["evidence_bundler_validation_errors"])  # type: ignore[arg-type]
        )
    if not meta["final_evidence_directory_exists"]:
        raise RuntimeError("vertical-nonempty unexpectedly produced no evidence directory")
    summary = run_cal(final_dir, case)
    summary.update(
        {
            "status": "PREPARED",
            "source_fixture": "examples/handoff-demo/scaffold-run-bm25-handoff-demo",
            "source_fixture_claim_semantics": "maintained synthetic legacy-A BM25 handoff demo",
            "b_writer": "bm25-floor-0-plus-synthetic-review-finalization",
            **meta,
        }
    )
    write_json(case / "prepared-summary.json", summary)
    return summary


def main() -> int:
    if len(sys.argv) != 4:
        print(
            "usage: prepare_cases.py <unit2|vertical-diagnostic|vertical-nonempty> "
            "<evidence-bundler-root> <output-root>",
            file=sys.stderr,
        )
        return 2
    mode = sys.argv[1]
    eb_root = Path(sys.argv[2]).resolve()
    out = Path(sys.argv[3]).resolve()
    out.mkdir(parents=True, exist_ok=True)

    if mode == "unit2":
        result = build_unit2(eb_root / "tests/fixtures/scaffold-run-minimal", out)
    elif mode == "vertical-diagnostic":
        result = build_vertical_diagnostic(eb_root / "tests/fixtures/scaffold-run-minimal", out)
    elif mode == "vertical-nonempty":
        result = build_vertical_nonempty(
            eb_root / "examples/handoff-demo/scaffold-run-bm25-handoff-demo", out
        )
    else:
        print(f"unknown mode: {mode}", file=sys.stderr)
        return 2

    print(json.dumps(result, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
