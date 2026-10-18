# Contributing

Keep the plugin portable, focused on Telegram development and grounded in official documentation. One shared skill serves both hosts; don't fork its content into separate Claude Code and Codex copies. Everything that ships lives in `plugins/telegram-ai/`; repository tooling stays outside it.

## Research changes

- Read the relevant existing reference before editing. Preserve the distinction between documented protocol behavior, recommended application design and observed runtime evidence.
- Prefer current Telegram method schemas and dated changelogs over old tutorials, and the Developer Terms for policy. Cite direct official URLs near changed claims. Per-method pages such as `https://core.telegram.org/bots/api/methods/<method>.md` are the cheapest way to check one method.
- Keep the research date and version baselines in one place: the baseline line in `SKILL.md` and the table in `references/sources.md`. Don't add per-file "checked on" stamps.
- State each fact in one reference and link to it from the others. Check authentication, payments, permission and lifecycle guidance for contradictions across references, and keep the HMAC, Ed25519, legacy login, OIDC and Serverless verification contexts distinct.
- Don't copy entire upstream manuals. Keep the contracts, decisions and pitfalls that save repeated research, and link exact method definitions for uncommon details.
- Exclude personal project names, local installation histories, private paths, credentials and account-specific configuration. Use generic examples and relative links.

## Checks

Run `npm run check` with Node.js 22 or newer. The validator has no dependencies and makes no network requests. Extend its tests when adding a packaging invariant or fixing a validator bug. CI also runs `node scripts/check-version.mjs <base>`, which fails when shipped plugin files change without a higher version in the manifests; changes only under `evals/` are exempt.

With Claude Code installed, run the two `claude plugin validate --strict` commands from the README. After changing manifests or layout, also install from a fresh local checkout in both hosts; package checks don't prove host compatibility.

## Behavioral evals

`plugins/telegram-ai/evals/` holds [`claude plugin eval`](https://code.claude.com/docs/en/plugin-evals) cases: each case directory has a `prompt.md` and graders under `graders/`. Every positive case checks that the skill fired and grades the answer with short PASS/FAIL rubrics; `unrelated-bot-request` checks that the skill stays silent. Add or update a case when you change guidance an agent should act on.

Each run is a real model call on your account, repeated with and without the plugin to report what the plugin adds. The answers are long, and the default small judge model has failed correct ones, so pass `--judge-model sonnet`. Run a focused subset while iterating:

```sh
claude plugin eval plugins/telegram-ai --judge-model sonnet --case login-url-verification --runs 1
```

Before a release, run the whole suite and record the scores and models in the release notes:

```sh
claude plugin eval plugins/telegram-ai --judge-model sonnet
```

Read a case's Δ together with its `skill-fired` indicator: a gain in runs where the skill never fired is noise. Cases that score the same with and without the plugin, such as `login-url-verification`, guard against regressions in security-critical guidance rather than measure the plugin's value.

To check that case files load without any model calls, add `--max-cost-usd 0`: load errors are listed before the run stops at the cost ceiling. Results are written to `plugins/telegram-ai/evals/results/`, which is git-ignored. The cases are advice-only; never let an eval create bots, send messages, charge users or deploy.

## Compatibility and releases

The portable `plugins/telegram-ai/plugin.json` follows the [Codex packaging guide](https://developers.openai.com/plugins/build/plugins). Claude Code uses its [plugin manifest](https://code.claude.com/docs/en/plugins-reference) and [marketplace catalog](https://code.claude.com/docs/en/plugin-marketplaces). The validator checks that both manifests agree on name, version, description, author, license, homepage, repository and keywords, and that both marketplaces point to the same plugin directory.

Before a release:

1. Check that both plugin manifests carry the version being released. Every change to shipped content bumps it in the same pull request (see [AGENTS.md](AGENTS.md)); eval-only changes don't.
2. Run `npm run check`, vendor validation and the eval suite, and test installation from a fresh checkout in both hosts. Record client versions and any untested surface in the release notes.
3. Check changed research against its cited sources and make sure no stale local paths, secrets or unresolved placeholders entered the package.
4. Publish releases only with the owner's authorization. Keep repository metadata and the README's installation commands aligned with the published repository.

The GitHub workflow pins `actions/checkout` and `actions/setup-node` to full commit SHAs, with the release tag in a comment. Review upstream changes before updating a pin. A green workflow proves the packaging checks passed; it doesn't prove agent quality or Telegram runtime compatibility.

For sensitive findings, keep live tokens, raw init data and personal information out of public issues. Provide redacted reproduction steps and explain the affected trust boundary.
