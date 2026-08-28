#!/usr/bin/env python3
"""Independent clean-room consumer for the frozen Contract C RC2 handoff.

This module intentionally knows nothing about producer implementation. It accepts the
frozen handoff bytes, verifies bindings against Contract-B, normalizes explicit state,
and applies consumer-owned policy probes without rewriting CAL state.
"""
from __future__ import annotations

import base64
import copy
import hashlib
import io
import json
import re
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any

EXPECTED_CANDIDATE_SHA256 = "e142f4aab119751dc201bca7994c0f97636c65647489f7edbee823a7f8aee3b4"
EXPECTED_HANDOFF_COMMIT = "213ed9e912b922bd5c57ef58009eb6b0d7fff398"


class ConsumerError(ValueError):
    pass


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def canonical(obj: Any) -> str:
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def _yaml_scalar(text: str, key: str) -> str | None:
    """Parse the limited top-level scalar shape used by the packaged Contract-B files.

    Plain multiline scalars are folded with spaces, matching ordinary YAML semantics.
    This is deliberately not a general YAML parser.
    """
    lines = text.splitlines()
    pat = re.compile(rf"^{re.escape(key)}:\s*(.*)$")
    for i, line in enumerate(lines):
        m = pat.match(line)
        if not m:
            continue
        first = m.group(1)
        parts = [first] if first else []
        j = i + 1
        while j < len(lines):
            nxt = lines[j]
            if nxt and not nxt[0].isspace():
                break
            if nxt.strip():
                parts.append(nxt.strip())
            j += 1
        value = " ".join(parts).strip()
        if len(value) >= 2 and value[0] == value[-1] == "'":
            value = value[1:-1].replace("''", "'")
        elif len(value) >= 2 and value[0] == value[-1] == '"':
            value = json.loads(value)
        return value
    return None


@dataclass(frozen=True)
class ContractBIndex:
    claims: dict[str, dict[str, str]]
    passages: dict[str, dict[str, str]]
    bundle_id: str
    bundle_hash: str
    contract_version: str
    artifact_sha256: str
    sha256sums_sha256: str


def _parse_contract_b(zip_bytes: bytes, manifest: dict[str, Any]) -> ContractBIndex:
    cbi = manifest["contract_b_input"]
    if sha256(zip_bytes) != cbi["decoded_zip_sha256"]:
        raise ConsumerError("Contract-B decoded ZIP identity mismatch")

    claims: dict[str, dict[str, str]] = {}
    passages: dict[str, dict[str, str]] = {}
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        names = [n for n in zf.namelist() if not n.endswith("/")]
        sums_name = next((n for n in names if n.endswith("/SHA256SUMS")), None)
        if not sums_name:
            raise ConsumerError("Contract-B SHA256SUMS missing")
        sums = zf.read(sums_name)
        if sha256(sums) != cbi["sha256sums_sha256"]:
            raise ConsumerError("Contract-B SHA256SUMS identity mismatch")
        prefix = sums_name[: -len("SHA256SUMS")]
        for line in sums.decode("utf-8").splitlines():
            expected, rel = line.split("  ", 1)
            try:
                data = zf.read(prefix + rel)
            except KeyError as exc:
                raise ConsumerError(f"Contract-B referenced file missing: {rel}") from exc
            if sha256(data) != expected:
                raise ConsumerError(f"Contract-B file hash mismatch: {rel}")

        version = zf.read(prefix + "CONTRACT_VERSION").decode("utf-8").strip()
        bundle_manifest = zf.read(prefix + "bundle_manifest.yaml").decode("utf-8")
        bundle_id = _yaml_scalar(bundle_manifest, "bundle_id")
        bundle_hash = _yaml_scalar(bundle_manifest, "bundle_hash")
        if version != cbi["contract_version"] or bundle_id != cbi["bundle_id"] or bundle_hash != cbi["bundle_hash"]:
            raise ConsumerError("Contract-B manifest binding mismatch")

        # Semantic indexing is content-driven. Paths and source ordering are not identities.
        for name in names:
            if not name.endswith(".yaml"):
                continue
            text = zf.read(name).decode("utf-8")
            claim_id = _yaml_scalar(text, "claim_id")
            claim_text = _yaml_scalar(text, "claim_text")
            if claim_id and claim_text is not None:
                if claim_id in claims:
                    raise ConsumerError(f"duplicate Contract-B claim_id: {claim_id}")
                claims[claim_id] = {
                    "claim_id": claim_id,
                    "claim_text": claim_text,
                    "text_sha256": sha256(claim_text.encode("utf-8")),
                    "bundle_id": _yaml_scalar(text, "bundle_id") or "",
                    "schema_version": _yaml_scalar(text, "schema_version") or "",
                }
            passage_id = _yaml_scalar(text, "passage_id")
            passage_hash = _yaml_scalar(text, "passage_hash")
            if passage_id and passage_hash:
                if passage_id in passages:
                    raise ConsumerError(f"duplicate Contract-B passage_id: {passage_id}")
                passages[passage_id] = {
                    "passage_id": passage_id,
                    "passage_sha256": passage_hash,
                    "source_id": _yaml_scalar(text, "source_id") or "",
                    "bundle_id": _yaml_scalar(text, "bundle_id") or "",
                    "schema_version": _yaml_scalar(text, "schema_version") or "",
                }

    if not claims or not passages:
        raise ConsumerError("Contract-B identity index incomplete")
    return ContractBIndex(
        claims=claims,
        passages=passages,
        bundle_id=bundle_id or "",
        bundle_hash=bundle_hash or "",
        contract_version=version,
        artifact_sha256=cbi["original_artifact_tree_sha256"],
        sha256sums_sha256=cbi["sha256sums_sha256"],
    )


