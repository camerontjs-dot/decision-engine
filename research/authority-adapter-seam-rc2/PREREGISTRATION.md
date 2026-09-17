# Decision Engine authority-adapter seam RC2 preregistration

## Classification

Draft Research only. This experiment must not modify maintained `src/**`, `scripts/**`, or `tests/**`, and must not authorize promotion, release, Contract C2 changes, Authorization, or execution.

## Subject

Parent evidence record: Decision Engine Draft Research PR #77 terminal head `97727a7d2f61c46b4e7ef3e11279fb0af7b915cd`.

The experiment preserves the exact previously tested projection kernel SHA-256 `e12d53020b3a6a046f4ee7688db0a5ea5c5e0a63e758b1c1e5711e7b227759e3`.

## Question

Can materially different trusted authority domains converge on one unchanged post-admission Decision seam without making the Decision projection kernel domain-aware or allowing callers to move the trust anchor?

## Phases

1. **CAL/C2 shadow seam**: independently verify the exact C2/B/resolver authority, adapt the admitted result to the frozen projection seam, and require exact Decision plus canonical Contract-D byte equality with the current maintained C2 policy path.
2. **Git-bound artifact-manifest replay**: rerun the frozen heterogeneous artifact-manifest experiment against the same frozen projection-kernel identity and require all prior source-binding, incompleteness, and cross-adapter controls to pass.
3. **Signed content-addressed authority**: introduce one research-only Ed25519 authority adapter with a fixed trusted public key, verify artifact bytes/digest/signature/producer/version, then route it through the unchanged projection seam. A valid but unfavorable signed fact must be admitted and produce policy HOLD rather than ingress rejection.
4. **Cross-adapter and implementation-substitution audit**: test C2/signature laundering, wrong signer, digest rebinding, target substitution, trusted-version mismatch, caller-selected trust key, caller policy-registry injection, caller adapter-implementation injection, and the existing RC1 collusion controls.

## Acceptance conditions

All must hold:

- the frozen projection-kernel bytes remain unchanged;
- CAL/C2 legitimate baseline produces exact Decision equality and exact canonical Contract-D byte equality with the maintained path;
- the five RC1 C2 substitutions are rejected before policy under independently established authority while the preserved weak/colluding control remains demonstrably unsafe;
- the frozen artifact-manifest R2 replay passes unchanged;
- a third signed authority reaches the same projection seam without CAL/Git vocabulary entering the kernel;
- wrong signer, stale digest, recomputed digest with stale signature, attacker re-signing, authority-type relabeling, exact-version mismatch, and cross-adapter laundering are rejected at the appropriate adapter/resolver boundary;
- a valid signed authority carrying an unfavorable domain fact is admitted and yields HOLD through policy rather than becoming an ingress failure;
- caller-supplied adapter or policy implementation substitution cannot alter the trusted research runtime, while an explicitly weak direct-kernel/caller-registry control demonstrates why the raw projection kernel is not itself an external trust boundary;
- the branch contains no maintained Decision source/script/test mutation relative to the parent head.

## Falsifiers

Record the architecture as falsified or requiring narrowing if any legitimate domain requires changing the frozen projection kernel, if caller-controlled metadata can move an adapter trust root, if cross-adapter reinterpretation succeeds, if CAL exact-output reproduction fails, or if the third authority requires domain branching inside the projection kernel.

## Non-claims

A pass would support only the tested post-admission seam and trusted maintained-adapter pattern. It would not establish arbitrary plugins, arbitrary external systems, caller-installed adapters, caller-installed policies, a universal raw-ingress schema, or production readiness.
