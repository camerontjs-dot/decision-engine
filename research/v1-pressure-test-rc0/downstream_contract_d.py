from __future__ import annotations

import copy
import json
import os
from pathlib import Path

from validators.contract_d_consume import ApplicabilityExpectation, consume
from validators.contract_d_core import canonical_json_bytes, semantic_identity, validate_decision


output_dir = Path(os.environ.get("PRESSURE_OUTPUT_DIR", "build/v1-pressure-rc0"))
index = json.loads((output_dir / "decision-index.json").read_text())
failed_index = json.loads((output_dir / "failed-decision-index.json").read_text())
all_rows = index + failed_index

counts = {
    "candidate_for_authorization": 0,
    "hold": 0,
    "evaluation_failed": 0,
}

for row in all_rows:
    raw = Path(row["path"]).read_bytes()
    decision = json.loads(raw)
    validate_decision(decision)
    assert canonical_json_bytes(decision) == raw

    expected = ApplicabilityExpectation(
        copy.deepcopy(decision["input_authority"]),
        copy.deepcopy(decision["policy"]),
        copy.deepcopy(decision["target"]),
        row["operation"],
        copy.deepcopy(row["params"]),
    )
    outcome = consume(decision, expected)["outcome"]
    evaluation = decision["evaluation"]
    if evaluation == {"state": "completed", "disposition": "clear"}:
        assert outcome == "candidate_for_authorization"
    elif evaluation == {"state": "completed", "disposition": "hold"}:
        assert outcome == "hold"
    elif evaluation == {"state": "failed"}:
        assert outcome == "evaluation_failed"
    else:
        raise AssertionError(f"unexpected evaluation: {evaluation}")
    counts[outcome] += 1

    # Exact Decision, wrong requested operation is never applicable.
    alternate_operation = (
        "knowledge.cite_as_evidence"
        if row["operation"] == "knowledge.add_verified_tag"
        else "knowledge.add_verified_tag"
    )
    alternate_params = {} if alternate_operation == "knowledge.cite_as_evidence" else {"scope": "claim"}
    wrong_operation = ApplicabilityExpectation(
        copy.deepcopy(decision["input_authority"]),
        copy.deepcopy(decision["policy"]),
        copy.deepcopy(decision["target"]),
        alternate_operation,
        alternate_params,
    )
    assert consume(decision, wrong_operation)["outcome"] == "not_applicable"

    # Same logical target id with a changed immutable target hash is non-applicable.
    wrong_target_value = copy.deepcopy(decision["target"])
    wrong_target_value["content_sha256"] = "sha256:" + "f" * 64
    wrong_target = ApplicabilityExpectation(
        copy.deepcopy(decision["input_authority"]),
        copy.deepcopy(decision["policy"]),
        wrong_target_value,
        row["operation"],
        copy.deepcopy(row["params"]),
    )
    assert consume(decision, wrong_target)["outcome"] == "not_applicable"

    # Changed immutable input authority is non-applicable.
    wrong_authority_value = copy.deepcopy(decision["input_authority"])
    wrong_authority_value["immutable_id"] = "sha256:" + "e" * 64
    wrong_authority = ApplicabilityExpectation(
        wrong_authority_value,
        copy.deepcopy(decision["policy"]),
        copy.deepcopy(decision["target"]),
        row["operation"],
        copy.deepcopy(row["params"]),
    )
    assert consume(decision, wrong_authority)["outcome"] == "not_applicable"

# This assertion exists specifically to prevent the first-cut evaluator defect from recurring.
assert counts["evaluation_failed"] == len(failed_index)
assert counts["evaluation_failed"] >= 2

# Metadata is explicitly non-authoritative under Contract D semantic identity.
representative = json.loads(Path(index[0]["path"]).read_text())
metadata_variant = copy.deepcopy(representative)
metadata_variant["metadata"] = {
    "reason_codes": ["pressure_metadata_changed"],
    "diagnostics": {"domain": "rc0", "ignored_for_identity": True},
}
validate_decision(metadata_variant)
assert semantic_identity(metadata_variant) == semantic_identity(representative)

# Effect substitution cannot satisfy the exact original request.
effect_variant = copy.deepcopy(representative)
effect_variant["effect"] = {"type": "task.dispatch", "version": "1", "params": {}}
validate_decision(effect_variant)
original_expectation = ApplicabilityExpectation(
    copy.deepcopy(representative["input_authority"]),
    copy.deepcopy(representative["policy"]),
    copy.deepcopy(representative["target"]),
    index[0]["operation"],
    copy.deepcopy(index[0]["params"]),
)
assert consume(effect_variant, original_expectation)["outcome"] == "not_applicable"

receipt = {
    "status": "PASS",
    "decision_count": len(all_rows),
    "ordinary_decision_count": len(index),
    "failed_control_count": len(failed_index),
    "outcomes": counts,
    "clear_is_only_candidate_for_authorization": True,
    "hold_does_not_escalate": True,
    "failed_does_not_escalate": True,
    "failed_outcome_observed": counts["evaluation_failed"] >= 2,
    "wrong_operation_non_applicable": True,
    "wrong_target_non_applicable": True,
    "wrong_authority_non_applicable": True,
    "effect_substitution_non_applicable": True,
    "metadata_non_authoritative": True,
    "authorization_performed": False,
    "execution_performed": False,
}
(output_dir / "downstream-contract-d-receipt.json").write_text(
    json.dumps(receipt, indent=2, sort_keys=True) + "\n"
)
print(json.dumps(receipt, sort_keys=True))
