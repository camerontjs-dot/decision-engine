# Authority Cross-Stage RC0 — Hardening Preregistration

Status: frozen after the first hosted RC0 cut and before hardening implementation

## Why this extension exists

The first frozen matrix executed successfully on hosted CI, but one hand-designed synthetic matrix is insufficient by itself to support the architecture question.

This extension does not change the original fixtures or success criteria. It adds harder-to-game checks against the same frozen authority profiles.

## Additional required evidence

1. **Alternate implementation cross-check**
   - implement a second jurisdiction evaluator using a materially different internal structure;
   - do not import or call the target evaluator;
   - compare jurisdiction outcomes across an exhaustive generated request grid;
   - record explicitly that this is an alternate implementation, not an independently isolated consumer, because it is produced in the same research context.

2. **Metamorphic semantic-payload sweep**
   - vary opaque semantic payloads across every generated request while authority-relevant descriptors remain fixed;
   - require jurisdiction invariance for the target evaluator and alternate evaluator.

3. **Generated mutation grid**
   - cover all frozen actors plus an intruder;
   - all known operations plus one unknown operation;
   - all known target classes;
   - multiple batch sizes including values inside and outside delegated scope;
   - verifier-self / verifier-independent context where relevant;
   - compare all three authority postures.

4. **Prior real Decision specimens as opaque payloads**
   - use the exact RC1 source-audit, citation, and task-dispatch Decision specimens from the preserved research branch;
   - place them only in the opaque semantic payload position of an otherwise identical authority request;
   - jurisdiction must remain unchanged across all three;
   - this establishes only payload ignorance, not real production cross-stage conformance.

5. **Static semantic-read guard**
   - inspect the target `evaluateJurisdiction` implementation and fail if its body begins reading the `semantic_payload` field.

## Decision consequence

If these controls agree with the initial RC0 matrix, the narrow claim may reach `SUPPORTED FOR PROMOTION` for a successor real-consumer experiment:

> A common authority/jurisdiction interface is technically sufficient for the tested heterogeneous stage classes and can remain semantically ignorant under the frozen research profiles.

This still does not establish universal applicability, production authority policy, Contract E, or a production Authority Control Plane.

If the alternate evaluator disagrees materially, semantic payload changes jurisdiction, or exhaustive mutations produce protected false permits, the primary claim is `FALSIFIED` or `INCONCLUSIVE` depending on cause.
