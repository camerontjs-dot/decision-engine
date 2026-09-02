# Contract-first Decision policy specimen #2

**Status:** preregistered research experiment  
**Base:** `decision-engine@9f5ffc04a0184abe44dc49509058a7ff88893e30`  
**Contract C authority:** `camerontjs-dot/apparatus-contracts@5fe55f9ed5d0ee9f026ca1b077e9d70ce0487ea1`, tag `contract-c-v1.0.0`, tag object `6bd135a948e407212b2e77ec18ac5c402f93565e`  
**Contract D authority:** `camerontjs-dot/apparatus-contracts@298a1a0f7b7b6d7712e11200d04faec3e1ca169b`, tag `contract-d-v1.0.0`, tag object `6eadd688b482f3c9fce2ce5e7a2841089d852096`

## Question

What common Decision Engine machinery is actually required when a second materially different policy consumes exact validated Contract C 1.0.0 and emits exact Contract D 1.0.0?

This experiment does not redesign either contract and does not establish Authorization, execution permission, actor authority, delegation, trust, or mutation behavior.

## Contract-C inventory relevant to downstream policy

A downstream policy may legitimately inspect Contract-C-owned state after exact whole-object and canonical validation, including:

- exact Contract-B binding;
- exact CAL semantic implementation and policy identity;
- result-set execution state;
- proposition identity/content hash;
- proposition execution/completion state;
- the four explicit assessment-stage states;
- retained contribution identity, channel, and exact Contract-B evidence reference;
- measurement identity/value/basis as CAL-attributable state without importing threshold semantics;
- conclusion label/terminal branch only as CAL-attributable labels;
- causal form, typed basis members, residual contributions, and rule roles under their exact Contract-C meanings.

Contract C does not determine downstream utility, risk tolerance, routing, action vocabulary, requested operation, Authorization, execution, source legitimacy, corpus completeness, or correctness of CAL semantic judgments.

## Candidate policies considered

### Candidate A — causal-basis citation

Question: for one exact claim–evidence link, does validated Contract C establish that the retained contribution referencing that evidence passage is part of the causal basis of the completed assessed proposition conclusion?

This uses `conclusion.basis_members` and contribution/evidence binding. It can use registered Contract-D effect `knowledge.cite_as_evidence@1` without treating CAL's headline verdict as the Decision policy.

**Selected as specimen #2.** It exercises a materially different Contract-C capability, target kind, and Contract-D effect from supported-claim verification.

### Candidate B — assessment-stage completion gate

Question: do the Contract-C assessment stages establish a favorable assessment state for a claim?

**Rejected as specimen #2.** Contract C 1.0.0 has `not_performed`, performed `unknown`, performed `adverse`, `not_applicable`, and `failed`, but no generic favorable/pass value. A positive policy would have to manufacture meaning not present in Contract C. A review-dispatch policy would also require task semantics not established by Contract C plus the current bounded Decision policy context.

## Experimental policy record

