#!/usr/bin/env python3
"""Prepare two bounded Contract-B -> Contract-C experiment cases.

Case unit2 uses Evidence Bundler's fixture-only writer to create a genuinely new
Contract B object from the maintained minimal legacy-A fixture. Case vertical
uses the same legacy-A fixture through BM25 retrieval, synthetic deterministic
review, excerpt refinement, and finalization before CAL. The synthetic review is
wiring apparatus only and is not evidence that retrieval nominees are true.
"""

from __future__ import annotations

import hashlib
import json
import shutil
import sys
from pathlib import Path

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
from claim_audit_lab.contracts.bundle_loader import load_bundle
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
    (case_dir / "expected-contract-b.json").write_text(
        json.dumps(expected_b, sort_keys=True) + "\n", encoding="utf-8"
    )
    index = make_b_index(bundle_dir)
    (case_dir / "contract-b-index.json").write_text(
        json.dumps(index, sort_keys=True, separators=(",", ":")) + "\n", encoding="utf-8"
    )

    source_claims = {claim.id: claim for claim in claims}
    c_obj = json.loads(raw)
    contexts_dir = case_dir / "contexts"
    contexts_dir.mkdir()
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
        (contexts_dir / f"{proposition_id}.json").write_text(
            json.dumps(context, sort_keys=True) + "\n", encoding="utf-8"
        )

    summary = summarize_c(c_obj)
    summary.update(
        {
            "contract_b": expected_b,
            "contract_b_extension_present": (bundle_dir / "extensions/contract-b-factual-context-v1.json").exists(),
            "contract_c_sha256": sha256_bytes(raw),
        }
    )
    return summary


def summarize_c(c_obj: dict[str, object]) -> dict[str, object]:
    propositions = []
    for record in c_obj["propositions"]:  # type: ignore[index]
        execution = record["execution"]
        conclusion = record.get("conclusion")
        measurement = record.get("measurement")
        assessments = record["assessments"]
        propositions.append(
            {
                "proposition_id": record["proposition"]["proposition_id"],
                "execution": execution,
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
                "measurement": measurement,
                "assessments": assessments,
            }
        )
    return {
        "contract_c_version": c_obj["contract_c_version"],
        "execution": c_obj["execution"],
        "producer": c_obj["producer"],
        "propositions": propositions,
    }


def build_unit2(scaffold: Path, out: Path) -> dict[str, object]:
    case = out / "unit2"
    clean(case)
    bundle_dir = case / "contract-b"
    result = build_fixture_bundle(scaffold, bundle_dir)
    errors = validate_bundle_tree(bundle_dir)
    if errors:
        raise RuntimeError("unit2 Contract B validation failed: " + "; ".join(errors))
    summary = run_cal(bundle_dir, case)
    summary["b_writer"] = "fixture-only"
    summary["bundle_id"] = result.manifest.bundle_id
    return summary


def build_vertical(scaffold: Path, out: Path) -> dict[str, object]:
    case = out / "vertical"
    clean(case)
    draft = case / "draft-b"
    retrieval_report = case / "retrieval-report.md"
    result = build_retrieval_bundle(
        scaffold,
        draft,
        config=RetrievalConfig(retrieval_method="bm25"),
        report_out=retrieval_report,
    )
    errors = validate_bundle_tree(draft)
    if errors:
        raise RuntimeError("vertical draft Contract B validation failed: " + "; ".join(errors))

    annotations_path = case / "review_annotations.yaml"
    annotations = scaffold_annotations_from_bundle(draft)
    reviewed, count = apply_decision_to_annotations(
        annotations,
        decision="accepted",
        role=None,
        claim_id=None,
        source_id=None,
        sample=None,
        notes="Synthetic deterministic accept-all review for cross-repository wiring only; not a semantic truth judgment.",
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
    errors = validate_bundle_tree(final_dir)
    if errors:
        raise RuntimeError("vertical final Contract B validation failed: " + "; ".join(errors))

    summary = run_cal(final_dir, case)
    summary.update(
        {
            "b_writer": "bm25-retrieval-plus-synthetic-review-finalization",
            "draft_bundle_id": result.manifest.bundle_id,
            "bundle_id": finalized.manifest.bundle_id,
            "retrieval_no_candidate_claim_ids": result.retrieval_report.no_candidate_claim_ids
            if result.retrieval_report
            else [],
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
        }
    )
    return summary


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: prepare_cases.py <evidence-bundler-root> <output-root>", file=sys.stderr)
        return 2
    eb_root = Path(sys.argv[1]).resolve()
    out = Path(sys.argv[2]).resolve()
    clean(out)
    scaffold = eb_root / "tests/fixtures/scaffold-run-minimal"

    unit2 = build_unit2(scaffold, out)
    vertical = build_vertical(scaffold, out)
    receipt = {
        "status": "PREPARED",
        "source_fixture": "tests/fixtures/scaffold-run-minimal",
        "source_fixture_claim_semantics": "synthetic maintained legacy-A fixture",
        "unit2": unit2,
        "vertical": vertical,
    }
    (out / "prepared-summary.json").write_text(
        json.dumps(receipt, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    print(json.dumps(receipt, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
