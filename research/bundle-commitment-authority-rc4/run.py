from __future__ import annotations

import hashlib
import json
import os
import shutil
import subprocess
from pathlib import Path
from typing import Any

import yaml

EB_ROOT = Path(os.environ["EB_AUTHORITY_ROOT"]).resolve()
B_ROOT = Path(os.environ["B_CONTROL_ROOT"]).resolve()
OUT = Path(os.environ.get("RC4_OUTPUT_DIR", "build/bundle-commitment-authority-rc4")).resolve()

EB_COMMIT = "4e1f6fe00e7c350b28f52bfea14f1f8988847884"
HASHING_PATH = "src/evidence_bundler/contracts/hashing.py"
HASHING_BLOB = "7722ca0d94260b60de0bf81003ff992a789b9cd7"
B_COMMIT = "d03d0e960ad82d889e6763fd4fb53cd24babd187"
B_PATH = "tests/fixtures/cb/evidence-bundle-minimal"
B_TREE = "5bcfa0a27877cb7ceebf22cd8960e907f6f92083"
PENDING = "sha256:pending"


def git(root: Path, *args: str) -> str:
    return subprocess.check_output(["git", "-C", str(root), *args], text=True).strip()


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def yaml_string(data: dict[str, Any]) -> str:
    return yaml.safe_dump(
        data,
        allow_unicode=True,
        default_flow_style=False,
        indent=2,
        sort_keys=False,
    )


def iter_bound_files(root: Path) -> list[Path]:
    rows: list[Path] = []
    for path in root.rglob("*"):
        if not path.is_file() or path.name == "SHA256SUMS":
            continue
        parts = path.relative_to(root).parts
        if parts and parts[0] == "deviations":
            continue
        rows.append(path)
    return sorted(rows)


def normalized_special_digest(path: Path, rel: str) -> str:
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise AssertionError(f"{rel} is not mapping")
    if rel == "audit_config.yaml":
        data["config_hash"] = PENDING
    elif rel == "bundle_manifest.yaml":
        data["bundle"]["bundle_hash"] = PENDING
    else:
        raise AssertionError(rel)
    return sha256_hex(yaml_string(data).encode("utf-8"))


def independent_bundle_hash(root: Path) -> str:
    hasher = hashlib.sha256()
    for path in iter_bound_files(root):
        rel = path.relative_to(root).as_posix()
        if rel in {"audit_config.yaml", "bundle_manifest.yaml"}:
            digest = normalized_special_digest(path, rel)
        else:
            digest = sha256_hex(path.read_bytes())
        hasher.update(f"{rel}\0{digest}\n".encode())
    return f"sha256:{hasher.hexdigest()}"


