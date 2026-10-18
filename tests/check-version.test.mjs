import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  checkVersionBump,
  compareVersions,
  versionBumpError,
} from "../scripts/check-version.mjs";

const PLUGIN = "plugins/telegram-ai";
const MANIFEST = `${PLUGIN}/.claude-plugin/plugin.json`;
const REFERENCE = `${PLUGIN}/skills/telegram-platform/references/bots.md`;
const EVAL_PROMPT = `${PLUGIN}/evals/sample/prompt.md`;

const bumpError = (changedFiles, baseVersion, headVersion) =>
  versionBumpError({
    pluginRoot: PLUGIN,
    changedFiles,
    baseVersion,
    headVersion,
  });

test("compares release versions numerically", () => {
  assert.ok(compareVersions("0.10.0", "0.9.9") > 0);
  assert.ok(compareVersions("1.0.0", "0.99.0") > 0);
  assert.equal(compareVersions("0.2.0", "0.2.0"), 0);
  assert.ok(compareVersions("0.1.9", "0.2.0") < 0);
});

test("accepts shipped changes with a higher version", () => {
  assert.equal(bumpError([REFERENCE], "0.1.0", "0.1.1"), null);
});

test("rejects shipped changes without a bump", () => {
  assert.match(
    bumpError([REFERENCE], "0.2.0", "0.2.0"),
    /without a version bump/,
  );
});

test("rejects a version decrease", () => {
  assert.match(bumpError([REFERENCE], "0.2.0", "0.1.0"), /0\.2\.0 -> 0\.1\.0/);
});

test("ignores eval-only changes", () => {
  assert.equal(bumpError([EVAL_PROMPT], "0.2.0", "0.2.0"), null);
});

test("ignores changes outside the plugin", () => {
  assert.equal(
    bumpError(["README.md", "plugins/other/x.md"], "0.2.0", "0.2.0"),
    null,
  );
});

test("skips plugins that are new at the base", () => {
  assert.equal(bumpError([REFERENCE], undefined, "0.1.0"), null);
});

async function repository(t) {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "telegram-ai-version-"),
  );
  t.after(() => rm(directory, { recursive: true, force: true }));
  const git = (...args) =>
    execFileSync(
      "git",
      [
        "-c",
        "user.name=Test",
        "-c",
        "user.email=test@example.com",
        "-c",
        "commit.gpgsign=false",
        ...args,
      ],
      { cwd: directory, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
  const write = async (file, content) => {
    await mkdir(path.dirname(path.join(directory, file)), { recursive: true });
    await writeFile(path.join(directory, file), content);
  };
  const commit = async (files) => {
    for (const [file, content] of Object.entries(files))
      await write(file, content);
    git("add", "-A");
    git("commit", "-q", "-m", "change");
    return git("rev-parse", "HEAD").trim();
  };
  git("init", "-q");
  return { directory, commit };
}

const manifest = (version) => JSON.stringify({ name: "telegram-ai", version });
const check = (directory, baseRef) =>
  checkVersionBump({ directory, baseRef, pluginRoot: PLUGIN });

test("fails a branch that changes a reference without a bump", async (t) => {
  const { directory, commit } = await repository(t);
  const base = await commit({
    [MANIFEST]: manifest("0.2.0"),
    [REFERENCE]: "a",
  });
  await commit({ [REFERENCE]: "b" });
  assert.match(check(directory, base), /references\/bots\.md/);
});

test("passes a branch that bumps the version in a later commit", async (t) => {
  const { directory, commit } = await repository(t);
  const base = await commit({
    [MANIFEST]: manifest("0.2.0"),
    [REFERENCE]: "a",
  });
  await commit({ [REFERENCE]: "b" });
  await commit({ [MANIFEST]: manifest("0.2.1") });
  assert.equal(check(directory, base), null);
});

test("passes when the plugin is new since the base", async (t) => {
  const { directory, commit } = await repository(t);
  const base = await commit({ "README.md": "readme" });
  await commit({ [MANIFEST]: manifest("0.1.0"), [REFERENCE]: "a" });
  assert.equal(check(directory, base), null);
});

test("reports an unknown base commit", async (t) => {
  const { directory, commit } = await repository(t);
  await commit({ [MANIFEST]: manifest("0.1.0") });
  assert.throws(() => check(directory, "f".repeat(40)));
});
