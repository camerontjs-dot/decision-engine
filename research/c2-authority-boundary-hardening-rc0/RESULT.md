# Contract C2 authority-boundary hardening RC0 — terminal result

## Classification

Draft Research / authority-boundary hardening.

**Terminal research disposition: `SUPPORTED_WITH_BOUNDARY`.**

Keep the PR Draft. No maintained Decision Engine source change, Contract C2/D change, CAL change, Authorization, execution, merge, tag, release, or production-default change is authorized by this result.

## Exact subject

Decision Engine C2 integration subject:

- parent integration PR: #75
- exact stacked base / maintained C2 subject: `b1bcc33e2b5ef0707b8cbf7dd8e821b2d34d1b55`
- released V1 ancestor: `7be709b2141c767c5da89b8b94cf90233c4238fe`

Exact Contract C2 authority:

- Apparatus promotion head: `b42c827acb0a9fe65353354d709add0e27bab307`
- public candidate version: `2.0.0`
- wire profile: `contract-c-successor-candidate-a-rc2-research`

Frozen preregistration / apparatus head before reveal:

- decisive research head: `bee53b481dbeac6c225899a5e1c0c188504a0d67`

## Decisive execution

GitHub Actions:

- workflow: `Research C2 authority-boundary hardening RC0`
- run: `35185025913` — **SUCCESS**
- job: `105085123610` — **SUCCESS**
- artifact: `c2-authority-boundary-hardening-rc0-bee53b481dbeac6c225899a5e1c0c188504a0d67`
- artifact ID: `10481498841`
- artifact digest: `sha256:801b0d61a788817b2e8231dd7f130549727c679985133f843aa63df80d829018`

The exact-head workflow verified before the scientific step that:

- the branch descends from exact C2 integration subject `b1bcc33e...`;
- no `src/**`, `scripts/**`, or `tests/**` bytes differ from that subject;
- Apparatus is checked out at exact C2 authority `b42c827...`;
- the exact `contract_c_v2.py` and `contract_c_rc2.py` blobs match the pinned authority.

The preregistered discriminator then passed without modifying the subject or evaluator.

## Frozen research authority inputs

The experiment fixed these inputs before execution:

- exact Contract-B object: `1.2.0`, bundle `bundle-c2-authority-hardening-001`, bundle hash `sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`;
- evidence index: `[(src-S1, S1)]`;
- independently selected resolver commit: `43b571464734325277374ee81098553fb7c1b944`;
- resolver entry: semantic implementation `a902621e8baea3063dddd7f92ba975aade305464`, policy digest `44ecc33519fa8911079595d322f5f0decbf0389af42e153ac32214931798e42c`.

These are frozen research controls. They do not establish that current production Decision Engine already possesses an independent source for those inputs.

## Baseline

Canonical baseline C2 object:

`sha256:f3cb5d91945e6efc4872c2038c0bff011e7d670feffa0bb24535961379d80dbf`

Observed:

- current C2 Decision path: `CLEAR`;
- exact canonical C2 `verify_candidate(...)` with the frozen external authority inputs: PASS.

This establishes that the strict verifier does not reject the legitimate baseline merely because the stronger authority checks are enabled.

## Preregistered substitutions

Every mutation was applied coherently, resealed through the exact C2 authority, and given a fresh whole-object digest. None is a stale-object replay.

### 1. Evidence source substitution

Mutated C2:

`sha256:71ffad68e93b41494e99b9cde939eea27d2158f522e1be9312a69a0afff9e566`

Observed:

- current C2 ingress reached maintained policy evaluation;
- current supported-claim policy returned `CLEAR`;
- strict verification against the fixed evidence world rejected it:
  `participant: evidence reference is absent from the exact bound Contract-B world`.

### 2. Evidence passage substitution

Mutated C2:

`sha256:8f24067b60a9fa0267d729c0a22f2adb25d0ba51385ce4a448ef3d51d701398f`

Observed:

- current C2 ingress reached maintained policy evaluation;
- current supported-claim policy returned `CLEAR`;
- strict verification against the fixed evidence world rejected it with the same absent-reference authority failure.

### 3. Producer resolver-commit substitution

Mutated C2:

`sha256:a4596696e6e6d28ca13f1e4282358fb1773a35b93e552361631f9184658d18d3`

