# R3 evaluator correction

Preserved predecessor R2 run: `34505314369`.

R2 reached all nine mutation cases and reported seven killed, one redundantly rejected by exact Contract D, and one unexplained survivor: M9.

M9 is an evaluator static-guard defect. The guard used `/\bcal\b/i`; JavaScript treats underscore as a word character, so the deliberately injected identifier `CAL_DOMAIN_BRANCH` did not create a regex word boundary and escaped detection.

R3 changes only the CAL-token detector used by the synthetic neutrality guard to treat any non-alphanumeric character, including underscore, as a boundary:

`/(^|[^A-Za-z0-9])cal([^A-Za-z0-9]|$)/i`

R3 also carries forward the already-recorded M4 correction. It does not modify the frozen projection-kernel subject, any preregistered mutant, Contract D authority, or survivor classification rule.

The R2 result remains `INCONCLUSIVE_SURVIVING_MUTANTS` as executed. R3 is a new evaluator attempt, not a rewrite of that result.
