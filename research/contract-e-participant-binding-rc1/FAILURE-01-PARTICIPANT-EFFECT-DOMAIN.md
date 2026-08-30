# RC1 Preserved Failure 01 — Participant Effect Domain Was Under-Specified

Status: observed hosted failure, preserved before repair

## Frozen failing cut

- implementation/workflow head: `77cd49e51947738e0f423443f82a0c035249639d`
- hosted research run: `33320187907`
- run conclusion: failure
- uploaded artifact ID: `9734652234`
- artifact ZIP SHA-256: `306d84d11c11f4ddf700e99b4797011d5264b29c0b4462ff65118397edd877c1`
- frozen artifact projection SHA-256: `a702fe310d92f2bcadec639f151f7bbc6ed001d6e71abf11eed46f16faf0c15f`
- frozen participant declaration SHA-256: `521c19e0634ae3a87ac235048b37121251ff573c56e5bb09257107310fc3c48e`
- frozen jurisdiction evaluator Git blob: `5012f6398f6953e458de87179a318bc45d1df456`

Ordinary repository CI at the same head succeeded. The failure was research-semantic, not a repository regression.

## Observed failures

Two preregistered participant-domain substitutions were incorrectly accepted by the declaration-driven binding validator:

1. the `citation-use` participant consumed the frozen task-dispatch Decision and validated:
   - actor: `citation-agent`
   - derived operation: `task.dispatch`
   - target class: `mainframe_task`
2. the `task-execution` participant consumed the frozen citation Decision and validated:
   - actor: `task-agent`
   - derived operation: `citation.use`
   - target class: `mindgraph_retrieval_result`

The validator truthfully reconstructed the global effect mapping. The problem was that the participant declaration did not constrain which mapped effects that participant was responsible for consuming.

## What did not fail

At the same frozen cut:

- all seven intended participant baselines validated and were `IN_JURISDICTION`;
- source/passages access and admission stayed separate from scaffold support/trust semantic labels;
- semantic projection mutations did not change authority bindings across the seven tested stages;
- source hash, passage ID, Contract B bundle, Contract C result-set, operation, target-class, and verification-ID adapter substitutions were rejected;
- revoked/mismatched source-access receipts blocked source/admission binding;
- Contract B claim/passage mismatch was rejected;
- weak generic `eligible` laundering produced a direct false permit when validator bypassed, and the declaration validator rejected it;
- semantics-leaking evidence admission produced a direct false permit when receipt validation was bypassed, and the declaration validator rejected it;
- unknown Decision effect failed closed;
- self-verification failed the frozen independent-verifier rule;
- the frozen jurisdiction evaluator remained semantically ignorant.

## Interpretation

Observed evidence supports a narrower requirement than the original declaration shape:

> A participant responsibility declaration must constrain not only how a typed effect maps to an operation/target, but also which exact effect/operation domain the participant is permitted to consume.

A global effect registry is insufficient by itself. Otherwise a structurally correct adapter can cross participant responsibilities without lying about the effect.

## Smallest repair to test

Do not change:

- the authority evaluator;
- real artifact projections;
- operation registry/profile;
- stage adapters;
- baseline semantic fields;
- negative controls.

Change only:

1. `citation-use` declaration: accept only `cite_as_evidence`;
2. `task-execution` declaration: accept only `dispatch_task`;
3. declaration validator: reject an effect outside the participant's declared accepted-effect set before global effect mapping.

Rerun the identical RC1 harness. Preserve any further failure rather than widening declarations to make it pass.
