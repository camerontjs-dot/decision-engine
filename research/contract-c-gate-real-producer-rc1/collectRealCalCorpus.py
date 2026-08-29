"""Capture a bounded Contract C corpus from unmodified current CAL exporter pathways.

The selected cases are existing CAL exporter tests. This script calls those test
functions unchanged, intercepts only the exported Contract C return value, then
re-runs the current byte exporter on the exact same arguments to freeze bytes.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import sys
import tempfile
from pathlib import Path
from typing import Any

CAL_MAIN_SHA = "53f0885b111676794d1bd20e10b91aa58b07e9d4"
CAL_EXPORTER_BLOB_SHA = "d6b32a44ef11109fe0ee91efa212d3904badf58c"
CAL_EXPORTER_PRODUCTION_MERGE = "a069707e5031cef5b82af02d08b0f1a47ea8752e"
CAL_EXPORTER_SEMANTIC_SHA = "33a928db97316a3652d57df9cafb8ca240305233"
CAL_TEST_BLOB_SHA = "bb7f128bdc089c1635a6f487a0c6861920ec5c9f"

CASES = [
    ("production-minimal", "test_exporter_preserves_reference_measurement_and_not_performed_state"),
    ("supported-tied-alternatives", "test_tied_co_maxima_export_as_independent_sufficient_alternatives"),
    ("unsupported-residual", "test_adverse_terminal_replay_does_not_promote_residual_to_cause"),
    ("not-checkable-unclassified", "test_unclassified_early_return_is_completed_not_checkable_not_failure"),
    ("needs-source-credential", "test_credential_missing_source_uses_producer_owned_state_basis"),
    ("overstated-joint-state", "test_absolute_wording_with_counterevidence_preserves_joint_state_basis"),
]


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
            if passage.passage_id in passages:
                raise RuntimeError(f"duplicate passage_id in captured Contract B index: {passage.passage_id}")
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


def load_test_module(cal_root: Path):
    path = cal_root / "tests" / "test_contract_c_exporter.py"
    spec = importlib.util.spec_from_file_location("cal_rc1_contract_c_exporter_tests", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot import {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("cal_root", type=Path)
    parser.add_argument("output_dir", type=Path)
    args = parser.parse_args()
    cal_root = args.cal_root.resolve()
    out = args.output_dir.resolve()
    out.mkdir(parents=True, exist_ok=True)

    module = load_test_module(cal_root)
    original_export = module.export_contract_c
    captures: list[dict[str, Any]] = []

    def capture_export(*call_args: Any, **call_kwargs: Any):
        result = original_export(*call_args, **call_kwargs)
        raw = module.export_contract_c_bytes(*call_args, **call_kwargs)
        contents = call_kwargs["contents"]
        captures.append(
            {
                "result": result,
                "raw": raw,
                "index": build_contract_b_index(contents),
            }
        )
        return result

    module.export_contract_c = capture_export
    manifest_rows: list[dict[str, Any]] = []

    for case_id, test_name in CASES:
        captures.clear()
        test_fn = getattr(module, test_name)
        with tempfile.TemporaryDirectory(prefix=f"rc1-{case_id}-") as temp:
            test_fn(Path(temp))
        if not captures:
            raise RuntimeError(f"{test_name} did not emit Contract C through export_contract_c")
        capture = captures[-1]
        raw: bytes = capture["raw"]
        result: dict[str, Any] = capture["result"]
        index: dict[str, Any] = capture["index"]
        object_path = out / f"{case_id}.json"
        index_path = out / f"{case_id}.contract-b-index.json"
        object_path.write_bytes(raw)
        index_path.write_text(json.dumps(index, sort_keys=True, separators=(",", ":")) + "\n", encoding="utf-8")

        propositions = []
        for row in result["propositions"]:
            propositions.append(
                {
                    "proposition_id": row["proposition"]["proposition_id"],
                    "execution": row["execution"],
                    "reported_verdict": row["conclusion"]["reported_verdict"] if row.get("conclusion") else None,
                    "assessment_states": {
                        name: value.get("state")
                        for name, value in row.get("assessments", {}).items()
                    },
                }
            )
        manifest_rows.append(
            {
                "case_id": case_id,
                "source_test": test_name,
                "reachability": "observed_from_current_CAL_exporter_official_test_pathway",
                "contract_c_file": object_path.name,
                "contract_b_index_file": index_path.name,
                "sha256": sha256(raw),
                "result_set_id": result["result_set_id"],
                "propositions": propositions,
            }
        )

    manifest = {
        "classification": "frozen real-producer research corpus; not production traffic",
        "cal": {
            "repository": "camerontjs-dot/claim-audit-lab",
            "main_sha": CAL_MAIN_SHA,
            "contract_c_exporter_blob_sha": CAL_EXPORTER_BLOB_SHA,
            "exporter_production_merge": CAL_EXPORTER_PRODUCTION_MERGE,
            "semantic_implementation_sha": CAL_EXPORTER_SEMANTIC_SHA,
            "official_exporter_test_blob_sha": CAL_TEST_BLOB_SHA,
        },
        "method": (
            "Existing official CAL exporter test functions are executed unchanged. "
            "The test module's export_contract_c symbol is wrapped only to capture its returned object; "
            "the current export_contract_c_bytes function is then run on the exact same arguments to freeze bytes."
        ),
        "rows": manifest_rows,
        "explicit_nonclaims": [
            "Official test-pathway reachability is not evidence of production traffic frequency.",
            "Schema-valid synthetic RC0 states are not relabeled as CAL-production-reachable.",
            "No CAL source or tests were modified to manufacture a desired state.",
        ],
    }
    (out / "MANIFEST.json").write_text(
        json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