def _require_state(obj: Any, where: str) -> str:
    if not isinstance(obj, dict) or not isinstance(obj.get("state"), str) or not obj["state"].strip():
        raise ConsumerError(f"malformed execution/assessment state at {where}")
    return obj["state"]


def validate_candidate(candidate: dict[str, Any], b: ContractBIndex, manifest: dict[str, Any]) -> None:
    if candidate.get("result_set_id") != manifest["candidate"]["result_set_id"]:
        raise ConsumerError("result_set_id mismatch")
    _require_state(candidate.get("execution"), "result-set execution")

    cb = candidate.get("input", {}).get("contract_b")
    expected_cb = {
        "artifact_sha256": b.artifact_sha256,
        "bundle_hash": b.bundle_hash,
        "bundle_id": b.bundle_id,
        "contract_version": b.contract_version,
        "sha256sums_sha256": b.sha256sums_sha256,
    }
    if cb != expected_cb:
        raise ConsumerError("candidate Contract-B binding mismatch")

    propositions = candidate.get("propositions")
    if not isinstance(propositions, list) or not propositions:
        raise ConsumerError("propositions missing")
    seen_props: set[str] = set()
    for p in propositions:
        prop = p.get("proposition")
        if not isinstance(prop, dict):
            raise ConsumerError("proposition identity missing")
        pid = prop.get("proposition_id")
        text_hash = prop.get("text_sha256")
        if not isinstance(pid, str) or not isinstance(text_hash, str) or pid in seen_props:
            raise ConsumerError("malformed or duplicate proposition identity")
        seen_props.add(pid)
        bound_claim = b.claims.get(pid)
        if bound_claim is None or bound_claim["text_sha256"] != text_hash:
            raise ConsumerError(f"proposition identity/text binding failed: {pid}")
        if bound_claim["bundle_id"] != b.bundle_id or bound_claim["schema_version"] != b.contract_version:
            raise ConsumerError(f"proposition Contract-B bundle/version binding failed: {pid}")

        _require_state(p.get("execution"), f"{pid}.execution")
        ga = p.get("generic_assessments")
        if not isinstance(ga, dict):
            raise ConsumerError(f"generic_assessments missing: {pid}")
        for name, assessment in ga.items():
            state = _require_state(assessment, f"{pid}.generic_assessments.{name}")
            if state == "not_performed":
                forbidden_outcomes = {"result", "verdict", "decision", "conclusion", "value", "passed", "failed"}
                if forbidden_outcomes.intersection(assessment):
                    raise ConsumerError(f"not_performed carries outcome-like state: {pid}.{name}")

        contributions = p.get("contributions")
        if not isinstance(contributions, list):
            raise ConsumerError(f"contributions missing: {pid}")
        by_id: dict[str, dict[str, Any]] = {}
        for c in contributions:
            cid = c.get("contribution_id")
            if not isinstance(cid, str) or not cid or cid in by_id:
                raise ConsumerError(f"malformed or duplicate contribution_id: {pid}")
            by_id[cid] = c
            eref = c.get("evidence_ref")
            if not isinstance(eref, dict):
                raise ConsumerError(f"evidence_ref missing: {cid}")
            passage_id = eref.get("passage_id")
            bound = b.passages.get(passage_id)
            if bound is None:
                raise ConsumerError(f"unknown passage reference: {cid}")
            if eref.get("source_id") != bound["source_id"] or eref.get("passage_sha256") != bound["passage_sha256"]:
                raise ConsumerError(f"broken passage/source/hash binding: {cid}")
            if bound["bundle_id"] != b.bundle_id or bound["schema_version"] != b.contract_version:
                raise ConsumerError(f"passage Contract-B bundle/version binding failed: {cid}")
            if c.get("terminal_role") not in {"necessary", "residual"}:
                raise ConsumerError(f"unknown terminal contribution role: {cid}")

        measurement = p.get("measurement")
        if not isinstance(measurement, dict) or not isinstance(measurement.get("basis_contribution_ids"), list):
            raise ConsumerError(f"measurement basis state missing: {pid}")
        for cid in measurement["basis_contribution_ids"]:
            if cid not in by_id:
                raise ConsumerError(f"measurement basis reference unresolved: {pid}:{cid}")

        conclusion = p.get("conclusion")
        if not isinstance(conclusion, dict):
            raise ConsumerError(f"conclusion missing: {pid}")
        necessary = conclusion.get("terminal_necessary_contribution_ids")
        residual = conclusion.get("terminal_residual_contribution_ids")
        if not isinstance(necessary, list) or not isinstance(residual, list):
            raise ConsumerError(f"terminal contribution lists missing: {pid}")
        if set(necessary).intersection(residual):
            raise ConsumerError(f"contribution both necessary and residual: {pid}")
        for cid in necessary:
            if cid not in by_id or by_id[cid].get("terminal_role") != "necessary":
                raise ConsumerError(f"necessary reference/role mismatch: {pid}:{cid}")
        for cid in residual:
            if cid not in by_id or by_id[cid].get("terminal_role") != "residual":
                raise ConsumerError(f"residual reference/role mismatch: {pid}:{cid}")
        explicit_ids = set(by_id)
        if set(necessary).union(residual) != explicit_ids:
            raise ConsumerError(f"terminal contribution state incomplete: {pid}")

        rule_roles = conclusion.get("rule_roles")
        if not isinstance(rule_roles, list):
            raise ConsumerError(f"rule_roles missing: {pid}")
        role_ids: set[str] = set()
        for role in rule_roles:
            rid = role.get("control_id") if isinstance(role, dict) else None
            if not isinstance(rid, str) or not rid or rid in role_ids:
                raise ConsumerError(f"malformed or duplicate rule role: {pid}")
            role_ids.add(rid)


