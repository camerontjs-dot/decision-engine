function getPath(root, path) {
  return path.split(".").reduce((value, key) => {
    if (value === null || value === undefined) return undefined;
    if (/^\d+$/.test(key)) return value[Number(key)];
    return value[key];
  }, root);
}

function values(root, paths) {
  return paths.map((path) => getPath(root, path));
}

function result(ok, reason, expected = null) {
  return Object.freeze({ ok, reason, expected });
}

function baseExpected(declaration, artifacts) {
  const binding = declaration.binding;
  const targetIdParts = values(artifacts, binding.target_id || []);
  const targetHashParts = values(artifacts, binding.target_hash || []);
  if (targetIdParts.some((v) => typeof v !== "string") || targetHashParts.some((v) => typeof v !== "string")) {
    return null;
  }
  return {
    actor: declaration.actor,
    operation: declaration.operation,
    target: {
      class: declaration.target_class,
      id: targetIdParts.join("::"),
      current_hash: targetHashParts.join("::"),
    },
    batch_size: 1,
  };
}

function decisionExpected(declaration, artifacts, declarations) {
  const effect = getPath(artifacts, declaration.effect_binding);
  const targetKind = getPath(artifacts, declaration.target_kind_binding);
  const targetId = getPath(artifacts, declaration.target_id_binding);
  const targetHash = getPath(artifacts, declaration.target_hash_binding);
  const mapping = declarations.effect_operation_map[effect];
  if (!mapping) return result(false, "effect_unmapped");
  if (targetKind !== mapping.target_kind) return result(false, "effect_target_kind_mismatch");
  if (typeof targetId !== "string" || typeof targetHash !== "string") return result(false, "decision_target_incomplete");
  return result(true, "expected_derived", {
    actor: declaration.actor,
    operation: mapping.operation,
    target: { class: mapping.target_class, id: targetId, current_hash: targetHash },
    batch_size: 1,
  });
}

function requestCore(request) {
  return {
    actor: request?.actor,
    operation: request?.operation,
    target: {
      class: request?.target?.class,
      id: request?.target?.id,
      current_hash: request?.target?.current_hash,
    },
    batch_size: request?.batch_size,
  };
}

function same(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function accessReceiptIsValid(artifacts, evaluationTime, requiredOperation) {
  const receipt = artifacts.source_access_receipt;
  const passage = artifacts.contract_b.passage;
  if (!receipt || receipt.revoked === true) return result(false, "access_receipt_revoked_or_missing");
  const now = Date.parse(evaluationTime);
  const from = Date.parse(receipt.valid_from);
  const until = Date.parse(receipt.valid_until);
  if (![now, from, until].every(Number.isFinite)) return result(false, "access_receipt_time_invalid");
  if (now < from || now > until) return result(false, "access_receipt_not_current");
  if (!Array.isArray(receipt.operations) || !receipt.operations.includes(requiredOperation)) return result(false, "access_operation_not_granted");
  if (receipt.source_url !== passage.provenance.source_url) return result(false, "access_source_url_mismatch");
  if (receipt.source_content_hash !== passage.provenance.source_content_hash) return result(false, "access_source_hash_mismatch");
  return result(true, "access_receipt_bound");
}

function contractBIntegrityIsBound(artifacts) {
  const { manifest, claim, passage } = artifacts.contract_b;
  const ref = claim.evidence_passages?.[0];
  if (!manifest || !claim || !passage || !ref) return result(false, "contract_b_projection_incomplete");
  if (claim.bundle_id !== manifest.bundle_id || passage.bundle_id !== manifest.bundle_id) return result(false, "contract_b_bundle_binding_mismatch");
  if (ref.source_id !== passage.source_id || ref.passage_id !== passage.passage_id || ref.passage_hash !== passage.passage_hash) {
    return result(false, "contract_b_passage_binding_mismatch");
  }
  return result(true, "contract_b_binding_valid");
}

export function validateDeclarationSet(declarations) {
  const failures = [];
  for (const [name, declaration] of Object.entries(declarations.participants || {})) {
    const owned = new Set(declaration.owns || []);
    const excluded = new Set(declaration.excludes || []);
    for (const item of owned) {
      if (excluded.has(item)) failures.push(`${name}:ownership_exclusion_overlap:${item}`);
    }
    const bindingPaths = JSON.stringify(declaration.binding || {}) + JSON.stringify({
      effect_binding: declaration.effect_binding,
      target_kind_binding: declaration.target_kind_binding,
      target_id_binding: declaration.target_id_binding,
      target_hash_binding: declaration.target_hash_binding,
    });
    for (const forbidden of declaration.forbidden_semantic_inputs || []) {
      if (bindingPaths.includes(forbidden)) failures.push(`${name}:semantic_field_used_as_binding:${forbidden}`);
    }
  }
  return Object.freeze({ ok: failures.length === 0, failures });
}

export function validateAdapterBinding({ stage, request, artifacts, declarations, evaluationTime }) {
  const declaration = declarations.participants?.[stage];
  if (!declaration) return result(false, "declaration_missing");

  if (stage === "source-access") {
    const receipt = accessReceiptIsValid(artifacts, evaluationTime, "source.read");
    if (!receipt.ok) return receipt;
  }
  if (stage === "evidence-admission") {
    const receipt = accessReceiptIsValid(artifacts, evaluationTime, "evidence.admit_passage");
    if (!receipt.ok) return receipt;
    const contractB = contractBIntegrityIsBound(artifacts);
    if (!contractB.ok) return contractB;
  }
  if (stage === "cal-assessment") {
    const contractB = contractBIntegrityIsBound(artifacts);
    if (!contractB.ok) return contractB;
  }

  let expectedResult;
  if (declaration.effect_binding) {
    expectedResult = decisionExpected(declaration, artifacts, declarations);
  } else {
    const expected = baseExpected(declaration, artifacts);
    expectedResult = expected ? result(true, "expected_derived", expected) : result(false, "binding_field_missing");
  }
  if (!expectedResult.ok) return expectedResult;

  const actual = requestCore(request);
  if (!same(actual, expectedResult.expected)) {
    return result(false, "adapter_binding_mismatch", expectedResult.expected);
  }
  return result(true, "adapter_binding_valid", expectedResult.expected);
}

export function mutateRequest(request, mutation) {
  const clone = structuredClone(request);
  mutation(clone);
  return clone;
}

export const internalChecks = Object.freeze({ accessReceiptIsValid, contractBIntegrityIsBound, getPath });
