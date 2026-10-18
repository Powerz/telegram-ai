---
description: Correct a Stars subscription design that revokes on cancel and dedupes by payload
tags: [payments]
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill]
---

We revoke all paid access on a canceled subscription update and deduplicate every renewal by invoice payload. Review and correct the lifecycle design.
