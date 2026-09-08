#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


def sha256_text(text: str) -> str:
    return "sha256:" + hashlib.sha256(text.encode("utf-8")).hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cal-root", required=True, type=Path)
    parser.add_argument("--out-dir", required=True, type=Path)
    args = parser.parse_args()

    fixture_root = args.cal_root / "pipeline" / "cal_rc0" / "fixtures"
    cohort = json.loads((fixture_root / "cohort.json").read_text(encoding="utf-8"))
    admission = json.loads((fixture_root / "admission.json").read_text(encoding="utf-8"))

    case = cohort["cases"][0]
    assert case["case_id"] == "PIPELINE_SMOKE_001"
    assert any(p["evidence_id"] == "PIPE-P1" for p in case["passages"])
    assert not any(p["evidence_id"] == "PIPE-P4" for p in case["passages"])

    contrary = "Women exceeded Men by 5 percentage points."
    case["contract_a"]["sources"].append(
        {
            "content": contrary,
            "content_sha256": sha256_text(contrary),
            "media_type": "text/plain; charset=utf-8",
            "source_id": "PIPE-S4",
        }
    )
    case["passages"].append(
        {
            "evidence_id": "PIPE-P4",
            "source_id": "PIPE-S4",
            "text": contrary,
        }
    )

    row = admission["cases"]["PIPELINE_SMOKE_001"]["PIPELINE_SMOKE_001:child:1"]
    assert row["accepted"] == ["PIPE-P1"]
    assert row["rejected"] == ["PIPE-P3"]
    row["accepted"] = ["PIPE-P1", "PIPE-P4"]
    row["rejected"] = ["PIPE-P3"]

    args.out_dir.mkdir(parents=True, exist_ok=True)
    cohort_path = args.out_dir / "cohort-mixed.json"
    admission_path = args.out_dir / "admission-mixed.json"
    cohort_path.write_text(json.dumps(cohort, sort_keys=True, separators=(",", ":")) + "\n", encoding="utf-8")
    admission_path.write_text(json.dumps(admission, sort_keys=True, separators=(",", ":")) + "\n", encoding="utf-8")

    receipt = {
        "schema": "de-adversarial-mixed-input-v1",
        "added_source_id": "PIPE-S4",
        "added_passage_id": "PIPE-P4",
        "added_text": contrary,
        "added_content_sha256": sha256_text(contrary),
        "child_1_accepted": row["accepted"],
        "cohort_path": str(cohort_path),
        "admission_path": str(admission_path),
    }
    (args.out_dir / "INPUT-MUTATION-RECEIPT.json").write_text(
        json.dumps(receipt, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    print(json.dumps(receipt, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
