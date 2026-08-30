# Contract D Evolution / Independent Consumer RC1 — Preregistration

Status: frozen before RC1 execution

Parent evidence: RC0 disposition `MULTIPLE_SHAPES_EQUIVALENT`.

## Question

Do A, B, and C remain equivalent when Contract D is consumed independently and policy/effect semantics evolve?

## Frozen discriminators

### Evolution cases

E1. Known effect v1 gains optional human-readable explanation only. Machine semantics MUST remain unchanged.

E2. Known effect v1 gains a new optional machine parameter, `scope`, with a safe default explicitly defined by the effect schema.

E3. Effect v2 changes machine semantics and MUST NOT be interpreted by a v1-only consumer.

E4. Unknown future effect type MUST fail closed for Authorization while remaining parseable as an unknown Decision effect.

E5. Policy-specific output adds a machine parameter that is meaningful only to one policy. A generic representation passes only if that parameter can be typed/versioned without inventing ambiguous generic fields.

### Independent consumer contract

The consumer receives only:

- candidate D object;
- public candidate schema/semantic rules;
- actor/action/context request.

It does not receive Decision Engine source or Contract C.

It must return one of:

- `candidate_for_authorization`;
- `not_candidate`;
- `unknown_effect`;
- `invalid_decision`.

It must never return execution success or automatic permission.

### Ablations

For each candidate remove:

- input authority id;
- policy id;
- policy version;
- target id;
- target hash;
- evaluation state;
- disposition;
- effect type;
- effect version;
- basis/reason codes.

Record whether the independent consumer can still meet the frozen tasks. Do not declare a field required merely because the decoder currently expects it.

### Unknown-field policies

Test:

- extra top-level field;
- extra nested decision field;
- authorization-looking injected field;
- execution-looking injected field.

Unknown fields must not acquire semantics. Candidate may reject them or preserve/ignore them according to a declared rule.

## Decision rule

A representation wins only if another candidate fails a frozen semantic/evolution/independence requirement that it passes.

If all remain equivalent, do not choose by nesting preference. Move to minimal semantic-surface comparison and prefer the representation requiring the least independently versioned machinery.

If C requires policy-specific schema machinery but B represents all frozen policy-specific semantics through a versioned typed effect, C is dominated.

If A and B remain semantically equivalent, compare whether A creates namespace/collision/evolution ambiguity under the frozen mutations. If not, structure alone is not grounds to reject A.

## Terminal outcomes

- `A_SUPPORTED`
- `B_SUPPORTED`
- `C_SUPPORTED`
- `MULTIPLE_SHAPES_EQUIVALENT`
- `SEMANTIC_GAP`
- `FALSIFIED`
- `INCONCLUSIVE`
