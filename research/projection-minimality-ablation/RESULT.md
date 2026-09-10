# Projection minimality / ablation result

Disposition: **SUPPORTED FOR BOUNDED MINIMAL PROJECTION; NOT PROMOTED.**

Science head: `829827a657253f030d69782ea25f00433397e044`

Hosted run: `34528065557`  
Job: `103041751992`  
Artifact: `projection-minimality-ablation-34528065557`  
Artifact ID: `10172359861`  
Artifact ZIP SHA-256: `8cd15d9a0aa17f624f0cf1295234333629fd6e20351ea82154246a4b7eb67ff6`  
Evidence TGZ SHA-256: `0a847051b08292f795d5ea71a1f546aba686cb27503d9ab3a8015cd9687e3b88`  
Minimal candidate SHA-256: `48ab7f5954f4def72929529604a33b1d9bed70f86a85aefca9bc4ccfeb25bd51`

## Observed valid equivalence

The minimal projection candidate produced exact byte-identical Contract D to the prior projection kernel for:

- released canonical Contract C claim: HOLD, D SHA `19deb8f2515f3b76f96b905f699835e900adc84a1cb8193fec726c336095ed3b`;
- released canonical Contract C causal-basis citation: CLEAR, D SHA `b204d89ebdd951f5cdfca138692570e6b5209124656cd797ee880dacc0c515aa`;
- Contract C missing-proposition FAILED: D SHA `057b8221b60211c45166ff3a2c93c5ab5b3d6c31205088e4a9d0343ce8f7837d`;
- release qualification: CLEAR, D SHA `fee869e69b055c1f6dd5dbc39620885f806a191f94d2a3e21cfb70c4952c4dd5`;
- task result: CLEAR, D SHA `7421c5b6eeca7f5d340a9a685686eca6650281d330788ac42e92d9bbed48e033`;
- source-bound artifact manifest: CLEAR, D SHA `29c9ccabeaced199636ef0f741b295d5718943e520f0587fc982014f27774720`.

Where maintained/legacy Decision paths existed, the minimal candidate also matched them exactly.

## Ablation result

Projection-specific structural pre-validation was removed for the tested malformed cases. All remained fail-closed:

- missing / extra input-authority fields: exact Contract D rejected;
- extra policy field: exact Contract D rejected;
- missing target content hash: exact Contract D rejected;
- completed Decision without effect: exact Contract D rejected;
- invalid completed disposition: exact Contract D rejected;
- failed Decision carrying effect: exact Contract D rejected;
- unknown evaluation state: exact Contract D rejected;
- non-object metadata: existing Decision exporter rejected.

Therefore those structural checks are redundant with already-authoritative downstream validation for this tested seam. Keeping duplicates may still improve error locality, but they are not required for fail-closed conformance.

## Unique projection responsibility

A policy fragment containing alternate `input_authority`, `policy`, and `target` fields could not alter the minimal candidate because the candidate selects only `evaluation`, `effect`, and `metadata` from the fragment.

The corresponding naive spread-based construction was accepted by exact Contract D with the alternate, self-consistent authority/policy/target values. Contract D cannot know the external bindings the Decision Engine intended to preserve.

So the unique generic responsibility established here is:

> Preserve externally established `input_authority`, `policy`, and `target` bindings while selecting only policy-owned evaluation/effect/metadata state, then materialize against exact Contract D authority.

## Supported boundary

`trusted domain adapter -> trusted target resolver -> trusted policy implementation -> bound Decision-fragment projection -> exact Contract D`

The candidate contains no policy registry and no CAL / Contract C / release / task-result / GitHub domain vocabulary.

## Non-claims

This result does not authorize maintained extraction, does not make arbitrary caller-provided Decision fragments trusted, does not eliminate trusted policy dispatch, does not revise Contract D, and does not authorize execution.
