# Decision / Authorization Cross-Use-Case RC1 — Results

Primary disposition: **SUPPORTED FOR PROMOTION**

Promotion scope is narrow:

> Treat Decision and Authorization as separate interfaces, and treat a typed policy effect (or equivalent action-binding output) as load-bearing at the Decision → Authorization seam.

This does not authorize Contract D 1.0.0, production authorization, automatic MainFrame mutation, or a universal authorization engine.

## Frozen authority

- Decision Engine base: `cd5a471703e6682b7e8281bc954a135996cac58e`
- MainFrame Live authority inspected: `cf216d90251586f2b4976e0240a427bc439fe9bf`
- parent seam evidence: Decision Engine PR #14
- preregistration first commit: `6ee49dcbdf4d466ad565c4495b67d57b2a1920fd`
- final tested implementation head: `97576734578801be63fa0a64f4ad7813c2d26126`
- hosted RC1 PR run: `33288646619` — SUCCESS
- ordinary repository CI: `33288646613` — SUCCESS
- hosted RC1 push run: `33288645090` — SUCCESS

## Frozen Decision specimens

| Use case | Raw SHA-256 |
| --- | --- |
| source audit | `599945c366c0dfb806afc3bed5be57d5e5fbff62cc1d220077b7caf56e72fe91` |
| citation permission | `11c5e39e18a27f07d1f7b9f7b0e0cef2950a73e6d1adf8af65c781173fd2b895` |
| task dispatch | `9115ff9868101d9e53c2c721901357a4677051029d1f1621233425a05f3c8e9e` |

All three conformed to the same structural Decision envelope.

## OBSERVED

### Common envelope

All three cases used exactly these structural fields:

- `decision_envelope_version`
- `input.authority_kind`
- `input.authority_id`
- `policy.id`
- `policy.version`
- `target.kind`
- `target.object_id`
- `target.content_sha256`
- `decision.disposition`
- `decision.effect`
- `decision.reason_codes`

No use case required actor, requested action, approval state, delegation profile, or execution state inside Decision.

### Source audit

With one byte-identical source-audit Decision:

- current manual profile, no approval → `require_approval`
- same Decision + human approval → `permit`
- same Decision + research delegated-low-risk profile → `permit`
- same Decision + delegated profile in medical domain → `require_approval`
- wrong requested action → `deny`
- target substitution → `deny`

The research delegation profile is a counterfactual authorization consumer, not current MainFrame production policy.

### Citation permission

With one byte-identical citation Decision:

- governed agent + `cite_as_evidence` → `permit`
- wrong requested action → `deny`
- target substitution → `deny`
- weakening only Decision disposition to `hold` → `deny`

This mirrors the observed MainFrame distinction in which `citable` is usable, `unverified` is nomination rather than evidence, and `not_citable` is excluded from citation use.

### Task dispatch

With one byte-identical task-dispatch Decision:

- no operator approval → `require_approval`
- same Decision + operator approval → `permit`
- wrong actor → `deny`
- target substitution → `deny`
- superseded Decision context → `deny`

This mirrors the observed MainFrame architecture in which reviewed task eligibility is separate from later dispatch approval.

### Decision invariance

Every context-only variation returned the exact frozen Decision SHA for its use case.

Authorization changed while Decision bytes did not.

### Cross-use-case substitution

The strong consumer denied:

- citation Decision + `dispatch_task`
- task-dispatch Decision + `add_verified_tag`

Both failed as `action_effect_mismatch`.

### Weak control

A deliberately weak consumer that checked only `decision.disposition == eligible` and target identity **permitted both cross-use-case substitutions**.

Therefore the apparatus discriminated between:

- a typed Decision effect that binds policy conclusion to the class of operation being authorized; and
- a plausible but unsafe generic “eligible” design.

### Missing effect

Removing `decision.effect` made the common Decision envelope invalid and authorization denied.

### Authority smuggling

Adding top-level actor, delegation-profile, and automatic-application fields to a Decision made the common envelope invalid. The injected fields did not acquire authority.

### Production isolation

The RC1 research code:

- performed no external file write;
- spawned no process;
- made no network request;
- imported no MainFrame production code;
- modified no Decision Engine production source;
- modified no Gate tests or Select/Rank machinery.

Production Gate baseline and ordinary repository CI remained green.

## INFERENCE

The one-use-case seam result from RC0 generalizes across three materially different MainFrame policy questions.

The evidence supports a common boundary in which:

### Decision owns

- authoritative input identity;
- target identity;
- decision-policy identity;
- policy disposition;
- typed policy effect;
- machine-readable decision basis / reason codes.

### Authorization owns

- actor;
- requested operation;
- approval state;
- delegation/autonomy profile;
- operational domain/risk restrictions;
- permission validity/supersession context.

### Execution owns

- whether an action was actually attempted/applied;
- idempotency/replay handling;
- execution outcome;
- mutation receipt.

A typed effect or equivalent policy-specific action binding is load-bearing. A generic eligible/clear disposition alone is too weak.

## HYPOTHESIS retained

A useful architecture can likely be expressed as:

`upstream authority → Decision contract → Authorization policy/capability → Executor → Receipt`

where the same Decision may be consumed under different authorization postures without semantic mutation.

## UNKNOWN

RC1 does not establish:

- final Contract D field names or enum vocabulary;
- whether `effect` should be a string, typed payload, capability class, or policy-specific schema;
- whether authorization should be a durable contract, capability token, query result, or enforcement-point decision;
- whether human approval is itself an authorization object or a separate signed/recorded input;
- whether every future Decision Engine use case fits this common envelope;
- whether risk/domain belongs in authorization input or an earlier policy decision for every domain;
- canonical Contract D versioning, signing, expiry, or revocation semantics.

## Falsifier review

No preregistered falsifier was observed.

The weak disposition-only consumer failed the intended cross-use-case attack, while the typed-effect consumer rejected it.

## Terminal disposition

**SUPPORTED FOR PROMOTION**

The smallest justified promotion is architectural, not operational:

1. Decision and Authorization are separate interfaces.
2. Authorization may vary without rewriting Decision semantics.
3. Authorization must bind the requested operation to a typed Decision effect or equivalent policy-specific output.
4. Execution remains separate from both.