def normalize(candidate: dict[str, Any], candidate_sha: str, b: ContractBIndex) -> dict[str, Any]:
    # Copy only explicit CAL state, canonicalizing collection order by explicit identities.
    cal_props: list[dict[str, Any]] = []
    consumer_props: list[dict[str, Any]] = []
    for source in candidate["propositions"]:
        p = copy.deepcopy(source)
        p["contributions"] = sorted(p["contributions"], key=lambda x: x["contribution_id"])
        p["measurement"]["basis_contribution_ids"] = sorted(p["measurement"]["basis_contribution_ids"])
        p["conclusion"]["terminal_necessary_contribution_ids"] = sorted(p["conclusion"]["terminal_necessary_contribution_ids"])
        p["conclusion"]["terminal_residual_contribution_ids"] = sorted(p["conclusion"]["terminal_residual_contribution_ids"])
        p["conclusion"]["rule_roles"] = sorted(p["conclusion"]["rule_roles"], key=lambda x: x["control_id"])
        cal_props.append(p)
        consumer_props.append({
            "proposition_id": p["proposition"]["proposition_id"],
            "assessment_states": {k: v["state"] for k, v in sorted(p["generic_assessments"].items())},
            "basis_reference_count": len(p["measurement"]["basis_contribution_ids"]),
            "necessary_contribution_count": len(p["conclusion"]["terminal_necessary_contribution_ids"]),
            "residual_contribution_count": len(p["conclusion"]["terminal_residual_contribution_ids"]),
        })
    cal_props.sort(key=lambda x: x["proposition"]["proposition_id"])
    consumer_props.sort(key=lambda x: x["proposition_id"])
    return {
        "binding": {
            "candidate_sha256": candidate_sha,
            "result_set_id": candidate["result_set_id"],
            "contract_b": copy.deepcopy(candidate["input"]["contract_b"]),
        },
        "cal_state": {
            "execution": copy.deepcopy(candidate["execution"]),
            "producer": copy.deepcopy(candidate.get("producer")),
            "candidate_profile": candidate.get("candidate_profile"),
            "propositions": cal_props,
        },
        "consumer_view": {"propositions": consumer_props},
        "policy_results": {},
        "validation": {
            "claim_bindings_verified": len(b.claims),
            "passage_bindings_available": len(b.passages),
            "repairs_performed": 0,
            "semantic_order_source": "explicit-identities",
        },
    }


