import { readdir, readFile, lstat } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CLAUDE_MARKETPLACE = ".claude-plugin/marketplace.json";
const CODEX_MARKETPLACE = ".agents/plugins/marketplace.json";
const PORTABLE_MANIFEST = "plugin.json";
const CLAUDE_MANIFEST = ".claude-plugin/plugin.json";
const LICENSE = "LICENSE";
const PORTABLE_SCHEMA =
  "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json";
const PORTABLE_KEYS = new Set([
  "$schema",
  "name",
  "version",
  "description",
  "author",
  "homepage",
  "repository",
  "license",
  "keywords",
  "extensions",
]);
const AUTHOR_KEYS = new Set(["name", "email", "url"]);
const SHARED_MANIFEST_KEYS = [
  "name",
  "version",
  "description",
  "author",
  "license",
  "homepage",
  "repository",
  "keywords",
];
const PLUGIN_NAME = /^(?!.*(?:--|\.\.))[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/;
const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_NAME_LENGTH = 64;
const MAX_SKILL_DESCRIPTION_LENGTH = 1024;
const RELEASE_VERSION = /^\d+\.\d+\.\d+$/;
const CODEX_INSTALLATION_POLICIES = new Set([
  "AVAILABLE",
  "INSTALLED_BY_DEFAULT",
  "NOT_AVAILABLE",
]);
const GRADER_TYPES = new Set([
  "regex",
  "tool_used",
  "tool_order",
  "file_exists",
  "llm",
  "baseline",
]);
const SKIPPED_DIRECTORIES = new Set([".git", "node_modules"]);
const EVAL_RESULTS_DIRECTORY = "results";

const fail = (message) => {
  throw new Error(message);
};

const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim() !== "";

function parseFrontmatter(content, label) {
  const match = content.match(
    /^---\r?\n(?:([\s\S]*?)\r?\n)?---[ \t]*(?:\r?\n|$)/,
  );
  if (!match) fail(`Missing or malformed frontmatter: ${label}`);
  const fields = new Map();
  for (const line of (match[1] ?? "").split(/\r?\n/)) {
    const field = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (field)
      fields.set(field[1], field[2].trim().replace(/^(["'])(.*)\1$/, "$2"));
  }
  return { fields, body: content.slice(match[0].length) };
}

const stripFences = (content) =>
  content.replace(/^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?^ {0,3}\1[^\n]*$/gm, "");

const stripCode = (content) =>
  stripFences(content).replace(/(`+)[\s\S]*?\1/g, "");

const safeDecode = (value) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
};

function headingSlugs(content) {
  const slugs = new Set();
  const counts = new Map();
  for (const match of stripFences(content).matchAll(
    /^ {0,3}#{1,6}\s+(.+?)\s*#*\s*$/gm,
  )) {
    const base = match[1]
      .replace(/`/g, "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s_-]/gu, "")
      .replace(/\s/g, "-");
    const count = counts.get(base) ?? 0;
    counts.set(base, count + 1);
    slugs.add(count === 0 ? base : `${base}-${count}`);
  }
  return slugs;
}

export async function validatePackage(directory) {
  const root = path.resolve(directory);
  const relative = (target) => path.relative(root, target) || ".";
  const contained = (value, base) => {
    if (path.posix.isAbsolute(value) || path.win32.isAbsolute(value))
      fail(`Absolute package path: ${value}`);
    const target = path.resolve(base, value);
    const fromRoot = path.relative(root, target);
    if (fromRoot === ".." || fromRoot.startsWith(`..${path.sep}`))
      fail(`Path escapes package: ${value}`);
    return target;
  };

  const files = [];
  async function walk(directoryPath) {
    for (const entry of await readdir(directoryPath)) {
      if (SKIPPED_DIRECTORIES.has(entry)) continue;
      const target = path.join(directoryPath, entry);
      const stat = await lstat(target);
      if (stat.isSymbolicLink())
        fail(`Symlinks are not allowed: ${relative(target)}`);
      if (stat.isDirectory()) await walk(target);
      else if (stat.isFile()) files.push(target);
    }
  }
  await walk(root);
  const fileSet = new Set(files);
  const requireFile = (target) => {
    if (!fileSet.has(target))
      fail(`Missing required file: ${relative(target)}`);
  };
  const read = (target) => readFile(target, "utf8");
  async function json(target) {
    requireFile(target);
    try {
      return JSON.parse(await read(target));
    } catch (error) {
      fail(`Invalid JSON in ${relative(target)}: ${error.message}`);
    }
  }

  const claudeMarket = await json(path.join(root, CLAUDE_MARKETPLACE));
  const codexMarket = await json(path.join(root, CODEX_MARKETPLACE));
  for (const market of [claudeMarket, codexMarket]) {
    if (!isNonEmptyString(market.name)) fail("Marketplace name is required");
    if (!Array.isArray(market.plugins) || market.plugins.length !== 1)
      fail("Each marketplace must list exactly one plugin");
  }
  if (claudeMarket.name !== codexMarket.name) fail("Marketplace names differ");
  if (!isNonEmptyString(claudeMarket.owner?.name))
    fail("Claude marketplace owner.name is required");
  const claudeEntry = claudeMarket.plugins[0];
  const codexEntry = codexMarket.plugins[0];
  const codexSource =
    typeof codexEntry.source === "string"
      ? codexEntry.source
      : codexEntry.source?.path;
  if (
    typeof codexEntry.source === "object" &&
    codexEntry.source?.source !== "local"
  )
    fail("Codex marketplace source must be local");
  if (!CODEX_INSTALLATION_POLICIES.has(codexEntry.policy?.installation))
    fail("Codex marketplace policy.installation is missing or unknown");
  if (!isNonEmptyString(codexEntry.policy?.authentication))
    fail("Codex marketplace policy.authentication is required");
  if (!isNonEmptyString(codexEntry.category))
    fail("Codex marketplace category is required");

  const pluginRoots = [claudeEntry.source, codexSource].map((source) => {
    if (typeof source !== "string") fail("Marketplace source path is required");
    if (!source.startsWith("./")) fail("Marketplace source must start with ./");
    return contained(source, root);
  });
  if (pluginRoots[0] !== pluginRoots[1])
    fail("Marketplaces point to different plugin directories");
  const pluginRoot = pluginRoots[0];
  const evalResults =
    path.join(pluginRoot, "evals", EVAL_RESULTS_DIRECTORY) + path.sep;
  const packageFiles = files.filter((file) => !file.startsWith(evalResults));

  const portable = await json(path.join(pluginRoot, PORTABLE_MANIFEST));
  const claude = await json(path.join(pluginRoot, CLAUDE_MANIFEST));
  for (const key of Object.keys(portable)) {
    if (!PORTABLE_KEYS.has(key)) fail(`Unknown portable manifest key: ${key}`);
  }
  if (portable.$schema !== PORTABLE_SCHEMA)
    fail("Portable manifest must declare the Agent Plugins schema");
  if (
    !isNonEmptyString(portable.name) ||
    portable.name.length > MAX_NAME_LENGTH ||
    !PLUGIN_NAME.test(portable.name)
  )
    fail("Plugin name must be a lowercase identifier of at most 64 characters");
  if (
    typeof portable.version !== "string" ||
    !RELEASE_VERSION.test(portable.version)
  )
    fail("Plugin version must be a release semver");
  if (!isNonEmptyString(portable.description))
    fail("Plugin description is required");
  if (!isNonEmptyString(portable.license)) fail("Plugin license is required");
  if (!isNonEmptyString(portable.author?.name))
    fail("Plugin author.name is required");
  for (const key of Object.keys(portable.author)) {
    if (!AUTHOR_KEYS.has(key)) fail(`Unknown author key: ${key}`);
  }
  for (const key of ["homepage", "repository"]) {
    if (portable[key] === undefined) continue;
    try {
      new URL(portable[key]);
    } catch {
      fail(`Plugin ${key} must be a URL`);
    }
  }
  if (
    portable.keywords !== undefined &&
    (!Array.isArray(portable.keywords) ||
      !portable.keywords.every(isNonEmptyString))
  )
    fail("Plugin keywords must be an array of strings");
  if (
    portable.extensions !== undefined &&
    !Object.values(portable.extensions).every(
      (value) =>
        value !== null && typeof value === "object" && !Array.isArray(value),
    )
  )
    fail("Portable manifest extensions must be objects");
  for (const key of SHARED_MANIFEST_KEYS) {
    if (!isDeepStrictEqual(portable[key], claude[key]))
      fail(`Plugin manifests differ in ${key}`);
  }
  for (const entry of [claudeEntry, codexEntry]) {
    if (entry.name !== portable.name)
      fail("Marketplace plugin name differs from the plugin manifest");
  }

  const pluginLicense = path.join(pluginRoot, LICENSE);
  requireFile(path.join(root, LICENSE));
  requireFile(pluginLicense);
  if ((await read(path.join(root, LICENSE))) !== (await read(pluginLicense)))
    fail("Plugin LICENSE differs from the repository LICENSE");

  const inPlugin = (target, ...segments) =>
    target.startsWith(path.join(pluginRoot, ...segments) + path.sep);
  const skillFiles = packageFiles.filter(
    (file) =>
      path.basename(file) === "SKILL.md" &&
      path.dirname(path.dirname(file)) === path.join(pluginRoot, "skills"),
  );
  if (skillFiles.length === 0) fail("Plugin must contain at least one skill");
  for (const file of skillFiles) {
    const { fields } = parseFrontmatter(await read(file), relative(file));
    const name = fields.get("name");
    const description = fields.get("description");
    for (const [key, value] of [
      ["name", name],
      ["description", description],
    ]) {
      if (!value || ["|", ">", "|-", ">-"].includes(value))
        fail(
          `Skill frontmatter requires a single-line ${key}: ${relative(file)}`,
        );
    }
    if (name.length > MAX_NAME_LENGTH || !SKILL_NAME.test(name))
      fail(
        `Skill name must be lowercase words joined by single hyphens: ${name}`,
      );
    if (name !== path.basename(path.dirname(file)))
      fail(`Skill name must match its directory: ${name}`);
    if (description.length > MAX_SKILL_DESCRIPTION_LENGTH)
      fail(
        `Skill description exceeds ${MAX_SKILL_DESCRIPTION_LENGTH} characters: ${name}`,
      );
  }

  const evalCases = packageFiles.filter(
    (file) => path.basename(file) === "prompt.md" && inPlugin(file, "evals"),
  );
  for (const prompt of evalCases) {
    const caseDirectory = path.dirname(prompt);
    const { body } = parseFrontmatter(await read(prompt), relative(prompt));
    if (!body.trim()) fail(`Eval prompt is empty: ${relative(prompt)}`);
    const graders = packageFiles.filter(
      (file) =>
        path.dirname(file) === path.join(caseDirectory, "graders") &&
        file.endsWith(".md"),
    );
    if (graders.length === 0)
      fail(`Eval case has no graders: ${relative(caseDirectory)}`);
    for (const grader of graders) {
      const { fields, body: criteria } = parseFrontmatter(
        await read(grader),
        relative(grader),
      );
      const type = fields.get("type");
      if (!GRADER_TYPES.has(type))
        fail(`Unknown grader type "${type}": ${relative(grader)}`);
      if (type === "llm" && !criteria.trim() && !fields.get("criteria"))
        fail(`LLM grader has no criteria: ${relative(grader)}`);
    }
  }

  const markdown = packageFiles.filter((file) => file.endsWith(".md"));
  const slugCache = new Map();
  const slugsOf = async (file) => {
    if (!slugCache.has(file))
      slugCache.set(file, headingSlugs(await read(file)));
    return slugCache.get(file);
  };
  for (const file of markdown) {
    const content = stripCode(await read(file));
    const links = [
      ...content.matchAll(/!?\[[^\]]*\]\((<[^>]+>|[^\s)]+)(?:\s+[^)]*)?\)/g),
      ...content.matchAll(/^\s{0,3}\[[^\]]+\]:\s*(<[^>]+>|\S+)/gm),
    ];
    for (const match of links) {
      const link = match[1].replace(/^<|>$/g, "");
      if (path.win32.isAbsolute(link) || path.posix.isAbsolute(link))
        fail(`Absolute package path: ${link}`);
      if (/^[a-z][a-z\d+.-]*:/i.test(link)) continue;
      const [target, fragment] = link.split("#", 2);
      let destination = file;
      if (target) {
        const decoded = safeDecode(target.split("?")[0]);
        if (decoded === undefined)
          fail(`Invalid link encoding in ${relative(file)}: ${link}`);
        destination = contained(decoded, path.dirname(file));
        const isDirectory = files.some((candidate) =>
          candidate.startsWith(destination + path.sep),
        );
        if (!fileSet.has(destination) && !isDirectory)
          fail(`Missing link target in ${relative(file)}: ${link}`);
      }
      if (fragment && destination.endsWith(".md")) {
        if (!(await slugsOf(destination)).has(safeDecode(fragment)))
          fail(`Missing link anchor in ${relative(file)}: ${link}`);
      }
    }
  }

  return {
    files: files.length,
    skills: skillFiles.length,
    evalCases: evalCases.length,
    pluginRoot: relative(pluginRoot),
  };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const result = await validatePackage(
      process.argv[2] ??
        path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
    );
    console.log(
      `Package invariants passed: ${result.pluginRoot}, ${result.skills} skill(s), ${result.evalCases} eval case(s), ${result.files} files. This is not full vendor schema validation.`,
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
