---
name: telegram-platform
description: Plan, build, adapt, debug, or review Telegram bots and Mini Apps, including BotFather setup, Bot API updates and webhooks, launch links, WebApp integration, initData and Telegram Login authentication, Stars payments, Telegram Serverless hosting, Developer Terms and data-use rules, and Telegram client testing. Use it for any Telegram bot or Mini App task, including short questions and plans, because it holds current platform rules that general knowledge often gets wrong; also for porting web games into Telegram.
---

# Telegram bots and Mini Apps

Use this researched baseline to implement Telegram integrations without rediscovering the platform. Baseline checked **2026-10-17**: Bot API **10.3** (2026-08-24); Mini Apps changelog **10.1** (2026-06-11); Serverless guide **2026-10-06**, CLI **0.2.0**; BotFather Mini App layout observed **2026-10-18**. These are documentation baselines, not a promise that every client implements every feature; [sources.md](references/sources.md) has the details.

## Read only the relevant references

| Work                                                                                      | Reference                                               |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Bot creation, update delivery, sending and formatting, commands, groups, modern features  | [bots.md](references/bots.md)                           |
| Where each bot and Mini App setting lives in BotFather (Mini App and chat commands)       | [botfather.md](references/botfather.md)                 |
| Mini App launch surfaces, bridge, layout, origin, storage, device APIs, client debugging  | [mini-apps.md](references/mini-apps.md)                 |
| initData validation, sessions, Stars, subscriptions, refunds, Developer Terms and privacy | [security-payments.md](references/security-payments.md) |
| Telegram sign-in on an external website or app, `login_url` buttons                       | [login.md](references/login.md)                         |
| Telegram-hosted backend and static frontend, SDK, deployment and migrations               | [serverless.md](references/serverless.md)               |
| Architecture choice, implementation sequence, deployment and acceptance testing           | [delivery.md](references/delivery.md)                   |
| Baselines, official source links, efficient doc lookup, known documentation conflicts     | [sources.md](references/sources.md)                     |

Read the security reference before implementing authenticated data, money flows or data collection. Ordinary bot-only work doesn't need the Mini App references.

## Work from the user's actual scope

Identify the requested outcome, existing stack, bot and environment, launch surfaces, hosting, supported clients, persistence authority and whether payments are in scope. Inspect the repository before changing it. Ask only about material unresolved product choices; don't turn a small bot or game port into a platform rewrite.

Choose between ordinary Bot API hosting and Telegram Serverless using the delivery reference. A Mini App can start as an HTTPS-hosted frontend configured in BotFather; secure accounts, shared scores, purchases or remote data add server responsibilities. A Phaser game doesn't need conversion to React or a native package to run as a Mini App. Classic Telegram Games is a separate optional integration with its own launch and scoreboard contracts.

Use the official JavaScript bridge through a small platform adapter. Reuse an existing maintained SDK when suitable, but distinguish its API from Telegram's protocol and verify that the installed version supports the required features. Don't add a framework only because a tutorial uses one.

## Keep these boundaries explicit

- Select the launch contract before the response mechanism. Reply-keyboard `sendData`, inline-button `answerWebAppQuery`, inline-mode selection, main and direct links, prepared sharing and join requests are different flows. `query_id`, user and chat data can be absent.
- Validate raw `initData` on your backend; never authenticate with `initDataUnsafe`. Reply-keyboard and inline-mode launches carry no init data, and `web_app_data` is client-controlled. In deployed Serverless endpoints, `ctx.initData` is already validated, but the CLI's synthetic `--ctx` isn't. No route validates client scores, prices or ownership.
- Mini App `initData`, `login_url`/legacy widget data and OIDC ID tokens each have their own verifier. Never reuse one for another.
- Keep bot and CLI tokens out of client bundles, source control and logs. The token is in every Bot API URL, including `getFile` download links, so never hand those to clients. Keep bridge calls on the original Mini App origin and open other destinations with `openLink`/`openTelegramLink`.
- For Telegram digital goods, use Stars. Fulfill from authenticated `successful_payment` updates with charge-level idempotency, never from a frontend invoice callback or precheckout approval. Keep renewal, cancellation and refund semantics separate.
- The Developer Terms bind every bot: they forbid collecting data to build datasets or train AI models, require a privacy policy, and attach fees and eligibility rules to paid broadcasts and private-chat topics.
- Gate bridge APIs by documented minimum version, actual method presence and runtime result. Handle unsupported hardware, denied access and missing data, and test fallback controls. Loading the bridge in an ordinary browser doesn't create a Telegram session.
- Keep Telegram activity and browser visibility in sync with pause and audio state. Respect device and Telegram safe areas. Expansion isn't immersive fullscreen; orientation lock keeps the current orientation.
- Distinguish transport deduplication from idempotent business effects. Keep pending updates unless discarding them is the user's intent. A remote test command can send messages or change real data.

## Reuse research; refresh only what matters

Don't start each task with a broad web search or by rereading manuals. Use the local references for architecture, workflow and known traps. For a latest or current claim, a changed feature, a missing detail, a release, or a policy or payment decision, check the directly linked changelog entry or the specific method, type or terms section; prefer the per-method Markdown pages described in [sources.md](references/sources.md#reading-the-docs-efficiently). Compare with the dated baseline and bring only the relevant change into the task. Refresh SDK and package facts when choosing or upgrading dependencies.

The current method schema and dated changelog outrank stale FAQ and tutorial statements; for policy and eligibility, the Developer Terms govern. Don't invent a minimum client version, API limit or pricing guarantee. If offline, continue with what the baseline supports and name any current fact that remains unverified. Don't edit this skill's files during product work; update its references only when asked to maintain the skill.

## Finish with evidence

Use the relevant acceptance cases in the references. Test pure logic and bridge failure paths locally, authentication and delivery at the server boundary, and interaction inside real Telegram clients. Browser mocks, deployed files and in-client behavior are different levels of evidence. State what was tested and what remains unobserved. A request to research or prepare doesn't authorize creating a bot, sending messages, charging users, changing BotFather settings or deploying.
