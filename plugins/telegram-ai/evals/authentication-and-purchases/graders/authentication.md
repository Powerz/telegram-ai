---
type: llm
---

PASS if the response says initDataUnsafe must not be trusted, the raw initData must be verified on the backend (HMAC with the bot token, or a platform-verified context such as a Telegram Serverless endpoint), and that verifying identity is separate from authorizing what that user may do or own.
FAIL if it accepts initDataUnsafe for identity, proposes client-side verification, or treats verified identity as sufficient authorization.
