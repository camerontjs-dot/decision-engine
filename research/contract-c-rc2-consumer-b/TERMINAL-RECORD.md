# Contract C RC2 Consumer B — Terminal Record

## Terminal decision

1. `consumer_reproducibility = REPRODUCIBLE`
2. standard research disposition = `SUPPORTED FOR PROMOTION`
3. frozen handoff commit = `213ed9e912b922bd5c57ef58009eb6b0d7fff398`
4. frozen Contract-C candidate SHA-256 = `e142f4aab119751dc201bca7994c0f97636c65647489f7edbee823a7f8aee3b4`
5. decisive consumer implementation commit = `d24466f1417d9de7d07d5fd517998824334ae9dd`

`SUPPORTED FOR PROMOTION` is bounded to the clean-room Consumer B reproducibility claim. It authorizes only a later Contract-C promotion-readiness review. It does **not** assign a Contract-C version, authorize a production exporter, or authorize Decision Engine production behavior.

## Exact runs and artifacts

### Preregistration

- preregistration commit: `aa5332f8d9b52cb6369d6be3ffe01e8e3143a58f`
- candidate semantic contents had not been deliberately inspected when this preregistration was frozen
- no expected case outputs were preregistered

### Transport / identity assurance

- initial independent integrity run: `33218535606`
- job: `99007459915`
- integrity artifact: `9704288529`
- result: exact handoff checkout, outer `SHA256SUMS`, supplied transport verifier, independent candidate hash, and independent Contract-B bundle/hash/version/ZIP/sums checks passed

Additional proposition text-binding control:

- run: `33218802610`
- job: `99008281603`
- result: all candidate proposition `text_sha256` values independently reproduced from packaged Contract-B `claim_text` values using ordinary YAML parsing plus SHA-256

### Preserved failed consumer attempt

- run: `33218916748`
- job: `99008619316`
- result: `FAIL`
- failure: the first clean-room consumer's deliberately small YAML reader assumed relevant bundle identity keys were at column zero and rejected the legitimate Contract-B bundle manifest
- interpretation: consumer implementation defect, not handoff semantic failure
- correction: indentation handling only; no expected result, policy, semantic rule, candidate byte, or handoff input was changed

### Decisive corrected consumer run

- run: `33218978492`
- job: `99008811105`
- implementation commit executed: `d24466f1417d9de7d07d5fd517998824334ae9dd`
- result artifact: `9704444616`
- artifact ZIP SHA-256: `2a0695a7efe8054fcbeda5ab3e1a4888761aef6dafc9d1ace588f909117a458f`
- uploaded files: `normalized.json`, `policy-firewall.json`, `mutation-results.json`, `metamorphic-results.json`, `ambiguity-report.json`, `experiment-receipt.json`
- terminal output: `consumer_reproducibility=REPRODUCIBLE`; `research_disposition=SUPPORTED FOR PROMOTION`

## Frozen identity receipt

The clean-room run independently established and preserved:

- result-set ID: `result-set:80d5837106f14c87f60624f9c48561f3b6e95f6332d5cddbf7c63d811f452a3d`
- candidate SHA-256: `e142f4aab119751dc201bca7994c0f97636c65647489f7edbee823a7f8aee3b4`
- Contract-B bundle ID: `85f8f6dc-f46f-5efa-b7e7-6e049da84591`
- Contract-B bundle hash: `sha256:a40fe687c19944248fe77d044801dca02bba56259198b297b897f6a5a304f2fa`
- Contract-B version: `1.2.0`
- decoded Contract-B ZIP SHA-256: `6b67085e29357375bd43fcf27f376f4aa373507d5c615b75ba0070e4e78052d1`
- Contract-B embedded `SHA256SUMS` SHA-256: `6e8ea67e6d744e68f395c952f2cb0f0ad4f6fc2b1ffafbb5cd356af697445c25`

