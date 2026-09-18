# Causal Jurisdiction Carrier Discriminator RC0 — Terminal Result

Date: 2026-09-18

Classification: Draft Research / evaluator-invalid terminal.

## Disposition

**INCONCLUSIVE_EVALUATOR_INVALID.**

The frozen weak-strategy discriminator passed and demonstrated that unbound caller routing is relabelable.

After candidate exposure, the bound-manifest evaluator executed all hostile controls and recorded ten rejected attacks, but the frozen evaluator ended with:

`assert.equal(attacks.length, 9)`

The actual frozen attack set contains ten cases:

1. causal relabeled ordinary;
2. ordinary relabeled causal;
3. wrong manifest digest;
4. stale manifest from another C2;
5. wrong C2 binding;
6. wrong proposition ID;
7. wrong proposition content hash;
8. unknown jurisdiction;
9. extra manifest field;
10. missing manifest.

The run therefore failed on evaluator bookkeeping `10 !== 9`, not on an observed accepted hostile case.

## Exact evidence

- pre-candidate apparatus head: `4e61deda4c482dbf5bcf4703b301d164eddf574a`
- pre-candidate run: `35362818679`
  - exact parent/C2 identity: PASS
  - frozen weak discriminator: PASS
  - candidate import: absent as intended
- first exposed candidate head: `78960a753538ab3d34c01bff93a1e72c64b24f74`
- exposed run: `35362931562`
  - exact parent/C2 identity: PASS
  - weak discriminator: PASS
  - candidate evaluator reached final hostile-count assertion
  - final failure: evaluator expected 9, observed 10

## Consequence

No candidate qualification claim is made from RC0 despite the ten observed rejections.

A fresh RC1 must restart from the exact Decision C2 integration parent, freeze the corrected ten-control evaluator before candidate exposure, and only then expose a candidate.

No maintained source, Contract C, production policy, Authorization, execution, merge, or release was changed.
