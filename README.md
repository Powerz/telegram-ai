# telegram-ai

Research-backed Telegram development guidance for **Claude Code and Codex**, distributed as one MIT-licensed plugin.

Use it to build and review bots, Mini Apps, web game integrations, authentication and Stars payments. The plugin contains one shared skill, `telegram-platform`, with focused references loaded as needed. It requires no Telegram credentials to install and includes no hooks, MCP servers or background processes.

## Install

### Claude Code

```sh
claude plugin marketplace add Powerz/telegram-ai
claude plugin install telegram-ai@telegram-ai
```

Start a new session and describe a Telegram task, or invoke the skill directly:

```text
/telegram-ai:telegram-platform
```

### Codex

```sh
codex plugin marketplace add Powerz/telegram-ai
codex plugin add telegram-ai@telegram-ai
```

Start a new session and ask:

```text
Use the telegram-platform skill from telegram-ai to plan a Telegram Mini App.
```

You can also select the installed plugin's skill in the skill picker. In clients without `codex plugin add`, add the marketplace and install **Telegram AI** from its source in the desktop Plugins directory. Client and workspace policies can restrict local plugins.

### From a local checkout

Run these from the repository root; the `./` prefix is required.

```sh
claude plugin marketplace add ./
claude plugin install telegram-ai@telegram-ai
```

```sh
codex plugin marketplace add ./
codex plugin add telegram-ai@telegram-ai
```

To try the plugin in Claude Code without installing it, run `claude --plugin-dir plugins/telegram-ai`.

Use the repository as the marketplace source, not a raw marketplace JSON URL: both catalogs resolve the plugin relative to the repository. A GitHub release doesn't list the plugin in either vendor's public directory.

If you already installed `telegram-platform` as a standalone personal skill, keep only one active copy to avoid ambiguous selection or stale guidance. Back up any personal additions before removing the old copy.

## What it covers

| Area      | Included guidance                                                                                                    |
| --------- | -------------------------------------------------------------------------------------------------------------------- |
| Bots      | Bot setup, update delivery, formatting and limits, callbacks, groups and privacy, guest/business/ephemeral messages  |
| BotFather | Where each bot and Mini App setting lives in BotFather, in its Mini App and chat commands                            |
| Mini Apps | Launch contracts, bridge APIs, viewport, theme and safe areas, origin protection, storage, sensors, client debugging |
| Identity  | Mini App HMAC/Ed25519 verification, `login_url` and Telegram Login/OIDC, sessions and authorization                  |
| Payments  | Stars, precheckout, fulfillment, renewals, cancellation, refunds, idempotency and the payments launch checklist      |
| Policy    | Developer Terms obligations, including privacy, the ban on collecting data for AI training, fees and crypto rules    |
| Hosting   | Conventional hosting and Telegram Serverless, deployment and migration semantics                                     |
| Delivery  | Architecture choices, testing layers and operational checks                                                          |

The research snapshot is dated **2026-10-17** and covers Bot API 10.3, the Mini Apps documentation and Telegram Serverless; the BotFather settings map was observed on **2026-10-18**. See the [sources reference](plugins/telegram-ai/skills/telegram-platform/references/sources.md) for exact baselines, links and known documentation conflicts.

The skill reuses this baseline and checks only relevant changes or missing details against official documentation. It can't freeze a fast-changing platform or guarantee that every Telegram client supports every documented API. A successful local test is not evidence of real Telegram client behavior.

## Example requests

- “Add Telegram Mini App support to this existing web game while retaining browser controls.”
- “Review our initData verification and webhook processing for replay and duplicate effects.”
- “Implement a Stars subscription with correct renewals, cancellation and refunds.”
- “Debug why this menu launch has no query_id.”
- “Compare our existing backend with Telegram Serverless for this bot.”

## Develop and validate

With Node.js 22 or newer:

```sh
npm run check
```

No `npm install` is needed: the validator and its tests use only Node's standard library. They check marketplace and manifest consistency, the Agent Plugins manifest schema, skill frontmatter, eval case structure, and local links and anchors. They don't implement the full vendor schemas or test Telegram itself.

With Claude Code installed, also validate the manifests:

```sh
claude plugin validate --strict plugins/telegram-ai
```

```sh
claude plugin validate --strict .
```

Behavioral evals live in [plugins/telegram-ai/evals](plugins/telegram-ai/evals) and run with `claude plugin eval`; see [CONTRIBUTING.md](CONTRIBUTING.md) before running them, because each run uses model credits. GitHub Actions runs the dependency-free checks on Linux and Windows.

## Repository layout

```text
.claude-plugin/marketplace.json      Claude Code marketplace
.agents/plugins/marketplace.json     Codex marketplace
plugins/telegram-ai/                 The plugin; only this directory is installed
  plugin.json                        Portable Agent Plugins manifest (Codex)
  .claude-plugin/plugin.json         Claude Code manifest
  skills/telegram-platform/          Shared skill and researched references
  evals/                             Behavioral eval cases for claude plugin eval
scripts/validate.mjs                 Offline package checks
AGENTS.md, CLAUDE.md                 Instructions for coding agents working on this repository
tests/                               Validator regression tests
```

The two manifests share identity, version and metadata, and both hosts load the same skill files.

## License

[MIT](LICENSE) for this project's original content and code. Linked upstream documentation remains owned by its respective authors. This is an independent community project, not an official Telegram, Anthropic or OpenAI plugin.