- **Policy ID:** `decision-engine.contract-c.causal-basis-citation`
- **Version:** `1.0.0`
- **Policy question:** Does exact validated Contract C establish that this exact retained contribution is a causal-basis contribution for this exact completed assessed proposition, so the exact claim–evidence link may be cleared for `knowledge.cite_as_evidence@1`?
- **Accepted authority:** exact Contract C 1.0.0 canonical bytes with external whole-object SHA-256, exact released Contract-C validator checkout, exact expected Contract-B binding, and explicit Decision policy context.
- **Target kind:** `claim-evidence-link`.
- **Target binding:** target logical ID is `claim-evidence-link:<proposition_id>:<contribution_id>`. Target `content_sha256` is SHA-256 of the deterministic canonical JSON projection containing the exact proposition ID/text hash plus exact contribution ID/channel/evidence reference. The projection uses recursively lexicographically sorted keys, compact JSON, UTF-8, and one trailing LF.
- **May inspect:** result-set execution; requested proposition identity/content hash; proposition execution/completion; requested retained contribution identity/channel/evidence reference; contribution membership in `conclusion.basis_members` namespace `contribution`.
- **Must ignore for disposition:** `reported_verdict`, `terminal_branch`, `causal_form`, measurement value/kind/basis, assessment-stage values, CAL producer-private policy payload contents, and rule/state basis members. Those fields remain authoritative Contract-C state but this policy does not use them to decide CLEAR/HOLD.
- **CLEAR:** result set completed; requested proposition exists and completed with `completion=assessed`; requested contribution exists; exact target binding matches; contribution is present in the proposition conclusion's causal basis as namespace `contribution`.
- **HOLD:** exact target is identified, but result-set execution is not completed, proposition execution is not completed/assessed, or the retained contribution is residual/non-deciding rather than in the causal basis.
- **Evaluation failed:** the requested proposition or requested contribution cannot be identified in otherwise valid exact Contract C. Failed evaluation has no effect.
- **Effect:** `knowledge.cite_as_evidence@1`, empty parameter schema.
- **Reason codes:** diagnostics only. They distinguish incomplete result/proposition state, non-assessed completion, residual contribution, and missing target identity without adding authority.
- **Unknown/missing behavior:** malformed/missing Contract-C-required state is rejected by the exact Contract-C validator. Valid but policy-ignored unknown state does not change the Decision. Unknown/missing requested proposition or contribution yields evaluation failure, not favorable or adverse epistemic reinterpretation.

## Non-claims

A CLEAR Decision under this policy does not establish that:

- the evidence statement is true;
- the source is legitimate or trustworthy;
- the corpus is complete;
- the contribution is independently sufficient unless Contract C separately says so;
- the CAL conclusion is correct;
- the passage should be cited for a different proposition;
- a citation is complete or publication-ready;
- any actor is authorized to mutate knowledge state.

Under exact Contract-D applicability, CLEAR may become only `candidate_for_authorization`.

## Preimplementation falsifiers

The experiment must fail closed or preserve the correct weaker outcome for at least these cases:

1. valid causal contribution -> CLEAR;
2. valid residual contribution -> HOLD;
3. genuine target-identification failure -> evaluation failed;
4. stale/wrong Contract-C whole-object SHA-256;
5. wrong expected Contract-B binding;
6. wrong policy ID or version;
7. target ID substitution;
8. target content substitution;
9. valid policy-ignored unknown/assessment mutation does not change authority;
10. malformed/missing Contract-C-required state is rejected;
11. Contract-D effect substitution cannot be reused as citation authority;
12. Contract-D effect-parameter substitution is rejected for the empty parameter schema;
13. metadata mutation does not change Contract-D semantic identity;
14. same logical claim/contribution IDs with changed immutable contribution content reject a stale target hash;
15. result/proposition execution state can HOLD without converting that state into a subject-matter verdict;
16. exact Contract-D consumer returns only `candidate_for_authorization`, never Authorization;
17. specimen #1 regression remains unchanged.

## Controlled variables

- Contract C and D release identities remain frozen.
- Contract-D effect registry remains frozen.
- Existing maintained supported-claim verification implementation remains unchanged during specimen #2 implementation.
- Fixtures are constructed from frozen Contract-C authority solely to test Decision Engine behavior. Synthetic validity does not establish current CAL reachability or upstream producer correctness.

## Environment deviation

The interactive execution environment cannot resolve public GitHub network addresses, so local clone/test execution is unavailable. Repository reads/writes use the connected GitHub authority surface and the experiment executes in GitHub Actions. This changes the execution venue, not the contract authority or preregistered semantics.

## Disposition rule

Allowed terminal research dispositions are `SUPPORTED FOR PROMOTION`, `FALSIFIED`, `INCONCLUSIVE`, or `SUPERSEDED`. Green CI alone is not a disposition.