def load_manifest(root: Path) -> dict[str, Any]:
    value = yaml.safe_load((root / "bundle_manifest.yaml").read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise AssertionError("manifest not mapping")
    return value


def derive_participants(root: Path) -> list[tuple[str, str]]:
    rows: list[tuple[str, str]] = []
    for path in sorted(root.glob("evidence/*/passages/*.yaml")):
        value = yaml.safe_load(path.read_text(encoding="utf-8"))
        rows.append((str(value["source_id"]), str(value["passage_id"])))
    return sorted(set(rows))


def import_eb_helpers():
    import sys

    sys.path.insert(0, str(EB_ROOT / "src"))
    from evidence_bundler.contracts.hashing import (  # type: ignore
        compute_bundle_tree_hash,
        verify_sha256sums,
        write_sha256sums,
    )
    from evidence_bundler.contracts.writer import validate_bundle_tree  # type: ignore

    return compute_bundle_tree_hash, verify_sha256sums, write_sha256sums, validate_bundle_tree


def commitment_from_artifact(root: Path, compute_bundle_tree_hash) -> dict[str, str]:
    manifest = load_manifest(root)
    return {
        "contract_version": (root / "CONTRACT_VERSION").read_text(encoding="utf-8").strip(),
        "bundle_id": str(manifest["bundle_id"]),
        "bundle_hash": str(compute_bundle_tree_hash(root)),
    }


def verify_presented_artifact(
    root: Path,
    external_commitment: dict[str, str],
    *,
    compute_bundle_tree_hash,
    verify_sha256sums,
) -> dict[str, Any]:
    producer_hash = str(compute_bundle_tree_hash(root))
    independent_hash = independent_bundle_hash(root)
    if producer_hash != independent_hash:
        raise RuntimeError(f"hash algorithm divergence: producer={producer_hash} independent={independent_hash}")

    manifest = load_manifest(root)
    internal = {
        "contract_version": (root / "CONTRACT_VERSION").read_text(encoding="utf-8").strip(),
        "bundle_id": str(manifest["bundle_id"]),
        "bundle_hash": str(manifest["bundle"]["bundle_hash"]),
    }
    recomputed = {
        "contract_version": internal["contract_version"],
        "bundle_id": internal["bundle_id"],
        "bundle_hash": producer_hash,
    }
    if internal != recomputed:
        raise ValueError("presented artifact internal commitment does not match recomputed bytes")
    if recomputed != external_commitment:
        raise ValueError("presented artifact does not open the independently selected external commitment")
    sums_errors = list(verify_sha256sums(root))
    if sums_errors:
        raise ValueError("SHA256SUMS failed: " + "; ".join(sums_errors))
    participants = derive_participants(root)
    if not participants:
        raise ValueError("no participant references after commitment verification")
    return {
        "producer_hash": producer_hash,
        "independent_hash": independent_hash,
        "participants": participants,
        "internal": internal,
    }


def replace_ids_and_rename(root: Path, old_source: str, old_passage: str, new_source: str, new_passage: str) -> None:
    for path in sorted(root.rglob("*.yaml")):
        text = path.read_text(encoding="utf-8")
        text = text.replace(old_source, new_source).replace(old_passage, new_passage)
        path.write_text(text, encoding="utf-8")

    old_source_dir = root / "evidence" / old_source
    new_source_dir = root / "evidence" / new_source
    if old_source_dir.exists():
        old_source_dir.rename(new_source_dir)
    old_passage_file = new_source_dir / "passages" / f"{old_passage}.yaml"
    new_passage_file = new_source_dir / "passages" / f"{new_passage}.yaml"
    if old_passage_file.exists():
        old_passage_file.rename(new_passage_file)


def reseal_artifact(root: Path, compute_bundle_tree_hash, write_sha256sums) -> dict[str, str]:
    manifest_path = root / "bundle_manifest.yaml"
    manifest = load_manifest(root)
    manifest["bundle"]["bundle_hash"] = PENDING
    manifest_path.write_text(yaml_string(manifest), encoding="utf-8")
    new_hash = str(compute_bundle_tree_hash(root))
    manifest["bundle"]["bundle_hash"] = new_hash
    manifest_path.write_text(yaml_string(manifest), encoding="utf-8")
    write_sha256sums(root)
    return {
        "contract_version": (root / "CONTRACT_VERSION").read_text(encoding="utf-8").strip(),
        "bundle_id": str(manifest["bundle_id"]),
        "bundle_hash": new_hash,
    }


def rejection(root: Path, commitment: dict[str, str], helpers) -> tuple[bool, str]:
    compute_bundle_tree_hash, verify_sha256sums, _, _ = helpers
    try:
        verify_presented_artifact(
            root,
            commitment,
            compute_bundle_tree_hash=compute_bundle_tree_hash,
            verify_sha256sums=verify_sha256sums,
        )
    except (ValueError, RuntimeError) as exc:
        return True, str(exc)
    return False, "accepted"


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    assert git(EB_ROOT, "rev-parse", "HEAD") == EB_COMMIT
    assert git(EB_ROOT, "rev-parse", f"HEAD:{HASHING_PATH}") == HASHING_BLOB
    assert git(B_ROOT, "rev-parse", "HEAD") == B_COMMIT
    assert git(B_ROOT, "rev-parse", f"HEAD:{B_PATH}") == B_TREE

    helpers = import_eb_helpers()
    compute_bundle_tree_hash, verify_sha256sums, write_sha256sums, validate_bundle_tree = helpers

    source = B_ROOT / B_PATH
    baseline_a = OUT / "presented-baseline-a"
    baseline_b = OUT / "different-location" / "presented-baseline-b"
    stale = OUT / "stale-participant-tamper"
    attacker = OUT / "resealed-attacker-world"
    for target in (baseline_a, baseline_b, stale, attacker):
        if target.exists():
            shutil.rmtree(target)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copytree(source, target)

    trusted_commitment = commitment_from_artifact(source, compute_bundle_tree_hash)
    baseline_manifest = load_manifest(source)
    assert trusted_commitment["bundle_hash"] == str(baseline_manifest["bundle"]["bundle_hash"])

    baseline_one = verify_presented_artifact(
        baseline_a,
        trusted_commitment,
        compute_bundle_tree_hash=compute_bundle_tree_hash,
        verify_sha256sums=verify_sha256sums,
    )
    baseline_two = verify_presented_artifact(
        baseline_b,
        trusted_commitment,
        compute_bundle_tree_hash=compute_bundle_tree_hash,
        verify_sha256sums=verify_sha256sums,
    )
    if baseline_one["producer_hash"] != baseline_two["producer_hash"]:
        raise RuntimeError("path relocation changed bundle commitment")

    original_participant = tuple(baseline_one["participants"][0])
    stale_passage = next(iter(sorted(stale.glob("evidence/*/passages/*.yaml"))))
    stale_text = stale_passage.read_text(encoding="utf-8")
    stale_passage.write_text(
        stale_text.replace(original_participant[1], original_participant[1] + "-tampered"),
        encoding="utf-8",
    )
    stale_rejected, stale_reason = rejection(stale, trusted_commitment, helpers)

    attacker_source = original_participant[0] + "-attacker"
    attacker_passage = original_participant[1] + "-attacker"
    replace_ids_and_rename(
        attacker,
        original_participant[0],
        original_participant[1],
        attacker_source,
        attacker_passage,
    )
    attacker_commitment = reseal_artifact(attacker, compute_bundle_tree_hash, write_sha256sums)
    attacker_validation_errors = list(validate_bundle_tree(attacker))
    attacker_producer_hash = str(compute_bundle_tree_hash(attacker))
    attacker_independent_hash = independent_bundle_hash(attacker)
    if attacker_producer_hash != attacker_independent_hash:
        raise RuntimeError("hash algorithm divergence on resealed attacker artifact")
    if attacker_validation_errors:
        raise AssertionError("resealed attacker artifact did not validate: " + "; ".join(attacker_validation_errors))

    resealed_against_original_rejected, resealed_original_reason = rejection(
        attacker, trusted_commitment, helpers
    )
    weak_moving_commitment_result = verify_presented_artifact(
        attacker,
        attacker_commitment,
        compute_bundle_tree_hash=compute_bundle_tree_hash,
        verify_sha256sums=verify_sha256sums,
    )
    malicious_participant = (attacker_source, attacker_passage)
    weak_moving_commitment_accepts_malicious = malicious_participant in {
        tuple(row) for row in weak_moving_commitment_result["participants"]
    }

    accepted = all(
        [
            baseline_one["producer_hash"] == trusted_commitment["bundle_hash"],
            baseline_two["producer_hash"] == trusted_commitment["bundle_hash"],
            baseline_one["producer_hash"] == baseline_one["independent_hash"],
            stale_rejected,
            resealed_against_original_rejected,
            attacker_commitment["bundle_hash"] != trusted_commitment["bundle_hash"],
            weak_moving_commitment_accepts_malicious,
        ]
    )
    disposition = (
        "SUPPORTED_TRUSTED_BUNDLE_COMMITMENT_PLUS_PRESENTED_ARTIFACT"
        if accepted
        else "FALSIFIED_BUNDLE_COMMITMENT_AUTHORITY"
    )

    result = {
        "schema": "decision-engine-bundle-commitment-authority-rc4-result-v1",
        "disposition": disposition,
        "authorities": {
            "evidence_bundler_commit": EB_COMMIT,
            "hashing_blob": HASHING_BLOB,
            "contract_b_control_commit": B_COMMIT,
            "contract_b_control_tree": B_TREE,
        },
        "trusted_commitment": trusted_commitment,
        "baseline": {
            "participants": baseline_one["participants"],
            "producer_hash": baseline_one["producer_hash"],
            "independent_reproducer_hash": baseline_one["independent_hash"],
            "arbitrary_location_a_passed": True,
            "arbitrary_location_b_passed": True,
        },
        "stale_participant_tamper": {
            "rejected": stale_rejected,
            "reason": stale_reason,
        },
        "resealed_attacker_world": {
            "participant": list(malicious_participant),
            "internal_validation_errors": attacker_validation_errors,
            "producer_hash": attacker_producer_hash,
            "independent_reproducer_hash": attacker_independent_hash,
            "resealed_commitment": attacker_commitment,
            "rejected_against_original_external_commitment": resealed_against_original_rejected,
            "original_rejection_reason": resealed_original_reason,
            "accepted_when_external_commitment_moves_with_attacker": weak_moving_commitment_accepts_malicious,
        },
        "interpretation": {
            "locator_required_for_integrity": False,
            "presented_artifact_may_be_untrusted_transport": True,
            "external_commitment_selection_must_be_trusted": True,
            "participant_index_is_derived_only_after_commitment_verification": True,
        },
        "nonclaims": [
            "The private first-genuine raw Contract-B artifact was not available and was not tested.",
            "The mechanism-control artifact declares Contract B 1.0.0; Contract B 1.2 specifies its extension as included in the same bundle-tree hash, but an exact first-genuine 1.2 raw packet remains to be tested.",
            "This is not an independent clean-room consumer reproduction.",
            "This does not establish how a runtime independently selects the correct run receipt/commitment.",
        ],
    }
    (OUT / "RESULT.json").write_text(json.dumps(result, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(result, sort_keys=True))
    if disposition != "SUPPORTED_TRUSTED_BUNDLE_COMMITMENT_PLUS_PRESENTED_ARTIFACT":
        raise SystemExit(2)


if __name__ == "__main__":
    main()
