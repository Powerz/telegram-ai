---
description: Plan a Telegram webhook reminder bot that survives retries and double presses
tags: [bots, delivery]
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill]
---

Plan a Telegram reminder bot on our existing Node backend. Telegram retries our webhook, and users sometimes press the same inline confirmation button twice.
