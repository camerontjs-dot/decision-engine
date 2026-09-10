# Heterogeneous Artifact-Manifest Authority → Decision Projection

## Classification

Stacked Draft Research experiment over the successful projection-seam mutation audit. Decision Engine only. No maintained `src/**`, `scripts/**`, `tests/**`, contract amendment, Authorization, execution, release, tag, promotion, or production-default change.

## Exact subject

The generic projection subject remains the exact PR #58 science artifact:

- projection kernel SHA-256: `sha256:e12d53020b3a6a046f4ee7688db0a5ea5c5e0a63e758b1c1e5711e7b227759e3`
- PR #58 science head: `33f39e88f0f94a13afe740d087e4896247695f79`
- exact Contract D authority: `298a1a0f7b7b6d7712e11200d04faec3e1ca169b`

## Question

Can the same post-admission/post-target-resolution projection kernel consume a materially heterogeneous authority family that is **not** an assessment-authority envelope, without changing one byte of the kernel or laundering domain semantics into it?

## Third authority family

Use a research-only **artifact integrity manifest** built from exact files at frozen Decision Engine commit `33f39e88f0f94a13afe740d087e4896247695f79`.

The raw authority is factual/structural rather than an assessment conclusion. It records:

- manifest identity/version and frozen source commit;
- a declared required path set;
- exact nested entry bytes (base64), byte counts, SHA-256 identities, and roles;
- an exact deterministic entry-root over the manifest entries.

It deliberately does **not** use the prior `{authority, subject, evidence, state}` assessment envelope.

## Domain responsibilities

A manifest-specific adapter must:

1. verify exact whole-object bytes against the caller's expected manifest SHA;
2. reject unknown/malformed manifest shapes;
3. validate base64, byte counts, per-entry SHA-256, unique paths, and deterministic entry-root;
4. derive the Decision input-authority identity;
5. resolve an exact nested manifest entry into a Decision target.

Manifest-specific policies must answer two different questions:

- **bound-entry use**: is this exact nested entry present and integrity-valid?
- **complete-set use**: is this exact entry present and is the manifest's entire declared required set present?

The projection kernel may do none of that domain interpretation.

## Preregistered cases

### Baseline

A complete manifest over four exact PR #58 science files. Both policies must CLEAR.

### Valid incomplete authority

Remove one *other* required entry and recompute the manifest consistently. The target entry remains intact.

Expected:

- bound-entry policy remains CLEAR;
- complete-set policy becomes HOLD.

This tests policy discrimination without treating incompleteness as malformed ingress.

### Internal-integrity mutation

Mutate nested entry content while preserving the stale declared entry hash. Even if the outer expected manifest SHA is recomputed, admission must fail on the internal content/hash mismatch.

### Whole-object replay/substitution

Use exact baseline bytes with the wrong expected outer SHA. Admission must fail.

### Nested target substitution

Resolve one entry but supply a target hash or ID from another entry. Resolver must fail closed before projection.

### Cross-domain adapter rejection

The manifest adapter must reject bytes from the prior release-qualification assessment authority. The Contract-C adapter must reject manifest bytes rather than reinterpret them as Contract C.

### Kernel identity

The kernel source must hash exactly to the PR #58 science SHA. Any change is a falsifier.

## Main falsifiers

The candidate seam is weakened or falsified if:

1. the projection kernel must change for this authority family;
2. manifest/version/path/completeness/integrity semantics enter the projection kernel;
3. a valid incomplete manifest cannot be expressed without changing generic Decision machinery;
4. nested target substitution survives the domain resolver;
5. outer rebinding hides an internal entry-integrity failure;
6. a foreign authority can be reinterpreted through the wrong adapter;
7. exact Contract D cannot represent the resulting CLEAR/HOLD Decisions without a new domain-specific output field.

## Alternative explanations

A PASS still may not establish a universal Decision primitive. Artifact manifests are deterministic and structurally simpler than semantic authorities. The strongest remaining assumption after a PASS would shift toward **adapter truthfulness**: whether a domain adapter itself faithfully binds real-world/domain facts rather than merely presenting a self-consistent object.

## Stop rule

Do not modify the frozen projection kernel. Preserve any failure. If the new domain requires a kernel branch, narrow the abstraction rather than widening the kernel.
