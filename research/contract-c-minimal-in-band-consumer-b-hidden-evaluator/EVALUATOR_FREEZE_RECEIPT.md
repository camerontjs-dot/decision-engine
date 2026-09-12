# Contract C minimal in-band Consumer B evaluator freeze receipt

**Classification:** supervisor-only post-freeze research evaluator. Do not expose evaluator details to the fresh implementer before its candidate freeze.

## Frozen clean-room aperture

- repository: `camerontjs-dot/research-scaffold-harness`
- parent main at aperture construction: `548bfa81f65290eda15af658f647497679b840ef`
- sparse aperture commit: `cb1d27ff00ae030093c5e97d78477cec7f20c6f4`
- sparse aperture tree: `2fade6a19f1e199fd5d3412480badc3eac141eb2`
- execution branch initial head: exactly the sparse aperture commit
- copied upstream handoff blobs reproduced exactly:
  - `SHADOW_SPEC.md`: `d98d2dac12b6639d5c76d267de3e337cd8d1faf7`
  - `schema-delta.json`: `0b1edf9ebdf1c7508306ffc51b703650dac9fdc4`
  - `contract-b-index.json`: `4de40713482a1fc5a075a230a61e19acc25afbd9`
  - `valid-shadow.json`: `14e88cbc691f7eba9366b4bf88611ef834637f27`
- valid object external SHA-256: `sha256:325962ebcdbf6af836bb6193a451524ccd40b4d10f2394ff9f703fbfce1ec1e3`
- valid object result-set ID: `result-set:4483272c4f6fbd9cb2362be7e3174bbd00aff3cf761d6c374897f3478818c9f0`

## Frozen evaluator material

Decision Engine protected base at setup:
`7be709b2141c767c5da89b8b94cf90233c4238fe`

Evaluator content head before this receipt:
`ae205bf75b08c14289fe74dad4f858f7a1a6ce98`

Blobs:

- preregistration: `0ec565cf3b5df0064f36a7458983242f3cbfa733`
- hidden evaluator: `cc1c507d81f5614ea76f1597d79099d51cd73e69`
- post-freeze comparison workflow: `ab4cdb9e59ce83563784f9b08813151b7df194b7`
- evaluator self-check workflow: `c3b5b96a19d7d903e21102d565796a17a2fc5c46`

The evaluator explicitly does **not** require an undocumented content-derived `contribution_id` recipe. It tests only contribution-ID format/uniqueness/reference closure permitted by the public aperture.

## Evaluator pre-launch self-check

Run `34710472047`, job `103598206017`:

- Python compilation: PASS
- pinned aperture identity checks: PASS
- overall self-check: PASS

This self-check exercised evaluator syntax and static identity pinning only. It did not consume or score a candidate.

## Reveal boundary

Do not dispatch the comparison workflow until all of the following are true:

1. a fresh executor has frozen its implementation on the exact execution branch descended from `cb1d27ff00ae030093c5e97d78477cec7f20c6f4`;
2. the candidate freeze receipt says `FROZEN_CANDIDATE_READY_FOR_REVEAL`;
3. `forbidden_inputs_read` is empty;
4. contamination state is `CLEAN_PRE_FREEZE_APERTURE`;
5. the supervisor independently verifies candidate ancestry and that only the allowed `candidate/` files changed.

Only then may the exact frozen candidate SHA be supplied to the comparison workflow.

No promotion, merge, Contract C version assignment, release, tag, Authorization, or execution is authorized by this receipt.
