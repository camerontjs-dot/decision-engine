# Contract D Schema Bake-off RC0 — Results

Base: `ff7a0f63e5f7075b192dff04064b950bf7255ffa`

Preregistration freeze: `6d6f003cc705264e4f8ecda24602da1da1820bc0`

Executed head: `c6824ecf6a5cb75b165195a39765582481fe6c95`

Hosted run: `33289298195`

## Observed

All three candidate representations A, B, and C passed the implemented RC0 semantic checks:

- semantic round-trip;
- deterministic canonicalization;
- cross-use-case denial when effect/action does not match;
- completed HOLD vs evaluation failure distinction;
- Decision byte invariance under authorization-only context changes;
- Decision identity change under policy-version mutation;
- authorization/execution field injection did not acquire authority through the candidate decoder.

The preregistered negative controls failed in the intended directions:

1. generic eligibility without typed effect allowed citation-clear to masquerade as task-dispatch authority and task-dispatch-clear to masquerade as tag authority;
2. embedding authorization posture in Decision caused Decision identity to change when approval changed;
3. collapsing completed HOLD and evaluation failure destroyed the distinction between a policy conclusion and failure to establish one.

## RC0 disposition

`MULTIPLE_SHAPES_EQUIVALENT`

This is not evidence that representation is irrelevant. It means the current tests establish several **semantic requirements** but do not discriminate among flat, structured-effect, and typed-payload encodings.

## Supported requirements from RC0

The following survived direct negative controls and should be treated as candidate Contract D requirements for the successor experiment:

- exact input-authority identity;
- exact target identity;
- exact decision-policy identity/version;
- explicit evaluation state separate from disposition;
- operation/effect binding more specific than generic eligibility;
- Decision identity invariant to Authorization-only state;
- deterministic canonical identity;
- Authorization/Execution fields carry no Decision authority.

## Not yet established

RC0 did not establish:

- whether effect belongs in a generic typed-effect object or policy-specific payload;
- whether reason/basis codes are semantically required for every completed decision;
- exact unknown-field policy;
- exact extensibility/versioning mechanism;
- whether target content hash is always required versus target identity plus upstream immutable identity;
- independent implementation conformance;
- cross-repository consumer ergonomics;
- stale/superseded Decision handling.

## Successor discriminator

RC1 should stop comparing JSON aesthetics and instead test **evolution and independent consumption**.

The strongest remaining assumption is that A/B/C are equivalent under future policy/effect evolution. Falsify it with:

1. an independent consumer that has never seen Decision Engine internals;
2. known-version and unknown-future effect/payload fixtures;
3. policy evolution that adds policy-specific machine semantics;
4. strict versus tolerant unknown-field handling;
5. field ablation, especially basis and target hash;
6. canonicalization/version migration;
7. a consumer attempting Authorization from D plus actor/action/context.

If a generic typed effect remains sufficient across those mutations, policy-specific payload machinery is unnecessary. If policy-specific semantics cannot be represented without overloading generic fields, C gains evidence. If flat A remains equally safe and independently evolvable, nesting itself has no evidentiary justification.
