import { canonicalBytes, sha256Bytes, sha256Json } from "../release-qualification-assessment-authority-kernel/canonical.mjs";

export class ManifestAuthorityError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ManifestAuthorityError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new ManifestAuthorityError(code, message);
}

function object(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value, expected, label) {
  if (!object(value)) fail("manifest_schema_mismatch", `${label} must be an object`);
  const actual = Object.keys(value).sort();
  const keys = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(keys)) {
    fail("manifest_schema_mismatch", `${label} keys must be exactly ${keys.join(",")}`);
  }
}

function string(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    fail("manifest_schema_mismatch", `${label} must be a non-empty string`);
  }
}

function sortedUniqueStrings(values, label) {
  if (!Array.isArray(values) || values.some((value) => typeof value !== "string" || value.length === 0)) {
    fail("manifest_schema_mismatch", `${label} must be an array of non-empty strings`);
  }
  const sorted = [...values].sort();
  if (JSON.stringify(sorted) !== JSON.stringify(values) || new Set(values).size !== values.length) {
    fail("manifest_noncanonical_order", `${label} must be sorted and unique`);
  }
}

function codeUnitCompare(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function entryRoot(entries) {
  return sha256Json(entries.map((entry) => ({
    byte_count: entry.byte_count,
    content_sha256: entry.content_sha256,
    path: entry.path,
    role: entry.role,
  })));
}

export function buildManifestValue({ repository, commitSha, manifestId, requiredPaths, entries }) {
  const normalizedEntries = [...entries]
    .map((entry) => {
      const bytes = Buffer.isBuffer(entry.bytes) ? entry.bytes : Buffer.from(entry.bytes);
      return {
        byte_count: bytes.length,
        content_base64: bytes.toString("base64"),
        content_sha256: sha256Bytes(bytes),
        path: entry.path,
        role: entry.role,
      };
    })
    .sort((a, b) => codeUnitCompare(a.path, b.path));

  const value = {
    entries: normalizedEntries,
    entry_root_sha256: entryRoot(normalizedEntries),
    manifest_id: manifestId,
    manifest_version: "research-1",
    required_paths: [...requiredPaths].sort(),
    source: {
      commit_sha: commitSha,
      repository,
    },
  };
  return value;
}

export function manifestBytes(value) {
  return canonicalBytes(value);
}

export function admitManifest({ bytes, expectedSha256 }) {
  if (!Buffer.isBuffer(bytes)) fail("manifest_schema_mismatch", "manifest bytes must be a Buffer");
  string(expectedSha256, "expectedSha256");
  const actualOuter = sha256Bytes(bytes);
  if (actualOuter !== expectedSha256) {
    fail("manifest_whole_object_mismatch", `manifest SHA ${actualOuter} does not equal expected ${expectedSha256}`);
  }

  let value;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    fail("manifest_parse_failed", `manifest is not valid UTF-8 JSON: ${error.message}`);
  }

  exactKeys(value, ["entries", "entry_root_sha256", "manifest_id", "manifest_version", "required_paths", "source"], "manifest");
  if (value.manifest_version !== "research-1") fail("manifest_version_mismatch", "manifest_version must be research-1");
  string(value.manifest_id, "manifest_id");
  exactKeys(value.source, ["commit_sha", "repository"], "source");
  string(value.source.repository, "source.repository");
  if (typeof value.source.commit_sha !== "string" || !/^[0-9a-f]{40}$/.test(value.source.commit_sha)) {
    fail("manifest_schema_mismatch", "source.commit_sha must be a lowercase 40-hex commit");
  }
  sortedUniqueStrings(value.required_paths, "required_paths");

  if (!Array.isArray(value.entries)) fail("manifest_schema_mismatch", "entries must be an array");
  const paths = [];
  for (const [index, entry] of value.entries.entries()) {
    exactKeys(entry, ["byte_count", "content_base64", "content_sha256", "path", "role"], `entries[${index}]`);
    string(entry.path, `entries[${index}].path`);
    string(entry.role, `entries[${index}].role`);
    string(entry.content_base64, `entries[${index}].content_base64`);
    if (!Number.isSafeInteger(entry.byte_count) || entry.byte_count < 0) {
      fail("manifest_schema_mismatch", `entries[${index}].byte_count must be a non-negative safe integer`);
    }
    if (typeof entry.content_sha256 !== "string" || !/^sha256:[0-9a-f]{64}$/.test(entry.content_sha256)) {
      fail("manifest_schema_mismatch", `entries[${index}].content_sha256 is invalid`);
    }
    const decoded = Buffer.from(entry.content_base64, "base64");
    if (decoded.toString("base64") !== entry.content_base64) {
      fail("manifest_entry_base64_mismatch", `entries[${index}] is not canonical base64`);
    }
    if (decoded.length !== entry.byte_count) {
      fail("manifest_entry_byte_count_mismatch", `entries[${index}] byte_count does not match decoded bytes`);
    }
    if (sha256Bytes(decoded) !== entry.content_sha256) {
      fail("manifest_entry_content_mismatch", `entries[${index}] content SHA does not match decoded bytes`);
    }
    paths.push(entry.path);
  }
  sortedUniqueStrings(paths, "entry paths");

  const expectedRoot = entryRoot(value.entries);
  if (value.entry_root_sha256 !== expectedRoot) {
    fail("manifest_entry_root_mismatch", `entry_root_sha256 must be ${expectedRoot}`);
  }

  const canonical = canonicalBytes(value);
  if (!canonical.equals(bytes)) {
    fail("manifest_noncanonical_bytes", "manifest bytes must equal deterministic research canonical bytes");
  }

  return {
    authority: structuredClone(value),
    inputAuthority: {
      kind: "artifact_manifest",
      id: value.manifest_id,
      immutable_id: expectedSha256,
    },
  };
}

export function targetForEntry(authority, path) {
  const entry = authority.entries.find((item) => item.path === path);
  if (!entry) return null;
  return {
    content_sha256: entry.content_sha256,
    id: `${authority.manifest_id}#${entry.path}`,
    kind: "artifact_manifest_entry",
  };
}

export function resolveManifestEntry({ authority, path, target }) {
  const entry = authority.entries.find((item) => item.path === path);
  if (!entry) fail("manifest_target_not_found", `manifest has no entry ${path}`);
  const expected = targetForEntry(authority, path);
  for (const key of ["kind", "id", "content_sha256"]) {
    if (target?.[key] !== expected[key]) {
      fail("manifest_target_binding_mismatch", `target ${key} does not match exact manifest entry`);
    }
  }
  return {
    entry: structuredClone(entry),
    target: structuredClone(expected),
  };
}

export function manifestCompleteness(authority) {
  const observed = new Set(authority.entries.map((entry) => entry.path));
  const missing = authority.required_paths.filter((path) => !observed.has(path));
  return {
    complete: missing.length === 0,
    missing_paths: missing,
  };
}
