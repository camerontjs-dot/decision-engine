import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import path from "node:path";

import { admitManifest, ManifestAuthorityError } from "./manifestAdapter.mjs";

function fail(code, message) {
  throw new ManifestAuthorityError(code, message);
}

function gitHead(root) {
  const result = spawnSync("git", ["-C", root, "rev-parse", "HEAD"], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    fail("manifest_source_unavailable", `cannot resolve manifest source HEAD: ${result.error?.message ?? result.stderr ?? result.stdout}`);
  }
  return result.stdout.trim();
}

function safeSourcePath(root, relative) {
  if (path.isAbsolute(relative) || relative.split(/[\\/]/).includes("..")) {
    fail("manifest_source_path_invalid", `unsafe manifest entry path ${relative}`);
  }
  const realRoot = realpathSync(root);
  const candidate = path.resolve(realRoot, relative);
  if (candidate !== realRoot && !candidate.startsWith(`${realRoot}${path.sep}`)) {
    fail("manifest_source_path_invalid", `manifest entry escapes source root: ${relative}`);
  }
  return candidate;
}

export function admitSourceBoundManifest({
  bytes,
  expectedSha256,
  sourceRoot,
  expectedSource,
}) {
  if (!expectedSource || Object.keys(expectedSource).sort().join(",") !== "commit_sha,repository") {
    fail("manifest_expected_source_invalid", "expectedSource must contain exactly commit_sha and repository");
  }
  const admitted = admitManifest({ bytes, expectedSha256 });
  const source = admitted.authority.source;
  if (source.repository !== expectedSource.repository || source.commit_sha !== expectedSource.commit_sha) {
    fail("manifest_source_binding_mismatch", "manifest source identity does not equal expected source identity");
  }
  const head = gitHead(sourceRoot);
  if (head !== expectedSource.commit_sha) {
    fail("manifest_source_binding_mismatch", `source checkout HEAD ${head} does not equal expected ${expectedSource.commit_sha}`);
  }

  for (const entry of admitted.authority.entries) {
    let actual;
    try {
      actual = readFileSync(safeSourcePath(sourceRoot, entry.path));
    } catch (error) {
      if (error instanceof ManifestAuthorityError) throw error;
      fail("manifest_source_entry_missing", `cannot read ${entry.path} from exact source checkout: ${error.message}`);
    }
    const declared = Buffer.from(entry.content_base64, "base64");
    if (!actual.equals(declared)) {
      fail("manifest_source_entry_mismatch", `manifest entry ${entry.path} differs from exact source checkout bytes`);
    }
  }

  return admitted;
}
