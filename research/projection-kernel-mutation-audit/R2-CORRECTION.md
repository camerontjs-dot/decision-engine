# R2 evaluator correction

Preserved predecessor run: `34505084519`.

The first mutation evaluator was invalid at M4 because it inserted `force_hold` as an unknown top-level Contract-D metadata key. Exact Contract D rejected that synthetic control before the intended metadata-authority mutation could be observed.

R2 changes only that synthetic marker to `metadata.diagnostics.force_hold` and changes the mutant lookup accordingly. The nine preregistered mutation questions, subject projection-kernel bytes, expected Contract-D authority, and classification rule for unexplained survivors are unchanged.

This is an evaluator correction, not a reinterpretation of a Decision Engine result.
