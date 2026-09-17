# Authority-adapter seam RC2 preserved failures

## Run 35232390053

Classification: `APPARATUS_LEGACY_DIGEST_PREFIX_ASSERTION_DEFECT`.

The preregistration/scope/frozen-kernel checks passed, all exact external identities passed, and the RC1 independent-authority discriminator reran successfully with `SUPPORTED_ARTIFACT_DERIVED_AUTHORITY`.

The frozen heterogeneous artifact-manifest scientific runner also completed and printed its expected `PASS` result with all prior controls true. The workflow failed only in the wrapper assertion immediately afterward because the legacy result records `exact_projection_kernel_sha256` as `sha256:<hex>` while the workflow environment stored the expected digest as bare `<hex>`.

Consequently the new CAL-shadow / signed-authority / cross-adapter harness did not execute in this run. This run is not evidence for or against the RC2 architecture.

Exact hosted evidence:

- run: `35232390053`
- job: `105239555259`
- executed head: `6b8e858506951924c24218f7f9d01f9e5f8f33a3`
- uploaded artifact ID: `10501677508`
- uploaded artifact ZIP SHA-256: `450a91e49b5233206c6cf974d11bd023d96228bdee442b6c8ace12481add589f`
- packaged evidence TGZ SHA-256: `c994b63d26b54e0f4984d483eaa4f316e585f16faf6fcf8904f86af1a2b9860b`

Successor correction is limited to digest representation normalization. The original research harness remains preserved unchanged; a successor wrapper may apply the same mechanical normalization only to a temporary execution copy.
