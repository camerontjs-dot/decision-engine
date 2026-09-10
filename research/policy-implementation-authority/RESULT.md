# Policy Implementation Authority Result

## Disposition

**TRUST BOUNDARY IDENTIFIED; MAINTAINED RUNTIME NOT SHOWN VULNERABLE.**

Keep this as a Draft Research evidence record. The result narrows the candidate Decision primitive by establishing that policy implementation dispatch is trusted machinery. It does not authorize Contract D revision or maintained refactoring.

## Exact execution

- protected Decision `main` checked before experiment: `358c2bb20f490bf25e808434394b26a70a16a123`
- frozen PR #58 projection-kernel SHA-256: `e12d53020b3a6a046f4ee7688db0a5ea5c5e0a63e758b1c1e5711e7b227759e3`
- exact Contract D authority: `298a1a0f7b7b6d7712e11200d04faec3e1ca169b`
- science head: `c609260704a947ea9818143a5c439d8bc5ec6f6c`
- hosted run: `34507072512`
- job: `102971764528`
- artifact: `policy-implementation-authority-34507072512`
- artifact ID: `10164248380`
- artifact ZIP SHA-256: `231d83abf2f42783ce87045362cf953bb408c63af9d1b172c4fbb71b8aa4fa47`
- evidence TGZ SHA-256: `8d39f031940c446b09002c5f83b79398cc3f19d0fd10ac65169e7be97b2b5661`
- trusted research policy module SHA-256: `3a5d7648da7323a91697f64f9a7f2e9c694625a5bf945bd5d4b2433a182eefdb`

All workflow stages passed, including exact subject/Contract-D verification, both policy-substitution pairs, released Contract-D consumer checks, research-only path guard, packaging, and artifact upload.

## Pair A: same identity, substituted HOLD

Fixed across the pair:

- authority SHA-256: `249efd981242fac6938893cde7d34e234953bf03fc4f600bd9fa8d13d3a0cf2f`;
- exact target;
- exact policy ID/version: `decision-engine.release-qualification.regression-maintenance-review@research-0`;
- typed effect family: `task.dispatch@1`;
- exact Contract D authority.

Observed:

- trusted evaluator: `completed / clear`, D SHA-256 `fee869e69b055c1f6dd5dbc39620885f806a191f94d2a3e21cfb70c4952c4dd5`, released consumer outcome `candidate_for_authorization`;
- substituted evaluator under the same exact policy key: `completed / hold`, D SHA-256 `5b99d5d48bd7e1221c5cc1055332a1e934c616937463f6f7571f2070fc17c4ae`, released consumer outcome `hold`.

Input-authority identity, target, policy object, and effect type remained identical. Only evaluator implementation changed.

## Pair B: same identity, substituted CLEAR

A canonical adverse authority was produced once from a failed required-CI observation and then held byte-identical across the pair.

Fixed authority SHA-256: `4c2d1dadde43244b8f5024fdbc4b8048fc42f2e28a5b768a71039fb2ead1c8a5`.

Observed:

- trusted evaluator: `completed / hold`, D SHA-256 `a2b0144864b26522e92de4fe65e217ef064d710427aa54d3838e33ba33824549`, released consumer outcome `hold`;
- substituted evaluator under the same exact policy key: `completed / clear`, D SHA-256 `0b7c14dc912a55deec20547f0e6976008e8aa868a988b4c45752338c95f0762a`, released consumer outcome `candidate_for_authorization`.

Again, authority, target, policy ID/version, effect type, and Contract D authority were unchanged within the pair.

## Observed boundary

Exact Contract D legitimately accepted different Decisions carrying the same recorded authority/target/policy identity when the evaluator implementation was changed upstream of projection.

Therefore:

- policy `{id, version}` does not self-authenticate evaluator code;
- a caller-controlled registry is not a safe generic projection API;
- trusted policy implementation dispatch is part of Decision Engine machinery.

## Maintained negative control

The live maintained Contract-C runtime is intentionally not shaped like this research registry interface. It switches the exact two maintained policy IDs/versions to maintained implementation functions and rejects unknown policy identities. It does not accept a caller-provided `policyRegistry` parameter.

Accordingly, **no maintained production vulnerability is claimed** by this experiment.

The research finding is about what must not be generalized when extracting the projection seam.

## Architectural refinement

Current supported candidate becomes:

`trusted domain authority adapter -> trusted target resolver -> trusted policy implementation dispatch -> domain-neutral Decision projection -> exact Contract D`

The word `trusted` on policy dispatch is load-bearing.

## What else could explain the result?

1. Contract D may intentionally treat policy ID/version as a semantic label under producer/executable authority rather than a portable proof of evaluator bytes. That is consistent with the result and is not a defect by itself.
2. The research projection kernel made registry substitution easy because the registry was an argument. A maintained extraction can avoid the problem by making trusted dispatch internal or otherwise authority-bound.
3. Adding an evaluator digest to Contract D might support independent portable reproduction, but no current evidence establishes that such a field is necessary. It would also create a new versioning and executable-identity obligation.

## Next discriminating test

Before maintained extraction, pressure **minimality and trust placement** rather than adding more domains:

- remove projection-kernel validations one family at a time;
- determine which failures are already fail-closed under exact Contract D and which are uniquely owned by the Decision kernel;
- keep policy dispatch outside caller control in the candidate;
- verify valid Contract-C and heterogeneous-domain output bytes remain exact.

This should identify the smallest maintained machinery justified by the evidence and avoid preserving redundant research scaffolding.

## Non-claims

- no maintained Contract-C runtime vulnerability;
- no requirement yet for policy code hashes in Contract D;
- no Contract D revision;
- no maintained extraction/promotion;
- no operational Authorization or execution.
