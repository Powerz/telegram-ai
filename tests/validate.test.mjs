import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  rm,
  cp,
  symlink,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validatePackage } from "../scripts/validate.mjs";

const PLUGIN = "plugins/telegram-ai";
const PORTABLE = `${PLUGIN}/plugin.json`;
const CLAUDE = `${PLUGIN}/.claude-plugin/plugin.json`;
const CLAUDE_MARKET = ".claude-plugin/marketplace.json";
const CODEX_MARKET = ".agents/plugins/marketplace.json";
const SKILL = `${PLUGIN}/skills/telegram-platform/SKILL.md`;
const REFERENCE = `${PLUGIN}/skills/telegram-platform/references/api.md`;
const EVAL_PROMPT = `${PLUGIN}/evals/sample/prompt.md`;
const EVAL_GRADER = `${PLUGIN}/evals/sample/graders/criteria.md`;
const LICENSE_TEXT = "MIT License\n";

const skill = (frontmatter, body = "[Reference](references/api.md#api)\n") =>
  `---\n${frontmatter}\n---\n${body}`;
const validSkill = skill(
  "name: telegram-platform\ndescription: Build Telegram applications",
);

async function fixture(t) {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "telegram-ai-validation-"),
  );
  t.after(() => rm(directory, { recursive: true, force: true }));
  const manifest = {
    name: "telegram-ai",
    version: "0.1.0",
    description: "Telegram development",
    author: { name: "Contributors" },
    homepage: "https://example.com/telegram-ai",
    repository: "https://example.com/telegram-ai.git",
    license: "MIT",
    keywords: ["telegram"],
  };
  const files = {
    LICENSE: LICENSE_TEXT,
    [`${PLUGIN}/LICENSE`]: LICENSE_TEXT,
    [PORTABLE]: JSON.stringify({
      $schema: "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
      ...manifest,
      extensions: {
        "com.openai": { interface: { displayName: "Telegram AI" } },
      },
    }),
    [CLAUDE]: JSON.stringify(manifest),
    [CLAUDE_MARKET]: JSON.stringify({
      name: "telegram-ai",
      owner: { name: "Contributors" },
      plugins: [{ name: "telegram-ai", source: `./${PLUGIN}` }],
    }),
    [CODEX_MARKET]: JSON.stringify({
      name: "telegram-ai",
      plugins: [
        {
          name: "telegram-ai",
          source: { source: "local", path: `./${PLUGIN}` },
          policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
          category: "Productivity",
        },
      ],
    }),
    [SKILL]: validSkill,
    [REFERENCE]:
      "# API\n\n## `login_url` buttons, and more\n\n[Skill](../SKILL.md) [Self](#login_url-buttons-and-more)\n\n```md\n[Ignored](missing.md)\n```\n",
    [EVAL_PROMPT]: "---\nmax_turns: 5\n---\n\nPlan a Telegram bot.\n",
    [EVAL_GRADER]: "---\ntype: llm\n---\n\nPASS if the plan is sound.\n",
    "README.md": `[Plugin](${PLUGIN}) [Reference](${REFERENCE})\n`,
  };
  for (const [file, content] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(directory, file)), { recursive: true });
    await writeFile(path.join(directory, file), content);
  }
  return directory;
}

async function editJson(directory, file, mutate) {
  const target = path.join(directory, file);
  const value = JSON.parse(await readFile(target, "utf8"));
  mutate(value);
  await writeFile(target, JSON.stringify(value));
}

test("actual package satisfies the invariants", async () => {
  const result = await validatePackage(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
  );
  assert.equal(result.pluginRoot, path.normalize(PLUGIN));
  assert.ok(result.skills >= 1);
  assert.ok(result.evalCases >= 1);
});

test("valid package remains valid after relocation", async (t) => {
  const directory = await fixture(t);
  const result = await validatePackage(directory);
  assert.deepEqual(
    { skills: result.skills, evalCases: result.evalCases },
    { skills: 1, evalCases: 1 },
  );
  const relocated = await mkdtemp(
    path.join(os.tmpdir(), "telegram-ai-relocated-"),
  );
  t.after(() => rm(relocated, { recursive: true, force: true }));
  await cp(directory, relocated, { recursive: true });
  await validatePackage(relocated);
});

