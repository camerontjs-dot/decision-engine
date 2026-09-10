# Projection Kernel Mutation Audit R3 Result

## Disposition

**PASS FOR TEST DISCRIMINATION; NOT PROMOTED.**

This result supports the adequacy of the tested controls around the frozen PR #58 projection seam. It does not establish that the seam is universally correct and does not authorize maintained extraction.

## Exact identities

- protected Decision `main` at execution context: `358c2bb20f490bf25e808434394b26a70a16a123`
- PR #58 terminal record head: `00251c6d01a45f6cb14fc3d8ac4c7a4fb566f57c`
- PR #58 science head: `33f39e88f0f94a13afe740d087e4896247695f79`
- frozen subject projection-kernel SHA-256: `e12d53020b3a6a046f4ee7688db0a5ea5c5e0a63e758b1c1e5711e7b227759e3`
- exact Contract D authority: `298a1a0f7b7b6d7712e11200d04faec3e1ca169b`
- R3 science head: `b38c384557551e87aa71eb87c6b0b42d35bf10d1`
- hosted run: `34505615784`
- job: `102966941476`
- artifact: `projection-kernel-mutation-audit-r3-34505615784`
- artifact ID: `10163676230`
- wrapper ZIP SHA-256: `5a005952e28500a549ef3e7c9fb5c2afd0ef7c89bdf6fa8c6e70917a80e7a002`
- evidence TGZ SHA-256: `db0039831d511fd1afdef43d61b4cc77e2059ca62d6a63518c7cb2f0f2e5b2e2`

## Result

Nine preregistered mutants were executed.

- total: 9
- killed: 8
- survived only because exact Contract D independently rejected the malformed output: 1
- unexplained survivors: 0

### Mutant disposition

| Mutant | Fault | Result |
| --- | --- | --- |
| M1 | unknown policy falls back to available evaluator | KILLED |
| M2 | FAILED result carrying an effect is accepted | KILLED |
| M3 | completed CLEAR/HOLD without effect bypasses kernel check | `SURVIVED_KERNEL_REDUNDANT_DOWNSTREAM` |
| M4 | metadata silently becomes disposition authority | KILLED |
| M5 | input-authority immutable identity substitution | KILLED |
| M6 | resolved-target content identity substitution | KILLED |
| M7 | exact Contract-D authority/canonicalization bypass | KILLED |
| M8 | malformed completed disposition coerced to HOLD | KILLED |
| M9 | explicit domain vocabulary enters generic kernel | KILLED |

M3 is not an unexplained safety hole. Once the kernel-level completed/effect check was removed, the exact released Contract-D validator independently rejected the Decision because `effect` is required for a completed evaluation. This is evidence of redundant enforcement at the kernel/output-contract seam.

## Preserved evaluator failures

### First evaluator

Run `34505084519` failed because M4 inserted an illegal top-level Contract-D metadata field. Exact Contract D rejected the control before the intended mutation could be observed. Preserved as evaluator-design failure.

### R2 evaluator

Run `34505314369` reached all mutants but reported M9 unexplained because `/\bcal\b/i` did not detect `CAL_DOMAIN_BRANCH`; underscore is a regex word character. Preserved as `INCONCLUSIVE_SURVIVING_MUTANTS`.

R3 changed only the synthetic static detector to treat non-alphanumeric characters, including underscore, as token boundaries. It did not modify the subject projection kernel or mutation questions.

## Supported inference

For the responsibilities currently assigned to the post-admission/post-target-resolution projection seam, the R3 mutation evaluator has no unexplained surviving fault among the nine tested classes.

The result strengthens, but does not complete, the hypothesis that the common Decision primitive can remain:

`admitted authority + resolved target + domain policy result -> domain-neutral Decision projection -> exact Contract D`

## What else could explain the PASS?

The admitted authority used for most mutation cases still comes from the release-qualification research shape. The seam could therefore remain accidentally coupled to that family despite the Contract-C exact-byte result. A materially heterogeneous raw authority is the next discriminating test.

The mutation set is finite. It does not prove arbitrary metadata, resource-exhaustion, policy-registry, or adapter faults are covered.

## Next discriminator

Use the exact frozen PR #58 projection-kernel bytes with a third authority family that does **not** reuse the existing `assessment_authority` envelope. Give that domain its own authority admission, nested target resolution, and policies. Include cross-domain adapter rejection so authority semantics cannot be laundered between domains.

If that requires changing the projection kernel or introducing domain branches into it, narrow or reject the seam.

## Non-claims

- no maintained Decision refactor is authorized;
- no universal ingress abstraction is established;
- no Contract C revision is implied;
- no operational Authorization or execution is performed.
