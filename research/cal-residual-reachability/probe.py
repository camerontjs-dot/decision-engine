from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys


def load_module(path: Path):
    spec = importlib.util.spec_from_file_location("cal_rc0_runtime_probe", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load runtime: {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def sha256(raw: bytes) -> str:
    return "sha256:" + hashlib.sha256(raw).hexdigest()


def validate_contract_c(raw: bytes, apparatus_c: Path) -> None:
    expected = sha256(raw)
    program = "\n".join(
        [
            "import json, sys",
            "root, expected = sys.argv[1], sys.argv[2]",
            "sys.path.insert(0, root)",
            "from validators.contract_c import validate_contract_c_bytes",
            "raw = sys.stdin.buffer.read()",
            "errors = validate_contract_c_bytes(raw, expected_sha256=expected)",
            "print(json.dumps({'errors': errors}))",
            "raise SystemExit(1 if errors else 0)",
        ]
    )
    proc = subprocess.run(
        [sys.executable, "-c", program, str(apparatus_c), expected],
        input=raw,
        capture_output=True,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"Contract C validation failed: {proc.stderr.decode()} {proc.stdout.decode()}")


def relation(runtime, proposition, relation_id: str, kind: str, evidence_id: str):
    return runtime.RelationRecord(
        relation_id=relation_id,
        claim_id=proposition.claim_id,
        atom_id=f"atom:{evidence_id}",
        relation=kind,
        warranted=True,
        reason="research structural reachability probe",
        evidence_ref={
            "source_id": f"source:{evidence_id}",
            "passage_id": f"passage:{evidence_id}",
            "passage_sha256": "sha256:" + hashlib.sha256(evidence_id.encode()).hexdigest(),
        },
        proposition_projection=runtime.proposition_projection(proposition),
    )


def inspect_contract(raw: bytes):
    value = json.loads(raw)
    p = value["propositions"][0]
    return {
        "completion": p["execution"]["completion"],
        "reported_verdict": p["conclusion"]["reported_verdict"],
        "contribution_count": len(p["contributions"]),
        "basis_members": p["conclusion"]["basis_members"],
        "residual_contribution_ids": p["conclusion"]["residual_contribution_ids"],
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--cal-root", type=Path, required=True)
    ap.add_argument("--apparatus-c", type=Path, required=True)
    ap.add_argument("--out-dir", type=Path, required=True)
    args = ap.parse_args()

    runtime_path = args.cal_root / "research/cal_research_profile_rc0/runtime.py"
    runtime = load_module(runtime_path)
    proposition = runtime.BoundProposition(
        claim_id="probe:claim:1",
        claim_text="Women trailed Men by 11 percentage points.",
        family="strict_comparison",
        lhs_entity="women",
        rhs_entity="men",
        comparison_direction="less_than",
    )
    binding = {
        "contract_version": "1.2.0",
        "bundle_id": "probe-bundle",
        "bundle_hash": "sha256:" + "1" * 64,
    }
    producer_sha = "4b9d69936d8ecdbaac0217561be7a3a821b70522"

    support = relation(runtime, proposition, "relation:" + "1" * 64, "SUPPORTS", "support-1")
    irrelevant = relation(runtime, proposition, "relation:" + "2" * 64, "IRRELEVANT", "irrelevant-1")
    support2 = relation(runtime, proposition, "relation:" + "3" * 64, "SUPPORTS", "support-2")

    one_support = runtime.compose_categorical_relations(
        proposition=proposition,
        relations=[support, irrelevant],
        required_relation_count=2,
    )
    one_raw, one_projection = runtime.project_contract_c(
        proposition=proposition,
        conclusion=one_support,
        relations=[support, irrelevant],
        contract_b_binding=binding,
        semantic_implementation_sha=producer_sha,
    )
    validate_contract_c(one_raw, args.apparatus_c)
    one_shape = inspect_contract(one_raw)

    two_supports = runtime.compose_categorical_relations(
        proposition=proposition,
        relations=[support, support2],
        required_relation_count=2,
    )
    two_raw, two_projection = runtime.project_contract_c(
        proposition=proposition,
        conclusion=two_supports,
        relations=[support, support2],
        contract_b_binding=binding,
        semantic_implementation_sha=producer_sha,
    )
    validate_contract_c(two_raw, args.apparatus_c)
    two_shape = inspect_contract(two_raw)

    assert one_support.disposition == "decided"
    assert one_support.verdict == "supported"
    assert one_shape["completion"] == "assessed"
    assert one_shape["contribution_count"] == 1
    assert len(one_shape["basis_members"]) == 1
    assert len(one_shape["residual_contribution_ids"]) == 0

    assert two_supports.disposition == "decided"
    assert two_supports.verdict == "supported"
    assert two_shape["completion"] == "not_checkable"
    assert two_shape["reported_verdict"] == "not_checkable"
    assert two_shape["contribution_count"] == 2
    assert len(two_shape["basis_members"]) == 0
    assert len(two_shape["residual_contribution_ids"]) == 2
    assert two_projection["projection_loss"] is not None

    args.out_dir.mkdir(parents=True, exist_ok=True)
    (args.out_dir / "one-support-plus-irrelevant.contract-c.json").write_bytes(one_raw)
    (args.out_dir / "two-supports.contract-c.json").write_bytes(two_raw)

    result = {
        "schema": "cal-rc0-residual-reachability-probe-v1",
        "cal_runtime_blob_expected": "b36dacf39d158601368b89df8fa66431ce1b4a07",
        "producer_sha": producer_sha,
        "one_support_plus_irrelevant": {
            "internal": {
                "disposition": one_support.disposition,
                "verdict": one_support.verdict,
                "basis_relation_ids": list(one_support.basis_relation_ids),
            },
            "projection": one_projection,
            "contract_c": one_shape,
            "contract_c_sha256": sha256(one_raw),
            "validation": "PASS",
        },
        "two_supports": {
            "internal": {
                "disposition": two_supports.disposition,
                "verdict": two_supports.verdict,
                "basis_relation_ids": list(two_supports.basis_relation_ids),
            },
            "projection": two_projection,
            "contract_c": two_shape,
            "contract_c_sha256": sha256(two_raw),
            "validation": "PASS",
        },
        "observed_reachability": {
            "assessed_basis_and_residual_same_proposition": False,
            "reason": "non-deciding relations do not become contributions; multiple deciding contributions trigger rc0_projection_loss_unestablished_multiplicity and not_checkable",
        },
        "boundary": "Structural producer-shape probe over exact frozen CAL composition/projection. Relation records are explicit test inputs, not independently regenerated retrieval/measurement/warrant receipts in this run.",
    }
    (args.out_dir / "CAL-RESIDUAL-REACHABILITY.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
