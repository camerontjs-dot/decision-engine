from __future__ import annotations

import copy
import hashlib
import importlib.util
import json
import sys
from pathlib import Path

APERTURE = Path("research/contract_c_minimal_in_band_consumer_b_aperture")
BASELINE_SHA = "sha256:325962ebcdbf6af836bb6193a451524ccd40b4d10f2394ff9f703fbfce1ec1e3"
BASELINE_RESULT = "result-set:4483272c4f6fbd9cb2362be7e3174bbd00aff3cf761d6c374897f3478818c9f0"
VERSION = "research-non-deciding-rc0"
FORBIDDEN_KEYS = {
    "member_id",
    "state_id",
    "receipt_id",
    "score",
    "confidence",
    "probability",
    "rank",
    "winner",
    "action",
    "authorization",
    "effect",
}


def canonical_bytes(value: object) -> bytes:
    return (json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False) + "\n").encode("utf-8")


def whole_digest(raw: bytes) -> str:
    return "sha256:" + hashlib.sha256(raw).hexdigest()


def recompute_result_set(obj: dict) -> dict:
    value = copy.deepcopy(obj)
    value.pop("result_set_id", None)
    digest = hashlib.sha256(canonical_bytes(value)).hexdigest()
    value["result_set_id"] = "result-set:" + digest
    return value


def rebind(obj: dict) -> tuple[dict, bytes, dict]:
    value = recompute_result_set(obj)
    raw = canonical_bytes(value)
    profile = {
        "contract_c_version": value["contract_c_version"],
        "whole_object_sha256": whole_digest(raw),
        "result_set_id": value["result_set_id"],
    }
    return value, raw, profile


def load_candidate(candidate_root: Path):
    path = candidate_root / "candidate" / "consumer.py"
    spec = importlib.util.spec_from_file_location("consumer_b_candidate", path)
    if spec is None or spec.loader is None:
        raise AssertionError("candidate consumer could not be imported")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    for name in ("ConsumerError", "consume_contract_c", "evaluate_supported_claim"):
        if not hasattr(module, name):
            raise AssertionError(f"candidate missing required API: {name}")
    return module


def expect_reject(module, raw: bytes, index: dict, profile: dict | None, label: str, failures: list[str]) -> None:
    try:
        module.consume_contract_c(raw, copy.deepcopy(index), copy.deepcopy(profile))
    except module.ConsumerError:
        return
    except Exception as exc:
        failures.append(f"{label}: raised non-ConsumerError {type(exc).__name__}: {exc}")
        return
    failures.append(f"{label}: accepted input that must fail closed")


def collect_forbidden_keys(value: object, path: str = "$") -> list[str]:
    found: list[str] = []
    if isinstance(value, dict):
        for key, child in value.items():
            if key in FORBIDDEN_KEYS:
                found.append(f"{path}.{key}")
            found.extend(collect_forbidden_keys(child, f"{path}.{key}"))
    elif isinstance(value, list):
        for i, child in enumerate(value):
            found.extend(collect_forbidden_keys(child, f"{path}[{i}]"))
    return found


def proposition(consumed: dict) -> dict:
    rows = consumed.get("propositions")
    if not isinstance(rows, list) or len(rows) != 1:
        raise AssertionError("expected exactly one normalized proposition")
    return rows[0]


