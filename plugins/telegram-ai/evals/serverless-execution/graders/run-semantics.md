---
type: llm
---

PASS if the response says `tgcloud run` executes the code on Telegram's platform rather than locally, so it can call the Bot API or change the bot's real data, and that the --ctx context is synthetic and unverified, proving nothing about authentication.
FAIL if it says or implies that `run` executes locally or has no side effects, or that the --ctx context is verified.
