# Contract E Participant Binding RC1 — Stage-Authority Hardening Preregistration

Status: frozen after first repaired PASS, before hardening implementation

## Starting evidence

- first frozen failing cut: `77cd49e51947738e0f423443f82a0c035249639d`
- preserved failure: `FAILURE-01-PARTICIPANT-EFFECT-DOMAIN.md`
- first repaired passing implementation head: `ba4a52481cac692c333ea3a7232f46e936afdefd`
- repaired declaration SHA-256 observed in hosted run: `42f3020b04a1e499d5f69ee1fd2f08842c8aa9af07be9261d9362fd82d21bd83`
- frozen real-artifact projection SHA-256: `a702fe310d92f2bcadec639f151f7bbc6ed001d6e71abf11eed46f16faf0c15f`
- frozen jurisdiction evaluator Git blob remains `5012f6398f6953e458de87179a318bc45d1df456`

## Why harden

The repaired test establishes truthful binding for the seven current participants, but two architectural questions remain insufficiently discriminated:

1. Does each stage truly obtain authority from standing/delegated governance, rather than from the semantic artifact it processes?
2. Can upstream source access and evidence admission vary independently without Contract E deciding whether the passage is relevant/supportive?

## Frozen hardening claims

### H1 — Stage authority removal

For each tested participant, hold its semantic/transport artifact and adapter request byte-identical, remove only that actor/operation grant from the standing authority profile, and require jurisdiction to cease being `IN_JURISDICTION`.

Test independently for:

- source access;
- evidence admission;
- CAL assessment issuance;
- Decision issuance;
- citation use;
- task execution;
- outcome verification.

This tests that the artifact itself does not self-authorize the stage.

### H2 — Access and admission are separable authority relations

Use the research authority sidecar's operation list as an independent aperture/delegation control.

Cases:

1. receipt grants `source.read` but not `evidence.admit_passage`:
   - source-access binding remains valid;
   - evidence-admission binding is rejected.
2. receipt grants `evidence.admit_passage` but not `source.read`:
   - source-access binding is rejected;
   - evidence-admission binding may remain valid under this research representation.

The second case is not a production recommendation. It is a separability probe demonstrating that admission authority need not be semantically inferred from read authority.

### H3 — Epistemic conclusion does not create citation authority

Construct a deliberately weak citation request from Contract C semantic conclusion alone, with no typed citation Decision. Because the standing profile contains `citation.use`, direct jurisdiction may permit the syntactically plausible request. The Contract E declaration/binding validator must reject it because the authoritative citation Decision/effect/target binding is absent.

This is a negative control. It should fail visibly if CAL semantic state can substitute for citation authority.

### H4 — Decision effect does not create execution authority

Hold the valid citation/task Decisions fixed and remove the corresponding actor/operation grant from the authority profile. The typed effect remains valid, but jurisdiction must no longer permit execution/use.

### H5 — Semantic-label changes cannot recover missing authority

With a stage grant or upstream admission operation removed, mutate positive-looking semantic labels (`primary`, `sourced`, supported-like values) and require that authority remains absent.

## Falsifiers

Narrow or reject the cross-cutting Contract E hypothesis if:

- any semantic artifact remains sufficient to produce `IN_JURISDICTION` after its stage authority grant is removed;
- Contract E must interpret relevance/support/verdict content to distinguish source access from evidence admission;
- CAL conclusion alone passes the citation participant binding declaration;
- typed Decision effect alone remains executable after execution/citation authority is removed;
- positive semantic labels recover a missing access/admission grant.

## Non-claims

This hardening does not decide whether a production deployment should use one source-scope receipt, exact passage approvals, capability tokens, policy bundles, or another representation. It tests separability and responsibility only.
