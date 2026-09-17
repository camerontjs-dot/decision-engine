from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
from pathlib import Path
from typing import Any

import yaml

RECEIPT_ROOT = Path(os.environ["RECEIPT_AUTHORITY_ROOT"]).resolve()
B_CONTROL_ROOT = Path(os.environ["B_CONTROL_ROOT"]).resolve()
OUT = Path(os.environ.get("RC3_OUTPUT_DIR", "build/first-genuine-receipt-authority-rc3")).resolve()

RECEIPT_COMMIT = "93c4f162c0f22a5c2e599fd332160628bc8b2986"
RECEIPT_PATH = "research/first_genuine_b_side_001/PORTABLE_RECEIPT.md"
RECEIPT_BLOB = "31094d3fd0b8b3ce59b02dad08a26688f34234be"
CONTROL_COMMIT = "d03d0e960ad82d889e6763fd4fb53cd24babd187"
CONTROL_PATH = "tests/fixtures/cb/evidence-bundle-minimal"
CONTROL_TREE = "5bcfa0a27877cb7ceebf22cd8960e907f6f92083"

EXPECTED_REAL_B = {
    "contract_version": "1.2.0",
    "bundle_id": "fc459009-fc50-5cc7-a874-0371ce7a3853",
    "bundle_hash": "sha256:8c25ad48cb0a87081088706eed98e53bcb426b6f7f1b944ba776db722a134c80",
}


def git(root: Path, *args: str) -> str:
    return subprocess.check_output(["git", "-C", str(root), *args], text=True).strip()


