"""Generate exact-byte receipts using the pinned Apparatus Contract C validator."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
from pathlib import Path

AUTHORITY = {
    "repository": "camerontjs-dot/apparatus-contracts",
    "main_sha": "00bdf9546a877f9f6c1d7fd227fd959e1d7aa99e",
    "release_tag": "contract-c-v1.0.0",
    "release_commit": "5fe55f9ed5d0ee9f026ca1b077e9d70ce0487ea1",
    "contract_c_version": "1.0.0",
    "validator_blob_sha": "9c75ccfbf2223578a8d1a7bf0c39673b394fbea4",
}


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("input_dir", type=Path)
    parser.add_argument("output_dir", type=Path)
    parser.add_argument("--index-dir", type=Path)
    args = parser.parse_args()

    authority_root = Path(os.environ["CONTRACT_C_AUTHORITY_ROOT"]).resolve()
    sys.path.insert(0, str(authority_root))
    from validators.contract_c import (  # type: ignore[import-not-found]
        canonical_bytes,
        parse_json_bytes,
        validate_contract_c_bytes,
    )

    args.output_dir.mkdir(parents=True, exist_ok=True)
    manifest: list[dict[str, object]] = []

    for path in sorted(args.input_dir.glob("*.json")):
        if path.name == "MANIFEST.json" or path.name.endswith(".contract-b-index.json"):
            continue
        raw = path.read_bytes()
        index = None
        index_path = None
        if args.index_dir is not None:
            candidate = args.index_dir / f"{path.stem}.contract-b-index.json"
            if candidate.exists():
                index_path = candidate
                index = parse_json_bytes(candidate.read_bytes())

        errors = validate_contract_c_bytes(raw, contract_b_index=index)
        canonical_sha = None
        result_set_id = None
        try:
            parsed = parse_json_bytes(raw)
            canonical_sha = sha256(canonical_bytes(parsed))
            result_set_id = parsed.get("result_set_id")
        except ValueError:
            pass

        receipt = {
            "receipt_version": "contract-c-exact-byte-validation-receipt-rc1",
            "authority": AUTHORITY,
            "valid": not errors,
            "object_sha256": sha256(raw),
            "canonical_sha256": canonical_sha,
            "result_set_id": result_set_id,
            "contract_b_index_sha256": sha256(index_path.read_bytes()) if index_path else None,
            "errors": errors,
        }
        out = args.output_dir / f"{path.stem}.receipt.json"
        out.write_text(json.dumps(receipt, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        manifest.append(
            {
                "object": path.name,
                "receipt": out.name,
                "valid": receipt["valid"],
                "object_sha256": receipt["object_sha256"],
                "result_set_id": result_set_id,
                "contract_b_index": index_path.name if index_path else None,
            }
        )

    (args.output_dir / "MANIFEST.json").write_text(
        json.dumps({"authority": AUTHORITY, "rows": manifest}, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
