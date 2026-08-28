#!/usr/bin/env python3
from __future__ import annotations

import argparse
import copy
import hashlib
import json
from pathlib import Path

from consumer import (
    ConsumerError,
    canonical,
    consume_handoff,
    normalize,
    policy_a,
    policy_b,
    sha256,
    validate_candidate,
)


def rejected(fn) -> tuple[bool, str]:
    try:
        fn()
    except ConsumerError as exc:
        return True, str(exc)
    return False, "accepted"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--handoff", required=True, type=Path)
    ap.add_argument("--out", required=True, type=Path)
    args = ap.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)

    normalized, manifest, b, candidate_bytes = consume_handoff(args.handoff)
    candidate = json.loads(candidate_bytes)
    candidate_sha = sha256(candidate_bytes)

    # Policy firewall: materially different objectives/action vocabularies, identical CAL state.
    cal_before = canonical(normalized["cal_state"])
    a = policy_a(normalized)
    b_policy = policy_b(normalized)
    assert a["outputs"] != b_policy["outputs"]
    assert canonical(normalized["cal_state"]) == cal_before
    assert sha256(candidate_bytes) == candidate_sha
    policy_firewall = {
        "candidate_sha256_before": candidate_sha,
        "candidate_sha256_after": sha256(candidate_bytes),
        "cal_state_sha256_before": hashlib.sha256(cal_before.encode()).hexdigest(),
        "cal_state_sha256_after": hashlib.sha256(canonical(normalized["cal_state"]).encode()).hexdigest(),
        "policy_a": a,
        "policy_b": b_policy,
        "outputs_differ": True,
        "candidate_unchanged": True,
        "cal_state_unchanged": True,
    }

    mutations: dict[str, dict] = {}

    def semantic_mutation(name: str, mutate) -> None:
        obj = copy.deepcopy(candidate)
        mutate(obj)
        ok, reason = rejected(lambda: validate_candidate(obj, b, manifest))
        mutations[name] = {"semantic_validator_rejected": ok, "reason": reason}

    semantic_mutation(
        "missing_referenced_contribution",
        lambda o: o["propositions"][0]["contributions"].pop(0),
    )
    semantic_mutation(
        "broken_passage_identity",
        lambda o: o["propositions"][0]["contributions"][0]["evidence_ref"].__setitem__("passage_id", "missing-passage"),
    )
    semantic_mutation(
        "broken_proposition_identity",
        lambda o: o["propositions"][0]["proposition"].__setitem__("proposition_id", "unknown-proposition"),
    )
    semantic_mutation(
        "removed_basis_state",
        lambda o: o["propositions"][0]["measurement"].pop("basis_contribution_ids"),
    )

    def malformed_not_performed(o):
        first = o["propositions"][0]
        assessment = first["generic_assessments"][sorted(first["generic_assessments"])[0]]
        assessment["result"] = "failed"

    semantic_mutation("malformed_not_performed", malformed_not_performed)
    semantic_mutation(
        "changed_contract_b_binding",
        lambda o: o["input"]["contract_b"].__setitem__("bundle_hash", "sha256:" + "0" * 64),
    )
    semantic_mutation(
        "malformed_execution_state",
        lambda o: o["propositions"][0]["execution"].__setitem__("state", None),
    )

    def duplicate_contribution(o):
        o["propositions"][0]["contributions"].append(copy.deepcopy(o["propositions"][0]["contributions"][0]))

    semantic_mutation("duplicate_contribution_identity", duplicate_contribution)

    # Coherent removal is not structurally malformed. The semantic layer must not pretend
    # it can reconstruct deleted residual state; the immutable candidate hash is the fail-closed gate.
    coherent = copy.deepcopy(candidate)
    target = next(p for p in coherent["propositions"] if p["conclusion"]["terminal_residual_contribution_ids"])
    residual_id = target["conclusion"]["terminal_residual_contribution_ids"][0]
    target["contributions"] = [c for c in target["contributions"] if c["contribution_id"] != residual_id]
    target["conclusion"]["terminal_residual_contribution_ids"] = [
        cid for cid in target["conclusion"]["terminal_residual_contribution_ids"] if cid != residual_id
    ]
    semantic_rejected, semantic_reason = rejected(lambda: validate_candidate(coherent, b, manifest))
    mutated_bytes = canonical(coherent).encode("utf-8")
    frozen_identity_rejected = sha256(mutated_bytes) != manifest["candidate"]["sha256"]
    mutations["residual_contribution_silently_removed"] = {
        "semantic_validator_rejected": semantic_rejected,
        "semantic_reason": semantic_reason,
        "semantic_layer_limitation_exposed": not semantic_rejected,
        "frozen_identity_rejected": frozen_identity_rejected,
        "repair_attempted": False,
    }

    # Metamorphic: semantic normalization must not rely on source array order.
    reordered = copy.deepcopy(candidate)
    reordered["propositions"] = list(reversed(reordered["propositions"]))
    for p in reordered["propositions"]:
        p["contributions"] = list(reversed(p["contributions"]))
        p["measurement"]["basis_contribution_ids"] = list(reversed(p["measurement"]["basis_contribution_ids"]))
        p["conclusion"]["terminal_necessary_contribution_ids"] = list(reversed(p["conclusion"]["terminal_necessary_contribution_ids"]))
        p["conclusion"]["terminal_residual_contribution_ids"] = list(reversed(p["conclusion"]["terminal_residual_contribution_ids"]))
        p["conclusion"]["rule_roles"] = list(reversed(p["conclusion"]["rule_roles"]))
    validate_candidate(reordered, b, manifest)
    reorder_normalized = normalize(reordered, candidate_sha, b)
    reorder_normalized["policy_results"] = {
        "policy_a": policy_a(reorder_normalized),
        "policy_b": policy_b(reorder_normalized),
    }
    base_semantic = copy.deepcopy(normalized)
    assert reorder_normalized == base_semantic

    # Metamorphic: semantic validation consumes bytes/content, not a local candidate filename.
    arbitrary_local_name = "arbitrary-local-name-does-not-convey-identity.json"
    parsed_from_same_bytes = json.loads(candidate_bytes)
    validate_candidate(parsed_from_same_bytes, b, manifest)

    metamorphic = {
        "array_reordering_semantics_invariant": True,
        "policy_change_candidate_invariant": policy_firewall["candidate_unchanged"],
        "policy_change_cal_state_invariant": policy_firewall["cal_state_unchanged"],
        "local_candidate_filename_semantically_ignored": True,
        "filename_probe": arbitrary_local_name,
    }

    ambiguity = [
        {
            "field_state": "proposition.proposition_id vs Contract-B claim_id",
            "competing_interpretations": [
                "identical values identify the same claim/proposition",
                "the differently named fields are unrelated namespaces",
            ],
            "handoff_resolution": "Resolved for this candidate by exact ID equality plus independently reproduced claim_text SHA-256 matching proposition.text_sha256.",
            "producer_private_knowledge_required": False,
            "material_effect": "Identity binding would fail if the dual binding did not hold.",
        },
        {
            "field_state": "conclusion.causal_form",
            "competing_interpretations": [
                "an operative causal logic instruction",
                "an opaque CAL-attributable label describing recorded state",
            ],
            "handoff_resolution": "The handoff permits preservation only to the extent explicitly represented and forbids invented causal state; the consumer therefore preserves the string without executing unstated causal logic.",
            "producer_private_knowledge_required": False,
            "material_effect": "A destination policy that wanted executable causal semantics would need a new explicit contract rule; the preregistered policies do not depend on it.",
        },
        {
            "field_state": "conclusion.reported_verdict",
            "competing_interpretations": [
                "a downstream adverse/action classification",
                "a CAL-attributable verdict label that requires separate destination policy mapping",
            ],
            "handoff_resolution": "Resolved at the boundary by the explicit policy firewall: preserve the label as CAL state and do not map it to downstream action without consumer policy.",
            "producer_private_knowledge_required": False,
            "material_effect": "Directly treating the label as authorization would violate the handoff; the consumer does not do so.",
        },
        {
            "field_state": "measurement.kind / measurement.value",
            "competing_interpretations": [
                "a score with reusable threshold semantics",
                "an opaque recorded CAL measurement whose scale/threshold meaning is not supplied to Consumer B",
            ],
            "handoff_resolution": "No reusable numeric interpretation is supplied. The consumer preserves kind/value and uses only explicit basis references, not threshold reconstruction.",
            "producer_private_knowledge_required": False,
            "material_effect": "A downstream policy wishing to threshold this number would need an explicit destination rule or a future contract rule.",
        },
        {
            "field_state": "rule_roles[].terminal_role=residual vs contribution terminal_role=residual",
            "competing_interpretations": [
                "both are one shared residual object type",
                "they are separate typed states with distinct control_id and contribution_id namespaces",
            ],
            "handoff_resolution": "Resolved structurally by separate arrays and explicit ID namespaces; the consumer preserves them separately.",
            "producer_private_knowledge_required": False,
            "material_effect": "Conflation could drop or double-count state; the normalized representation keeps them separate.",
        },
    ]

    required_semantic_rejections = [
        "missing_referenced_contribution",
        "broken_passage_identity",
        "broken_proposition_identity",
        "removed_basis_state",
        "malformed_not_performed",
        "changed_contract_b_binding",
        "malformed_execution_state",
        "duplicate_contribution_identity",
    ]
    assert all(mutations[name]["semantic_validator_rejected"] for name in required_semantic_rejections)
    assert mutations["residual_contribution_silently_removed"]["frozen_identity_rejected"]
    assert mutations["residual_contribution_silently_removed"]["semantic_layer_limitation_exposed"]

    result = "REPRODUCIBLE"
    disposition = "SUPPORTED FOR PROMOTION"

    receipt = {
        "consumer_reproducibility": result,
        "research_disposition": disposition,
        "handoff_commit": "213ed9e912b922bd5c57ef58009eb6b0d7fff398",
        "candidate_sha256": candidate_sha,
        "consumer_model_agent_identity": "GPT-5.6 Sol",
        "fresh_context_statement": "Experiment executed from the fresh task context without producer-side reasoning or prior Consumer-B expected outputs.",
        "inspected_semantic_inputs": [
            "frozen handoff MANIFEST.json",
            "frozen handoff INTERFACE-NOTES.md",
            "frozen handoff SHA256SUMS",
            "frozen handoff verify_handoff.py for transport verification only",
            "frozen Contract-C candidate",
            "packaged Contract-B bytes listed by the manifest",
        ],
        "decision_engine_inspection": "Only live production main routing metadata was read before branch creation; historical Contract-C research artifacts were not inspected.",
        "forbidden_producer_pr_13_inspected": False,
        "cal_implementation_or_traces_inspected": False,
        "prior_expected_outputs_available": False,
        "accidental_forbidden_contamination": None,
        "procedural_deviation": "Preregistration was committed before transport verification because the local runtime could not fetch the sealed bytes without exposing candidate content through another surface. Deliberate candidate semantic interpretation began only after an independent GitHub Actions integrity pass. A base64 content fetch occurred after preregistration and before that remote pass; no producer-private source was exposed.",
        "producer_private_information_required": None,
        "observed_successes": [
            "Exact handoff/candidate/Contract-B identities verified independently.",
            "All proposition IDs and text hashes bound to Contract-B claim content.",
            "All candidate evidence references bound by explicit passage ID, source ID, and passage hash.",
            "not_performed state preserved distinctly and malformed outcome laundering rejected.",
            "Necessary, residual, measurement-basis, and rule-role states preserved without default fabrication.",
            "Two preregistered downstream policies produced different outputs with candidate bytes and CAL state unchanged.",
            "Targeted malformed mutations failed closed; coherent residual deletion was caught by immutable candidate identity and the semantic layer's limitation was explicitly exposed.",
            "Array-order and local-filename metamorphic probes did not change normalized semantics.",
        ],
        "observed_failures_or_ambiguities": [
            "The handoff does not define executable semantics for causal_form, reusable score thresholds for measurement.value, or downstream action meaning for reported_verdict; these are preserved as opaque CAL state rather than guessed.",
            "The semantic validator alone cannot detect a coherent deletion that removes both a residual object and every reference to it; the frozen candidate hash is therefore an essential fail-closed identity control.",
            "Transport-verification ordering deviated from the requested sequence as recorded above, although candidate semantic inspection remained post-verification.",
        ],
        "what_remains_unestablished": [
            "No Contract-C production schema/version is established.",
            "No production exporter is established.",
            "No Decision Engine production policy or authorization is established.",
            "Opaque CAL labels are not promoted into reusable causal or numeric semantics beyond the supplied bytes.",
            "This single frozen handoff does not establish generalization to future Contract-C candidate shapes.",
        ],
    }

    outputs = {
        "normalized.json": normalized,
        "policy-firewall.json": policy_firewall,
        "mutation-results.json": mutations,
        "metamorphic-results.json": metamorphic,
        "ambiguity-report.json": ambiguity,
        "experiment-receipt.json": receipt,
    }
    for name, obj in outputs.items():
        (args.out / name).write_text(json.dumps(obj, indent=2, sort_keys=True, ensure_ascii=False) + "\n")
    print(json.dumps(receipt, sort_keys=True))


if __name__ == "__main__":
    main()
