from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Any

import yaml

POLICY_CANONICAL = {
    "ambiguity": "not_checkable",
    "id": "same-contract-b-exact-text-shadow",
    "match_rule": "exact UTF-8 proposition text equals exactly one retained evidence passage text",
    "no_match": "not_checkable",
    "version": "0.1.0",
}


def sha256_hex(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def load_yaml(path: Path) -> dict[str, Any]:
    value = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"expected YAML object: {path}")
    return value


def load_bundle(bundle_dir: Path) -> tuple[dict[str, Any], list[dict[str, Any]], dict[str, dict[str, Any]]]:
    manifest = load_yaml(bundle_dir / "bundle_manifest.yaml")
    claims = [load_yaml(path) for path in sorted((bundle_dir / "claims").glob("*.yaml"))]
    passages: dict[str, dict[str, Any]] = {}
    for path in sorted((bundle_dir / "evidence").glob("*/passages/*.yaml")):
        row = load_yaml(path)
        passage_id = str(row["passage_id"])
        if passage_id in passages:
            raise ValueError(f"duplicate passage id in Contract B: {passage_id}")
        passages[passage_id] = row
    if not claims or not passages:
        raise ValueError("Contract B bundle must contain claims and passages")
    return manifest, claims, passages


def contract_b_binding(bundle_dir: Path, manifest: dict[str, Any]) -> dict[str, str]:
    return {
        "contract_version": (bundle_dir / "CONTRACT_VERSION").read_text(encoding="utf-8").strip(),
        "bundle_id": str(manifest["bundle_id"]),
        "bundle_hash": str(manifest["bundle"]["bundle_hash"]),
    }


def build_contract_b_index(
    binding: dict[str, str], claims: list[dict[str, Any]], passages: dict[str, dict[str, Any]]
) -> dict[str, Any]:
    propositions = {
        str(claim["claim_id"]): sha256_hex(str(claim["claim_text"]).encode("utf-8"))
        for claim in claims
    }
    passage_index = {
        passage_id: {
            "source_id": str(row["source_id"]),
            "passage_sha256": str(row["passage_hash"]),
        }
        for passage_id, row in passages.items()
    }
    return {
        **binding,
        "propositions": dict(sorted(propositions.items())),
        "passages": dict(sorted(passage_index.items())),
    }


def contribution_id(
    *, proposition_id: str, channel: str, evidence_ref: dict[str, str], policy_sha: str
) -> str:
    payload = {
        "channel": channel,
        "evidence_ref": evidence_ref,
        "policy_sha256": policy_sha,
        "proposition_id": proposition_id,
    }
    raw = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return "contribution:" + sha256_hex(raw)


