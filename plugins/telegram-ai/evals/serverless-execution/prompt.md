---
description: Explain what tgcloud run, push and migrate do, and where trust and runtime limits apply
tags: [serverless]
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill]
---

We're putting a Vite Mini App on Telegram Serverless. Is `npx tgcloud run ... --ctx` a safe local dry run? Does `push` build the app and migrate the database? Do our endpoints still need their own authorization checks, and can the Vite frontend keep using npm packages? Explain without running commands.
