# Sources, baselines and refreshing

The references are an authored guide built from official Telegram documentation, not a mirror of every method and type. All of them were checked against the live documentation on **2026-10-17**. That research didn't authenticate to Telegram, run a bot, inspect account eligibility or test client behavior, except for a tour of BotFather's Mini App and chat menus on **2026-10-18**, with settings switched on only on a throwaway test bot, that [botfather.md](botfather.md) records.

## Baselines

| Surface                  | Latest observed item                             | Notes                                                                          |
| ------------------------ | ------------------------------------------------ | ------------------------------------------------------------------------------ |
| Bot API                  | 10.3, 2026-08-24                                 | Ephemeral-message parameters, draft stop support, rich-message additions       |
| Bot API 10.2             | 2026-07-14; origin protection enabled 2026-07-20 | Mini App origin protection, subscription lifecycle updates, ephemeral messages |
| Mini Apps page changelog | 10.1, 2026-06-11                                 | Join-request launch context; the page doesn't list every later change          |
| Serverless guide         | 2026-10-06, CLI 0.2.0                            | Static hosting, endpoints, `tgcloud.jsonc`, `tgcloud/` layout                  |
| Policies and limits      | Live pages read; no version claimed              | Recheck before launch or when money, crypto or data use changes                |
| BotFather menus          | Observed 2026-10-18 (macOS client)               | No version or changelog; labels and grouping change without notice             |

The Bot API server version, the bridge script's query suffix, the client's advertised version, a native app build and an npm SDK version are different numbers. Don't derive one from another.

## Source index

| Source                                                                                                                                    | Use                                                                    |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [Bot API](https://core.telegram.org/bots/api) and [changelog](https://core.telegram.org/bots/api-changelog)                               | Methods, types, limits, update types, dated changes                    |
| [Bot features](https://core.telegram.org/bots/features)                                                                                   | BotFather, deep links, privacy, guest/business/ephemeral, bot-to-bot   |
| [BotFather Mini App](https://t.me/BotFather?startapp), [@BotNews](https://t.me/s/BotNews)                                                 | Current bot settings UI; announcements of settings-only features       |
| [FAQ](https://core.telegram.org/bots/faq)                                                                                                 | Approximate rate limits; older than the API page in places             |
| [Webhooks](https://core.telegram.org/bots/webhooks)                                                                                       | TLS, network and certificate troubleshooting                           |
| [Tutorial](https://core.telegram.org/bots/tutorial)                                                                                       | BotFather onboarding; its sample dependency versions aren't advice     |
| [Mini Apps](https://core.telegram.org/bots/webapps)                                                                                       | Bridge, launch surfaces, events, storage, sensors, validation, testing |
| [Client Mini App protocol](https://core.telegram.org/api/bots/webapps), [links](https://core.telegram.org/api/links)                      | Launch and link semantics as clients implement them                    |
| [Telegram Login](https://core.telegram.org/bots/telegram-login), [legacy widget](https://core.telegram.org/widgets/login-legacy)          | OIDC/JS sign-in; legacy hash for `login_url`                           |
| [Serverless](https://core.telegram.org/bots/serverless)                                                                                   | Hosted runtime, database, static frontend, endpoints, CLI              |
| [Inline bots](https://core.telegram.org/bots/inline), [Games](https://core.telegram.org/bots/games)                                       | Inline queries; classic game messages and scoreboards                  |
| [Stars payments](https://core.telegram.org/bots/payments-stars), [provider payments](https://core.telegram.org/bots/payments)             | Digital goods; physical goods                                          |
| [Developer Terms](https://telegram.org/tos/bot-developers), [blockchain guidelines](https://core.telegram.org/bots/blockchain-guidelines) | Binding policy; TON rules                                              |
| [Stars client protocol](https://core.telegram.org/api/stars)                                                                              | Regional purchase signals for clients, not a Bot API endpoint          |
| [MTProto bots](https://core.telegram.org/api/bots), [TDLib](https://core.telegram.org/tdlib)                                              | Specialized client and protocol work                                   |

## Reading the docs efficiently

- Telegram serves Markdown copies of its pages by appending `.md` (`/bots/api.md`, `/bots/webapps.md`, `/bots/serverless.md`).
- The Bot API is also split per method and per type, with lowercase names: `https://core.telegram.org/bots/api/methods/setwebhook.md` (about 3 KB) and `https://core.telegram.org/bots/api/types/update.md`. Fetch the one you need instead of the 860 KB API page; `/bots/api.md` itself is only an index.
- `/bots/webapps.md` shows a `{telegram_web_app_script_url}` placeholder; the HTML page has the real script URL.
- A missing HTML page returns HTTP 200 with the title "Page not found", while a missing `.md` page returns 404. Check page content, not just the status code.
- `/widgets/login` redirects to the new Telegram Login guide, but `/widgets/login.md` still serves the legacy widget page.

## Precedence and known inconsistencies

For API behavior, the current method or type schema and the dated changelog outrank FAQ and tutorial statements. For policy and eligibility, the Developer Terms govern; where sources disagree on a requirement, follow the stricter one and say so.

- **Paid broadcasts:** the Bot API page requires 10,000 Stars; the FAQ and Developer Terms §6.2.5 require 100,000 Stars and 100,000 monthly active users; BotFather's Paid Broadcast setting showed a 10,000 MAU minimum.
- **Bot-to-bot:** the FAQ says bots never see other bots; Bot API 10.0 and the features page allow opt-in communication.
- **Polling:** the FAQ loosely describes update confirmation; the API rule is an `offset` higher than the `update_id`.
- **Launch modes:** the Mini Apps introduction counts "seven" ways to launch, omitting join requests and the client-side menu launch.
- **Sensor callbacks:** the Mini Apps page says event handlers' `this` is `Telegram.WebApp`, while sensor examples use `this.x`; read sensor objects explicitly.
- **BotFather paths:** the payments guide says _Bot Settings > Payments_ and the Mini Apps page says _Bot Settings > Configure Mini App_. Both still exist in the chat menu, but the Mini App has Payments as a top-level item and Mini App settings under **Mini Apps**.
- **Serverless access:** the Serverless guide says to switch Serverless on in BotFather; a bot without access first has to request it (**Get access to Serverless**, beta).
- **Origin protection date:** the changelog enables it on July 20, 2026, while BotFather's Same-Origin Restriction note says July 25, 2026. Either way it is on by default now.
- **Serverless errors:** the guide's `BotApiError` example treats any `deleteMessage` 400 as "already gone"; a 400 has other causes.

## Refreshing

For design work, use the local references. For a current or latest claim, a changed feature or a missing detail, read only the relevant changelog entry and method, type or feature section. For releases and money, policy or data-use decisions, also read the current terms and limits. Record significant facts with retrieval date, URL and minimum version when documented. A successful fetch alone doesn't prove a guarantee is unchanged.

When asked to maintain this skill, update the affected reference and this baseline table (and the baseline line in `SKILL.md`), resolve contradictions, then rerun the structural checks and the behavioral evals. Don't copy manuals or add unchecked package claims.
