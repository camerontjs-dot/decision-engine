from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

ORIGINAL = Path(__file__).with_name("run.py")
OUT = Path(os.environ.get("RC4_OUTPUT_DIR", "build/bundle-commitment-authority-rc4")).resolve()
GENERATED = OUT / "run-successor-generated.py"
EXPECTED_ORIGINAL_GIT_BLOB = "40eb85ab1ff4232249b708593706fef3df4e49a2"

source = ORIGINAL.read_text(encoding="utf-8")

old = '''    attacker_commitment = reseal_artifact(attacker, compute_bundle_tree_hash, write_sha256sums)\n    attacker_validation_errors = list(validate_bundle_tree(attacker))\n    attacker_producer_hash = str(compute_bundle_tree_hash(attacker))\n    attacker_independent_hash = independent_bundle_hash(attacker)\n    if attacker_producer_hash != attacker_independent_hash:\n        raise RuntimeError("hash algorithm divergence on resealed attacker artifact")\n    if attacker_validation_errors:\n        raise AssertionError("resealed attacker artifact did not validate: " + "; ".join(attacker_validation_errors))\n'''
new = '''    attacker_commitment = reseal_artifact(attacker, compute_bundle_tree_hash, write_sha256sums)\n    baseline_current_validator_errors = list(validate_bundle_tree(source))\n    if baseline_current_validator_errors != ["CONTRACT_VERSION mismatch"]:\n        raise AssertionError(\n            "known evaluator aperture was not reproduced on untouched baseline: "\n            + "; ".join(baseline_current_validator_errors)\n        )\n    attacker_validation_errors = list(validate_bundle_tree(attacker))\n    attacker_effective_validation_errors = [\n        error for error in attacker_validation_errors if error != "CONTRACT_VERSION mismatch"\n    ]\n    attacker_producer_hash = str(compute_bundle_tree_hash(attacker))\n    attacker_independent_hash = independent_bundle_hash(attacker)\n    if attacker_producer_hash != attacker_independent_hash:\n        raise RuntimeError("hash algorithm divergence on resealed attacker artifact")\n    if attacker_effective_validation_errors:\n        raise AssertionError(\n            "resealed attacker artifact had errors beyond known evaluator version aperture: "\n            + "; ".join(attacker_effective_validation_errors)\n        )\n'''
if source.count(old) != 1:
    raise SystemExit("original RC4 scientific block did not match exactly once")
source = source.replace(old, new)

old_result = '''        "resealed_attacker_world": {\n            "participant": list(malicious_participant),\n            "internal_validation_errors": attacker_validation_errors,\n'''
new_result = '''        "resealed_attacker_world": {\n            "participant": list(malicious_participant),\n            "baseline_current_validator_errors": baseline_current_validator_errors,\n            "current_validator_errors": attacker_validation_errors,\n            "effective_errors_after_known_version_aperture": attacker_effective_validation_errors,\n'''
if source.count(old_result) != 1:
    raise SystemExit("original RC4 result block did not match exactly once")
source = source.replace(old_result, new_result)

OUT.mkdir(parents=True, exist_ok=True)
GENERATED.write_text(source, encoding="utf-8")
completed = subprocess.run([sys.executable, str(GENERATED)], check=False)
raise SystemExit(completed.returncode)
