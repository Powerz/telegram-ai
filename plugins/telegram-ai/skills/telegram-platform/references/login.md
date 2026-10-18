# Telegram Login outside Mini Apps

Two sign-in flows exist besides Mini App `initData`, and each has its own verifier. Never mix their credentials, signatures or verification code with each other or with Mini App validation.

| Flow                                                            | Verification                                   |
| --------------------------------------------------------------- | ---------------------------------------------- |
| Telegram Login: JS library or OIDC authorization code (current) | ID token (JWT) checked against Telegram's JWKS |
| `login_url` inline button, or the legacy iframe widget          | Legacy hash keyed with `SHA256(bot_token)`     |

## Telegram Login (OIDC and JS library)

[Guide](https://core.telegram.org/bots/telegram-login). In the BotFather Mini App, select the bot → **Login Widget** → **Switch to OpenID Connect Login**, then register exact **Redirect URIs** and the **Trusted Origins** that embed the JS library, and copy the Client ID and Client Secret. Keep the secret on the server. The switch permanently disables the bot's legacy login method; see [botfather.md](botfather.md#login-widget) before switching a bot with live `login_url` buttons.

- **Flows:** Telegram's JS login library (popup), or the standard OIDC authorization code flow with PKCE. Discovery is `https://oauth.telegram.org/.well-known/openid-configuration`. There is no UserInfo endpoint; claims arrive only in the ID token.
- **Scopes:** OIDC uses `openid` (required), `profile`, `phone` and `telegram:bot_access`. The JS library's options are `profile`, `phone` and `write`; don't swap the names. Phone needs user consent, and permission for the bot to message the user is a separate request from authentication. Discovery also advertises an undocumented `ton:wallet` scope; don't rely on it without docs.
- **User identity:** `openid` alone returns only `sub`. The Bot API user ID comes as the `id` claim, which requires the `profile` scope. Keep `sub` and `id` distinct when mapping accounts.
- **Token checks:** verify the signature with Telegram's JWKS, `iss` = `https://oauth.telegram.org`, `aud` = your bot ID, and `exp`. Pin the algorithm you configured instead of trusting the token header. The default is RS256; **Login Widget → Advanced** can switch to ES256, EdDSA or ES256K. EdDSA and ES256K allow only `openid`, so `profile` and `phone` requests are rejected and no `id` claim is available.
- **Request binding:** use server-generated `state` and PKCE with S256 (discovery also lists `plain`, so pin S256), bind them to the initiating session, verify them on return and consume them once. Telegram documents `nonce` only for the JS library, where it is embedded in the ID token; require and verify it there. In the code flow, send a nonce but confirm in an integration test that the ID token echoes it before making it mandatory.
- **Untrusted callback data:** never trust a decoded `user` object from the callback without verifying the ID token.
- **Popup and COOP:** the JS library needs cross-window communication. `Cross-Origin-Opener-Policy: same-origin` breaks it; use `same-origin-allow-popups` on the login page or remove the header there rather than weakening the whole site.
- Native iOS and Android SDKs are linked from the guide; consult them only for native apps. A Mini App launched with valid init data usually doesn't need a second login.

Use an established OIDC library from the existing stack, and recheck discovery and library configuration before implementing.

## `login_url` buttons and the legacy widget

Bot API `LoginUrl` inline buttons sign the user into a website from inside Telegram, and the archived iframe widget returns the same fields: `id`, `first_name`, `last_name`, `username`, `photo_url`, `auth_date`, `hash` (optional fields can be absent). Telegram requires checking the hash. [LoginUrl](https://core.telegram.org/bots/api#loginurl), [legacy widget docs](https://core.telegram.org/widgets/login-legacy)

```
data_check_string = sorted "key=value" lines of all received fields except hash, joined by "\n"
secret_key        = SHA256(bot_token)
valid             = hex(HMAC_SHA256(key = secret_key, message = data_check_string)) == hash
```

Use the raw `secret_key` bytes, compare in constant time and check `auth_date` freshness. This key derivation differs from the Mini App `WebAppData` scheme. The `/widgets/login` page now redirects to the OIDC guide, but its `.md` copy still serves the legacy widget page.

## Test cases

Invalid signature, wrong issuer or audience, expired token, `state`/nonce mismatch, reused authorization code or state, denied phone or write permission, blocked popup, unregistered redirect URI and callback recovery. For `login_url`: tampered fields, stale `auth_date` and a hash computed with the wrong key derivation. Test external sign-in separately from Mini App launch authentication.