The supplied `verify_handoff.py` was used only as transport/identity infrastructure. Independent checks separately established the identities above.

## Independence / contamination receipt

- model / agent: `GPT-5.6 Sol`
- experiment context: fresh task context
- live Decision Engine inspection before experiment: production `main` routing metadata only
- verified production `main` at experiment creation: `fc1001b61c20fc79d2b23f8621642e3dc4d197bd`
- semantic files inspected: only files permitted by the frozen handoff manifest
- Apparatus Contracts PR #13 inspected: **NO**
- PR #13 branch / implementation / tests / workflow / comments / evaluator / producer-gate summary / field maps / ablations / weak controls / telemetry or semantic-firewall results inspected: **NO**
- CAL RC2-C or RC2-D implementation/evaluator internals inspected: **NO**
- Claim Audit Lab implementation or traces beyond handoff bytes inspected: **NO**
- historical Decision Engine Contract-C research branches or expected outputs inspected: **NO**
- prior Consumer B expected outputs available: **NO**
- accidental forbidden-source contamination: **NONE OBSERVED**

### Recorded procedural ordering deviation

The task requested transport verification before semantic work. The local execution runtime could not fetch the sealed GitHub bytes directly, while the available GitHub content surface would expose the candidate. To avoid pre-preregistration semantic exposure, the preregistration was committed first and transport verification was then executed remotely in GitHub Actions before deliberate candidate semantic interpretation.

One base64-form candidate fetch occurred after preregistration and before the remote integrity pass completed. It exposed no forbidden producer-private material. Deliberate semantic interpretation of candidate contents began only after the independent integrity run passed. This is recorded as a procedural ordering deviation and not hidden as an idealized run history.

## Observed successes

### Identity and binding

- exact result-set identity verified
- Contract-B bundle ID/hash/version/artifact/sums binding preserved
- proposition IDs bound to Contract-B claim IDs by exact content identity, with candidate text hashes independently reproduced from Contract-B claim text
- every consumed evidence reference resolved by explicit passage ID, source ID, and passage hash
- broken references were rejected rather than guessed or repaired

### Semantic preservation

- result-set and proposition execution state stayed separate from subject-matter verdict state
- all supplied `not_performed` assessments remained `not_performed`; a mutation that paired `not_performed` with an outcome-like result was rejected
- necessary and residual contribution state was preserved
- measurement-basis contribution references were preserved and validated
- residual rule-role state remained distinct from residual evidence-contribution state
- no absent or unknown state was default-fabricated
- `causal_form`, `reported_verdict`, and measurement kind/value were retained as explicit CAL-attributable fields without inventing downstream semantics

### Consumer-owned representation

The deterministic output separates:

- `binding`: immutable candidate and Contract-B identities
- `cal_state`: state explicitly carried by the candidate
- `consumer_view`: deterministic presentation derived without new CAL judgments
- `policy_results`: destination-owned policy output
- `validation`: reference/binding validation metadata

Ordering is canonicalized by explicit identities rather than source array position.

### Downstream-policy firewall

Two policies were preregistered before candidate exposure:

- conservative review routing
- evidence-presence triage

They produced materially different destination outputs while:

- candidate SHA-256 remained unchanged
- normalized `cal_state` remained unchanged
- no destination vocabulary, risk preference, routing objective, or action was written back into Contract C

### Fail-closed mutation controls

The semantic consumer rejected:

- missing referenced contribution
- broken passage identity
- broken proposition identity
- removed measurement-basis state
- malformed `not_performed` with an outcome-like result
- changed Contract-B binding
- malformed execution state
- duplicate contribution identity

A coherent mutation that removed a residual contribution **and** every explicit reference to it was intentionally more discriminating: the structural semantic validator alone could not know the object had existed. The experiment records that limitation instead of pretending otherwise. The mutation was nevertheless fail-closed at the frozen-candidate boundary because its bytes no longer matched the authorized candidate SHA. This demonstrates that immutable candidate identity is an essential control, not redundant decoration.