def policy_a(normalized: dict[str, Any]) -> dict[str, Any]:
    out: dict[str, str] = {}
    for p in normalized["cal_state"]["propositions"]:
        pid = p["proposition"]["proposition_id"]
        reasons = []
        if p["execution"]["state"] != "completed":
            reasons.append("proposition_execution_not_completed")
        if any(a["state"] != "completed" for a in p["generic_assessments"].values()):
            reasons.append("assessment_not_completed")
        if p["conclusion"]["terminal_residual_contribution_ids"]:
            reasons.append("residual_contribution_present")
        if any(r.get("terminal_role") == "residual" for r in p["conclusion"]["rule_roles"]):
            reasons.append("residual_rule_role_present")
        out[pid] = "manual_review" if reasons else "eligible_for_automated_followup"
    return {"policy_id": "consumer-probe-a-conservative-review", "outputs": out}


def policy_b(normalized: dict[str, Any]) -> dict[str, Any]:
    out: dict[str, str] = {}
    for p in normalized["cal_state"]["propositions"]:
        pid = p["proposition"]["proposition_id"]
        by_id = {c["contribution_id"]: c for c in p["contributions"]}
        basis = p["measurement"]["basis_contribution_ids"]
        if p["execution"]["state"] != "completed" or not basis:
            out[pid] = "no_completed_basis_available"
            continue
        roles = [by_id[cid]["terminal_role"] for cid in basis]
        if "necessary" in roles:
            out[pid] = "has_deciding_basis"
        elif roles and all(role == "residual" for role in roles):
            out[pid] = "has_only_nondeciding_or_residual_basis"
        else:
            out[pid] = "no_completed_basis_available"
    return {"policy_id": "consumer-probe-b-evidence-presence", "outputs": out}


def consume_handoff(root: Path) -> tuple[dict[str, Any], dict[str, Any], ContractBIndex, bytes]:
    manifest = json.loads((root / "MANIFEST.json").read_text())
    sums = (root / "SHA256SUMS").read_text().splitlines()
    for line in sums:
        expected, name = line.split("  ", 1)
        data = (root / name).read_bytes()
        if sha256(data) != expected:
            raise ConsumerError(f"outer handoff hash mismatch: {name}")
    candidate_path = root / manifest["candidate"]["path"]
    candidate_bytes = candidate_path.read_bytes()
    candidate_sha = sha256(candidate_bytes)
    if candidate_sha != EXPECTED_CANDIDATE_SHA256 or candidate_sha != manifest["candidate"]["sha256"]:
        raise ConsumerError("frozen candidate identity mismatch")

    cbi = manifest["contract_b_input"]
    encoded = "".join((root / name).read_text().rstrip("\n") for name in sorted(cbi["base64_parts"]))
    zip_bytes = base64.b64decode(encoded, validate=True)
    b = _parse_contract_b(zip_bytes, manifest)
    candidate = json.loads(candidate_bytes)
    validate_candidate(candidate, b, manifest)
    normalized = normalize(candidate, candidate_sha, b)
    before = canonical(normalized["cal_state"])
    normalized["policy_results"] = {
        "policy_a": policy_a(normalized),
        "policy_b": policy_b(normalized),
    }
    if canonical(normalized["cal_state"]) != before or sha256(candidate_bytes) != candidate_sha:
        raise ConsumerError("downstream policy mutated candidate/CAL state")
    return normalized, manifest, b, candidate_bytes