test("accepts a Codex marketplace with a plain string source", async (t) => {
  const directory = await fixture(t);
  await editJson(directory, CODEX_MARKET, (market) => {
    market.plugins[0].source = `./${PLUGIN}`;
  });
  await validatePackage(directory);
});

test("ignores generated eval results", async (t) => {
  const directory = await fixture(t);
  const results = path.join(directory, PLUGIN, "evals/results/run/report.md");
  await mkdir(path.dirname(results), { recursive: true });
  await writeFile(results, "[Broken](missing.md)\n");
  await validatePackage(directory);
});

for (const [label, file, content, expected] of [
  ["malformed JSON", PORTABLE, "{", /Invalid JSON/],
  [
    "malformed skill frontmatter",
    SKILL,
    "---\nname: telegram-platform\n",
    /frontmatter/,
  ],
  [
    "missing skill description",
    SKILL,
    skill("name: telegram-platform"),
    /description/,
  ],
  [
    "block scalar description",
    SKILL,
    skill("name: telegram-platform\ndescription: >"),
    /single-line description/,
  ],
  [
    "skill name that differs from its directory",
    SKILL,
    skill("name: telegram-bots\ndescription: Build Telegram applications"),
    /match its directory/,
  ],
  [
    "skill name with consecutive hyphens",
    SKILL,
    skill("name: telegram--platform\ndescription: Build Telegram applications"),
    /single hyphens/,
  ],
  [
    "overlong skill description",
    SKILL,
    skill(`name: telegram-platform\ndescription: ${"x".repeat(1025)}`),
    /exceeds 1024/,
  ],
  [
    "missing link target",
    SKILL,
    skill(
      "name: telegram-platform\ndescription: Build",
      "[Missing](references/missing.md)\n",
    ),
    /Missing link target/,
  ],
  [
    "missing anchor in another file",
    SKILL,
    skill(
      "name: telegram-platform\ndescription: Build",
      "[Gone](references/api.md#gone)\n",
    ),
    /Missing link anchor/,
  ],
  [
    "missing anchor in the same file",
    REFERENCE,
    "# API\n[Self](#elsewhere)\n",
    /Missing link anchor/,
  ],
  [
    "escaping reference",
    REFERENCE,
    "# API\n[Outside](../../../../../../outside.md)",
    /escapes package/,
  ],
  [
    "Windows absolute reference",
    REFERENCE,
    "# API\n[Outside](C:/outside.md)",
    /Absolute package path/,
  ],
  [
    "POSIX absolute reference",
    REFERENCE,
    "# API\n[Outside](/outside.md)",
    /Absolute package path/,
  ],
  [
    "invalid link encoding",
    REFERENCE,
    "# API\n[Bad](bad%E0%A4%A.md)",
    /Invalid link encoding/,
  ],
  [
    "eval case without a prompt body",
    EVAL_PROMPT,
    "---\nmax_turns: 5\n---\n",
    /prompt is empty/,
  ],
  [
    "unknown grader type",
    EVAL_GRADER,
    "---\ntype: nonsense\n---\n",
    /Unknown grader type/,
  ],
  [
    "LLM grader without criteria",
    EVAL_GRADER,
    "---\ntype: llm\n---\n",
    /no criteria/,
  ],
  [
    "plugin license that differs",
    `${PLUGIN}/LICENSE`,
    "Apache License\n",
    /LICENSE differs/,
  ],
]) {
  test(`rejects ${label}`, async (t) => {
    const directory = await fixture(t);
    await writeFile(path.join(directory, file), content);
    await assert.rejects(validatePackage(directory), expected);
  });
}

for (const [label, file, expected] of [
  ["missing plugin license", `${PLUGIN}/LICENSE`, /Missing required file/],
  ["missing Claude manifest", CLAUDE, /Missing required file/],
  ["missing Codex marketplace", CODEX_MARKET, /Missing required file/],
  ["skill-less plugin", SKILL, /at least one skill/],
  ["eval case without graders", EVAL_GRADER, /no graders/],
]) {
  test(`rejects ${label}`, async (t) => {
    const directory = await fixture(t);
    await rm(path.join(directory, file));
    await assert.rejects(validatePackage(directory), expected);
  });
}

