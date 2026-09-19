from __future__ import annotations

import base64
import importlib.util
import json
import os
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
APPARATUS_ROOT = Path(os.environ["APPARATUS_ROOT"]).resolve()
CAL_ROOT = Path(os.environ["CAL_ROOT"]).resolve()
EB_ROOT = Path(os.environ["EB_ROOT"]).resolve()
C2_ROOT = Path(os.environ["C2_ROOT"]).resolve()
RESOLVER_JSON = Path(os.environ["RESOLVER_JSON"]).resolve()
CONSUMER_ROOT = Path(os.environ["CONSUMER_ROOT"]).resolve()

EXPECTED_WHOLE = {
    "PIPE01": "sha256:a0e2f77b48a9a9fe8347df345e5f112cfe76bde19cc82986c2efaccf90730524",
    "PIPE02": "sha256:f2a1c54ea5e7eb9aaeca256d035247b79b563d3a4dbb19fd580362d2065a6e24",
    "PIPE03": "sha256:bfad4513810c30ab7e17c2dd6779a04e19733c3e297a58374d646d7a912b7eff",
    "PIPE04": "sha256:0e9f6e028685e5ed5e739e71cc78e88058aeb47734db284322240e2de8ca1304",
}


def load_module(path: Path, name: str) -> Any:
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"unable to load module: {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


producer = load_module(
    APPARATUS_ROOT
    / "research"
    / "contract_c_cal_v1_parent_recomposition_rc0_20260919"
    / "evaluate.py",
    "frozen_parent_bound_producer",
)
consumer = load_module(
    CONSUMER_ROOT / "candidate" / "consumer.py",
    "frozen_parent_bound_consumer",
)
integration = producer._load_integration_module()


def contract_b_index(result: dict[str, Any], outer: dict[str, Any]) -> dict[str, Any]:
    inner = outer["rc2_result"]
    propositions = {
        row["proposition"]["proposition_id"]: {
            "content_sha256": row["proposition"]["content_sha256"]
        }
        for row in inner["propositions"]
    }
    passages: list[dict[str, str]] = []
    seen: set[tuple[str, str]] = set()
    for row in result["package"]["candidates"]:
        key = (str(row["source_id"]), str(row["passage_id"]))
        if key not in seen:
            seen.add(key)
            passages.append({"source_id": key[0], "passage_id": key[1]})
    return {**inner["contract_b"], "propositions": propositions, "passages": passages}


def decomposition_input(contract_a: dict[str, Any]) -> dict[str, Any]:
    root = contract_a["root_proposition"]
    decomposition = contract_a["decomposition"]
    return {
        "state": decomposition["state"],
        "decomposition_id": decomposition["decomposition_id"],
        "operator": decomposition["operator"],
        "root": {
            "proposition_id": root["proposition_id"],
            "text_sha256": root["text_sha256"],
        },
        "children": [
            {
                "sequence": row["sequence"],
                "proposition_id": row["proposition_id"],
                "text_sha256": row["text_sha256"],
            }
            for row in decomposition["children"]
        ],
    }


def authority(whole: str) -> dict[str, str]:
    return {
        "profile": producer.rc2.PROFILE,
        "cal_freeze_commit": producer.candidate.CAL_FREEZE_COMMIT,
        "cal_semantic_source_commit": producer.candidate.CAL_SEMANTIC_SOURCE_COMMIT,
        "semantic_implementation_sha": producer.candidate.CAL_SEMANTIC_IMPLEMENTATION,
        "policy_sha256": producer.candidate.POLICY_SHA256,
        "policy_resolver_commit_sha": producer.candidate.POLICY_RESOLVER_COMMIT,
        "whole_object_sha256": whole,
    }


def native_results(result: dict[str, Any]) -> dict[str, bytes]:
    return {
        str(result["c1"].proposition_id): result["c1_bytes"],
        str(result["c2"].proposition_id): result["c2_bytes"],
    }


def main() -> None:
    out = Path(sys.argv[1]).resolve()
    out.mkdir(parents=True, exist_ok=True)
    resolver = json.loads(RESOLVER_JSON.read_text(encoding="utf-8"))
    manifest: dict[str, Any] = {
        "schema": "contract-c-parent-bound-de-qualification-fixtures-v1",
        "cases": {},
    }

    for case_spec in integration.CASES:
        case_id = case_spec.case_id
        result = integration._execute_case(case_spec, out / "cal-runs")
        outer, _ = producer._build_case(result, resolver)
        raw = producer.candidate.canonical_bytes(outer, rc2_validator=producer.rc2)
        whole = producer.candidate.whole_object_sha256(outer, rc2_validator=producer.rc2)
        if whole != EXPECTED_WHOLE[case_id]:
            raise RuntimeError(f"{case_id}: whole-object authority drift: {whole}")

        index = contract_b_index(result, outer)
        decomposition = decomposition_input(result["contract_a"])
        natives = native_results(result)
        expected_authority = authority(whole)

        normalized = consumer.consume_parent_bound_contract_c(
            raw,
            contract_b_index=index,
            expected_authority=expected_authority,
            contract_a_decomposition=decomposition,
            native_child_results=natives,
        )

        case_dir = out / case_id
        case_dir.mkdir(parents=True, exist_ok=True)
        (case_dir / "contract-c.json").write_bytes(raw)
        payload = {
            "contract_b_index": index,
            "expected_authority": expected_authority,
            "contract_a_decomposition": decomposition,
            "native_child_results_b64": {
                key: base64.b64encode(value).decode("ascii")
                for key, value in natives.items()
            },
        }
        (case_dir / "consumer-inputs.json").write_text(
            json.dumps(payload, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )
        (case_dir / "validated.json").write_text(
            json.dumps(normalized, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )
        manifest["cases"][case_id] = {
            "whole_object_sha256": whole,
            "expected_parent": result["parent"].conclusion.value,
            "root": decomposition["root"],
            "contract_b": outer["rc2_result"]["contract_b"],
        }

    (out / "MANIFEST.json").write_text(
        json.dumps(manifest, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
