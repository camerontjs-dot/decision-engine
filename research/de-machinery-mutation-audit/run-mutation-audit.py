#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import shutil
import subprocess
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
BASE = os.environ["DECISION_BASE"]
C_ROOT = os.environ["APPARATUS_CONTRACT_C_DIR"]
D_ROOT = os.environ["APPARATUS_CONTRACT_D_DIR"]
RC1_ROOT = os.environ["CONTRACT_C_RC1_EVIDENCE_DIR"]
FAKE_C_ROOT = os.environ["FAKE_CONTRACT_C_DIR"]
PYTHON = os.environ.get("PYTHON", "python3")
OUT = ROOT / "build" / "de-machinery-mutation-audit"
OUT.mkdir(parents=True, exist_ok=True)

POLICY_A_TEST = ["node", "tests/contractCToContractD.integration.mjs"]
POLICY_B_TEST = ["node", "tests/contractCBasisCitation.integration.mjs"]
CLI_TEST = ["node", "tests/decisionEvaluateCli.integration.mjs"]
WRONG_C_AUTH_TEST = ["node", "research/de-machinery-mutation-audit/wrong-c-authority-control.mjs"]

COMMON_ENV = {
    **os.environ,
    "APPARATUS_CONTRACT_C_DIR": C_ROOT,
    "APPARATUS_CONTRACT_D_DIR": D_ROOT,
    "CONTRACT_C_RC1_EVIDENCE_DIR": RC1_ROOT,
    "FAKE_CONTRACT_C_DIR": FAKE_C_ROOT,
    "PYTHON": PYTHON,
}


def restore() -> None:
    subprocess.run(
        ["git", "checkout", BASE, "--", "src", "scripts"],
        cwd=ROOT,
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def replace_once(path: str, old: str, new: str) -> None:
    file = ROOT / path
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"mutation replacement count for {path} must be 1, got {count}: {old!r}")
    file.write_text(text.replace(old, new, 1))


def run_test(command: list[str], label: str) -> dict[str, Any]:
    env = dict(COMMON_ENV)
    safe = label.replace("/", "-").replace(" ", "-")
    env["CONTRACT_C_TO_D_OUTPUT_DIR"] = str(OUT / safe / "policy-a")
    env["CONTRACT_C_BASIS_CITATION_OUTPUT_DIR"] = str(OUT / safe / "policy-b")
    env["DECISION_EVALUATE_CLI_OUTPUT_DIR"] = str(OUT / safe / "cli")
    result = subprocess.run(
        command,
        cwd=ROOT,
        env=env,
        text=True,
        capture_output=True,
    )
    return {
        "command": " ".join(command),
        "returncode": result.returncode,
        "stdout_tail": result.stdout[-1500:],
        "stderr_tail": result.stderr[-1500:],
    }


def run_suite(commands: list[list[str]], label: str) -> dict[str, Any]:
    runs = [run_test(command, f"{label}-{i}") for i, command in enumerate(commands)]
    return {
        "runs": runs,
        "all_passed": all(item["returncode"] == 0 for item in runs),
    }


baseline = run_suite(
    [POLICY_A_TEST, POLICY_B_TEST, CLI_TEST, WRONG_C_AUTH_TEST],
    "baseline",
)
if not baseline["all_passed"]:
    print(json.dumps({"status": "INVALID_BASELINE", "baseline": baseline}, indent=2))
    raise SystemExit(1)