Observed:

- current C2 ingress reached maintained policy evaluation;
- current supported-claim policy returned `CLEAR`;
- strict verification rejected it:
  `producer.policy_resolver_commit_sha: wrong resolver authority`.

### 4. Producer semantic-implementation substitution

Mutated C2:

`sha256:f86bccec4452031778578674da03a519d423c6c4f2e3e4e483413c902719fb6b`

Observed:

- current C2 ingress reached maintained policy evaluation;
- current supported-claim policy returned `CLEAR`;
- strict verification rejected it:
  `producer: unknown or ambiguous implementation/policy binding in immutable resolver`.

## Authority-collusion controls

Three deliberately colluding external-authority controls were then run against the same canonical verifier:

- substituted evidence source + attacker-updated evidence index: PASS;
- substituted producer resolver commit + attacker-updated independently-selected resolver commit: PASS;
- substituted semantic implementation + attacker-updated resolver row: PASS.

This is a decisive boundary result.

Canonical `verify_candidate(...)` contains the machinery needed to discriminate the tested reference and producer substitutions **only when its external authority inputs are themselves independently established**.

Adding `evidence_index`, `resolver_commit`, or `resolver_entries` as ordinary caller-controlled Decision inputs would not close the authority boundary. It would move the trust problem into those new inputs.

## Observed evidence

1. The current C2 Decision ingress at the exact pipeline subject authenticates exact C2 bytes/authority and exact top-level Contract-B identity, but all four coherently resealed authority substitutions reached maintained supported-claim policy evaluation and returned `CLEAR`.
2. Exact canonical C2 `verify_candidate(...)` rejected all four substitutions against frozen external authority inputs while preserving the legitimate baseline.
3. The same verifier accepted corresponding mutations when its external evidence-index / resolver authority was changed to collude with the mutated C2 object.
4. No maintained Decision source, policy, target semantics, Contract D output machinery, CAL semantics, or contract bytes were changed by the experiment.

## Inference

The completed CAL Pipeline's current C2 Decision ingress under-establishes the full authority that canonical Contract C2 is capable of checking.

The missing property is not a more sophisticated Decision policy. It is an independently established binding from the C2 object to:

- the exact Contract-B evidence world used to authorize participant references; and
- the exact immutable producer-policy resolver used to authorize the C2 producer identity/policy pair.

The strict C2 apparatus already provides the relevant validation functions. The unresolved architecture question is where those external authority inputs should come from without becoming caller-controlled assertions.

## What is not established

This result does not establish:

- that current full-pipeline outputs are fabricated or semantically wrong;
- that the first genuine pipeline receipt was incorrectly decided;
- CAL semantic accuracy or retrieval completeness;
- that Decision Engine must reconstruct all of Contract B itself;
- that a new Contract C or Contract D version is required;
- that `verify_candidate(...)` should be called directly from production with caller-supplied arguments;
- Authorization or execution correctness.

The observed issue is an authority aperture: a valid C2 object can carry internally substituted evidence/producer references that current Decision ingress does not independently reject.

## Smallest next discriminator

Do not modify maintained C2 ingress yet.

The next experiment should construct the verifier authority inputs from independently authoritative artifacts rather than caller declarations:

1. start from an exact Contract-B 1.2 artifact whose bundle tree / `SHA256SUMS` passes canonical integrity verification;
2. deterministically derive the `(source_id, passage_id)` evidence index from that verified artifact and bind it to the same exact top-level B identity supplied to Decision;
3. start from the exact immutable policy-resolver artifact/commit authorized for the current CAL semantic implementation and derive the resolver entries from that artifact;
4. run the unchanged baseline plus the same four substitutions;
5. require baseline Decision bytes/semantics to remain unchanged while all four substitutions fail before policy evaluation;
6. include a weak control that trusts caller-supplied index/resolver data and require it to fail the promotion gate for the intended reason.

If that survives, the project can evaluate a minimal ingress promotion that establishes authority before policy code runs. If an independently reconstructable authority source does not exist, the correct result is a cross-component authority requirement, not a Decision Engine-local invented default.

## Terminal disposition

`SUPPORTED_WITH_BOUNDARY`

The current C2 Decision policy kernel is not the problem exposed here. The hardening target is the authority boundary immediately before it.
