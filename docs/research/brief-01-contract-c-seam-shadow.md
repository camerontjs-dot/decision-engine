# Research brief 01: Contract C seam shadow

**Status:** preregistered shadow experiment, not a production contract decision  
**Branch:** `research/contract-c-seam-shadow`  
**Upstream dependency:** Evidence Bundler Contract-B seam research + Apparatus Contract-B CAL consumer candidate  
**Downstream target:** MainFrame `10_knowledge/` operator promotion gate

## Research question

What is the **smallest provenance-bound CAL state that must cross CAL → Contract C → Decision Engine** so a downstream policy can make a reconstructable decision without:

1. treating CAL as world truth;
2. re-running or reverse-engineering CAL's semantic audit;
3. depending on incidental model telemetry;
4. inventing defaults for unknown state; or
5. acquiring authority to mutate MainFrame knowledge by itself?

This branch does not change the existing career-decision behavior on `main`, released CAL behavior, released Evidence Bundler behavior, the locked C-B schema, or MainFrame promotion rules.

## Integration target

The intended first real use is MainFrame durable knowledge:

```text
10_knowledge synthesized note
  claim as written
  note identity / content hash
  source links
          │
          ▼
Evidence Bundler
  traceable evidence aperture over preserved raw/source material
          │
          ▼
Contract B
          │
          ▼
Claim Audit Lab
  semantic measurement
  assessment / decision basis
  support verdict + explicit unresolved state
          │
          ▼
Contract C candidate
          │
          ▼
Decision Engine
  destination-specific deterministic policy
          │
          ▼
Decision receipt
  promotion_candidate | human_review_required | retain_synthesized | blocked
          │
          ▼
MainFrame operator promotion gate
```

MainFrame remains the authority that mutates note lifecycle state. In this experiment Decision Engine can nominate a claim as a `promotion_candidate`; it cannot set `status: stable` itself.

## Why Contract C should exist

A raw CAL trace is a rich implementation record. A downstream decision system should not have to know which NLI logit, retrieval score, support-signal intermediate, or internal feature happened to produce a verdict.

The decision boundary needs a smaller semantic object:

- what exact claim was audited;
- what exact C-B bundle was audited;
- which CAL/rules/config produced the result;
- the final support degree and abstention reason when applicable;
- non-exclusive audit flags;
- citation status;
- audit confidence;
- explicit unresolved state;
- the decision basis / assessment receipts when available;
- immutable result identity.

The working hypothesis is that this is enough to make downstream policy replayable while keeping CAL implementation internals on CAL's side of the seam.

## Candidate ownership boundary

### Contract B / Evidence Bundler owns upstream evidence-world state

Per the existing seam research, Contract B should preserve evidence identity, provenance, admitted evidence, preparation history, and mechanically supplied/source-declared facts without turning retrieval nomination into a CAL semantic judgment.

### CAL owns audit state

CAL owns:

- claim ↔ passage semantic measurement;
- proposition-specific assessment;
- support/refutation relation;
- eligibility / validity / applicability where the policy defines them;
- completeness/aperture conclusion;
- final audit support verdict or abstention;
- audit flags;
- citation assessment;
- audit confidence;
- the decision basis and audit trace.

### Contract C owns the handoff representation

Contract C should preserve the **decision-relevant audit result and lineage**, not every implementation detail.

Candidate C-C fields in RC0:

```text
profile
upstream.contract_b_bundle_id
upstream.contract_b_bundle_sha256
claim.claim_id
claim.claim_text
claim.claim_text_sha256
audit.cal_version
audit.audit_config_hash
audit.rules_version
audit.rules_hash
audit.support_verdict
audit.support_verdict_reason
audit.audit_flags[]
audit.citation_status
audit.audit_confidence
audit.rules_fired[]                 # IDs only in RC0
audit.explicit_unknowns[]
audit.decision_basis_passage_ids[]
audit.decision_basis_passage_hashes[]
audit.assessment_receipt_hashes[]
integrity.cal_result_sha256
```

### Decision Engine owns destination policy

Decision Engine owns:

- the decision policy ID/version;
- thresholds that are genuinely downstream policy rather than CAL measurement thresholds;
- mapping audit state to downstream disposition;
- escalation / human-review requirements;
- generation of a reconstructable decision receipt.

Decision Engine does **not** own evidence retrieval, semantic entailment, claim rewriting, or MainFrame status mutation.

## Important semantic rule

> **CAL result ≠ world truth. Contract C preserves what CAL concluded about a supplied claim and supplied evidence under a pinned audit policy. Decision Engine decides what a downstream system is allowed to do with that audit state.**

This keeps the audit and the decision from collapsing into one authority.

## Candidate dispositions

RC0 uses four deliberately operational dispositions:

### `promotion_candidate`

The supplied CAL state satisfies the shadow policy's minimum conditions. This means only that the claim may proceed to MainFrame's promotion review.

It does **not** mean `stable`, true, or automatically publishable.

### `human_review_required`

The audit is informative but a decision-relevant condition prevents clean policy disposition. Examples: partial support, explicit unknown state, review-only flags, citation weakness, or confidence below the shadow threshold.

### `retain_synthesized`

The audit cannot support promotion and does not establish a hard adverse conclusion. The claim remains at its current synthesized state pending better evidence or a better-formed proposition.

A CAL `not_checkable` abstention belongs here in RC0 unless destination policy explicitly requires escalation.

### `blocked`

The claim as written is not promotion-eligible under the supplied audit state. RC0 uses this for `unsupported`, `contradicted`, and blocking failure flags such as `overstated`.

`blocked` does not authorize destructive deletion or automatic claim rewriting.

## Shadow policy

RC0 intentionally starts conservative:

