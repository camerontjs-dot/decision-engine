# Decision Engine v1.0.0 Capability Questions

This file records product/use-case questions surfaced by RC0 without pretending the current two-policy surface already answers them.

## Maintained V1 decisions

Decision Engine v1.0.0 currently exposes two maintained questions only:

1. Is this exact completed assessed Contract C proposition reported `supported`, so `knowledge.add_verified_tag@1(scope=claim)` may become a candidate for downstream Authorization?
2. Is this exact retained contribution in the causal basis of this exact completed assessed proposition, so `knowledge.cite_as_evidence@1` may become a candidate for downstream Authorization?

These are useful primitives for audited claim state and exact citation selection. They are not document/workflow approval semantics.

## MainFrame-shaped questions not currently represented

- Is an entire synthesized note ready to move from `needs_review` to an audited/approved lifecycle state?
- Have all material claims in that note been audited to an acceptable policy-specific state?
- Are all citations used in the note exact deciding/acceptable evidence links?
- Does the note require human review even though some atomic claims CLEAR?
- Should missing or held claims trigger evidence remediation rather than merely remain unverified?

## SOP / controlled-document questions not currently represented

- Is an SOP or controlled requirement approved for issue/use?
- Are all required clauses present and individually supported by governing authority?
- Does one unsupported or not-checkable requirement block document approval?
- Is approval conditional on training, effective date, QA signature, change-control state, or other non-claim authority?
- Should the effect be document approval, routing for review, remediation, rejection, or no action?

## Regulated publication / quality questions not currently represented

- Is a claim acceptable for regulated external publication/use, not merely supported by evidence?
- Does provenance/source class satisfy a domain policy?
- Has temporal applicability/freshness actually been established?
- Is aperture/completeness adequate for the intended decision?
- Does a contradiction require retraction or escalation rather than HOLD?

## Software/research qualification questions not currently represented

- Is a candidate release approved for regression maintenance?
- Is independent reproduction required before production promotion?
- Does a frozen artifact set satisfy a required completeness policy?
- Should a task be dispatched to resolve a missing qualification condition?

Prior research demonstrated these sorts of non-CAL authority families can project through a bounded Decision materialization seam, but they are deliberately outside the maintained v1.0.0 raw authority/policy surface.

## Product implication under test

A likely useful product boundary is:

`domain authority -> domain-specific target resolver -> fixed domain policy -> bound Decision materialization -> Contract D -> Authorization`

V1.0.0 maintains only the Contract C domain and two policies. RC0 should help decide which additional policy/domain is valuable enough to test next rather than turning the engine into a generic caller-programmable rule registry.

## Candidate next policy experiments after RC0

These are hypotheses, not implementation commitments:

1. **MainFrame audited-note promotion**
   - authority: exact note + complete exact set of per-claim/per-citation Decisions or their source authorities;
   - target: note lifecycle transition candidate;
   - likely outcomes: CLEAR/HOLD/FAILED with typed candidate effect for later Authorization.

2. **Controlled-document readiness**
   - authority: exact document/revision plus required claim/control assessments and workflow state;
   - target: controlled document/revision;
   - likely effect: candidate for approval/review routing, never direct issuance.

3. **Regulated publication claim use**
   - authority: exact claim plus evidence/semantic assessment and publication-policy context;
   - target: exact claim-in-artifact placement;
   - likely effect: candidate for publication/use, remediation, or human review.

Each would need its own authority contract, target binding, policy falsifiers, and effect semantics. None should be simulated by changing the meaning of `knowledge.add_verified_tag` or `knowledge.cite_as_evidence`.
