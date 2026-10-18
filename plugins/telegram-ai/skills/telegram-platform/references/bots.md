# Telegram bots

Task-routing reference for HTTP Bot API bots. It keeps the contracts and traps that cause repeated mistakes; open the linked method or type for exact parameters. SDKs can lag behind Telegram.

## Setup and secrets

Create the bot with [@BotFather](https://t.me/BotFather) (Mini App **Create a New Bot** or `/newbot`) and verify the token with `getMe`. [botfather.md](botfather.md) maps where each setting lives. The token authenticates the bot, not its owner, and BotFather can revoke it. Keep it in a backend secret store; never ship it to a browser or Mini App.

The token is part of every Bot API URL, including file downloads: `https://api.telegram.org/file/bot<token>/<file_path>`. Redact these URLs in logs and traces, and never hand a `getFile` download URL to a client (avatars, media in a Mini App); proxy or re-host the file instead. Download links stay valid for at least one hour. [File](https://core.telegram.org/bots/api#file)

The official tutorial hardcodes demonstration credentials, prints raw updates and pins an old Java library; adapt its patterns instead of copying them. [Tutorial](https://core.telegram.org/bots/tutorial)

## Receiving updates

Polling (`getUpdates`) and webhooks are mutually exclusive, and Telegram keeps undelivered updates for at most 24 hours. [Getting updates](https://core.telegram.org/bots/api#getting-updates)

- **Polling:** use a positive `timeout` and `limit` 1–100. An update is confirmed once `getUpdates` is called with an `offset` higher than its `update_id`. Run one consumer per token.
- **Update IDs:** they increase sequentially, but after a week without updates the next ID is chosen randomly. Keep deduplication records for a bounded window rather than as a permanent unique key, and don't assume IDs are monotonic across idle periods.
- **Webhooks:** Telegram retries non-2xx responses "a reasonable amount" of times with no published schedule. Set `secret_token` (1–256 characters: `A-Z`, `a-z`, `0-9`, `_`, `-`) and verify the `X-Telegram-Bot-Api-Secret-Token` header. `max_connections` is 1–100, default 40. Inspect delivery with `getWebhookInfo`. [setWebhook](https://core.telegram.org/bots/api#setwebhook)
- **`allowed_updates`:** omitting it keeps the previous setting. An empty list receives every type except `chat_member`, `message_reaction` and `message_reaction_count`. An explicit list must be extended whenever you handle a new update type, and updates created before the change can still arrive. `drop_pending_updates` discards work; use it only when that loss is intended.
- **Webhook responses:** a Bot API call returned in the webhook response body gives no success or result confirmation.
- **Hosting:** IPv4, TLS 1.2+, a certificate whose CN/SAN matches the domain with the full chain, and ports 443, 80, 88 or 8443 (all HTTPS). Self-signed certificates must be uploaded. Redirects are not followed (watch framework trailing-slash and HTTP→HTTPS redirects) and wildcard certificates may not work. Telegram's source IP ranges are optional defense in depth; refresh them from current docs instead of hardcoding them. [Webhook guide](https://core.telegram.org/bots/webhooks), [FAQ](https://core.telegram.org/bots/faq)
- **Local Bot API server:** call `logOut` before redirecting requests to it. It allows uploads up to 2000 MB and unlimited downloads. [Local server](https://core.telegram.org/bots/api#using-a-local-bot-api-server)

Telegram Serverless manages the webhook for you; see [serverless.md](serverless.md) instead of calling `setWebhook` yourself.

## Handling updates reliably

Engineering recommendations derived from the delivery model; scale them to what the bot actually needs.

- Route by update field; never assume every update has `message.text`. Keep callback, inline, edited-message, payment and membership handlers separate, preserve chat/thread/business context, and treat unknown fields and update types as forward-compatible input.
- For webhooks, validate the secret header and payload shape, then either finish processing or persist the update before returning 2xx quickly. Deduplicate by bot plus `update_id` within the retention window, and write the dedup record atomically with what it guards: in the same transaction as the update's effects, or as the durable queued update itself. A "processed" marker written before the work lets a crash lose the update, because Telegram doesn't redeliver after a 2xx; if the update can be neither processed nor persisted, return non-2xx so Telegram retries. Make business effects idempotent too: two presses of the same button are two different updates.
- Serialize state changes per conversation or entity when ordering matters; parallel webhook connections don't preserve order.
- A send timeout is an ambiguous outcome, and blind retries can duplicate messages. When a lost or duplicated message matters (payments, reminders), record outgoing intents durably and retry them with bounds; a simple bot can send inline.
- Store chat and user IDs as 64-bit integers; they can exceed 32 bits. Handle `migrate_to_chat_id` when a group becomes a supergroup.
- Distinguish a Telegram API success from fulfilling the user's request. Record pending-update count, delivery errors and processing lag without logging private content.

## Sending messages

- **Formatting:** text is 1–4096 characters and captions 0–1024 characters, both counted after entity parsing. With `parse_mode=MarkdownV2`, the characters ``_ * [ ] ( ) ~ ` > # + - = | { } . !`` must be escaped with `\` outside entities, and different rules apply inside code and link URLs. With `HTML`, escape `<`, `>` and `&`. Unescaped user content is a common cause of "can't parse entities" errors; escape it, or send `entities` instead of a parse mode. [Formatting options](https://core.telegram.org/bots/api#formatting-options)
- **Rate limits (FAQ guidance, not a guarantee):** about one message per second per chat with short bursts, 20 per minute in a group, and roughly 30 per second for bulk notifications. Honor `retry_after` on 429 responses. [FAQ](https://core.telegram.org/bots/faq)
- **Paid broadcasts:** `allow_paid_broadcast` raises the limit to 1000 messages per second, charging 0.1 Stars per message above the free rate. The eligibility sources conflict: the Bot API page says 10,000 Stars on the balance, while the FAQ and the binding [Developer Terms §6.2.5](https://telegram.org/tos/bot-developers) require 100,000 Stars and 100,000 monthly active users, and BotFather's Paid Broadcast setting (chat only: `/mybots` → bot → **Bot Settings** → **Paid Broadcast**) showed a 10,000 MAU minimum when checked. Treat the Terms as governing, and never enable paid broadcasting automatically. [Paid broadcasts](https://core.telegram.org/bots/api#paid-broadcasts)
- **Files:** bots download up to 20 MB through `getFile` and upload up to 50 MB (photos 10 MB) as multipart. Files sent by HTTP URL are limited to 5 MB for photos and 20 MB otherwise. A `file_id` belongs to one bot, so a test bot can't reuse production IDs. [Sending files](https://core.telegram.org/bots/api#sending-files)

## Callback buttons

Call `answerCallbackQuery` promptly even when no toast is needed; it stops the client's progress indicator. `callback_data` is 1–64 **bytes**, not characters, so store a short opaque reference and check its owner and current state on the server. The source message may be inaccessible, and callbacks from inline messages carry `inline_message_id` instead of `message`. [CallbackQuery](https://core.telegram.org/bots/api#callbackquery), [answerCallbackQuery](https://core.telegram.org/bots/api#answercallbackquery)

## Commands and deep links

`https://t.me/<bot>?start=<payload>` arrives as `/start <payload>`. The payload is at most 64 characters from ASCII letters, digits, `_` and `-` (base64url fits). `?startgroup=<payload>` asks the user to pick a group and arrives there as `/start@<bot> <payload>`. Use opaque, expiring payloads rather than reusable credentials. Command menus aid discovery and never authorize anything. [Deep linking](https://core.telegram.org/bots/features#deep-linking)

## Groups, privacy and bot-to-bot messages

Privacy mode is on by default and filters ordinary group messages; admin bots receive all messages. After disabling privacy mode, the bot must be **re-added** to existing groups before the change applies. Check the chat permissions an action needs, not just membership. [Privacy mode](https://core.telegram.org/bots/features#privacy-mode)

Bot-to-bot communication is opt-in. In groups, a command mention `/command@OtherBot` or a direct reply is delivered when at least one of the bots has the mode enabled; a receiving bot with the mode plus admin rights or privacy disabled also sees other bots' messages without a mention. Private bot-to-bot chats need both bots to opt in. Bound loops and deduplicate. The FAQ still says bots never see other bots; that statement is outdated. [Bot-to-bot](https://core.telegram.org/bots/features#bot-to-bot-communication)

## Modern bot features

- **Business (Secretary Mode):** handle the connection lifecycle, check the latest rights, and reply with `business_connection_id`; replies are limited to private chats with an incoming message in the last 24 hours. [Business bots](https://core.telegram.org/bots/features#business-bots)
- **Guest mode:** enabled in the BotFather Mini App. When mentioned or replied to in a chat the bot isn't a member of, it receives a `guest_message` update and can send **one** reply with `answerGuestQuery(guest_query_id, result)`. It gets no history, member list or later messages. The guest chat may not match other bot chats with the same ID, so don't key guest state by `chat.id` alone. [Guest mode](https://core.telegram.org/bots/features#guest-bots)
- **Ephemeral messages:** visible only to one user and the bot. A bot that isn't a chat admin must send within **15 seconds** of the triggering action, passing `ephemeral_message_parameters.callback_query_id` or replying via `reply_parameters.ephemeral_message_id`; admin bots may send to any non-bot member at any time. Since 10.3, send methods take `ephemeral_message_parameters` (`receiver_user_id`, optional `callback_query_id`, optional `replace_callback_query_message`, which must be false for callbacks from ephemeral messages). The `editEphemeralMessage…` and `deleteEphemeralMessage` methods still take top-level `chat_id`, `receiver_user_id` and `ephemeral_message_id`, so store both IDs. Delivery isn't guaranteed; keep important outcomes in durable state, and don't route ephemeral replies through delayed queues. Commands marked `is_ephemeral` reply ephemerally. [Ephemeral messages](https://core.telegram.org/bots/features#ephemeral-messages), [EphemeralMessageParameters](https://core.telegram.org/bots/api#ephemeralmessageparameters)
- **Rich messages and streaming drafts:** `sendMessageDraft` and `sendRichMessageDraft` accept `can_stop`/`keep_on_stop`; a user stopping generation arrives as the `stopped_message_generation` update.
- **Topics in private chats:** enabling them puts a non-refundable 15% fee on all later Stars purchases in that bot while they stay enabled ([Developer Terms §6.2.6](https://telegram.org/tos/bot-developers)). Check this before enabling them for streaming or threads in a paid bot.
- Communities, managed bots and subscription updates have dedicated APIs; check the [changelog](https://core.telegram.org/bots/api-changelog) entry before relying on an SDK's support.

## Inline mode

Inline mode is its own interaction: users type `@bot query` in any chat, pick a result, and send it into that chat. Enable it in BotFather and handle `inline_query` updates instead of message text. Result URLs are visible to users, so never embed secrets in them. Check result types, caching/personalization and optional chosen-result feedback before implementing. [Inline bots](https://core.telegram.org/bots/inline)

## Games versus Mini Apps

The classic Gaming Platform uses `/newgame`, game messages and game callback queries: the Play button asks the bot for a game URL, and the first button in the first row must launch the game. Telegram supplies chat scoreboards; `TelegramGameProxy.shareScore()` needs a direct user action and works only inside Telegram. See `sendGame`, `setGameScore` and `getGameHighScores` for exact rules. [Gaming Platform](https://core.telegram.org/bots/games)

A Mini App is a general web interface served over HTTPS; a game can be one without using the classic game API. Game URL parameters and score-sharing scripts are not Mini App authentication; see [mini-apps.md](mini-apps.md).

## Protocol boundaries

The HTTP Bot API is the default backend interface. MTProto is a separate API: bot authorization needs the bot token **and** an API ID/hash, and only methods marked as usable by bots work. User-account capabilities never follow from a bot token. TDLib is a library for building full Telegram clients, not another name for the Bot API. [MTProto bots](https://core.telegram.org/api/bots), [TDLib](https://core.telegram.org/tdlib)

For sign-in on an external website or app, including `login_url` buttons, see [login.md](login.md).
