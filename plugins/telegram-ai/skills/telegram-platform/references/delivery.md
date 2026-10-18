# Architecture, delivery and acceptance

Engineering guidance derived from the Telegram contracts in the other references, not extra platform rules. Choose the smallest design that delivers the requested behavior.

## Architecture selection

| Need                                                | Starting point                                          | Boundary                                                                 |
| --------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------ |
| Chat commands, menus, notifications                 | Bot API handlers with one delivery mode                 | Messaging rights, privacy mode, permissions and rate limits apply        |
| Web game with local-only progress                   | Static HTTPS frontend + configured bot or Main Mini App | No trustworthy remote scores or purchases without server authority       |
| Accounts, shared progress, leaderboard or purchases | Mini App + authenticated backend + durable data         | Telegram identity doesn't prove gameplay results                         |
| Small bot + Mini App on managed hosting             | Evaluate Telegram Serverless                            | No npm, no public inbound HTTP, no documented transactions or scheduling |
| Built-in chat game scoreboards                      | Evaluate classic Games separately                       | Different callback/score API; not interchangeable with Mini App auth     |
| Full Telegram client                                | MTProto/TDLib only when actually needed                 | A Bot API integration never requires implementing a Telegram client      |

With custom hosting, use the existing stack: a static CDN/HTTPS frontend, backend handlers and durable storage only where required. Opening a Main Mini App, menu-button app or direct link doesn't involve a bot update, so a bot that only opens its web UI from those surfaces shouldn't need a running update handler (an inference from the launch docs, not a documented guarantee). Keyboard and inline-button launches, welcome and help commands all need one. Don't add infrastructure or frameworks for imagined growth; the existing platform or database can provide durability.

## Build sequence

1. Capture concrete user flows and pick launch surfaces ([mini-apps.md](mini-apps.md)). Reply-keyboard and inline-mode launches have empty init data, so no verified identity is available there. Decide whether progress stays device-local or is linked to Telegram users, and whether ordinary browser access must keep working.
2. Choose hosting and a separate test bot and environment wherever changes could affect real users. Record bot identity, app origin, named-app short name and frontend/backend configuration without embedding secrets. Use BotFather for bot creation, descriptions, commands, menu/Main Mini App URL and media as needed; [botfather.md](botfather.md) has the locations.
3. Add the bridge behind a small adapter with a browser fallback and error states.
4. With a custom backend, validate raw init data before issuing a bounded session; on Serverless, use the platform-validated endpoint context ([security-payments.md](security-payments.md)). Authorize each data operation per user. Scope client-local progress to the Telegram user when several accounts share a device; never silently merge another account's scores or purchases.
5. Add only the requested business behavior. Design retries and idempotency at state transitions, and keep paid fulfillment independent of update delivery. Report supported, unsupported, cancelled and failed outcomes as such instead of substituting successful defaults.
6. Build production assets, run the project's checks and verify deployment configuration. Keep bridge calls on the original Mini App origin ([origin protection](mini-apps.md#navigation-and-origin-protection)); review redirects, base paths, cache invalidation and external navigation. Keep launch data out of URL analytics, error reports and request dumps.
7. Configure the launch route, exercise it inside Telegram, and read back changed configuration where an API exposes it. Record the source revision and the clients actually tested. Publish only within the scope the user authorized.

## Test matrix

| Layer            | Cases that give useful evidence                                                                                                                                         |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pure unit        | Business rules, state transitions, progress parsing, input conversion, idempotency decisions, message formatting and escaping                                           |
| Bridge contract  | Missing bridge or init data, old client version, method missing despite version, rejected operation, cleanup after restart                                              |
| Layout/lifecycle | Compact, expanded and fullscreen; both safe areas; keyboard; back; closing a dirty flow; minimize/restore; locked device; audio unlock                                  |
| Identity         | Valid signed fixtures plus tampering, encoding/Unicode, duplicate keys, wrong bot or environment, expired/future time, missing user, replay-sensitive actions           |
| Bot ingestion    | Duplicate and out-of-order updates, non-text messages, callback acknowledgement, persisted checkpoint, crash after acceptance, 429, blocked chat, unknown update field  |
| Payments         | Server-only price, precheckout timeout/rejection, no fulfillment from UI callback, repeated payment, distinct renewals, cancellation keeping paid time, refund recovery |
| Persistence      | Failed writes, quota, reload, new device, account switch, migration, recovery without fabricated success                                                                |
| Real clients     | Actual launch links on iOS and Android; Desktop and Web where supported; an older supported client; missing-hardware fallback                                           |

For tilt or action games, measure input direction, neutral angle, sampling and staleness, touch fallback, frame rate, pause/resume and accidental dismissal on real devices. Don't infer Telegram WebView behavior from a native wrapper such as Capacitor.

A browser mock proves frontend wiring. A test-environment payment proves that environment's flow. An upload proves asset delivery. A real-client run proves only the observed device, version and scenarios. Report each separately and name what remains untested.

## Operational baseline

Use separate bot tokens and databases for test and production; `file_id` values don't carry over between bots. On custom hosting, monitor webhook errors, pending updates, handler latency and failed business operations with redacted logs. Back up durable progress and payment data and test recovery where it matters. Queue outgoing traffic within the documented limits, honor `retry_after`, and never enable paid broadcasting automatically. Before launch, update the privacy policy and support flow if data use changed, and check the [Developer Terms](https://telegram.org/tos/bot-developers), including the ban on collecting data for AI training ([security-payments.md](security-payments.md#developer-terms-and-policy)).
