from __future__ import annotations

import argparse
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
from typing import Any, Callable


def load_json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"expected JSON object: {path}")
    return value


def load_validator(root: Path) -> Any:
    path = root / "validators" / "contract_c.py"
    spec = importlib.util.spec_from_file_location("matrix_contract_c_validator", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load Contract C validator: {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def sha256_id(raw: bytes) -> str:
    return "sha256:" + hashlib.sha256(raw).hexdigest()


def target_row(value: dict[str, Any], proposition_id: str) -> dict[str, Any]:
    matches = [
        row
        for row in value["propositions"]
        if row["proposition"]["proposition_id"] == proposition_id
    ]
    if len(matches) != 1:
        raise ValueError(f"expected exactly one proposition {proposition_id}")
    return matches[0]


def require_supported_single_basis(value: dict[str, Any], proposition_id: str) -> str:
    row = target_row(value, proposition_id)
    if row["execution"] != {"state": "completed", "completion": "assessed"}:
        raise ValueError("matrix base proposition must be completed/assessed")
    if row["conclusion"]["reported_verdict"] != "supported":
        raise ValueError("matrix base proposition must report supported")
    if len(row["contributions"]) != 1:
        raise ValueError("matrix base proposition must retain exactly one contribution")
    cid = row["contributions"][0]["contribution_id"]
    if row["conclusion"]["basis_members"] != [{"namespace": "contribution", "id": cid}]:
        raise ValueError("matrix base must have exactly one contribution basis member")
    if row["conclusion"]["residual_contribution_ids"]:
        raise ValueError("matrix base must have no residual contributions")
    return cid


def mutate_producer_sha(value: dict[str, Any], proposition_id: str, validator: Any) -> None:
    del proposition_id, validator
    current = value["producer"]["semantic_implementation_sha"]
    replacement = "f" * 40 if current != "f" * 40 else "e" * 40
    value["producer"]["semantic_implementation_sha"] = replacement


def mutate_producer_policy(value: dict[str, Any], proposition_id: str, validator: Any) -> None:
    del proposition_id
    canonical = {
        "id": "matrix-counterfactual-producer-policy",
        "purpose": "dependency-isolation-only",
        "version": "1",
    }
    value["producer"]["policy"] = {
        "canonical": canonical,
        "sha256": validator.sha256_hex(validator.canonical_bytes(canonical)),
    }


def assessment_mutator(slot: str, state: dict[str, Any]) -> Callable[[dict[str, Any], str, Any], None]:
    def apply(value: dict[str, Any], proposition_id: str, validator: Any) -> None:
        del validator
        target_row(value, proposition_id)["assessments"][slot] = copy.deepcopy(state)
    return apply


def mutate_measurement(value: dict[str, Any], proposition_id: str, validator: Any) -> None:
    del validator
    row = target_row(value, proposition_id)
    cid = row["contributions"][0]["contribution_id"]
    if row["measurement"] is None:
        row["measurement"] = {
            "kind": "matrix.synthetic_measurement",
            "value": 1.0,
            "basis_contribution_ids": [cid],
        }
    else:
        row["measurement"] = None


def mutate_terminal_branch(value: dict[str, Any], proposition_id: str, validator: Any) -> None:
    del validator
    row = target_row(value, proposition_id)
    row["conclusion"]["terminal_branch"] = "matrix_alternate_terminal_branch"


def mutate_reported_verdict(value: dict[str, Any], proposition_id: str, validator: Any) -> None:
    del validator
    row = target_row(value, proposition_id)
    row["conclusion"]["reported_verdict"] = "contradicted"


def mutate_contribution_channel(value: dict[str, Any], proposition_id: str, validator: Any) -> None:
    del validator
    row = target_row(value, proposition_id)
    row["contributions"][0]["channel"] = "counterevidence"


def mutate_basis_to_residual(value: dict[str, Any], proposition_id: str, validator: Any) -> None:
    del validator
    row = target_row(value, proposition_id)
    cid = row["contributions"][0]["contribution_id"]
    row["conclusion"]["causal_form"] = "redundant_non_deciding"
    row["conclusion"]["basis_members"] = []
    row["conclusion"]["residual_contribution_ids"] = [cid]


def mutate_not_checkable(value: dict[str, Any], proposition_id: str, validator: Any) -> None:
    del validator
    row = target_row(value, proposition_id)
    row["execution"] = {"state": "completed", "completion": "not_checkable"}
    row["conclusion"]["reported_verdict"] = "not_checkable"
    row["conclusion"]["terminal_branch"] = "matrix_not_checkable"
    row["conclusion"]["causal_form"] = "redundant_non_deciding"
    row["conclusion"]["basis_members"] = []
    row["conclusion"]["residual_contribution_ids"] = [
        item["contribution_id"] for item in row["contributions"]
    ]


def mutate_proposition_incomplete(value: dict[str, Any], proposition_id: str, validator: Any) -> None:
    del validator
    row = target_row(value, proposition_id)
    row["execution"] = {"state": "incomplete"}
    row["conclusion"] = None


def mutate_result_incomplete(value: dict[str, Any], proposition_id: str, validator: Any) -> None:
    del proposition_id, validator
    value["execution"] = {"state": "incomplete"}


MUTATIONS: list[tuple[str, str, Callable[[dict[str, Any], str, Any], None]]] = [
    ("baseline_supported", "NATURAL", lambda value, proposition_id, validator: None),
    ("producer_semantic_identity", "VALID_COUNTERFACTUAL", mutate_producer_sha),
    ("producer_policy_identity", "VALID_COUNTERFACTUAL", mutate_producer_policy),
    (
        "assessment_eligibility_adverse",
        "VALID_COUNTERFACTUAL",
        assessment_mutator("eligibility", {"state": "performed", "value": "adverse"}),
    ),
    (
        "assessment_semantic_validity_adverse",
        "VALID_COUNTERFACTUAL",
        assessment_mutator("semantic_validity", {"state": "performed", "value": "adverse"}),
    ),
    (
        "assessment_aperture_unknown",
        "VALID_COUNTERFACTUAL",
        assessment_mutator("aperture_completeness", {"state": "performed", "value": "unknown"}),
    ),
    (
        "assessment_temporal_failed",
        "VALID_COUNTERFACTUAL",
        assessment_mutator("temporal_applicability", {"state": "failed"}),
    ),
    ("measurement_toggle", "VALID_COUNTERFACTUAL", mutate_measurement),
    ("terminal_branch_identity", "VALID_COUNTERFACTUAL", mutate_terminal_branch),
    ("reported_verdict_contradicted", "VALID_COUNTERFACTUAL", mutate_reported_verdict),
    ("contribution_channel_counterevidence", "VALID_COUNTERFACTUAL", mutate_contribution_channel),
    ("basis_membership_to_residual", "VALID_COUNTERFACTUAL", mutate_basis_to_residual),
    ("proposition_not_checkable", "VALID_COUNTERFACTUAL", mutate_not_checkable),
    ("proposition_execution_incomplete", "VALID_COUNTERFACTUAL", mutate_proposition_incomplete),
    ("result_execution_incomplete", "VALID_COUNTERFACTUAL", mutate_result_incomplete),
]


def build_family(
    *,
    name: str,
    source_path: Path,
    proposition_id: str,
    validator: Any,
    contract_b_index: dict[str, Any],
    out_root: Path,
) -> dict[str, Any]:
    base = load_json(source_path)
    cid = require_supported_single_basis(base, proposition_id)
    if base["input"]["contract_b"] != {
        key: contract_b_index[key] for key in ("contract_version", "bundle_id", "bundle_hash")
    }:
        raise ValueError(f"{name}: Contract C / Contract B index binding mismatch")

    family_out = out_root / name
    family_out.mkdir(parents=True, exist_ok=True)
    rows: list[dict[str, Any]] = []

    for row_name, classification, mutate in MUTATIONS:
        candidate = copy.deepcopy(base)
        mutate(candidate, proposition_id, validator)
        candidate = validator.with_result_set_identity(candidate)
        raw = validator.canonical_bytes(candidate)
        exact_sha = sha256_id(raw)
        errors = validator.validate_contract_c_bytes(
            raw,
            expected_sha256=exact_sha,
            contract_b_index=contract_b_index,
        )
        if errors:
            raise RuntimeError(f"{name}/{row_name} exact validation failed: {'; '.join(errors)}")
        path = family_out / f"{row_name}.json"
        path.write_bytes(raw)
        target = target_row(candidate, proposition_id)
        rows.append(
            {
                "row": row_name,
                "classification": classification,
                "path": str(path),
                "contract_c_sha256": exact_sha,
                "result_set_id": candidate["result_set_id"],
                "target_contribution_id": target["contributions"][0]["contribution_id"]
                if target["contributions"]
                else None,
                "execution": candidate["execution"],
                "proposition_execution": target["execution"],
                "reported_verdict": target["conclusion"]["reported_verdict"]
                if target["conclusion"]
                else None,
            }
        )

    invalid = copy.deepcopy(base)
    invalid["producer"]["policy"]["canonical"] = {"invalid": "hash-not-recomputed"}
    invalid = validator.with_result_set_identity(invalid)
    invalid_raw = validator.canonical_bytes(invalid)
    invalid_sha = sha256_id(invalid_raw)
    invalid_errors = validator.validate_contract_c_bytes(
        invalid_raw,
        expected_sha256=invalid_sha,
        contract_b_index=contract_b_index,
    )
    if not invalid_errors or not any("policy hash mismatch" in item.lower() for item in invalid_errors):
        raise RuntimeError(f"{name}: invalid producer policy hash control did not fail as expected")
    invalid_path = family_out / "invalid_producer_policy_hash.json"
    invalid_path.write_bytes(invalid_raw)

    return {
        "family": name,
        "source_path": str(source_path),
        "proposition_id": proposition_id,
        "natural_contribution_id": cid,
        "rows": rows,
        "invalid_control": {
            "row": "invalid_producer_policy_hash",
            "classification": "INVALID_CONTROL",
            "path": str(invalid_path),
            "contract_c_sha256": invalid_sha,
            "validator_errors": invalid_errors,
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cal-c", type=Path, required=True)
    parser.add_argument("--shadow-c", type=Path, required=True)
    parser.add_argument("--contract-b-index", type=Path, required=True)
    parser.add_argument("--contract-c-root", type=Path, required=True)
    parser.add_argument("--proposition-id", required=True)
    parser.add_argument("--out-dir", type=Path, required=True)
    args = parser.parse_args()

    validator = load_validator(args.contract_c_root.resolve())
    b_index = load_json(args.contract_b_index)
    cal = load_json(args.cal_c)
    shadow = load_json(args.shadow_c)

    if cal["input"]["contract_b"] != shadow["input"]["contract_b"]:
        raise SystemExit("CAL and shadow producer do not bind the same exact Contract B")
    cal_target = target_row(cal, args.proposition_id)
    shadow_target = target_row(shadow, args.proposition_id)
    if cal_target["proposition"] != shadow_target["proposition"]:
        raise SystemExit("CAL and shadow producer do not bind the same exact proposition")

    args.out_dir.mkdir(parents=True, exist_ok=True)
    result = {
        "schema": "cross-producer-policy-dependency-matrix-variants-v1",
        "contract_b": cal["input"]["contract_b"],
        "proposition": cal_target["proposition"],
        "same_exact_contract_b": True,
        "same_exact_proposition": True,
        "normative_noncal_contract_c_conformance_claimed": False,
        "families": [
            build_family(
                name="cal",
                source_path=args.cal_c,
                proposition_id=args.proposition_id,
                validator=validator,
                contract_b_index=b_index,
                out_root=args.out_dir,
            ),
            build_family(
                name="shadow",
                source_path=args.shadow_c,
                proposition_id=args.proposition_id,
                validator=validator,
                contract_b_index=b_index,
                out_root=args.out_dir,
            ),
        ],
    }
    manifest = args.out_dir / "variants-manifest.json"
    manifest.write_bytes(validator.canonical_bytes(result))
    print(json.dumps(result, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
