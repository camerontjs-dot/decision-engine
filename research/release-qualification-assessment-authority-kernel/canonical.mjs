import { createHash } from "node:crypto";

function sortJson(value) {
  if (Array.isArray(value)) {
    return value.map(sortJson);
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortJson(value[key])]),
    );
  }
  return value;
}

export function canonicalBytes(value) {
  return Buffer.from(`${JSON.stringify(sortJson(value))}\n`, "utf8");
}

export function sha256Bytes(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

export function sha256Json(value) {
  return sha256Bytes(canonicalBytes(value));
}

export function cloneJson(value) {
  return structuredClone(value);
}
