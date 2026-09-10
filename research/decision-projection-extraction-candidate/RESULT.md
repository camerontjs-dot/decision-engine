# Decision projection extraction candidate result

Disposition: **SUPPORTED AS TRUSTED INTERNAL PLUMBING; DETACHED POLICY-RESULT TRUST BOUNDARY FALSIFIED. NOT PROMOTED.**

Science head: `1d18e04e5ea6dcb228878422b4854817a27a330b`

Hosted run: `34528490444`  
Job: `103043154779`  
Artifact: `decision-projection-extraction-candidate-34528490444`  
Artifact ID: `10172529148`  
Artifact ZIP SHA-256: `102a4f6809edc25f52b7b042961990678ae16e0902d302da01937c411249e202`  
Evidence TGZ SHA-256: `c74be87bd986550e67c00cb95b123958f1763438ced7684316cc65eb4a50f1d1`  
Candidate SHA-256: `b0b63251a014e8d7814fd47455e8182e8180d2c2a912c0fd794242814df939fe`

## Exact call-site equivalence

The 42-line production-shaped candidate produced exact byte-identical Contract D for every tested call path:

- Contract C canonical claim: HOLD, D SHA `19deb8f2515f3b76f96b905f699835e900adc84a1cb8193fec726c336095ed3b`;
- Contract C causal-basis citation: CLEAR, D SHA `b204d89ebdd951f5cdfca138692570e6b5209124656cd797ee880dacc0c515aa`;
- Contract C missing-target FAILED: exact maintained equivalence;
- release qualification baseline: CLEAR, D SHA `fee869e69b055c1f6dd5dbc39620885f806a191f94d2a3e21cfb70c4952c4dd5`;
- release qualification adverse: HOLD, D SHA `a2b0144864b26522e92de4fe65e217ef064d710427aa54d3838e33ba33824549`;
- task result: CLEAR, D SHA `7421c5b6eeca7f5d340a9a685686eca6650281d330788ac42e92d9bbed48e033`;
- source-bound artifact manifest: CLEAR, D SHA `29c9ccabeaced199636ef0f741b295d5718943e520f0587fc982014f27774720`.

The candidate exposes no raw-authority parameter, policy registry, or evaluator callback.

## Primary falsifier: detached policy-result replay

A real baseline release authority produced a genuine CLEAR policy result under:

`decision-engine.release-qualification.regression-maintenance-review@research-0`

A second, canonically produced release authority changed the required-CI observation to adverse. Trusted evaluation of that exact second authority produced HOLD with `bounded_qualification_not_supported`.

The CLEAR policy-owned evaluation/effect/metadata from the first authority was then detached and materialized against the second authority's exact `input_authority` and target under the same exact policy identity.

Exact Contract D accepted the replay:

- correct trusted adverse output: HOLD, D SHA `a2b0144864b26522e92de4fe65e217ef064d710427aa54d3838e33ba33824549`;
- detached replay output: CLEAR, D SHA `447e5134bc6f2a263344d74798995c93df60c3e5bdb68f5692091f9cc60cd23b`.

Therefore a policy result containing only evaluation/effect/metadata is not a portable warrant and is not self-bound to the authority/target against which it was computed.

This does not show a Contract D defect. Contract D correctly validates the Decision object supplied to it; it cannot infer unrecorded provenance of detached internal policy-result state.

## Machinery checks

- ten repeated candidate materializations produced one exact D SHA;
- mutating all caller-owned input objects after materialization did not change the returned Decision or bytes;
- mutating the returned Decision object did not change the already-returned canonical bytes;
- live `main` was verified at `358c2bb20f490bf25e808434394b26a70a16a123` during the hosted run;
- only research paths changed.

## Supported architectural boundary

`trusted domain admission -> trusted target resolution -> fixed trusted policy evaluation -> immediate bound Decision materialization -> exact Contract D`

The reusable materializer is supported as trusted internal Decision Engine plumbing. It must not be described or exposed as a standalone trust boundary for detached or externally supplied policy-result state.

If a future use case requires policy results to cross process/module/trust boundaries independently, that is a different research problem requiring explicit binding/provenance semantics rather than silently expanding this helper.

## Smallest later production candidate

If a promotion slice is separately authorized, extract only the bound Decision materialization helper. Keep domain admission, target resolution, and fixed policy implementation dispatch in their existing trusted domain runtimes and invoke materialization immediately from those paths. Do not extract a caller-controlled policy registry or a generic detached-policy-result protocol.

## Non-claims

This result does not authorize maintained extraction, merge, release, Contract D revision, Authorization, execution, or portable policy-result warrants.