def proposition_result(
    claim: dict[str, Any], passages: dict[str, dict[str, Any]], policy_sha: str
) -> dict[str, Any]:
    claim_id = str(claim["claim_id"])
    claim_text = str(claim["claim_text"])
    proposition = {
        "proposition_id": claim_id,
        "text_sha256": sha256_hex(claim_text.encode("utf-8")),
    }
    assessments = {
        "eligibility": {"state": "not_performed"},
        "semantic_validity": {"state": "not_performed"},
        "aperture_completeness": {"state": "not_performed"},
        "temporal_applicability": {"state": "not_performed"},
    }

    exact_matches: list[dict[str, Any]] = []
    for candidate in claim.get("evidence_passages", []):
        passage_id = str(candidate["passage_id"])
        row = passages.get(passage_id)
        if row is None:
            raise ValueError(f"claim references missing Contract B passage: {passage_id}")
        if str(row["passage_text"]) == claim_text:
            exact_matches.append(row)

    if len(exact_matches) != 1:
        branch = (
            "shadow_exact_text_no_match"
            if len(exact_matches) == 0
            else "shadow_exact_text_ambiguous_multiple_matches"
        )
        return {
            "proposition": proposition,
            "execution": {"state": "completed", "completion": "not_checkable"},
            "assessments": assessments,
            "contributions": [],
            "measurement": None,
            "conclusion": {
                "reported_verdict": "not_checkable",
                "terminal_branch": branch,
                "causal_form": "redundant_non_deciding",
                "basis_members": [],
                "residual_contribution_ids": [],
                "rule_roles": [],
            },
        }

    match = exact_matches[0]
    evidence_ref = {
        "source_id": str(match["source_id"]),
        "passage_id": str(match["passage_id"]),
        "passage_sha256": str(match["passage_hash"]),
    }
    cid = contribution_id(
        proposition_id=claim_id,
        channel="support",
        evidence_ref=evidence_ref,
        policy_sha=policy_sha,
    )
    return {
        "proposition": proposition,
        "execution": {"state": "completed", "completion": "assessed"},
        "assessments": assessments,
        "contributions": [
            {
                "contribution_id": cid,
                "channel": "support",
                "evidence_ref": evidence_ref,
            }
        ],
        "measurement": None,
        "conclusion": {
            "reported_verdict": "supported",
            "terminal_branch": "shadow_exact_text_single_match",
            "causal_form": "single_necessary",
            "basis_members": [{"namespace": "contribution", "id": cid}],
            "residual_contribution_ids": [],
            "rule_roles": [],
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--bundle", type=Path, required=True)
    parser.add_argument("--contract-c-root", type=Path, required=True)
    parser.add_argument("--semantic-implementation-sha", required=True)
    parser.add_argument("--proposition-id", required=True)
    parser.add_argument("--out-dir", type=Path, required=True)
    args = parser.parse_args()

    if not re.fullmatch(r"[0-9a-f]{40}", args.semantic_implementation_sha):
        raise SystemExit("--semantic-implementation-sha must be 40 lowercase hex")

    sys.path.insert(0, str(args.contract_c_root.resolve()))
    from validators.contract_c import (  # type: ignore[import-not-found]
        canonical_bytes,
        validate_contract_c_bytes,
        with_result_set_identity,
    )

    manifest, claims, passages = load_bundle(args.bundle)
    matching_claims = [row for row in claims if str(row["claim_id"]) == args.proposition_id]
    if len(matching_claims) != 1:
        raise SystemExit(f"expected exactly one Contract B claim for {args.proposition_id}")

    binding = contract_b_binding(args.bundle, manifest)
    b_index = build_contract_b_index(binding, claims, passages)
    policy_sha = sha256_hex(canonical_bytes(POLICY_CANONICAL))
    result = proposition_result(matching_claims[0], passages, policy_sha)

    value = with_result_set_identity(
        {
            "contract_c_version": "1.0.0",
            "input": {"contract_b": binding},
            "producer": {
                "semantic_implementation_sha": args.semantic_implementation_sha,
                "policy": {"sha256": policy_sha, "canonical": POLICY_CANONICAL},
            },
            "execution": {"state": "completed"},
            "propositions": [result],
        }
    )
    raw = canonical_bytes(value)
    expected_sha = "sha256:" + sha256_hex(raw)
    errors = validate_contract_c_bytes(raw, expected_sha256=expected_sha, contract_b_index=b_index)
    if errors:
        raise SystemExit("Contract C structural/reference validation failed: " + "; ".join(errors))

    args.out_dir.mkdir(parents=True, exist_ok=True)
    (args.out_dir / "contract-c.json").write_bytes(raw)
    (args.out_dir / "contract-c.sha256").write_text(expected_sha + "\n", encoding="utf-8")
    (args.out_dir / "contract-b-index.json").write_bytes(canonical_bytes(b_index))
    (args.out_dir / "expected-contract-b.json").write_bytes(canonical_bytes(binding))

    summary = {
        "status": "PASS",
        "classification": "research_structural_shadow_not_normative_contract_c_producer",
        "producer": "same-contract-b-exact-text-shadow@0.1.0",
        "semantic_implementation_sha": args.semantic_implementation_sha,
        "contract_b": binding,
        "proposition_id": args.proposition_id,
        "contract_c_sha256": expected_sha,
        "contract_c_validator_acceptance": True,
        "normative_contract_c_1_0_producer_conformance_claimed": False,
        "cal_imported": False,
        "cal_artifact_consumed": False,
        "evaluator_gold_consumed": False,
        "result": {
            "execution": result["execution"],
            "verdict": result["conclusion"]["reported_verdict"],
            "contribution_ids": [row["contribution_id"] for row in result["contributions"]],
        },
    }
    (args.out_dir / "producer-summary.json").write_bytes(canonical_bytes(summary))
    print(json.dumps(summary, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