for (const key of [
  "name",
  "version",
  "description",
  "author",
  "license",
  "homepage",
  "repository",
  "keywords",
]) {
  test(`rejects manifest drift in ${key}`, async (t) => {
    const directory = await fixture(t);
    await editJson(directory, CLAUDE, (manifest) => {
      manifest[key] =
        key === "author"
          ? { name: "Other" }
          : key === "keywords"
            ? ["other"]
            : "https://other.example/x";
    });
    await assert.rejects(
      validatePackage(directory),
      new RegExp(`differ in ${key}`),
    );
  });
}

for (const [label, file, mutate, expected] of [
  [
    "unknown portable key",
    PORTABLE,
    (m) => (m.skills = "./skills"),
    /Unknown portable manifest key/,
  ],
  [
    "missing portable schema",
    PORTABLE,
    (m) => delete m.$schema,
    /Agent Plugins schema/,
  ],
  [
    "invalid plugin name",
    PORTABLE,
    (m) => (m.name = "Telegram_AI"),
    /lowercase identifier/,
  ],
  [
    "prerelease version",
    PORTABLE,
    (m) => (m.version = "0.1.0-beta"),
    /release semver/,
  ],
  [
    "unknown author key",
    PORTABLE,
    (m) => (m.author.role = "maintainer"),
    /Unknown author key/,
  ],
  [
    "non-URL homepage",
    PORTABLE,
    (m) => (m.homepage = "telegram-ai"),
    /homepage must be a URL/,
  ],
  [
    "non-object extension",
    PORTABLE,
    (m) => (m.extensions["com.openai"] = "yes"),
    /extensions must be objects/,
  ],
  [
    "two marketplace plugins",
    CLAUDE_MARKET,
    (m) => m.plugins.push(m.plugins[0]),
    /exactly one plugin/,
  ],
  [
    "marketplace name drift",
    CODEX_MARKET,
    (m) => (m.name = "other"),
    /Marketplace names differ/,
  ],
  [
    "marketplace entry name drift",
    CLAUDE_MARKET,
    (m) => (m.plugins[0].name = "other"),
    /plugin name differs/,
  ],
  [
    "missing Claude marketplace owner",
    CLAUDE_MARKET,
    (m) => delete m.owner,
    /owner\.name/,
  ],
  [
    "unprefixed source",
    CLAUDE_MARKET,
    (m) => (m.plugins[0].source = PLUGIN),
    /start with \.\//,
  ],
  [
    "escaping source",
    CLAUDE_MARKET,
    (m) => (m.plugins[0].source = "./../outside"),
    /escapes package/,
  ],
  [
    "marketplaces pointing to different plugins",
    CODEX_MARKET,
    (m) => (m.plugins[0].source.path = "./"),
    /different plugin directories/,
  ],
  [
    "non-local Codex source",
    CODEX_MARKET,
    (m) => (m.plugins[0].source.source = "url"),
    /must be local/,
  ],
  [
    "unknown Codex installation policy",
    CODEX_MARKET,
    (m) => (m.plugins[0].policy.installation = "SOMETIMES"),
    /policy\.installation/,
  ],
  [
    "missing Codex authentication policy",
    CODEX_MARKET,
    (m) => delete m.plugins[0].policy.authentication,
    /policy\.authentication/,
  ],
  [
    "missing Codex category",
    CODEX_MARKET,
    (m) => delete m.plugins[0].category,
    /category/,
  ],
]) {
  test(`rejects ${label}`, async (t) => {
    const directory = await fixture(t);
    await editJson(directory, file, mutate);
    await assert.rejects(validatePackage(directory), expected);
  });
}

test("rejects symlinks", async (t) => {
  const directory = await fixture(t);
  await symlink(
    os.tmpdir(),
    path.join(directory, "outside"),
    process.platform === "win32" ? "junction" : "dir",
  );
  await assert.rejects(validatePackage(directory), /Symlinks are not allowed/);
});
