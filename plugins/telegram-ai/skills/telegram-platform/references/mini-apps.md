# Telegram Mini Apps

Implementation reference for Mini Apps (the Bot API's legacy name is "Web Apps"). Use it for launch selection, the JS bridge, layout, storage, device APIs and client testing; consult the linked sections for full field lists.

## Bridge setup

Load `https://telegram.org/js/telegram-web-app.js?64` in `<head>` before other scripts. The query suffix is the library revision, not the client's Bot API version; the `.md` copy of the Mini Apps page shows a placeholder instead of this URL. Call `Telegram.WebApp.ready()` once the UI can render. [Initializing Mini Apps](https://core.telegram.org/bots/webapps#initializing-mini-apps)

Wrap the bridge in a small adapter that owns readiness, capability checks, theme, viewport, back/close behavior and optional features:

- Gate each feature on `isVersionAtLeast(...)`, the method actually existing, and its runtime result. An advertised version doesn't prove hardware, permission or platform support.
- Register `onEvent` handlers with stable function references and remove them with `offEvent` on teardown. Read fresh state after an event instead of caching initial values.
- Keep a usable browser fallback and an error state for when the bridge or authentication fails. Loading the script in an ordinary browser doesn't create a Telegram session.
- Send raw `initData` to the backend for verification ([security-payments.md](security-payments.md)); `initDataUnsafe`, `start_param` and client storage are untrusted hints.

## Choosing a launch surface

Decide the launch surface before the data flow; each one has a different contract. `query_id`, user and chat fields can be absent, so model them as optional and never fabricate them. [Launch surfaces](https://core.telegram.org/bots/webapps#implementing-mini-apps), [client protocol](https://core.telegram.org/api/bots/webapps)

| Surface         | Contract                                                                                                                                                                                                                                                                                                                                             |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reply keyboard  | Private chats only. `initData` is **empty**, so the backend can't verify the user. `sendData` sends up to 4096 bytes as `message.web_app_data` and closes the app; it isn't general RPC. Telegram warns that a modified client can put arbitrary content in `web_app_data.data` and `button_text`.                                                   |
| Inline keyboard | Private user–bot chats only, not business messages. The session has `query_id`; the backend answers with `answerWebAppQuery`, which sends an inline message on the user's behalf and closes the app. `can_send_after` says when an answer becomes possible.                                                                                          |
| Menu button     | A raw HTTPS URL behaves like an inline-keyboard launch. A `t.me` app link opens "as if the user pressed the link", so don't assume `query_id`.                                                                                                                                                                                                       |
| Attachment menu | Same query flow, addressed to the chat it was opened from. Production access is limited to major advertisers; every bot can use it on the test server.                                                                                                                                                                                               |
| Inline mode     | Opened from `InlineQueryResultsButton.web_app` (set exactly one of `web_app` or `start_parameter`). `initData` is empty and the app has no chat access; it returns with `switchInlineQuery` and the user chooses what to send.                                                                                                                       |
| Main Mini App   | Configured in BotFather; `https://t.me/<bot>?startapp=<payload>`. Chat access isn't documented, so don't assume `query_id` or the right to post.                                                                                                                                                                                                     |
| Direct link     | `https://t.me/<bot>/<appname>?startapp=<payload>`. The payload arrives as `start_param` and `tgWebAppStartParam`. No chat read/send access; `chat_type` and `chat_instance` identify the shared context. Opens full height by default; `mode=compact` opens half height.                                                                             |
| Join request    | The bot gets `chat_join_request` with `query_id` and must, within **10 seconds**, call `sendChatJoinRequestWebApp(chat_join_request_query_id, web_app_url)` or answer directly. The app receives `chat_join_request_query_id`; the backend finishes with `answerChatJoinRequestQuery(..., result)`, where result is `approve`, `decline` or `queue`. |

Client deep-link handling also recognizes `mode=fullscreen`, and clients can launch from the side menu, so the Mini Apps page's fixed count of launch modes is incomplete. Production `WebAppInfo.url` must be HTTPS; HTTP is allowed only on the test server.

`savePreparedInlineMessage` prepares content for one `user_id` with allowed destination chat types; the JS `shareMessage` consumes it. It differs from `answerWebAppQuery`, which answers an inline-keyboard session. [answerWebAppQuery](https://core.telegram.org/bots/api#answerwebappquery), [savePreparedInlineMessage](https://core.telegram.org/bots/api#savepreparedinlinemessage), [MenuButtonWebApp](https://core.telegram.org/bots/api#menubuttonwebapp)

## Capabilities by minimum version

The client's advertised version gates these APIs. The Mini Apps changelog's latest entry is Bot API 10.1; `Telegram.WebApp.Serverless` is marked NEW without a version, so feature-detect it. [Recent changes](https://core.telegram.org/bots/webapps#recent-changes)

| Minimum | Capability                                                                                                                                                                    |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6.1     | BackButton, HapticFeedback, `openInvoice`                                                                                                                                     |
| 6.2     | Closing confirmation, popups                                                                                                                                                  |
| 6.4     | QR scanner; clipboard reading (attachment-menu apps only, on user gesture)                                                                                                    |
| 6.7     | `switchInlineQuery`                                                                                                                                                           |
| 6.9     | CloudStorage (1024 keys per user), `requestWriteAccess`, `requestContact`                                                                                                     |
| 7.2     | BiometricManager                                                                                                                                                              |
| 7.7     | Vertical swipe control                                                                                                                                                        |
| 7.8     | `shareToStory`                                                                                                                                                                |
| 7.10    | SecondaryButton                                                                                                                                                               |
| 8.0     | Fullscreen, safe areas, `activated`/`deactivated`, orientation lock, sensors, LocationManager, `shareMessage`, `downloadFile`, home-screen shortcuts                          |
| 9.0     | DeviceStorage (5 MB per user), SecureStorage (10 items per user)                                                                                                              |
| 9.1     | `hideKeyboard`                                                                                                                                                                |
| 9.5     | BottomButton custom emoji icon                                                                                                                                                |
| 9.6     | `requestChat(req_id)`; `req_id` comes from the backend's `savePreparedKeyboardButton(user_id, button)` with a `request_users`, `request_chat` or `request_managed_bot` button |
| 10.1    | `chat_join_request_query_id` in init data (join-request launches)                                                                                                             |

## Layout, theme and lifecycle

- `expand()` gives full height; immersive fullscreen is separate. `requestFullscreen()` returns nothing: failure arrives only as the `fullscreenFailed` event with `error` `UNSUPPORTED` or `ALREADY_FULLSCREEN`, and success as `fullscreenChanged`. Set a header color in fullscreen so status-bar contrast works.
- `viewportChanged` receives `{isStateStable}`; read dimensions from the bridge afterwards. Position bottom-pinned UI with `viewportStableHeight`.
- Respect both the device safe area (`safeAreaInset`, `safeAreaChanged`) and the Telegram UI content safe area (`contentSafeAreaInset`, `contentSafeAreaChanged`).
- The bridge exposes CSS variables: `--tg-theme-*` colors (for example `--tg-theme-bg-color`, `--tg-theme-text-color`, `--tg-theme-button-color`), `--tg-viewport-height`, `--tg-viewport-stable-height`, `--tg-safe-area-inset-*` and `--tg-content-safe-area-inset-*`. Prefer them to hardcoded colors and insets, and handle `themeChanged`.
- `lockOrientation()` locks the current orientation; it doesn't rotate the app.
- Pause game loops and audio on `deactivated` and browser visibility changes, and resume on `activated`. Persist state before any close or navigation request; the webview can be destroyed.

[Events](https://core.telegram.org/bots/webapps#events-available-for-mini-apps), [safe areas](https://core.telegram.org/bots/webapps#safeareainset), [theme](https://core.telegram.org/bots/webapps#themeparams)

## Navigation and origin protection

Since Bot API 10.2 (released July 14, 2026, enabled automatically July 20, 2026), Mini App methods are blocked on origins other than the original Mini App domain. BotFather offers an opt-out (bot → **Mini Apps** → **Same-Origin Restriction**), which makes the bot responsible for not linking to untrusted sites. Keep the protection on and keep bridge-dependent screens on the configured origin. [Changelog 10.2](https://core.telegram.org/bots/api-changelog#july-14-2026)

- Open external sites with `openLink(url)`, which must be called from a user interaction and opens the external browser. Open `t.me` links with `openTelegramLink(url)`; neither closes the app.
- Don't navigate the Mini App document to another origin with `location` or plain links; the bridge stops working there.
- Treat origin migrations, authentication redirects and cross-origin navigation as acceptance cases. Origin protection guards the client bridge; it doesn't replace backend authentication.

## Payments from a Mini App

`openInvoice(url[, callback])` opens an invoice link created by the backend (`createInvoiceLink`). The `invoiceClosed` status is `paid`, `cancelled`, `failed` or `pending`; `pending` means the payment is still processing and isn't a failure. Use the status only to refresh state from the server; grant goods only from the backend's `successful_payment` handling in [security-payments.md](security-payments.md).

## Storage

Keep device-local, encrypted, cloud and authoritative server data separate. Client storage never decides scores, balances or entitlements. All three stores use error-first callbacks: `(error, result)`. When wrapping them in promises, keep "missing value" distinct from failure, and surface storage errors instead of pretending a save worked.

| Store         | Contract                                                                                                                                                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| CloudStorage  | Stored in Telegram's cloud per user and bot. Keys 1–128 characters from `A-Z a-z 0-9 _ -`; values 0–4096 characters; 1024 keys. `setItem`, `getItem`, `getItems`, `removeItem`, `removeItems`, `getKeys`.                |
| DeviceStorage | Local to the device, up to 5 MB. `setItem`, `getItem`, `removeItem`, `clear`.                                                                                                                                            |
| SecureStorage | iOS Keychain / Android Keystore, up to 10 items; expect `UNSUPPORTED` on Desktop and Web and provide a fallback. Adds `restoreItem`, which asks the user for consent. A missing item returns `(null, null, canRestore)`. |

[CloudStorage](https://core.telegram.org/bots/webapps#cloudstorage), [DeviceStorage](https://core.telegram.org/bots/webapps#devicestorage), [SecureStorage](https://core.telegram.org/bots/webapps#securestorage)

## Permissions and device APIs

- Explain why before requesting location, contact, write access or biometrics, and handle denial and unsupported clients.
- Call `LocationManager.init()` and `BiometricManager.init()` before first use. Their `openSettings()` works only in response to a user interaction.
- `requestChat` needs a prepared button from the backend (see the 9.6 row above).

## Sensors

- `Accelerometer`, `Gyroscope` and `DeviceOrientation` expose `start(params, callback)` and `stop(callback)`; the callback receives a boolean. Subscribe to the matching Started/Stopped/Changed/Failed events and handle `UNSUPPORTED`.
- `refresh_rate` is in milliseconds, 20–1000, default 1000, and is only a request.
- Units: accelerometer m/s², gyroscope rad/s, orientation `alpha`/`beta`/`gamma` in radians around Z/X/Y. Convert before reusing browser thresholds in degrees.
- `need_absolute` defaults to false; even when requested, check `DeviceOrientation.absolute`.
- In handlers, read samples from `Telegram.WebApp.Accelerometer` and friends explicitly. The docs contradict themselves about what `this` refers to, so don't rely on it.
- Stop unused sensors and provide touch/keyboard fallbacks. Don't assume Telegram's acceleration includes gravity or matches browser sign conventions; measure on a real device before reusing a tilt formula.

[Accelerometer](https://core.telegram.org/bots/webapps#accelerometer), [DeviceOrientation](https://core.telegram.org/bots/webapps#deviceorientation), [parameters](https://core.telegram.org/bots/webapps#deviceorientationstartparams)

## Sharing and downloads

- `downloadFile({url, file_name}, callback)` needs an HTTPS URL served with `Content-Disposition: attachment; filename="<file_name>"` and `Access-Control-Allow-Origin: https://web.telegram.org`. The callback reports only whether the user accepted; `fileDownloadRequested` reports `downloading` or `cancelled`, not completion.
- `shareMessage(msg_id, callback)` reports sent or not sent; failures include `UNSUPPORTED`, `MESSAGE_EXPIRED`, `MESSAGE_SEND_FAILED`, `USER_DECLINED` and `UNKNOWN_ERROR`. Prepared messages expire, so prepare them close to use.
- For permissions, sharing and downloads, distinguish dialog opened, user accepted, action started and observed success.

[Download parameters](https://core.telegram.org/bots/webapps#downloadfileparams)

## Testing and debugging in real clients

Browser mocks prove wiring only. Test each launch surface separately on iOS, Android, Desktop and Web, including an older supported client, notches, landscape, fullscreen transitions, keyboard resizing, minimize/restore, unsupported sensors, expired prepared messages and denied prompts. Use a separate bot for destructive tests. [Testing Mini Apps](https://core.telegram.org/bots/webapps#testing-mini-apps)

| Client                | Inspection setup                                                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| iOS                   | Tap Settings 10 times, enable Allow Web View Inspection, connect to a Mac by USB, then use Safari → Develop → device.                                  |
| Android               | Enable USB debugging; in Telegram Settings, press and hold the version number twice and enable WebView Debug; inspect at `chrome://inspect/#devices`.  |
| Desktop Windows/Linux | Beta build → Settings → Advanced → Experimental settings → enable webview inspection; right-click the app → Inspect.                                   |
| Native macOS Telegram | Beta build; click Settings 5 times, enable Debug Mini Apps, then right-click → Inspect Element. Telegram Desktop for macOS doesn't support inspection. |

The test server needs its own user account and its own BotFather bot; production accounts and bots don't carry over. Bot API calls use `https://api.telegram.org/bot<TOKEN>/test/METHOD_NAME`, and HTTP without TLS is allowed there only. Test-account login: iOS Settings 10 taps → Accounts → Login to another account → Test; Desktop Settings → Shift+Alt+right-click Add Account → Test Server; native macOS Settings icon 10 clicks → Command-click Add Account. Keep test tokens and URLs separate in configuration.
