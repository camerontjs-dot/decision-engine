from __future__ import annotations

import copy
import hashlib
import importlib
import importlib.util
import json
import os
import sys
from pathlib import Path
from typing import Any

FIXTURE_ROOT = Path(os.environ["FIXTURE_ROOT"]).resolve()
CONTRACT_C_ROOT = Path(os.environ["CONTRACT_C_ROOT"]).resolve()
RC2_ROOT = Path(os.environ["RC2_ROOT"]).resolve()
OUT = Path(os.environ["ATTACK_ROOT"]).resolve()


def load_candidate() -> Any:
    path = (
        CONTRACT_C_ROOT
        / "research/contract_c_cal_v1_parent_recomposition_rc0_20260919/candidate_rc0.py"
    )
    spec = importlib.util.spec_from_file_location("de_prod_contract_c_candidate", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def tagged(raw: bytes) -> str:
    return "sha256:" + hashlib.sha256(raw).hexdigest()


def main() -> None:
    sys.path.insert(0, str(RC2_ROOT))
    rc2 = importlib.import_module("validators.contract_c_rc2")
    candidate = load_candidate()
    base = json.loads((FIXTURE_ROOT / "PIPE01" / "contract-c.json").read_text())
    OUT.mkdir(parents=True, exist_ok=True)
    manifest: dict[str, Any] = {}

    mutations = {
        "stale_receipt_coherent_reseal": lambda x: x["recomposition"].__setitem__(
            "decomposition_receipt_id", "0" * 64
        ),
        "native_child_substitution_coherent_reseal": lambda x: x["recomposition"][
            "ordered_children"
        ][0].__setitem__("native_result_sha256", "sha256:" + "1" * 64),
    }
    for name, mutate in mutations.items():
        value = copy.deepcopy(base)
        mutate(value)
        value.pop("result_set_id", None)
        resealed = candidate.seal(value)
        candidate.validate_object(resealed, rc2_validator=rc2)
        raw = candidate.canonical_bytes(resealed, rc2_validator=rc2)
        path = OUT / f"{name}.json"
        path.write_bytes(raw)
        manifest[name] = {
            "path": path.name,
            "whole_object_sha256": tagged(raw),
            "result_set_id": resealed["result_set_id"],
        }

    (OUT / "MANIFEST.json").write_text(
        json.dumps(manifest, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(manifest, sort_keys=True))


if __name__ == "__main__":
    main()
