# Security, payments and policy

Read this before implementing authenticated data, money flows or anything that collects user data. Each Telegram signature scheme below is distinct; never reuse one verifier for another.

| Credential                                | Verifier                                                         |
| ----------------------------------------- | ---------------------------------------------------------------- |
| Mini App `initData`, your own backend     | HMAC with the `WebAppData` key (below)                           |
| Mini App `initData`, third party          | Ed25519 with Telegram's public key (below)                       |
| Mini App call to a Serverless endpoint    | Verified by the platform; see [serverless.md](serverless.md)     |
| `login_url` button or legacy login widget | Legacy hash with `SHA256(bot_token)`; see [login.md](login.md)   |
| Telegram Login (OIDC / JS library)        | ID token signed with Telegram's JWKS; see [login.md](login.md)   |
| Webhook request                           | `X-Telegram-Bot-Api-Secret-Token` header; see [bots.md](bots.md) |

## Mini App initData validation

Send raw `Telegram.WebApp.initData` to the server; `initDataUnsafe` is untrusted. Parse the query string, keep the decoded value strings exactly (don't parse and re-serialize the embedded JSON), sort the pairs by key, and join `key=value` lines with `\n` (0x0A) and no trailing newline. [Validation](https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app)

**HMAC (your backend, holds the bot token).** Exclude `hash` and keep every other field, including `signature` when present: `hash` covers "all passed parameters", while `signature` covers all parameters except `hash`.

```
secret   = HMAC_SHA256(key = "WebAppData", message = bot_token)
expected = hex(HMAC_SHA256(key = secret, message = data_check_string))
```

Use the raw `secret` bytes, not their hex form, and compare `expected` with `hash` in constant time. The docs say you _can_ also check `auth_date`.

**Ed25519 (third parties without the bot token).** Exclude both `hash` and `signature`. Verify the base64url-decoded `signature` (accept unpadded input) over `"<bot_id>:WebAppData\n" + data_check_string` with Telegram's public key. The docs say third parties _should_ validate `auth_date`. [Third-party validation](https://core.telegram.org/bots/webapps#validating-data-for-third-party-use)

- Production key: `e7bf03a2fa4602af4580703d88dda5bb59f32ed8b02a56c187fe7d34caed242d`
- Test environment key: `40055058a4ee38156a06562e52eece92a771bcd8346a8c4615cb7376eddf72ec`

Neither scheme prescribes a TTL.

Reply-keyboard and inline-mode launches carry **no** init data, so these flows can't authenticate the user. Data from `sendData` (`web_app_data.data` and `button_text`) is client-controlled: Telegram warns that a bad client can send arbitrary content. Only the message's sender is attested by Telegram.

## Authentication and authorization recommendations

Engineering recommendations, not Telegram requirements:

- Reject duplicate keys, malformed encoding, a hash or signature of the wrong length, missing identity on endpoints that need it, excessive age and timestamps unreasonably in the future. Choose and document the TTL and clock skew from the product's risk.
- Pin the environment, bot identity and key explicitly; never let a request choose which bot or key to trust.
- Exchange validated init data for a bounded server session. Valid init data proves launch integrity, not permission to buy, administer, read another user's records or submit a score.
- Enforce resource ownership on the server. Scores, prices, product IDs, start parameters and client storage are client input. Signed init data stays reusable until your policy rejects it, so an age check alone doesn't stop replay; use one-time challenges or idempotent operations where it matters, while still allowing legitimate reopen and session recovery.
- Keep the bot token in a server secret store, out of bundles, user-facing URLs, analytics and logs. Redact Bot API URL paths (they contain the token), raw launch strings and session credentials. Rotate an exposed token through BotFather.
- Authenticate webhook requests before accepting work, acknowledge only after durable acceptance, and recover failures without duplicate grants. Payment idempotency is separate from update deduplication.
- Mini App origin protection ([mini-apps.md](mini-apps.md#navigation-and-origin-protection)) secures the client bridge only; it never replaces backend authentication.

## Stars payments

Digital goods and services sold inside Telegram must use Stars, even when the merchant also sells on its own website; cryptocurrency isn't an alternative. Physical goods use the [provider payments](https://core.telegram.org/bots/payments) flow, with provider contracts and regional coverage. [Stars payments](https://core.telegram.org/bots/payments-stars)

API facts:

- Stars invoices use currency `XTR`, an empty `provider_token` and exactly one price item. [sendInvoice](https://core.telegram.org/bots/api#sendinvoice), [createInvoiceLink](https://core.telegram.org/bots/api#createinvoicelink)
- Answer `pre_checkout_query` within 10 seconds. Approving it is not payment: deliver only after the `successful_payment` message, and store its `telegram_payment_charge_id`.
- Subscriptions: `createInvoiceLink.subscription_period` must be 2592000 (30 days) and the price at most 10000 Stars. A user can hold several concurrent subscriptions. `SuccessfulPayment` carries `is_recurring`, `is_first_recurring` and optional `subscription_expiration_date`. [SuccessfulPayment](https://core.telegram.org/bots/api#successfulpayment)
- `refundStarPayment(user_id, telegram_payment_charge_id)` refunds in full; there's no partial amount. [refundStarPayment](https://core.telegram.org/bots/api#refundstarpayment)
- `editUserStarSubscription(user_id, telegram_payment_charge_id, is_canceled)`: `true` stops renewal and keeps the paid period; `false` lets the user re-enable a subscription **the bot** canceled. It doesn't charge or reactivate by itself. [editUserStarSubscription](https://core.telegram.org/bots/api#edituserstarsubscription)
- Since Bot API 10.2, `Update.subscription` (`BotSubscriptionUpdated`) reports `user`, `invoice_payload` and `state`: `canceled` (user canceled), `active` (user re-enabled) or `failed` (renewal payment failed). It has no charge ID or expiration date. Add `subscription` to explicit `allowed_updates` lists. [BotSubscriptionUpdated](https://core.telegram.org/bots/api#botsubscriptionupdated)
- `getStarTransactions` lists the bot's Stars transactions for reconciliation.

Recommended implementation:

1. Create a server-owned order with its price snapshot and an opaque `invoice_payload`; for subscriptions, use a unique payload per subscription instance, not per product.
2. At precheckout and at successful payment, match payload, buyer, currency and amount.
3. Make the charge ID the fulfillment boundary: record the charge and grant the entitlement atomically, in one transaction where the database has one, or by letting a unique charge-ID insert decide whether the grant runs. Store each renewal as its own charge and update access from the confirmed `subscription_expiration_date`; never deduplicate renewals by the original payload.
4. Treat browser invoice callbacks only as a prompt to refresh from the server.
5. Keep cancellation and refund separate. `active` isn't a new payment, `failed` isn't a refund, and `canceled` doesn't end already-paid access. Correlate lifecycle updates by user plus payload, deduplicate them, and test them arriving out of order with payments.
6. Handle timeouts and unknown outcomes without granting or refunding twice; reconcile against `getStarTransactions`. Plan how refunded digital goods are revoked, and back up the payment ledger.

Before going live (the [Live Checklist](https://core.telegram.org/bots/payments-stars#live-checklist)):

- A `/terms` command or equally easy access to terms, which users confirm before buying.
- Support through `/paysupport` (required for digital goods) and a clear support channel, telling users that Telegram support and @BotSupport can't help with purchases made through the bot.
- Two-step verification on the account that owns the bot, stable infrastructure and payment-data backups.
- Payment tests in Telegram's test environment (a separate test account and bot; see [mini-apps.md](mini-apps.md#testing-and-debugging-in-real-clients)), including fulfillment and dispute handling.

Stars availability varies by region and client. The client config flag `stars_purchase_blocked` ([client docs](https://core.telegram.org/api/stars)) tells Telegram apps to hide Stars purchases; it isn't a Bot API eligibility check. Show clear unavailable, cancelled and pending states, and never promise availability from a successful integration.

## Developer Terms and policy

The [Bot Developer Terms](https://telegram.org/tos/bot-developers) are binding. Check the current text before launch or when data use, payments or crypto features change.

- **Privacy (§4):** the Standard Privacy Policy applies by default; a service it doesn't cover needs its own policy, set in BotFather. Collect only the data the service needs and honor deletion and retention requests.
- **No dataset or AI-training collection (§4.3):** "any form of data collection aimed at creating large datasets, machine learning models and AI products, such as scraping public group or channel contents" is always prohibited. Don't log chats for model training.
- **Security (§4.4):** encrypt user data at rest with keys stored separately, follow reasonable security practice, respond to breaches, and keep credentials confidential. The Terms name verification of login widget data and protection against arbitrary `web_app_data` as required checks.
- **Conduct (§5):** no spam or impersonation; Mini App interfaces must work and be closable.
- **Payments (§6):** developers handle digital-goods disputes through `/paysupport` and refund Stars in full. Paid broadcasts (§6.2.5) and topics in private chats (§6.2.6, a 15% fee on Stars purchases) have their own conditions; see [bots.md](bots.md#sending-messages). Rewards through Fragment may be unavailable, and taxes are the developer's responsibility.
- **Crypto (§7):** crypto features in a Mini App and its bot must use TON, and wallets must use TON Connect, with exceptions for bridging and multichain wallets. Promoting or linking to non-TON cryptoassets is prohibited (§7.4). The [blockchain guidelines](https://core.telegram.org/bots/blockchain-guidelines) exempt ordinary bots without a Mini App, forbid modifying or forking TON Connect, and forbid restricting wallet choice except by feature support. Don't add crypto features speculatively; check the exact flow against current terms first.

## Test cases

Cover: tampered identity and payload; wrong bot, environment or key; expired and future `auth_date`; encoding and embedded-JSON preservation; duplicate keys; `signature` handling in each scheme; webhook secret failures; duplicate and reordered payment updates; precheckout failure and deadline; a client callback with no server payment; mismatched amount, currency or buyer; a crash between receipt and grant; refund timeout and replay; renewal uniqueness and expiration; cancellation keeping paid access. Report unit evidence, test-environment evidence and production observations separately.
