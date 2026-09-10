# Working Thoughts — What Might Sit Upstream of Decision Besides CAL?

This is a research notebook, not a decision record. It deliberately preserves alternatives and doubts that may later be falsified.

## Reframing the seam

The promising abstraction is not `claim audit -> Decision` and probably not `Contract C -> Decision` either.

A more general candidate is:

```text
independently established assessment authority
                  |
                  v
          exact Decision target
                  |
                  v
          versioned Decision policy
                  |
                  v
          FAILED / HOLD / CLEAR
                  |
                  v
          typed candidate effect
```

CAL is one assessment producer. The key upstream property is that the producer owns the difficult domain-specific question and emits a bounded, evidence-bound assessment. Decision owns the separate question of what a particular policy does with that assessment.

This separation is useful only if Decision does not have to re-run the evaluator or silently rebuild its semantics.

## Candidate non-CAL producers

### 1. Research / release qualification

A qualifier consumes exact candidate identity plus frozen tests, conformance runs, mutation results, provenance, reproduction receipts, and known deviations. It emits a bounded qualification state. Decision can then apply different policies to the same state: continue research, request promotion review, block production promotion, request another reproduction, and so on.

Why it is attractive:

- the project already produces costly-to-fake evidence of this type;
- no linguistic entailment or claim-audit semantics are needed;
- the same assessment can legitimately yield different decisions under different promotion policies;
- it naturally preserves the separation between evidence/assessment and operational Authorization.

Main risk: release qualification can become a policy bundle itself. The producer must report what the evidence establishes; it must not smuggle the downstream promotion decision into the assessment.

### 2. Agent-result verification

An independent verifier consumes exact task request, starting state, agent output, diff, tests, receipts, and target bindings. It emits `verified`, `adverse`, `incomplete`, or `not_checkable`-like state with the causal verification basis.

Decision can then decide whether to accept a result candidate, retry verification, request another agent, escalate to the operator, or make a typed downstream effect eligible for Authorization.

Why it may ultimately be the strongest MainFrame use case:

- it prevents the generating agent from self-authorizing its own success;
- it can preserve Raw terminal state and test receipts independently of agent prose;
- it is materially different from claim auditing while retaining the evidence -> assessment -> Decision separation.

Main risk: `accept`, `retry`, and `escalate` effects are not all represented in current Contract D's tiny effect registry. Testing this honestly may require either choosing only `task.dispatch@1` or explicitly treating effect vocabulary as a separate contract question.

### 3. Model evaluation

A model-eval harness consumes an exact candidate model/config and exact benchmark/evaluator outputs. It establishes bounded capability, safety, regression, robustness, or calibration findings. Decision policies then decide deploy/shadow/restrict/retest/review.

Why attractive: strong analogy to CAL's evaluator-under-test discipline and clear separation between measurements and deployment policy.

Risk: model evaluation often produces multidimensional distributions rather than a single bounded conclusion. A too-thin generic authority could erase the information policies actually need.

### 4. Data-quality / lineage qualification

A producer assesses exact dataset/version against freshness, schema, completeness, lineage, drift, and provenance evidence. Decision can decide publish/quarantine/use-for-training/reprocess under different policies.

Risk: decisions may require quantitative thresholds not naturally represented by a single headline outcome, so the authority likely needs typed findings rather than only a conclusion label.

### 5. Security finding / exploitability assessment

A verifier consumes exact artifact/environment plus scanner findings, reproduction evidence, reachability, exploitability tests, and mitigations. It establishes applicable/adverse/unresolved state. Decision policies determine whether release is blocked, remediation is required, or operator review is needed.

Risk: risk tolerance belongs downstream, but exploitability/severity boundaries are often already policy-laden upstream. Ownership has to be explicit.

### 6. Compliance/control testing

A control tester consumes exact control scope/period plus records and test evidence, and establishes operated-effectively/adverse/unknown/not-applicable state. Decision decides whether evidence is accepted, remediation is required, or a regulated process should be held.