mutants: list[dict[str, Any]] = [
    {
        "id": "M01_skip_contract_c_authority_root_verification",
        "path": "src/contractCIngress.js",
        "old": "  verifyCanonicalAuthorityRoot(contractCAuthorityRoot);",
        "new": "  // MUTANT: skipped Contract C authority-root verification",
        "maintained_tests": [POLICY_A_TEST, POLICY_B_TEST, CLI_TEST],
        "supplemental_tests": [WRONG_C_AUTH_TEST],
        "claim": "Exact Contract C checkout/tag/validator identity is enforced at ingress.",
    },
    {
        "id": "M02_skip_released_contract_c_validator",
        "path": "src/contractCIngress.js",
        "old": "  runChecked(\n    python,\n    [\"-c\", validatorProgram, contractCAuthorityRoot, expectedContractCSha256],\n    { input: raw },\n    \"contract_c_validation_failed\",\n    \"canonical Contract C validation failed\",\n  );",
        "new": "  // MUTANT: skipped released Contract C validator",
        "maintained_tests": [POLICY_A_TEST, CLI_TEST],
        "supplemental_tests": [],
        "claim": "Released Contract C structural/semantic validation is required before policy.",
    },
    {
        "id": "M03_skip_top_level_contract_b_binding",
        "path": "src/contractCIngress.js",
        "old": "  requireContractBBinding(contractC, expectedContractB);",
        "new": "  // MUTANT: skipped expected Contract B binding",
        "maintained_tests": [POLICY_A_TEST],
        "supplemental_tests": [],
        "claim": "Expected top-level Contract B identity is decision-critical ingress authority.",
    },
    {
        "id": "M04_policy_a_ignore_result_execution",
        "path": "src/contractCDecision.js",
        "old": "  if (contractC.execution.state !== \"completed\") {",
        "new": "  if (false && contractC.execution.state !== \"completed\") {",
        "maintained_tests": [POLICY_A_TEST],
        "supplemental_tests": [],
        "claim": "Policy A must HOLD when result-set execution is not completed.",
    },
    {
        "id": "M05_policy_a_ignore_reported_verdict",
        "path": "src/contractCDecision.js",
        "old": "  if (proposition.conclusion.reported_verdict !== \"supported\") {",
        "new": "  if (false && proposition.conclusion.reported_verdict !== \"supported\") {",
        "maintained_tests": [POLICY_A_TEST],
        "supplemental_tests": [],
        "claim": "Policy A positive disposition depends on exact supported verdict.",
    },
    {
        "id": "M06_policy_a_ignore_target_content_binding",
        "path": "src/contractCDecision.js",
        "old": "  if (target.content_sha256 !== expectedTargetHash) {",
        "new": "  if (false && target.content_sha256 !== expectedTargetHash) {",
        "maintained_tests": [POLICY_A_TEST],
        "supplemental_tests": [],
        "claim": "Policy A binds exact target content, not proposition ID alone.",
    },
    {
        "id": "M07_policy_b_ignore_basis_membership",
        "path": "src/contractCBasisCitationDecision.js",
        "old": "  if (!causalContributionIds.has(contribution.contribution_id)) {",
        "new": "  if (false && !causalContributionIds.has(contribution.contribution_id)) {",
        "maintained_tests": [POLICY_B_TEST, CLI_TEST],
        "supplemental_tests": [],
        "claim": "Residual retained contributions cannot CLEAR as causal-basis citations.",
    },
    {
        "id": "M08_policy_b_skip_exact_target_binding",
        "path": "src/contractCBasisCitationDecision.js",
        "old": "  requireExactTargetBinding(contractC, decisionContext);",
        "new": "  // MUTANT: skipped exact citation target binding",
        "maintained_tests": [POLICY_B_TEST, CLI_TEST],
        "supplemental_tests": [],
        "claim": "Policy B requires exact claim-evidence-link target content binding.",
    },
    {
        "id": "M09_runtime_unknown_policy_falls_through_to_policy_a",
        "path": "src/contractCDecisionRuntime.js",
        "old": "    default:\n      throw new ContractCDecisionError(",
        "new": "    default:\n      return decideContractCToContractD(options);\n      throw new ContractCDecisionError(",
        "maintained_tests": [CLI_TEST],
        "supplemental_tests": [],
        "claim": "Unknown policy identity must fail closed rather than fall through.",
    },
    {
        "id": "M10_skip_contract_d_authority_root_verification",
        "path": "src/contractDCanonicalOutput.js",
        "old": "  verifyContractDAuthorityRoot(contractDAuthorityRoot);",
        "new": "  // MUTANT: skipped Contract D authority-root verification",
        "maintained_tests": [CLI_TEST],
        "supplemental_tests": [],
        "claim": "CLI canonical output is bound to exact released Contract D authority.",
    },
]

results: list[dict[str, Any]] = []
try:
    for mutant in mutants:
        restore()
        replace_once(mutant["path"], mutant["old"], mutant["new"])
        maintained = run_suite(mutant["maintained_tests"], mutant["id"] + "-maintained")
        supplemental = (
            run_suite(mutant["supplemental_tests"], mutant["id"] + "-supplemental")
            if mutant["supplemental_tests"]
            else None
        )
        results.append(
            {
                "id": mutant["id"],
                "claim": mutant["claim"],
                "path": mutant["path"],
                "maintained_suite": {
                    "status": "SURVIVED" if maintained["all_passed"] else "KILLED",
                    **maintained,
                },
                "supplemental_recent_pressure": (
                    {
                        "status": "SURVIVED" if supplemental["all_passed"] else "KILLED",
                        **supplemental,
                    }
                    if supplemental is not None
                    else None
                ),
            }
        )
finally:
    restore()

maintained_killed = sum(r["maintained_suite"]["status"] == "KILLED" for r in results)
maintained_survived = [r["id"] for r in results if r["maintained_suite"]["status"] == "SURVIVED"]

receipt = {
    "schema": "decision-engine-machinery-mutation-audit-v1",
    "semantics": "EVALUATOR_AND_REGRESSION_APPARATUS_UNDER_TEST",
    "decision_base": BASE,
    "baseline": {"status": "PASS"},
    "mutant_count": len(results),
    "maintained_suite_killed": maintained_killed,
    "maintained_suite_survived": maintained_survived,
    "mutation_score": maintained_killed / len(results),
    "results": results,
    "interpretation": {
        "tests_are_not_evidence_merely_by_existing": True,
        "maintained_suite_strength_measured_by_mutant_rejection": True,
        "survivors_must_be_preserved": True,
        "research_only_missing_requirements_not_counted_as_mutants": [
            "Contract C -> Contract B internal-reference index authority from PR #49/#50",
            "producer semantic implementation/policy identity from PR #48",
            "Policy A generic assessment-stage policy choice from PR #46/#47",
        ],
    },
    "production_change_authorized": False,
}

(OUT / "RESULT.json").write_text(json.dumps(receipt, indent=2) + "\n")
print(json.dumps(receipt, indent=2))
