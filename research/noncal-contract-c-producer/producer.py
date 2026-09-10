from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Any

import yaml

ATOMIC_LATENCY = re.compile(
    r"^(?P<entity>.+?) median alert latency is (?P<value>[0-9]+(?:\.[0-9]+)?) ms\.$"
)

POLICY_CANONICAL = {
    "ambiguity": "not_checkable",
    "grammar": "<entity> median alert latency is <number> ms.",
    "id": "independent-contract-b-exact-numeric-fact",
    "match_rule": "same entity + literal metric phrase + exact numeric equality",
    "nonmatching_grammar": "not_checkable",
    "unit": "ms",
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
    contract_version = (bundle_dir / "CONTRACT_VERSION").read_text(encoding="utf-8").strip()
    return {
        "contract_version": contract_version,
        "bundle_id": str(manifest["bundle_id"]),
        "bundle_hash": str(manifest["bundle"]["bundle_hash"]),
    }


def build_contract_b_index(
    binding: dict[str, str], claims: list[dict[str, Any]], passages: dict[str, dict[str, Any]]
) -> dict[str, Any]:
    propositions: dict[str, str] = {}
    for claim in claims:
        claim_id = str(claim["claim_id"])
        claim_text = str(claim["claim_text"])
        propositions[claim_id] = sha256_hex(claim_text.encode("utf-8"))

    passage_index: dict[str, dict[str, str]] = {}
    for passage_id, row in passages.items():
        passage_index[passage_id] = {
            "source_id": str(row["source_id"]),
            "passage_sha256": str(row["passage_hash"]),
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


def semantic_match(
    claim: dict[str, Any], passage_records: dict[str, dict[str, Any]]
) -> list[dict[str, Any]] | None:
    claim_text = str(claim["claim_text"])
    parsed = ATOMIC_LATENCY.fullmatch(claim_text)
    if parsed is None:
        return None

    entity = parsed.group("entity")
    expected = float(parsed.group("value"))
    passage_pattern = re.compile(
        re.escape(entity) + r" median alert latency of (?P<value>[0-9]+(?:\.[0-9]+)?) ms\.",
        re.IGNORECASE,
    )

    matches: list[dict[str, Any]] = []
    for candidate in claim.get("evidence_passages", []):
        passage_id = str(candidate["passage_id"])
        authoritative = passage_records.get(passage_id)
        if authoritative is None:
            raise ValueError(f"claim references missing Contract B passage: {passage_id}")
        text = str(authoritative["passage_text"])
        found = passage_pattern.search(text)
        if found is None:
            continue
        observed = float(found.group("value"))
        matches.append(
            {
                "channel": "support" if observed == expected else "counterevidence",
                "expected": expected,
                "observed": observed,
                "passage_id": passage_id,
                "source_id": str(authoritative["source_id"]),
                "passage_sha256": str(authoritative["passage_hash"]),
            }
        )
    return matches


def proposition_result(
    claim: dict[str, Any], passage_records: dict[str, dict[str, Any]], policy_sha: str
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

    matches = semantic_match(claim, passage_records)
    if matches is None:
        return {
            "proposition": proposition,
            "execution": {"state": "completed", "completion": "not_checkable"},
            "assessments": assessments,
            "contributions": [],
            "measurement": None,
            "conclusion": {
                "reported_verdict": "not_checkable",
                "terminal_branch": "independent_producer_grammar_out_of_scope",
                "causal_form": "redundant_non_deciding",
                "basis_members": [],
                "residual_contribution_ids": [],
                "rule_roles": [],
            },
        }

    # The producer is deliberately fail-conservative on ambiguous semantic matches.
    # It does not rank, aggregate, or choose among multiple matching passages.
    if len(matches) != 1:
        return {
            "proposition": proposition,
            "execution": {"state": "completed", "completion": "not_checkable"},
            "assessments": assessments,
            "contributions": [],
            "measurement": None,
            "conclusion": {
                "reported_verdict": "not_checkable",
                "terminal_branch": "independent_producer_ambiguous_matching_passages",
                "causal_form": "redundant_non_deciding",
                "basis_members": [],
                "residual_contribution_ids": [],
                "rule_roles": [],
            },
        }

    match = matches[0]
    evidence_ref = {
        "source_id": match["source_id"],
        "passage_id": match["passage_id"],
        "passage_sha256": match["passage_sha256"],
    }
    cid = contribution_id(
        proposition_id=claim_id,
        channel=match["channel"],
        evidence_ref=evidence_ref,
        policy_sha=policy_sha,
    )
    contribution = {
        "contribution_id": cid,
        "channel": match["channel"],
        "evidence_ref": evidence_ref,
    }
    verdict = "supported" if match["channel"] == "support" else "contradicted"
    terminal_branch = (
        "independent_exact_numeric_match"
        if match["channel"] == "support"
        else "independent_exact_numeric_mismatch"
    )
    return {
        "proposition": proposition,
        "execution": {"state": "completed", "completion": "assessed"},
        "assessments": assessments,
        "contributions": [contribution],
        "measurement": None,
        "conclusion": {
            "reported_verdict": verdict,
            "terminal_branch": terminal_branch,
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
    parser.add_argument("--out-dir", type=Path, required=True)
    args = parser.parse_args()

    if not re.fullmatch(r"[0-9a-f]{40}", args.semantic_implementation_sha):
        raise SystemExit("--semantic-implementation-sha must be 40 lowercase hex")

    # Contract C canonicalization/validation is contract apparatus, not semantic logic.
    sys.path.insert(0, str(args.contract_c_root.resolve()))
    from validators.contract_c import (  # type: ignore[import-not-found]
        canonical_bytes,
        validate_contract_c_bytes,
        with_result_set_identity,
    )

    manifest, claims, passages = load_bundle(args.bundle)
    binding = contract_b_binding(args.bundle, manifest)
    b_index = build_contract_b_index(binding, claims, passages)
    policy_sha = sha256_hex(canonical_bytes(POLICY_CANONICAL))

    value = {
        "contract_c_version": "1.0.0",
        "input": {"contract_b": binding},
        "producer": {
            "semantic_implementation_sha": args.semantic_implementation_sha,
            "policy": {"sha256": policy_sha, "canonical": POLICY_CANONICAL},
        },
        "execution": {"state": "completed"},
        "propositions": [
            proposition_result(claim, passages, policy_sha)
            for claim in sorted(claims, key=lambda row: str(row["claim_id"]))
        ],
    }
    value = with_result_set_identity(value)
    raw = canonical_bytes(value)
    expected_sha = "sha256:" + sha256_hex(raw)
    errors = validate_contract_c_bytes(
        raw,
        expected_sha256=expected_sha,
        contract_b_index=b_index,
    )
    if errors:
        raise SystemExit("Contract C validation failed: " + "; ".join(errors))

    args.out_dir.mkdir(parents=True, exist_ok=True)
    (args.out_dir / "contract-c.json").write_bytes(raw)
    (args.out_dir / "contract-c.sha256").write_text(expected_sha + "\n", encoding="utf-8")
    (args.out_dir / "contract-b-index.json").write_bytes(canonical_bytes(b_index))
    (args.out_dir / "expected-contract-b.json").write_bytes(canonical_bytes(binding))

    states = {
        row["proposition"]["proposition_id"]: {
            "completion": row["execution"].get("completion"),
            "verdict": row["conclusion"]["reported_verdict"] if row["conclusion"] else None,
            "contribution_ids": [item["contribution_id"] for item in row["contributions"]],
        }
        for row in value["propositions"]
    }
    summary = {
        "status": "PASS",
        "producer": "independent-contract-b-exact-numeric-fact@0.1.0",
        "semantic_implementation_sha": args.semantic_implementation_sha,
        "contract_b": binding,
        "contract_c_sha256": expected_sha,
        "contract_c_valid_with_exact_b_index": True,
        "cal_imported": False,
        "evaluator_gold_consumed": False,
        "states": states,
    }
    (args.out_dir / "producer-summary.json").write_bytes(canonical_bytes(summary))
    print(json.dumps(summary, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