Risk: legal/regulatory applicability can straddle assessment and policy. The split must not pretend a normative legal conclusion is a purely factual measurement.

### 7. Incident diagnostic assessment

Diagnostic machinery consumes telemetry and experiments and establishes bounded causal hypotheses. Decision selects rollback/isolate/page/gather-more-evidence policies.

Risk: this is harder because interventions have immediate operational consequences and causal uncertainty may be richer than the current Decision envelope.

## Why release qualification is the first discriminator

Release qualification is not chosen because it is the ultimate use case. It is chosen because it gives the cheapest honest falsifier of the primitive hypothesis:

- real non-CAL evidence already exists;
- exact candidate identity exists;
- evidence can be frozen without inventing a toy world;
- a bounded assessment can be produced without language-model semantics;
- two downstream policies can disagree on the same assessment for legitimate reasons;
- current Contract D can at least represent a candidate `task.dispatch@1` effect.

If the generic kernel fails even here, generalizing from CAL is premature.

## Current candidate primitive

Tentatively:

`AuthorityBoundPolicyProjection`

Inputs:

- exact immutable assessment authority;
- exact target expectation;
- exact policy identity/version;
- policy registry;
- exact Decision-output authority.

Generic responsibilities:

- validate and bind authority identity;
- bind target identity/content;
- dispatch an exact policy;
- preserve failed versus completed/hold/clear;
- bind output to exact input authority, policy and target;
- emit a registered typed candidate effect;
- canonicalize deterministically.

Domain responsibilities:

- determine whether evidence is adequate;
- interpret findings/measurements;
- define what counts as support, qualification, exploitability, verification, completeness, etc.;
- specify policy-specific blockers and success predicates;
- choose an effect already authorized by the effect contract vocabulary.

## What would make this abstraction fake?

The abstraction is fake if `kernel.mjs` becomes a switchboard with branches such as:

```text
if domain == CAL ...
if domain == release ...
if target.kind == task ...
```

It is also fake if the supposedly generic authority has to rename every domain concept into claim-audit words, or if the kernel has to inspect GitHub check names to decide whether a release candidate is qualified.

A useful kernel should be boring. If it is intellectually interesting, domain policy is probably leaking into it.

## Important Contract-D limitation

Contract D 1.0.0 has only three registered effects today:

- `knowledge.add_verified_tag@1`
- `knowledge.cite_as_evidence@1`
- `task.dispatch@1`

This experiment uses `task.dispatch@1` because it is the least misleading existing effect for a promotion/review workflow. That does not establish that the current effect registry is adequate for general assessment-driven decisions. Effect-vocabulary adequacy is a separate question.

## Assessment versus Decision

A load-bearing design preference to pressure, not assume:

> Assessment producers should establish internally coherent domain state. Decision policies should consume that state, not reconstruct the producer's evaluator semantics.

If downstream policies repeatedly need raw evidence to correct or reinterpret the assessment producer, either the assessment authority is underspecified or the boundary is in the wrong place.

## Possible ladder after this experiment

1. Release-qualification assessment authority with two Decision policies.
2. Mutation test the generic kernel and each policy independently.
3. Compare the generic kernel mechanically with maintained Contract-C Decision machinery and identify only truly shared responsibilities.
4. Run a second non-CAL domain, preferably agent-result verification, against the same kernel.
5. Only if both survive, consider a sibling/general assessment-authority contract experiment.
6. Keep Contract C 1.0.0 unchanged unless a separate contract experiment justifies a successor/generalization.

## Present uncertainty

The strongest unresolved question is whether a domain-neutral authority can remain compact without becoming an untyped bag of `state`. The matrix against Contract C showed that different policies consume different projections. A future general authority may need typed findings or profiles rather than one universal flat schema. This experiment intentionally avoids solving that larger contract-design problem.
