# AGENTS.md

Instructions for coding agents working in this repository. [CONTRIBUTING.md](CONTRIBUTING.md) has the full research, check and release rules; follow it.

- Everything that ships lives in `plugins/telegram-ai/`; repository tooling stays outside it.
- After changes, run `npm run check` (Node.js 22+) and the two `claude plugin validate --strict` commands from the [README](README.md).
- **Bump the plugin version with every change to shipped content.** Any change under `plugins/telegram-ai/` except eval-only changes in `evals/` needs a new version in both `plugins/telegram-ai/plugin.json` and `plugins/telegram-ai/.claude-plugin/plugin.json`, in the same commit or pull request. Claude Code caches installed plugins by version, so without a bump existing users never get the change. Use semver: a patch bump for corrections, a minor bump for new guidance or features. CI enforces this with `scripts/check-version.mjs` on pull requests and pushes to `main`.
