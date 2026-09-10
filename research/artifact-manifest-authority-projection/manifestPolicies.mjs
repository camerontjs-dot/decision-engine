import { manifestCompleteness } from "./manifestAdapter.mjs";

export const BOUND_ENTRY_USE_POLICY = Object.freeze({
  id: "decision-engine.artifact-manifest.bound-entry-use",
  version: "research-1",
});

export const COMPLETE_SET_USE_POLICY = Object.freeze({
  id: "decision-engine.artifact-manifest.complete-set-use",
  version: "research-1",
});

function effect() {
  return {
    type: "task.dispatch",
    version: "1",
    params: {},
  };
}

function evaluateBoundEntry({ resolution }) {
  if (!resolution?.entry) {
    return {
      state: "failed",
      metadata: { reason_codes: ["manifest_entry_not_resolved"] },
    };
  }
  return {
    state: "completed",
    disposition: "clear",
    effect: effect(),
    metadata: {
      reason_codes: ["manifest_entry_integrity_admitted"],
      diagnostics: {
        entry_path: resolution.entry.path,
        entry_role: resolution.entry.role,
      },
    },
  };
}

function evaluateCompleteSet({ authority, resolution }) {
  if (!resolution?.entry) {
    return {
      state: "failed",
      metadata: { reason_codes: ["manifest_entry_not_resolved"] },
    };
  }
  const completeness = manifestCompleteness(authority);
  return {
    state: "completed",
    disposition: completeness.complete ? "clear" : "hold",
    effect: effect(),
    metadata: {
      reason_codes: [completeness.complete ? "manifest_required_set_complete" : "manifest_required_set_incomplete"],
      diagnostics: {
        missing_paths: completeness.missing_paths,
        target_path: resolution.entry.path,
      },
    },
  };
}

export const MANIFEST_POLICY_REGISTRY = new Map([
  [`${BOUND_ENTRY_USE_POLICY.id}@${BOUND_ENTRY_USE_POLICY.version}`, evaluateBoundEntry],
  [`${COMPLETE_SET_USE_POLICY.id}@${COMPLETE_SET_USE_POLICY.version}`, evaluateCompleteSet],
]);
