from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

from claim_audit_lab.auditor import audit_claims
from claim_audit_lab.contracts.adapter import adapt_bundle_to_pipeline, build_claim_evidence_scopes
from claim_audit_lab.contracts.bundle_loader import load_bundle
from claim_audit_lab.contracts.contract_c import export_contract_c_bytes


out_dir = Path(os.environ.get("PRESSURE_OUTPUT_DIR", "build/v1-pressure-rc0"))
cal_root = Path(os.environ["CAL_RELEASE_DIR"])
fixture = cal_root / "tests" / "fixtures" / "cb" / "evidence-bundle-minimal"
out_dir.mkdir(parents=True, exist_ok=True)

contents = load_bundle(fixture, deviations_dir=out_dir / "cal-deviations")
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
value = json.loads(raw)

(out_dir / "real-cal-v0.5.0-contract-c.json").write_bytes(raw)
expected_b = value["input"]["contract_b"]
(out_dir / "real-cal-v0.5.0-expected-b.json").write_text(
    json.dumps(expected_b, sort_keys=True, separators=(",", ":")) + "\n",
    encoding="utf-8",
)

summary = {
    "cal_release": "v0.5.0",
    "contract_c_sha256": "sha256:" + hashlib.sha256(raw).hexdigest(),
    "contract_b": expected_b,
    "propositions": [
        {
            "proposition_id": item["proposition"]["proposition_id"],
            "completion": item["execution"].get("completion"),
            "reported_verdict": (item.get("conclusion") or {}).get("reported_verdict"),
            "basis_contribution_ids": [
                member["id"]
                for member in (item.get("conclusion") or {}).get("basis_members", [])
                if member["namespace"] == "contribution"
            ],
            "residual_contribution_ids": (item.get("conclusion") or {}).get(
                "residual_contribution_ids", []
            ),
        }
        for item in value["propositions"]
    ],
}
(out_dir / "real-cal-v0.5.0-summary.json").write_text(
    json.dumps(summary, indent=2, sort_keys=True) + "\n",
    encoding="utf-8",
)
print(json.dumps(summary, sort_keys=True))