def main(candidate_root: Path, output: Path) -> int:
    failures: list[str] = []
    observations: dict[str, object] = {}
    module = load_candidate(candidate_root)

    raw = (candidate_root / APERTURE / "valid-shadow.json").read_bytes()
    index = json.loads((candidate_root / APERTURE / "contract-b-index.json").read_text())
    baseline_obj = json.loads(raw)
    baseline_profile = {
        "contract_c_version": VERSION,
        "whole_object_sha256": BASELINE_SHA,
        "result_set_id": BASELINE_RESULT,
    }

    if whole_digest(raw) != BASELINE_SHA:
        raise AssertionError("evaluator fixture whole-object digest mismatch")
    if baseline_obj.get("result_set_id") != BASELINE_RESULT:
        raise AssertionError("evaluator fixture result-set identity mismatch")

    try:
        consumed = module.consume_contract_c(raw, copy.deepcopy(index), copy.deepcopy(baseline_profile))
    except Exception as exc:
        failures.append(f"baseline: rejected frozen valid handoff: {type(exc).__name__}: {exc}")
        consumed = None

    if consumed is not None:
        try:
            if consumed.get("contract_c_version") != VERSION:
                failures.append("baseline: wrong normalized contract version")
            if consumed.get("result_set_id") != BASELINE_RESULT:
                failures.append("baseline: wrong normalized result-set identity")
            if consumed.get("whole_object_sha256") != BASELINE_SHA:
                failures.append("baseline: wrong normalized whole-object identity")
            if consumed.get("contract_b") != {
                "contract_version": index["contract_version"],
                "bundle_id": index["bundle_id"],
                "bundle_hash": index["bundle_hash"],
            }:
                failures.append("baseline: wrong normalized Contract-B binding")
            p = proposition(consumed)
            if p.get("proposition") != {
                "proposition_id": "temporal-p1",
                "text_sha256": index["propositions"]["temporal-p1"],
            }:
                failures.append("baseline: proposition binding not recovered exactly")
            if p.get("reported_verdict") != "not_checkable":
                failures.append("baseline: verdict not preserved")
            if p.get("terminal_branch") != "unresolved_categorical_relation":
                failures.append("baseline: terminal branch not preserved")
            if p.get("causal_form") != "independent_sufficient_alternatives":
                failures.append("baseline: causal form not preserved")
            causal = p.get("causal_contributions")
            residual = p.get("residual_contributions")
            if not isinstance(causal, list) or {x["evidence_ref"]["passage_id"] for x in causal} != {"u-a", "u-b"}:
                failures.append("baseline: exact two causal passages not recovered")
            elif any(x.get("channel") != "non_deciding" for x in causal):
                failures.append("baseline: non_deciding channel not preserved")
            if residual != []:
                failures.append("baseline: unexpected residual contribution")
            forbidden = collect_forbidden_keys(consumed)
            if forbidden:
                failures.append("baseline: forbidden invented surface: " + ", ".join(forbidden))
            policy = module.evaluate_supported_claim(consumed, "temporal-p1")
            observations["baseline_policy"] = policy
            if not isinstance(policy, dict) or policy.get("disposition") != "hold":
                failures.append("baseline policy: non_deciding/not_checkable did not HOLD")
        except Exception as exc:
            failures.append(f"baseline normalized inspection failed: {type(exc).__name__}: {exc}")

    expect_reject(module, raw, index, {**baseline_profile, "whole_object_sha256": "sha256:" + "0" * 64}, "wrong_external_digest", failures)
    expect_reject(module, raw, index, None, "missing_external_profile", failures)
    expect_reject(module, raw, index, {}, "malformed_external_profile", failures)
    expect_reject(module, raw, index, {**baseline_profile, "contract_c_version": "1.0.0"}, "wrong_external_profile", failures)

    def reject_rebound(label: str, mutate) -> None:
        obj = copy.deepcopy(baseline_obj)
        mutate(obj)
        _, mutated_raw, profile = rebind(obj)
        expect_reject(module, mutated_raw, index, profile, label, failures)

    reject_rebound("unknown_version", lambda o: o.__setitem__("contract_c_version", "research-unknown-version"))
    reject_rebound("wrong_contract_b_binding", lambda o: o["input"]["contract_b"].__setitem__("bundle_id", "wrong-bundle"))
    reject_rebound("wrong_proposition_binding", lambda o: o["propositions"][0]["proposition"].__setitem__("text_sha256", "0" * 64))
    reject_rebound("wrong_evidence_reference", lambda o: o["propositions"][0]["contributions"][0]["evidence_ref"].__setitem__("source_id", "wrong-source"))
    reject_rebound("unknown_channel", lambda o: o["propositions"][0]["contributions"][0].__setitem__("channel", "mystery"))
    reject_rebound("missing_basis_contribution", lambda o: o["propositions"][0]["conclusion"].__setitem__("basis_members", o["propositions"][0]["conclusion"]["basis_members"][:1]))
    reject_rebound("causal_residual_overlap", lambda o: o["propositions"][0]["conclusion"]["residual_contribution_ids"].append(o["propositions"][0]["contributions"][0]["contribution_id"]))

    def make_unclassified(o: dict) -> None:
        p = o["propositions"][0]
        p["conclusion"]["causal_form"] = "single_necessary"
        p["conclusion"]["basis_members"] = p["conclusion"]["basis_members"][:1]
        p["conclusion"]["residual_contribution_ids"] = []
    reject_rebound("unclassified_contribution", make_unclassified)

    def bad_cardinality(o: dict) -> None:
        o["propositions"][0]["conclusion"]["causal_form"] = "single_necessary"
    reject_rebound("causal_cardinality_mismatch", bad_cardinality)

    stale = copy.deepcopy(baseline_obj)
    stale["propositions"][0]["conclusion"]["terminal_branch"] = "changed-branch"
    stale_raw = canonical_bytes(stale)
    stale_profile = {**baseline_profile, "whole_object_sha256": whole_digest(stale_raw)}
    expect_reject(module, stale_raw, index, stale_profile, "stale_result_set_identity", failures)

    def consume_valid_variant(label: str, mutate):
        obj = copy.deepcopy(baseline_obj)
        mutate(obj)
        value, mutated_raw, profile = rebind(obj)
        try:
            out = module.consume_contract_c(mutated_raw, copy.deepcopy(index), profile)
            return value, out
        except Exception as exc:
            failures.append(f"{label}: valid metamorphic variant rejected: {type(exc).__name__}: {exc}")
            return value, None

    _, support_out = consume_valid_variant("neutral_to_support", lambda o: o["propositions"][0]["contributions"][0].__setitem__("channel", "support"))
    if support_out is not None:
        channels = {x.get("channel") for x in proposition(support_out).get("causal_contributions", [])}
        if channels != {"support", "non_deciding"}:
            failures.append("neutral_to_support: semantic channel change not preserved exactly")
        if module.evaluate_supported_claim(support_out, "temporal-p1").get("disposition") != "hold":
            failures.append("neutral_to_support: unchanged not_checkable verdict incorrectly CLEARed")

    _, counter_out = consume_valid_variant("neutral_to_counterevidence", lambda o: o["propositions"][0]["contributions"][0].__setitem__("channel", "counterevidence"))
    if counter_out is not None:
        channels = {x.get("channel") for x in proposition(counter_out).get("causal_contributions", [])}
        if channels != {"counterevidence", "non_deciding"}:
            failures.append("neutral_to_counterevidence: semantic channel change not preserved exactly")
        if module.evaluate_supported_claim(counter_out, "temporal-p1").get("disposition") != "hold":
            failures.append("neutral_to_counterevidence: unchanged not_checkable verdict incorrectly CLEARed")

    _, joint_out = consume_valid_variant("jointly_sufficient", lambda o: o["propositions"][0]["conclusion"].__setitem__("causal_form", "jointly_sufficient"))
    if joint_out is not None and proposition(joint_out).get("causal_form") != "jointly_sufficient":
        failures.append("jointly_sufficient: causal form was collapsed")

    def causal_residual_variant(o: dict) -> None:
        p = o["propositions"][0]
        second_id = p["contributions"][1]["contribution_id"]
        p["conclusion"]["causal_form"] = "single_necessary"
        p["conclusion"]["basis_members"] = p["conclusion"]["basis_members"][:1]
        p["conclusion"]["residual_contribution_ids"] = [second_id]

    _, residual_out = consume_valid_variant("causal_residual_variant", causal_residual_variant)
    if residual_out is not None:
        p = proposition(residual_out)
        causal_passages = {x["evidence_ref"]["passage_id"] for x in p.get("causal_contributions", [])}
        residual_passages = {x["evidence_ref"]["passage_id"] for x in p.get("residual_contributions", [])}
        if causal_passages != {"u-a"} or residual_passages != {"u-b"}:
            failures.append("causal_residual_variant: causal/residual distinction not preserved")

    coherent_delete = copy.deepcopy(baseline_obj)
    p = coherent_delete["propositions"][0]
    p["contributions"] = p["contributions"][:1]
    p["conclusion"]["basis_members"] = p["conclusion"]["basis_members"][:1]
    p["conclusion"]["causal_form"] = "single_necessary"
    coherent_delete, coherent_raw, _ = rebind(coherent_delete)
    original_authority = {
        "contract_c_version": VERSION,
        "whole_object_sha256": BASELINE_SHA,
        "result_set_id": coherent_delete["result_set_id"],
    }
    expect_reject(module, coherent_raw, index, original_authority, "coherent_deletion_original_external_digest", failures)

    status = "PASS" if not failures else "FAIL"
    disposition = "SUPPORTED_CONTEXT_FREE_CONSUMER_B_REPRODUCTION" if not failures else "FALSIFIED_CONTEXT_FREE_CONSUMER_B_REPRODUCTION"
    result = {
        "schema": "contract-c-minimal-in-band-consumer-b-hidden-evaluation-v1",
        "status": status,
        "disposition": disposition,
        "candidate_root": str(candidate_root),
        "baseline_whole_object_sha256": BASELINE_SHA,
        "baseline_result_set_id": BASELINE_RESULT,
        "weak_neutral_implies_clear_mutant_killed": observations.get("baseline_policy", {}).get("disposition") == "hold" if isinstance(observations.get("baseline_policy"), dict) else False,
        "failures": failures,
        "observations": observations,
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, sort_keys=True, indent=2) + "\n")
    print(json.dumps(result, sort_keys=True))
    return 0 if not failures else 1


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("usage: evaluate_candidate.py <candidate-root> <output-json>")
    raise SystemExit(main(Path(sys.argv[1]), Path(sys.argv[2])))
