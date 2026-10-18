import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validatePackage } from "./validate.mjs";

const CLAUDE_MANIFEST = ".claude-plugin/plugin.json";
const UNVERSIONED_DIRECTORIES = ["evals"];
const NULL_COMMIT = /^0+$/;
const MISSING_AT_COMMIT = /does not exist in|exists on disk, but not in/;

export function compareVersions(left, right) {
  const a = left.split(".").map(Number);
  const b = right.split(".").map(Number);
  for (let index = 0; index < 3; index++)
    if (a[index] !== b[index]) return a[index] - b[index];
  return 0;
}

export function versionBumpError({
  pluginRoot,
  changedFiles,
  baseVersion,
  headVersion,
}) {
  if (baseVersion === undefined) return null;
  const prefix = `${pluginRoot}/`;
  const shipped = changedFiles.filter(
    (file) =>
      file.startsWith(prefix) &&
      !UNVERSIONED_DIRECTORIES.some((directory) =>
        file.startsWith(`${prefix}${directory}/`),
      ),
  );
  if (shipped.length === 0 || compareVersions(headVersion, baseVersion) > 0)
    return null;
  return `Plugin files changed without a version bump (${baseVersion} -> ${headVersion}): ${shipped.join(", ")}. Raise the version in both plugin manifests.`;
}

export function checkVersionBump({ directory, baseRef, pluginRoot }) {
  const git = (...args) =>
    execFileSync("git", args, {
      cwd: directory,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  const manifestAt = (commit) =>
    JSON.parse(git("show", `${commit}:${pluginRoot}/${CLAUDE_MANIFEST}`))
      .version;

  const base = git("merge-base", baseRef, "HEAD").trim();
  const changedFiles = git(
    "diff",
    "--name-only",
    base,
    "HEAD",
    "--",
    pluginRoot,
  )
    .split("\n")
    .filter(Boolean);
  let baseVersion;
  try {
    baseVersion = manifestAt(base);
  } catch (error) {
    if (!MISSING_AT_COMMIT.test(String(error.stderr))) throw error;
  }
  return versionBumpError({
    pluginRoot,
    changedFiles,
    baseVersion,
    headVersion: manifestAt("HEAD"),
  });
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const baseRef = process.argv[2];
  const directory = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
  );
  if (!baseRef || NULL_COMMIT.test(baseRef)) {
    console.log("No base commit to compare; version check skipped.");
  } else {
    try {
      const { pluginRoot } = await validatePackage(directory);
      const error = checkVersionBump({
        directory,
        baseRef,
        pluginRoot: pluginRoot.split(path.sep).join("/"),
      });
      if (error) {
        console.error(error);
        process.exitCode = 1;
      } else {
        console.log("Plugin version check passed.");
      }
    } catch (error) {
      console.error(error.stderr?.toString().trim() || error.message);
      process.exitCode = 1;
    }
  }
}