- support must be `supported` for promotion candidacy;
- audit confidence must be `high`;
- citation status must be `correct` or `not_applicable`;
- no explicit decision-relevant unknowns may remain;
- `overstated`, `source_scope_error`, `missed_counterevidence`, and `coverage_loss` block the claim as written;
- `inferred` and `false_caution` require review;
- all positive results still require an operator before MainFrame lifecycle mutation.

These values are **test policy**, not a claim that they are the final MainFrame promotion policy.

## Preregistered variants

### C0: raw CAL trace as decision input

Decision Engine reads the entire CAL implementation trace.

Expected weakness: excessive coupling. Incidental telemetry or CAL refactors can become accidental decision dependencies.

### C1: minimal Contract-C projection

Decision Engine receives only the candidate fields above.

This is the preferred hypothesis.

### C2: full audit-receipt package

C1 plus all CAL measurement/assessment receipts and implementation trace detail.

This is intentionally over-complete and serves as a comparison condition.

## Test rungs

### Rung 1: lineage preservation

C1 must preserve exact C-B bundle identity, exact claim identity/text hash, CAL/rules/config identity, and CAL result identity.

**Falsifier:** a decision can be replayed without knowing which claim or evidence bundle CAL actually audited.

### Rung 2: implementation-telemetry invariance

Mutating raw NLI logits, retrieval scores, support probabilities, or explanation prose while holding the decision-relevant CAL result fixed must not change C1.

**Falsifier:** an incidental CAL telemetry value changes Contract C despite no audit-state change.

### Rung 3: decision-state sensitivity

Changing support verdict, audit flag, citation status, explicit unknowns, claim identity, or upstream bundle identity must change C1.

**Falsifier:** a state that downstream policy legitimately depends on can change invisibly.

### Rung 4: explicit abstention preservation

`not_checkable` requires a reason. Missing reason must fail closed. A valid abstention must remain an abstention downstream rather than becoming favorable or adverse evidence by default.

**Falsifier:** an unknown/abstained CAL result becomes a promotion candidate through omission or defaulting.

### Rung 5: no claim laundering

An `overstated` claim is blocked **as written**. Decision Engine must not automatically weaken or rewrite it until it passes.

**Falsifier:** the engine edits proposition text to fit the evidence and then treats that edit as the audited claim.

### Rung 6: operator-gate preservation

Even a `promotion_candidate` decision receipt must carry `mainframeStatusMutation: null` and require the MainFrame/operator gate.

**Falsifier:** the shadow engine directly writes `stable` or otherwise mutates durable knowledge state.

### Rung 7: replay determinism

Identical C1 state and identical policy must produce byte-equivalent canonical decision receipts.

**Falsifier:** hidden time, randomness, model calls, or unordered sets change the disposition.

## MainFrame-specific contract notes

The tracked MainFrame rules imply several requirements for the eventual adapter:

1. `type: raw` content remains immutable evidence.
2. A `type: note` in `10_knowledge/` should identify the source it derives from.
3. `synthesized` is not a verified status.
4. `stable` / `audited` require checkable verification evidence.
5. A `needs-audit` tag cannot coexist with an earned verified status.
6. A promotion receipt must be a real, resolvable artifact rather than a decorative field.

Therefore a future MainFrame adapter should write a decision/audit receipt first, then perform any lifecycle mutation as a separate explicit action that references that receipt.

## Upstream MainFrame adapter gap

There is a separate upstream problem that Contract C does not solve:

> How do claims from a synthesized `10_knowledge/` note and the note's preserved raw/source lineage become a measurement-ready Evidence Bundler input?

The current Contract A is apparatus/harness-specific. This experiment does **not** silently redefine C-A around MainFrame.

A future MainFrame knowledge adapter should be tested as its own profile. At minimum it will need to preserve:

- note path and content hash;
- claim ID/text/text hash;
- claim location in the note;
- claim type where already declared;
- source/raw references and hashes;
- explicit missing-source state;
- note lifecycle state and `needs-audit` state;
- no invented source metadata when retrieval did not happen.

That is an adapter problem upstream of Evidence Bundler, not a reason to overload Contract C.

## Relationship to Contract B work

Contract C should not be locked on top of an ambiguous Contract B.

The existing Contract-B seam research already supports the distinction:

```text
EB evidence-world fact / preparation state
              ≠
CAL proposition-specific audit judgment
```

Contract C extends the same discipline downstream:

```text
CAL audit state
              ≠
Decision Engine destination policy
              ≠
MainFrame lifecycle mutation authority
```

The two contracts therefore form a chain of explicit ownership rather than a pipeline of increasingly authoritative-looking JSON.

## Promotion criteria

Support the Contract-C candidate if the shadow shows:

- C1 keeps all decision-relevant lineage and audit state;
- irrelevant CAL telemetry does not leak into C1;
- decision-relevant mutations are visible;
- abstention stays explicit;
- claim text is not rewritten;
- operator authority remains outside the engine;
- decision replay is deterministic.

Do not lock C-C if:

- Decision Engine repeatedly needs raw CAL internals to make legitimate decisions;
- an essential audit judgment is absent from C1;
- C1 includes values that are really downstream policy;
- the decision engine needs to rediscover evidence-world facts from raw sources;
- CAL unknown state cannot be represented without silent defaults;
- a positive decision cannot be separated from MainFrame lifecycle mutation.

## Next gate

After this structural shadow passes:

1. define a canonical Contract-C candidate profile in `apparatus-contracts`;
2. bind it explicitly to the Contract-B candidate lineage;
3. run a real four-surface fixture: Evidence Bundler → Contract B → CAL → Contract C → Decision Engine;
4. run the same case against a frozen MainFrame synthesized note + raw-source fixture;
5. only then decide whether Contract C is ready for a versioned schema and whether the MainFrame adapter deserves a separate apparatus profile.