### Metamorphic controls

- reversing proposition/contribution/basis/terminal-role array order did not change normalized semantics or policy outputs
- changing only downstream policy did not change candidate bytes or CAL state
- changing a local candidate filename while retaining identical bytes did not affect semantic interpretation

## Semantic ambiguity record

### Proposition ID vs Contract-B claim ID

Competing interpretations:

1. identical `proposition_id` and `claim_id` values identify the same supplied claim;
2. the differently named fields belong to unrelated namespaces.

Resolution: exact ID equality plus independently reproduced `claim_text` SHA-256 matching candidate `text_sha256` provides a dual binding from supplied bytes. No producer-private knowledge was required. This would have been material if the dual binding failed.

### `conclusion.causal_form`

Competing interpretations:

1. executable causal logic;
2. an opaque CAL-attributable recorded label.

Resolution: the handoff permits preservation only to the represented extent and forbids invented causal state. The consumer therefore preserves the value but does not execute unstated causal logic. A future destination that needs executable causal semantics would require an explicit contract/policy rule. The preregistered policies do not depend on such an interpretation.

### `conclusion.reported_verdict`

Competing interpretations:

1. a downstream adverse/action classification;
2. a CAL-attributable verdict label awaiting separate destination-policy mapping.

Resolution: the policy firewall requires the second treatment. The consumer preserves the exact label and does not convert it directly into downstream authority.

### `measurement.kind` / `measurement.value`

Competing interpretations:

1. reusable score and threshold semantics;
2. an opaque recorded CAL measurement whose reusable scale/threshold semantics are not supplied.

Resolution: the handoff does not define reusable numeric threshold behavior. The consumer preserves kind/value and uses explicit basis references only. A downstream policy that wishes to threshold the value needs an explicit policy or future contract rule.

### Residual rule role vs residual evidence contribution

Competing interpretations:

1. one shared residual object type;
2. separate typed state in distinct `control_id` and `contribution_id` namespaces.

Resolution: separate arrays and explicit ID namespaces resolve the structural distinction. The normalized representation preserves them separately.

## What else could explain apparent reproducibility?

Potential weaker explanations were actively probed:

- **Hard-coded expected cases:** the consumer does not hard-code proposition, contribution, or passage IDs; it discovers and binds them from supplied bytes. Reordering controls check this.
- **Filename or array-order gaming:** semantic indexes are content/identity driven and array reordering is invariant.
- **Hash-only success:** malformed semantic mutations are checked below the outer candidate-hash gate; most are rejected structurally. The coherent deletion control separately demonstrates what only the immutable hash can detect.
- **Producer-policy leakage:** downstream policy probes do not reconstruct or execute producer thresholds and do not consume producer-private implementation.
- **`not_performed` laundering:** an explicit mutation verifies that outcome-like state attached to `not_performed` is rejected.

The strongest remaining assumption is that standard Contract-B YAML scalar semantics define the supplied claim text. A targeted independent parser control reproduced all three candidate text hashes, falsifying the simplest alternative that a hidden producer text-normalization convention was necessary.

## Producer-private information required

**None observed.**

The consumer did not require producer implementation, traces, hidden telemetry, field-source maps, evaluator internals, historical expected outputs, or undocumented default judgments.

## What remains unestablished

- no Contract-C production schema or version
- no production Contract-C exporter
- no Decision Engine production policy, routing authorization, or action vocabulary
- no reusable executable semantics for opaque CAL labels beyond the supplied handoff
- no generalization claim to future Contract-C candidate shapes
- no re-evaluation of the producer-side sufficiency result

## Stopping point

The bounded evidence supports `REPRODUCIBLE` and therefore `SUPPORTED FOR PROMOTION` to the next promotion-readiness review only. No production Contract-C artifact or Decision Engine behavior is authorized in this experiment.
