# BotFather

[@BotFather](https://t.me/BotFather) creates bots and holds their platform settings. It has two interfaces over the same bots:

- **BotFather Mini App** (since July 2025): tap **Open** in the BotFather chat or next to BotFather in search, or open `https://t.me/BotFather?startapp`. Newer settings (guest, guard, bot management and bot-to-bot modes, threaded mode, access restriction, origin protection, OIDC login, Serverless) exist only here.
- **Chat commands:** `/mybots` opens an inline-button menu, and `/set…` commands edit one setting each. Paid broadcasts are configured only here.

Both menus below were walked through on 2026-10-18 in the macOS client, with every switch turned on once on a test bot to reveal nested options. Labels and grouping change without notice, so if a path doesn't match, look through the bot page instead of assuming the setting is gone. Changing these settings changes a live bot: research or planning doesn't authorize it. The **⋯** menu at the top of the Mini App is the Telegram client's (Fullscreen, Reload Page, Close), not BotFather's.

## Mini App layout

The home screen has a search field, **My bots** and **Create a New Bot**: photo, **Bot Name**, **About (Optional)** and a `t.me/…` username that must end in `bot`. Selecting a bot opens its page:

- **Header:** photo, name and username. Tapping the username opens the bot's Telegram profile, not a BotFather page.
- **Token card:** the token is behind a spoiler, with **Copy** and **Revoke**. Revoke issues a new token and invalidates the old one, so every deployment using it breaks until updated.
- **Settings:** Edit Info, Commands, Mini Apps, Bot Settings, Login Widget, Serverless, Games.
- **Monetization:** Payments, Telegram Stars.
- **Actions:** Transfer Ownership, Delete Bot.

### Edit Info

| Field                             | Purpose                                                                                                                                                                             |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Set New Photo**                 | Profile picture.                                                                                                                                                                    |
| **Info** (with language selector) | Name and **About** (up to 120 characters), shown on the profile and sent along when the bot is shared. The selector switches the language the page's texts are edited for.          |
| **Welcome message**               | **Set Welcome Picture** (photo 640×360, or GIF 320×180, 640×360 or 960×540) and a description of up to 512 characters, shown in the "What can this bot do?" block of an empty chat. |

**Update** saves the page. A profile video and other public info can also be edited from the bot's profile in Telegram apps.

### Commands

The list of commands, and **Add a Command** with:

- `/command` and **Description**.
- **Scope:** **Direct Messages**, **Group Chats** and **Group Administrators** switches choose who sees the command in the menu.
- **Ephemeral Command:** in groups, the invoking message is visible only to the sender and the bot (the API's `is_ephemeral`).

Per-chat and per-user scopes need `setMyCommands`. The menu is discovery only and never authorizes anything.

### Mini Apps

| Row                         | Contents and effect                                                                                                                                                                                                                                                                                                                  |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Menu Button**             | Button preview, Mini App URL, button text, **Disable Menu Button**. The default for all users; `setChatMenuButton` overrides it per chat.                                                                                                                                                                                            |
| **Main App**                | URL opened by the profile's **Open App** button and by `t.me/<bot>?startapp`. **Launch Mode**: Compact, Fullsize (the default) or Fullscreen. **Launch Screen** (below). **Disable Main App**. Enabling it also unlocks profile media previews and lists the bot in the search Apps tab for users who have launched it.              |
| **Same-Origin Restriction** | On: only the Mini App's own origin can call the WebApp SDK and read user data. **Opt out** turns it off and makes the bot responsible for not linking to untrusted sites. Keep it on; see [mini-apps.md](mini-apps.md#navigation-and-origin-protection).                                                                             |
| **Direct Links**            | **Create Direct Link**: Mini App URL; metadata (cover photo 640×360, or GIF 320×180, 640×360 or 960×540; title; description); and the short name in `t.me/<bot>/<name>`. Existing links are listed with copy and delete. The short name takes lowercase letters, digits and `_`, starts with a letter and has at least 3 characters. |

**Launch Screen** sets the loading screen: one **Set Splash Icon**, plus **Background color** and **Header color** per **Light Mode** and **Dark Mode** tab, and **Reset colors to default**. The icon should be an SVG with a 512×512 canvas and a single `<path>`; WEBP or TGS uploads are auto-outlined at lower quality.

The Mini Apps docs mention a **Settings** item for the Mini App's context menu (the `settingsButtonClicked` event), in their attachment-menu section. Neither interface showed it for an ordinary bot; expect it only with attachment-menu integration.

### Bot Settings

**Mode Settings**

| Setting                           | Purpose                                                                                                                                                                            |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Inline Mode** (subpage)         | Switch for `@bot query` inline requests; its options are below. See [bots.md](bots.md#inline-mode).                                                                                |
| **Bot Management Mode**           | Lets the bot create and manage other bots for users (managed bots). [Managed bots](https://core.telegram.org/bots/features#managed-bots)                                           |
| **Guest Chat Mode**               | Users can summon the bot by mention in chats it hasn't joined. See [bots.md](bots.md#modern-bot-features).                                                                         |
| **Guard Mode**                    | The bot can gate group joins: approve, decline or queue join requests, optionally after showing a Mini App. See [mini-apps.md](mini-apps.md#choosing-a-launch-surface).            |
| **Secretary Mode**                | Business mode: users connect the bot to their account to read and send messages on their behalf.                                                                                   |
| **Bot to Bot Communication Mode** | Opt-in messaging with other bots in groups and via business accounts. The screen itself warns about infinite loops; see [bots.md](bots.md#groups-privacy-and-bot-to-bot-messages). |

These switches have no further options. With **Inline Mode** on, its subpage adds:

- **Placeholder:** the hint shown after users type the bot's username.
- **Inline Location Data:** ask users for location with inline requests.
- **Inline Feedback:** the share of chosen results reported as `chosen_inline_result` updates: 0%, 0.1%, 1%, 10% or 100%. Caching can produce more reports than requests; the screen recommends a low value for popular bots.

**Threads Settings:** **Threaded Mode** turns on topics in private chats, with a fee on later Stars purchases ([bots.md](bots.md#modern-bot-features)); it switched on without a confirmation. Its description also mentions streamed replies, which Bot API 9.5 opened to every bot. While it's on, a nested **Disallow users to create new threads** switch appears.

**Groups and Channels**

- **Allow Groups:** off means the bot can't be added to groups.
- **Group Privacy:** on means the bot receives only commands, mentions and replies. Existing groups pick up a change only after the bot is re-added ([bots.md](bots.md#groups-privacy-and-bot-to-bot-messages)).
- **Group Admin Rights** and **Channel Admin Rights:** tap the label to expand 13 checkboxes each, the rights the bot requests by default when added as an admin; the switch selects or clears them all. The API equivalent is `setMyDefaultAdministratorRights`.

**Privacy Policy:** a URL. Without one, the Standard Privacy Policy for Bots and Mini Apps applies; see [security-payments.md](security-payments.md#developer-terms-and-policy) for when you need your own.

**Access:** with **Restrict bot usage** on, only the users under **Allowed users** (the owner by default; more are added with a multi-select **Choose Users** picker) can interact with the bot. Use it for staging and internal bots. Manager bots set the same thing via `setManagedBotAccessSettings`.

### Login Widget

The page starts in legacy mode: a domain field for the legacy widget and `login_url` buttons (the chat's `/setdomain`; a `login_url` URL must be on this domain), plus **Switch to OpenID Connect Login**, offered only while no domain is set. Its confirmation, "Switch to OAuth 2.0 Login", warns that the switch **permanently disables the legacy login method**, and the domain field is gone afterwards. Try the migration on a test bot, and don't switch a bot whose `login_url` buttons or legacy widget are live until replacements are ready.

After switching, the page has:

- **Client ID** (the bot's numeric ID) and **Client Secret**, both with copy buttons, and **Revoke** to generate a new secret.
- **Redirect URIs:** **Add a Redirect URI**; they must match exactly.
- **Trusted Origins:** **Add a Trusted Origin**, the origins allowed to make cross-origin token requests (pages that embed the JS library).
- **Native Login:** **Add a Native App** for Android (package name and SHA-256 signing fingerprint) or iOS (Team ID and Bundle ID), enabling login via deep links without a browser redirect.
- **Advanced → Signing Algorithm:** RS256 (default), ES256, EdDSA or ES256K.

Protocol details are in [login.md](login.md).

### Serverless

Serverless is in beta. A bot without access shows **Get access to Serverless**, which sends an access request; it isn't an instant switch. With access, the guide describes an on switch and the sections Handlers, Endpoints, Library, Database, Mini App Files and **CLI Access** (the CLI token, separate from the bot token). See [serverless.md](serverless.md).

### Games

Classic HTML5 games need inline mode, so the page starts with an **Inline Mode** switch ("mandatory for HTML5 games"). With it on, **My Games** lists games and **Create a New Game** asks for `game=short_name`, a cover (photo 640×360 or GIF 320×180, 640×360 or 960×540), **Title** and **Description**. There is no URL field: the bot supplies the game URL when the Play button is pressed. In chat: `/newgame`, `/listgames`, `/editgame`, `/deletegame`.

### Payments and Telegram Stars

- **Payments** lists **Payment Providers** for physical goods. The list depends on the account and region; the observed one had no Stripe entry, although the payments guide still recommends "Stripe TEST MODE". In the chat flow, each provider shows its supported merchant countries, website and pricing, with **Connect <provider> Test** and **Connect <provider> Live**; connecting continues in the provider's own bot, and connected providers then show their tokens. The payments guide's _Bot Settings > Payments_ path is outdated: Payments is a top-level item in the Mini App and on the chat's bot menu, and also appears under the chat's Bot Settings.
- **Telegram Stars** showed only an explainer and **Learn More** for a new bot, with no settings. Stars need no provider token.

### Actions

- **Transfer Ownership:** **Choose Recipient** by username, then **Continue**. The recipient must have interacted with the bot. The page warns that the transfer is irreversible and the current owner loses access.
- **Delete Bot:** closes the Mini App and posts a confirmation in the BotFather chat ("You are about to delete your bot…") with **No**, **Yes, delete the bot**, **Nope, nevermind** and **« Back to Bot**. Deletion frees the username and can't be undone.

## Chat menus and commands

`/mybots` → bot shows **API Token**, **Edit Bot**, **Bot Settings**, **Payments**, **Transfer Ownership**, **Delete Bot** and **« Back to Bot List**.

- **Edit Bot** lists the current name, about, description, description picture, botpic, commands and privacy policy, with **Edit Name**, **Edit About**, **Edit Description**, **Edit Description Picture**, **Edit Botpic**, **Edit Commands** and **Edit Privacy Policy**.
- **Bot Settings** has **Inline Mode**, **Secretary Mode**, **Allow Groups?**, **Group Privacy**, **Group Admin Rights**, **Channel Admin Rights**, **Payments**, **Domain**, **Menu Button**, **Configure Mini App** and **Paid Broadcast**.
- **Configure Mini App** shows whether the Main App is enabled. **Enable Mini App** asks for the URL (`/empty` disables it). Once enabled, it lists the URL, mode and splash settings, with **Edit Mini App URL**, **Change mode**, **Configure Splash Screen**, **Open Splash Screen Preview** and **Disable Mini App** (confirmed).
- **Paid Broadcast** turns on paid broadcasting. BotFather refuses below its monthly-active-user minimum and shows the bot's current MAU: the minimum shown was 10,000. See [bots.md](bots.md#sending-messages) for the conflicting thresholds.

Guest, guard, bot management and bot-to-bot modes, threaded mode, access restriction, origin protection, direct links, OIDC login and Serverless have no chat equivalent. Documented one-step commands:

| Command                                                       | Setting                                                                                           |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `/newbot`, `/token`, `/deletebot`                             | Create a bot (name, then a username of 5–32 characters ending in `bot`), regenerate token, delete |
| `/setname`, `/setabouttext`, `/setdescription`, `/setuserpic` | Profile fields from Edit Info                                                                     |
| `/setcommands`                                                | Command list                                                                                      |
| `/setinline`, `/setinlinegeo`, `/setinlinefeedback`           | Inline mode, its location requests and chosen-result updates                                      |
| `/setjoingroups`, `/setprivacy`                               | Allow Groups and Group Privacy                                                                    |
| `/setdomain`                                                  | Legacy Login Widget domain                                                                        |
| `/setmenubutton`                                              | Menu button URL and text (`/empty` restores the default commands menu)                            |
| `/setattach`                                                  | Attachment menu: test server for all bots, production only for major advertisers                  |
| `/newgame`, `/listgames`, `/editgame`, `/deletegame`          | Classic games                                                                                     |

The username can't be changed after creation. Type `/` in the BotFather chat for the current list.

## Settings outside BotFather

- **Bot API:** `setMyName`, `setMyDescription`, `setMyShortDescription` (About), `setMyProfilePhoto`, `setMyCommands`, `setChatMenuButton` and `setMyDefaultAdministratorRights` change the same fields from code, plus per-chat and per-user variants BotFather lacks. When both are used, decide which one owns each field so deployments don't overwrite manual edits.
- **Bot profile in Telegram apps:** the owner sees **Edit** on the bot's profile for public info and a profile video. Affiliate programs are created at _Mini App profile → Edit → Affiliate Program_. [Affiliate programs](https://telegram.org/tour/affiliate-programs/)
- **Test environment:** it has its own BotFather, bots and tokens; see [mini-apps.md](mini-apps.md#testing-and-debugging-in-real-clients).

When a newly documented feature doesn't work, check the changelog entry and features page for a BotFather setting it needs before debugging code.
