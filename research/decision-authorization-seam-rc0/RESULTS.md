# Decision–Authorization Seam RC0 — Results

Primary disposition: **SUPPORTED FOR PROMOTION**

Promotion scope: promote only the architectural seam hypothesis into a successor Contract-D / authorization-boundary design experiment. This result does **not** authorize production authorization machinery, automatic MainFrame mutation, or a Contract D release.

## Authority and frozen artifacts

- Decision Engine base: `cd5a471703e6682b7e8281bc954a135996cac58e`
- MainFrame Live observed authority: `cf216d90251586f2b4976e0240a427bc439fe9bf`
- preregistration first commit: `ead79a8b4d4c3544ea24c7cee21cac431d0eea93`
- frozen Decision specimen commit: `2acffefb9c0ea549e570527620d8a2e59441e8c4`
- frozen Decision raw SHA-256: `8826c8ab1cde94b9134f137f593032924cc5875cff6099e9ed425e4f1fc6f7a8`
- final tested implementation head: `362cee9062d5bf34ca6fc8f0ab3570c9482afaa1`
- hosted RC0 push run: `33287710741` — SUCCESS
- hosted RC0 PR run: `33287711473` — SUCCESS
- ordinary repository CI: `33287711452` — SUCCESS

## OBSERVED

### Frozen-context cases

The exact same frozen Decision bytes and SHA were consumed by A, B, C, D, E, F, and H.

| Case | Changed outside Decision | Authorization |
| --- | --- | --- |
| A | profile = manual | `require_approval` |
| B | profile = supervised; low-risk domain | `permit` |
| C | same supervised profile; domain = medical | `require_approval` |
| D | delegated profile; requested action = promote stable | `require_approval` |
| E | delegated profile; actor mismatch | `deny` |
| F | delegated profile; target mismatch | `deny` |
| H | delegated profile; Decision marked superseded by authorization context | `deny` |

The authorization receipts for these cases all returned the frozen Decision SHA and `mutatesExternalState: false`.

### Decision weakening

Case G changed only the Decision disposition from `eligible_for_verified_state` to `hold`. Under otherwise identical supervised authorization context, authorization became `deny` with reason `decision_not_authorizable`.

No weakened Decision produced broader authority.

### Authority-smuggling mutation

A derived Decision object was given an extra `authorization` object claiming:

- `automaticApplicationPermitted: true`;
- a permitted stable-promotion action;
- an alternate actor.

The authorization consumer ignored those non-authoritative fields. Under the manual authorization profile the result remained `require_approval`.

### Action-scope mutation

Changing only the requested action to `delete_knowledge_object` produced `deny` / `action_out_of_scope` while the frozen Decision was unchanged.

### Negative control

After the first successful RC0 run, a deliberately entangled competing implementation was added as a discrimination control. It reads operational permission from inside the Decision object.

With byte-identical D, that control necessarily returned the same result for A/B/C and therefore could not represent the observed authorization-profile variation.

This control was added after preregistration and after the first successful run. It is supporting evaluator-discrimination evidence, not part of the preregistered primary result.

### Production isolation

The research consumer:

- imports no Contract C machinery;
- calls no MainFrame code;
- performs no file write;
- performs no process execution;
- performs no network request;
- modifies no Gate production code.

The dedicated workflow separately checks for mutation/network primitives in the RC0 harness. Production Gate baseline tests also passed unchanged.

## INFERENCE

For the bounded source-audit specimen, Decision and operational authorization can be represented as independent authorities.

Specifically, an operational consumer can vary permission by actor, action, target, domain, and delegation profile while the upstream Decision remains byte-identical.

This supports a seam in which:

`Decision = policy conclusion about the target`

and:

`Authorization = permission for a specific actor/action/context to operationalize that conclusion`.

The observed behavior does not require the Decision object to carry actor-specific or delegation-specific authority.

The negative control strengthens this inference: an authorization-in-D design cannot preserve a frozen D while also expressing the preregistered A/B/C changes.

## HYPOTHESIS RETAINED FOR SUCCESSOR

A useful downstream architecture may be:

`Contract C -> Contract D (decision authority) -> authorization policy/capability -> executor -> receipt`

where changing authorization policy does not alter Contract D semantics.

Whether authorization should be a durable contract, a capability token, a query result, or another structure remains open.

## UNKNOWN

RC0 does not establish:

- the final Contract D schema or vocabulary;
- whether `eligible_for_verified_state` is the correct Decision disposition;
- whether the authorization profiles are realistic production profiles;
- whether domain/risk belongs directly in authorization input;
- whether human approval belongs in an authorization artifact or separate approval receipt;
- whether authorization needs content addressing and durable persistence;
- how revocation/supersession should be represented across repositories;
- whether the same seam survives task dispatch, citation permission, and research promotion use cases;
- whether a generic authorization layer is preferable to capability-specific enforcement points.

## Falsifier review

No preregistered primary falsifier was observed:

- authorization varied without changing frozen Decision bytes;
- the consumer did not inspect/reinterpret Contract C epistemic evidence;
- actor mismatch did not permit;
- target mismatch did not permit;
- action mismatch did not permit;
- weakened Decision did not broaden authority;
- authorization-like content inside Decision did not grant authority;
- no external mutation occurred.

## Disposition rationale

**SUPPORTED FOR PROMOTION** applies only to the seam hypothesis:

> Operational authorization is sufficiently separable from Decision semantics to justify designing the interfaces independently and testing a successor authorization boundary.

It is not a production-promotion result.
