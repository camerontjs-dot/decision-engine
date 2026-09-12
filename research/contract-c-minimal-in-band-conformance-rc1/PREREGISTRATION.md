# Contract C minimal in-band Decision conformance RC1

Status: **PREREGISTERED / NOT YET EXECUTED**

This is a normal-context supervisor conformance experiment, **not** a clean-room independent Consumer B reproduction. The project context-free execution protocol requires a separate isolated execution surface for that stronger claim. This experiment is the bounded precursor: it tests whether the minimized in-band Contract C invariant set composes safely with the current protected Decision Engine V1 baseline.

## Exact authority and base

- repository: `camerontjs-dot/decision-engine`
- protected `main` observed at launch: `7be709b2141c767c5da89b8b94cf90233c4238fe`
- exact base tree: `4e92703e781024de62c77f2f14e9164aceb16815`
- maintained released Contract C ingress blob held fixed: `f57a8067dadc04afb459f1d0342b2b786ec775e6`
- maintained supported-claim policy blob held fixed: `2225f73eb6eefd83609f0ba19e4786d1267dd527`
- maintained Decision materializer blob held fixed: `1562fb29da6679a0cf894e478cbdd4ae16e21a18`
- Apparatus surface-necessity terminal record: PR #89 / commit `c5fa9be39e6d521fdad8fd4c9cbb1d3cd10cc53b`
- Apparatus decisive run: `34695273270`
- Apparatus evidence artifact: `10298184921`
- Apparatus artifact digest: `sha256:2f3e713524fb978f9ab5b7e51c0402b276f57b56f1c6b5e59ba10b7256d22fae`
- frozen in-band handoff authority: Apparatus PR #85 receipt `ad1ffbd7906a7cf34cce5afa906a5797cd4a14ff`
- exact in-band handoff object blob: `14e88cbc691f7eba9366b4bf88611ef834637f27`
- exact Contract-B index blob: `4de40713482a1fc5a075a230a61e19acc25afbd9`
- exact handoff object SHA-256: `sha256:325962ebcdbf6af836bb6193a451524ccd40b4d10f2394ff9f703fbfce1ec1e3`
- exact handoff result-set identity: `result-set:4483272c4f6fbd9cb2362be7e3174bbd00aff3cf761d6c374897f3478818c9f0`

## Question

Can the smallest evidence-backed in-band invariant set survive consumption on the **current maintained Decision V1 baseline** without sidecar-specific fields, neutral-evidence laundering, weakening released Contract C 1.0 ingress, or changing ordinary supported-claim policy behavior?

## Minimized in-band invariant set under test

The research consumer may rely only on Contract C structures already present in 1.0 plus the candidate neutral channel:

1. `contributions[*].channel = non_deciding` as the sole new semantic category;
2. existing `contribution_id` and exact `evidence_ref` fields;
3. existing `conclusion.basis_members` for causal membership;
4. existing `conclusion.residual_contribution_ids` for residual membership;
5. existing `conclusion.causal_form` for causal multiplicity;
6. existing proposition identity and text hash;
7. existing result-set identity and exact whole-object transport binding;
8. existing Contract-B binding and exact Contract-B evidence index;
9. externally selected research profile/version authority.

The consumer must **not require** sidecar-specific `member_id`, `state_id`, sidecar `receipt_id`, duplicated carrier binding, or a second attribution object.

## Acceptance tests

### Semantic reconstruction

- exact frozen PR #85 object recovers two `non_deciding` causal contributions `u-a` and `u-b`;
- causal form recovers `independent_sufficient_alternatives`;
- same exact evidence members with `jointly_sufficient` remain observably different when only causal form changes and identities are recomputed;
- a neutral residual contribution is recoverable through `residual_contribution_ids` without becoming causal;
- causal + residual neutral evidence remains distinguishable;
- no scalar/confidence/winner field is required or invented.

### Policy firewall

- research `not_checkable` successor input maps to the maintained supported-claim policy-equivalent HOLD behavior;
- exact released Contract C 1.0 supported control continues through maintained `decideContractCToContractD` and CLEARs;
- neutral evidence never creates support, counterevidence, CLEAR, Authorization, or execution by itself.

### Hostile mutations / laundering

Reject or detect at least:

- wrong exact whole-object digest;
- wrong externally expected research profile/version;
- caller version/profile self-selection;
- wrong Contract-B top-level binding;
- wrong Contract-B evidence source/hash;
- proposition identity/hash substitution;
- missing causal basis contribution;
- causal/residual overlap;
- unclassified retained neutral contribution;
- causal-form/cardinality mismatch;
- stale result-set identity;
- `non_deciding -> support` laundering;
- `non_deciding -> counterevidence` laundering;
- dropping neutral evidence while preserving the old conclusion/basis;
- sidecar-only fields being required by the consumer.

### Maintained-boundary controls

- exact maintained `src/contractCIngress.js`, `src/contractCDecision.js`, and `src/decisionMaterializer.js` blobs must remain unchanged;
- maintained released-1.0 ingress must continue to reject the research successor rather than silently treating it as 1.0;
- ordinary Decision CI/regression must pass on the exact research head.

## Scientific discriminator

A deliberately unsafe mutant consumer that treats any causal `non_deciding` evidence as policy support/CLEAR must be killed by the frozen expected HOLD outcome. If both safe and unsafe consumers satisfy the decision gate, this experiment is `INCONCLUSIVE` rather than supported.

## Allowed terminal states

- `SUPPORTED_CURRENT_MAIN_MINIMAL_IN_BAND_CONFORMANCE`
- `FALSIFIED_CURRENT_MAIN_MINIMAL_IN_BAND_CONFORMANCE`
- `INCONCLUSIVE_CURRENT_MAIN_MINIMAL_IN_BAND_CONFORMANCE`
- `BLOCKED_CONTEXT_FREE_REPRODUCTION_REQUIRED`

A supported supervisor-context result does **not** satisfy the later clean-room reproduction requirement.

## Stop boundary

Do not modify maintained Decision source, Contract C/D authority, released schemas, production defaults, release metadata, Authorization, or execution surfaces. Keep all implementation and fixtures under this research directory plus one dedicated research workflow. Do not merge, release, tag, or promote.