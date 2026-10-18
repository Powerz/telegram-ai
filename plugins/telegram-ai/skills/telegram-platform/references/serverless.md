# Telegram Serverless

Telegram hosts a JavaScript backend in V8 isolates, a SQLite-backed database, bot update routing and an optional static frontend. [Guide](https://core.telegram.org/bots/serverless). The guide documents no pricing, quotas, execution time limits, delivery SLA or redelivery behavior; don't assume any.

## When it fits

It can remove infrastructure for a small bot plus Mini App. Prefer an ordinary backend when the project needs existing infrastructure, npm packages, custom persistence or independent hosting, or anything that calls in from outside: endpoints are reachable only from the bot's own Mini App by a Telegram user ("there is no public API"), so third-party webhooks such as payment providers, scheduled jobs and a frontend hosted elsewhere don't fit. The frontend itself can be a normal Vite build; backend restrictions don't apply to frontend bundling.

## Setup

These are reference commands, not authorization to run them against a live bot. Run the CLI as `npx tgcloud <command>`; there is no global `tgcloud` by default.

1. Serverless is in beta: in the BotFather Mini App, bot → **Serverless** → **Get access to Serverless** sends an access request. Once access is granted, turn Serverless on there; this unlocks the CLI access token, which is separate from the Bot API token. See [botfather.md](botfather.md#serverless).
2. `npm create @tgcloud/bot <directory>` scaffolds the project and the local CLI. Inspect generated changes before adopting them in an existing project.
3. Authenticate. `npx tgcloud login` is the only command that prompts for the token, and it needs an interactive terminal, which an agent's shell usually isn't. Ask the user to run it in their own terminal, or to provide `TGCLOUD_TOKEN` through the environment; never ask them to paste the token into chat. `login` writes `.tgcloud/`, which must stay git-ignored.
4. Projects created before CLI 0.2.0 keep `schema.js`, `lib/` and `handlers/` at the root, and other commands refuse to run until `npx tgcloud upgrade` moves them (preview with `--dry-run`).

## Runtime contract

- **Layout:** backend modules live in `tgcloud/`: flat `handlers/` and `endpoints/`, nested `lib/`, and one `schema.js`. Relative imports end in `.js`.
- **Imports:** only `sdk`, `sdk/db`, `sdk/api`, `sdk/fetch` and your own modules resolve. There are no npm packages, no filesystem and no Node APIs such as `Buffer`.
- **Network:** only through the SDK's `fetch`. Responses are read as text, and the whole response is capped at 30 MB, even when streamed.
- **Files:** uploads follow Bot API limits (50 MB per file, 10 MB per photo). The SDK's download helpers resolve `file_id` without exposing the bot token and are capped at 20 MB.

[Projects and modules](https://core.telegram.org/bots/serverless#projects-and-modules), [the SDK](https://core.telegram.org/bots/serverless#the-sdk)

## Handlers

Each file in `handlers/` is named after one update type: `message.js`, `callback_query.js`, `pre_checkout_query.js`, and so on. A type is handled only if its file exists and isn't empty; otherwise those updates are ignored. A paid bot therefore needs `pre_checkout_query.js` (answered within 10 seconds), and `successful_payment` arrives inside `message.js`. The platform rejects handler names it doesn't support, so scaffold with `npx tgcloud add handlers/<type>` (for example to confirm `subscription`).

A handler receives the unwrapped payload (`message.js` gets the Message, not the Update). The second argument's `ctx.update` holds the raw Update, including `update_id`. Because redelivery isn't documented, make effects idempotent by `update_id` or charge ID anyway.

## Endpoints and the Mini App

An endpoint is `export default async function (input, ctx)` in `endpoints/<name>.js`. The Mini App calls it with `Telegram.WebApp.Serverless.call(name[, input][, callback])`; `input` is an optional plain object. The platform validates `initData` before the endpoint runs and rejects missing or invalid data with 401, so `ctx.initData` (`user`, `chat`, `start_param`, `auth_date`, …) is trustworthy and custom HMAC checks are unnecessary there. Still authorize each action by `ctx.initData.user`, validate `input`, and check `auth_date` yourself if freshness matters; the guide doesn't say it's enforced. [Endpoints](https://core.telegram.org/bots/serverless#endpoints), [Serverless in the JS API](https://core.telegram.org/bots/webapps#serverless)

The callback is error-first. The error has `message`, `type` (`ENDPOINT_ERROR` when you threw `EndpointError`, platform values such as `UNAUTHORIZED` otherwise), `status` (HTTP status, or `0` when the request didn't complete, an ambiguous outcome) and `parameters`. `EndpointError` passes your message and parameters to the caller; other exceptions surface as a generic error, so keep secrets out of error text.

## Bot API calls and errors

`api.<method>(params)` returns the Bot API result directly and throws `BotApiError` with `code`, `description`, `method` and `parameters` (`retry_after`, `migrate_to_chat_id`). The guide's example treats any `deleteMessage` 400 as "already gone", but a 400 also covers messages older than 48 hours or missing rights, so check the description. Handle `retry_after`, chat migrations and ambiguous network outcomes deliberately. [The Bot API](https://core.telegram.org/bots/serverless#the-bot-api)

## Database

The database API resembles Drizzle but isn't npm Drizzle: every query is async and foreign keys are unsupported. The scaffold's `docs/tgcloud-sdk.md` lists the exact operations. [Database](https://core.telegram.org/bots/serverless#the-database)

The guide documents no transaction API, and a multi-row insert is a single statement limited by SQLite's variable count. For payment fulfillment, build idempotency from single statements instead: a unique index on `telegram_payment_charge_id`, an insert that handles the conflict, and a grant that runs only when that insert reports a new row (`rowsAffected` or `RETURNING` from `db.run`), or derive entitlements from the charge ledger. This pattern is untested on the platform; verify it before relying on it.

## Webhook

The platform manages the bot's webhook. Don't call `setWebhook`, `deleteWebhook` or `getUpdates` for a Serverless bot, and the `secret_token` advice in [bots.md](bots.md) doesn't apply. `npx tgcloud webhook` shows the URL, `allowed_updates`, pending count, last error and whether it matches the deployed handlers; `npx tgcloud webhook sync` repoints it and reconciles update subscriptions after handler changes. Don't add `--drop-pending` casually. Moving an existing production bot to Serverless is a cut-over of update delivery; rehearse it on a test bot first. [Webhook](https://core.telegram.org/bots/serverless#webhook)

## Deploying

1. **Build first.** `push` never runs a build or a migration; the scaffold's `npm run deploy` builds and then pushes.
2. **Static frontend:** `tgcloud.jsonc` sets `static.source` (Vite: `dist`), SPA fallback, cache headers, response headers and redirects. A full push serves the site at the URL the CLI prints; configure that exact URL in BotFather. Caveats:
   - Files and folders starting with a dot are skipped.
   - `immutable` caches matching files for a year with no recall; use it only for content-hashed assets.
   - Don't add `X-Frame-Options` or a restrictive `frame-ancestors`; Telegram Web opens Mini Apps in an iframe.
   - Don't put your own files under `/api/`, where endpoints live.
   - `"static": false` deletes the deployed site on the next push; removing the key only stops managing it.
3. **Review before pushing.** `npx tgcloud fetch` refreshes the cached cloud state; `status` and `diff` compare against that cache, and BotFather edits change the cloud copy. A full `push` mirrors the local folder and deletes cloud modules missing locally; a targeted push touches only the named modules.
4. **Migrate the schema.** By default `migrate` compares against the deployed `schema.js`, so push the schema first or pass `--local`; until then, deployed code runs against the old schema. Preview with `migrate --dry-run`, apply additive changes with `--safe`, and leave destructive warnings to the user's interactive `migrate` (`--yes` applies every warning; use it only with explicit approval). Without a flag, `migrate` needs a terminal and fails in non-interactive shells. Removing a declaration doesn't drop a table or column; `.deprecated()` declarations produce explicit drops.
5. **Sync the webhook** after adding or removing handlers, then check `npx tgcloud webhook`.

`push --force` skips concurrency protection, `pull` replaces local modules with the deployed ones, and `reset` discards local changes. Read the differences before any of these. [CLI reference](https://core.telegram.org/bots/serverless#command-line-interface), [Mini App front end](https://core.telegram.org/bots/serverless#mini-app-front-end), [migrations](https://core.telegram.org/bots/serverless#migrations)

## Testing

`npx tgcloud run <module> <payload> --ctx <context>` uses local files but **executes on Telegram's platform**. It isn't a local emulator or a dry run: the code can call the Bot API and change the bot's database. Use a separate test bot for effectful runs. `--ctx` isn't verified, so a successful endpoint run proves neither authentication nor real client behavior; keep synthetic identities out of production authorization paths. [run](https://core.telegram.org/bots/serverless#run)

Test pure business logic locally, then platform execution, real updates and real Mini App calls separately, and check webhook health after each deployment.
