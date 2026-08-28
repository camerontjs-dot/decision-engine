# Decision Engine

Decision Engine is a decision-support research repository for turning explicit inputs and policy into inspectable recommendations without hiding uncertainty or silently acquiring authority to act.

The repository currently contains **two implemented decision heads with different scopes**, plus a separate Contract C research seam. They should not be collapsed into one maturity claim.

## Current implemented surfaces

### 1. Select / rank head: career comparison

The original application is a browser-based career comparison tool in [`src/decisionEngine.js`](src/decisionEngine.js), with the UI in [`index.html`](index.html) and [`src/app.js`](src/app.js).

It compares fictional job offers or career paths across explicit dimensions, weights, caveats, and confidence rules. The engine is deterministic and separate from the UI. Its tests cover scoring invariants, output quality, and a broad combination matrix.

This head is **domain-specific**. It is not evidence that the weighted career scorer is a general-purpose decision kernel.

A separate public repository, [`career-decision-engine`](https://github.com/camerontjs-dot/career-decision-engine), owns the standalone career-project presentation. This repository retains the implementation as a working baseline and regression surface while broader decision primitives are researched.

### 2. Gate head: one item against a stated bar

[`src/gate/gateHead.js`](src/gate/gateHead.js) implements a smaller reusable primitive for a different question:

> Does this one item clear this explicitly stated bar?

The Gate evaluates named criteria with three outcomes:

- `pass`
- `fail`
- `unknown`

The decision rule is deterministic:

```text
any blocking fail     -> reject
any blocking unknown  -> hold
otherwise             -> promote
```

`unknown` is deliberately distinct from `fail`. A missing or unobserved condition may hold a decision, but it does not manufacture an adverse finding.

The Gate does not use a combined score. It records which criteria passed, failed, or remained unknown, and advisory findings remain visible as caveats.

The implementation is pure: it performs no I/O and resolves no missing evidence. Callers supply observations. Positive outputs are recommendations, not mutations; the returned record carries `requiresHumanApproval` where the policy demands it and always records `appliedAutomatically: false`.

[`src/gate/notePromotionBar.js`](src/gate/notePromotionBar.js) is one concrete MainFrame note-promotion policy built on that primitive. It is an application of the Gate, not proof that its vocabulary is the final general Decision Engine policy model.

## Contract C research seam

The proposed Claim Audit Lab → Decision Engine handoff remains **research, not a released production contract**.

Canonical live correspondence:

- [Apparatus Contracts #4: Contract C design](https://github.com/camerontjs-dot/apparatus-contracts/issues/4)
- [Apparatus Contracts #8: living epistemic/interface state](https://github.com/camerontjs-dot/apparatus-contracts/issues/8)
- [Decision Engine #1: Contract C consumer boundary](https://github.com/camerontjs-dot/decision-engine/issues/1)

The committed [`research/contract-c-seam-shadow/`](research/contract-c-seam-shadow/) fixtures exercise a bounded shadow question: can supplied CAL-style audit state remain distinguishable as it passes through a Decision Engine Gate without turning epistemic conclusions into automatic operational authorization?

Those fixtures are not calibration gold and the validator does not independently establish CAL entailment or citation truth. It replays supplied fields and checks downstream Gate behavior.

Current architecture work is testing whether the reusable kernel should remain a small deterministic policy runtime around the Gate idea, or whether existing policy infrastructure is sufficient and a bespoke generalized engine is unnecessary. That question is intentionally unresolved.

## Run the current surfaces

### Browser career head

Open:

```text
index.html
```

The browser test page is:

```text
tests/decisionEngine.test.html
```

### Node checks

```bash
node tests/engine.sweep.mjs
node tests/output-quality.sweep.mjs
node tests/combination-matrix.sweep.mjs
node --test tests/gateHead.test.mjs
```

### Contract C shadow fixture check

```bash
node research/contract-c-seam-shadow/validate-fixtures.mjs
```

## Repository map

```text
src/decisionEngine.js              career select/rank engine
src/app.js                         career browser UI
src/gate/gateHead.js               generic named-criterion Gate primitive
src/gate/notePromotionBar.js       MainFrame-specific Gate policy

tests/                             career and Gate regression checks
research/contract-c-seam-shadow/   bounded Contract C / Gate research fixtures
docs/ENGINE_NOTES.md               career engine formulas and behavior notes
```

## Boundaries

This repository does **not** currently establish that:

- the career select/rank engine is a general decision engine;
- `promote | hold | reject` is the correct universal action vocabulary;
- Contract C is canonical or released;
- CAL conclusions directly authorize downstream action;
- synthetic Contract C fixtures validate CAL semantic correctness;
- a Decision Engine recommendation should mutate MainFrame or another external system automatically.

The current useful separation is narrower:

```text
structured state
      +
explicit policy / criteria
      ↓
inspectable recommendation
      ↓
separate authority to act
```

## License

MIT.