def sha256_hex(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def parse_receipt(text: str) -> dict[str, Any]:
    match = re.search(
        r"\| Contract B \| `([^`]+)`; bundle `([^`]+)`; bundle hash `([^`]+)` \|",
        text,
    )
    if not match:
        raise AssertionError("portable receipt Contract B row not found")
    labels = []
    for line in text.splitlines():
        if not line.startswith("|") or line.startswith("| ---"):
            continue
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if len(cells) >= 2 and cells[0] != "Object":
            labels.append(cells[0])
    return {
        "contract_b": {
            "contract_version": match.group(1),
            "bundle_id": match.group(2),
            "bundle_hash": match.group(3),
        },
        "identity_table_labels": labels,
        "publication_excludes_raw_packets": (
            "intentionally excludes the source passage, raw Contract A/B/C2/D packets" in text
        ),
        "exposes_source_id_field": "source_id" in text,
        "exposes_passage_id_field": "passage_id" in text,
    }


def receipt_only_identity_check(candidate: dict[str, Any], receipt_b: dict[str, str]) -> bool:
    """Deliberately weak checker constrained to the B fields present in the portable receipt."""
    return candidate.get("contract_b") == receipt_b


def verify_sha256sums(bundle: Path) -> tuple[list[str], list[str]]:
    sums_path = bundle / "SHA256SUMS"
    if not sums_path.is_file():
        raise AssertionError("SHA256SUMS missing")
    checked: list[str] = []
    expected_paths: set[str] = set()
    for raw in sums_path.read_text(encoding="utf-8").splitlines():
        if not raw.strip():
            continue
        digest, rel = raw.split(None, 1)
        rel = rel.strip().lstrip("*")
        target = bundle / rel
        if not target.is_file():
            raise AssertionError(f"SHA256SUMS missing target: {rel}")
        if sha256_hex(target) != digest:
            raise AssertionError(f"SHA256SUMS mismatch: {rel}")
        checked.append(rel)
        expected_paths.add(rel)

    actual_paths = {
        p.relative_to(bundle).as_posix()
        for p in bundle.rglob("*")
        if p.is_file() and p.name != "SHA256SUMS" and p.relative_to(bundle).parts[0] != "deviations"
    }
    if actual_paths != expected_paths:
        raise AssertionError(
            f"SHA256SUMS coverage mismatch: missing={sorted(actual_paths-expected_paths)} extra={sorted(expected_paths-actual_paths)}"
        )
    return checked, sorted(actual_paths)


def derive_fixed_locator(locator: dict[str, str]) -> dict[str, Any]:
    expected = {
        "repository": "camerontjs-dot/claim-audit-lab",
        "commit": CONTROL_COMMIT,
        "path": CONTROL_PATH,
        "tree": CONTROL_TREE,
    }
    if locator != expected:
        raise ValueError("locator identity mismatch")
    if git(B_CONTROL_ROOT, "rev-parse", "HEAD") != CONTROL_COMMIT:
        raise ValueError("control checkout commit mismatch")
    if git(B_CONTROL_ROOT, "rev-parse", f"HEAD:{CONTROL_PATH}") != CONTROL_TREE:
        raise ValueError("control artifact tree mismatch")

    bundle = B_CONTROL_ROOT / CONTROL_PATH
    checked, actual_paths = verify_sha256sums(bundle)
    manifest = yaml.safe_load((bundle / "bundle_manifest.yaml").read_text(encoding="utf-8"))
    contract_version = (bundle / "CONTRACT_VERSION").read_text(encoding="utf-8").strip()

    participants: list[tuple[str, str]] = []
    for path in sorted(bundle.glob("evidence/*/passages/*.yaml")):
        row = yaml.safe_load(path.read_text(encoding="utf-8"))
        participants.append((str(row["source_id"]), str(row["passage_id"])))
    participants = sorted(set(participants))
    if not participants:
        raise AssertionError("control artifact has no participant references")

    return {
        "contract_b": {
            "contract_version": contract_version,
            "bundle_id": str(manifest["bundle_id"]),
            "bundle_hash": str(manifest["bundle"]["bundle_hash"]),
        },
        "participants": participants,
        "checked_sha256sums": checked,
        "all_bound_files": actual_paths,
        "tree": CONTROL_TREE,
    }


def rejects_locator_mutation(base: dict[str, str], field: str, value: str) -> bool:
    mutated = dict(base)
    mutated[field] = value
    try:
        derive_fixed_locator(mutated)
    except ValueError:
        return True
    return False


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)

    assert git(RECEIPT_ROOT, "rev-parse", "HEAD") == RECEIPT_COMMIT
    assert git(RECEIPT_ROOT, "rev-parse", f"HEAD:{RECEIPT_PATH}") == RECEIPT_BLOB
    receipt_text = (RECEIPT_ROOT / RECEIPT_PATH).read_text(encoding="utf-8")
    receipt = parse_receipt(receipt_text)
    assert receipt["contract_b"] == EXPECTED_REAL_B

    identity_labels = set(receipt["identity_table_labels"])
    locator_labels = {
        "Contract B artifact",
        "Contract B locator",
        "Contract B tree",
        "Contract B artifact ID",
        "Contract B participant index",
    }
    receipt_has_b_artifact_locator = bool(identity_labels & locator_labels)
    receipt_has_participant_authority = (
        receipt["exposes_source_id_field"] and receipt["exposes_passage_id_field"]
    )

    receipt_candidate_a = {
        "contract_b": dict(EXPECTED_REAL_B),
        "participant": ["receipt-hidden-source-A", "receipt-hidden-passage-A"],
    }
    receipt_candidate_b = {
        "contract_b": dict(EXPECTED_REAL_B),
        "participant": ["receipt-hidden-source-B", "receipt-hidden-passage-B"],
    }
    receipt_a_passes = receipt_only_identity_check(receipt_candidate_a, EXPECTED_REAL_B)
    receipt_b_passes = receipt_only_identity_check(receipt_candidate_b, EXPECTED_REAL_B)

    fixed_locator = {
        "repository": "camerontjs-dot/claim-audit-lab",
        "commit": CONTROL_COMMIT,
        "path": CONTROL_PATH,
        "tree": CONTROL_TREE,
    }
    derived = derive_fixed_locator(fixed_locator)
    legitimate = tuple(derived["participants"][0])
    source_attack = (legitimate[0] + "-substituted", legitimate[1])
    passage_attack = (legitimate[0], legitimate[1] + "-substituted")
    participant_set = {tuple(row) for row in derived["participants"]}

    locator_baseline_passes = legitimate in participant_set
    locator_source_attack_rejected = source_attack not in participant_set
    locator_passage_attack_rejected = passage_attack not in participant_set
    locator_mutations = {
        "commit": rejects_locator_mutation(fixed_locator, "commit", "0" * 40),
        "path": rejects_locator_mutation(fixed_locator, "path", CONTROL_PATH + "-substituted"),
        "tree": rejects_locator_mutation(fixed_locator, "tree", "0" * 40),
        "repository": rejects_locator_mutation(
            fixed_locator, "repository", "attacker/example"
        ),
    }

    # Weak causal control: if the caller is allowed to supply the authority set itself,
    # a substituted participant becomes authorized by construction. This is not represented
    # as a valid Contract-B artifact; it isolates the trust-anchor selection failure.
    malicious_participant = ("attacker-source", "attacker-passage")
    caller_selected_authority = {malicious_participant}
    weak_caller_authority_accepts_malicious = malicious_participant in caller_selected_authority

    h1_falsified = all(
        [
            receipt["publication_excludes_raw_packets"],
            not receipt_has_b_artifact_locator,
            not receipt_has_participant_authority,
            receipt_a_passes,
            receipt_b_passes,
        ]
    )
    h2_supported = all(
        [
            locator_baseline_passes,
            locator_source_attack_rejected,
            locator_passage_attack_rejected,
            *locator_mutations.values(),
            weak_caller_authority_accepts_malicious,
        ]
    )

    if h1_falsified and h2_supported:
        disposition = "FALSIFIED_RECEIPT_ONLY_AUTHORITY_SUPPORTED_IMMUTABLE_LOCATOR_MECHANISM"
    elif not h2_supported:
        disposition = "FALSIFIED_AUTHORITY_LOCATOR_DIRECTION"
    else:
        disposition = "INCONCLUSIVE_APPARATUS"

    result = {
        "schema": "decision-engine-first-genuine-receipt-authority-rc3-result-v1",
        "disposition": disposition,
        "real_receipt": {
            "commit": RECEIPT_COMMIT,
            "blob": RECEIPT_BLOB,
            "contract_b": receipt["contract_b"],
            "publication_excludes_raw_packets": receipt["publication_excludes_raw_packets"],
            "receipt_has_b_artifact_locator": receipt_has_b_artifact_locator,
            "receipt_has_participant_authority": receipt_has_participant_authority,
            "identity_table_labels": receipt["identity_table_labels"],
            "weak_identity_checker": {
                "variant_a_passes": receipt_a_passes,
                "variant_b_passes": receipt_b_passes,
                "interpretation": "top-level bundle identity alone cannot discriminate hidden participant references",
            },
        },
        "immutable_locator_mechanism_control": {
            "locator": fixed_locator,
            "derived_contract_b": derived["contract_b"],
            "derived_participants": derived["participants"],
            "sha256sums_entries_verified": len(derived["checked_sha256sums"]),
            "baseline_passes": locator_baseline_passes,
            "source_substitution_rejected": locator_source_attack_rejected,
            "passage_substitution_rejected": locator_passage_attack_rejected,
            "locator_mutations_rejected": locator_mutations,
            "weak_caller_selected_authority_accepts_malicious": weak_caller_authority_accepts_malicious,
        },
        "h1_receipt_only_falsified": h1_falsified,
        "h2_immutable_locator_supported_as_mechanism": h2_supported,
        "nonclaims": [
            "The synthetic receipt-only variants are not represented as valid first-genuine C2 objects.",
            "The fixture locator is a mechanism control, not the real first-genuine Contract-B artifact.",
            "This result does not establish a durable locator for the private first-genuine artifact.",
            "This result does not test the separately observed trusted-bundle-commitment plus presented-artifact hypothesis.",
        ],
    }
    (OUT / "RESULT.json").write_text(json.dumps(result, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(result, sort_keys=True))

    if disposition != "FALSIFIED_RECEIPT_ONLY_AUTHORITY_SUPPORTED_IMMUTABLE_LOCATOR_MECHANISM":
        raise SystemExit(2)


if __name__ == "__main__":
    main()
