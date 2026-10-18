---
description: Catch the wrong key derivation for login_url data
tags: [security, login]
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill]
---

Our website signs users in through a Telegram inline button with login_url. The server verifies the returned hash with HMAC-SHA256 using HMAC_SHA256("WebAppData", bot_token) as the key, like our Mini App does. Is that correct? Do not run anything.
