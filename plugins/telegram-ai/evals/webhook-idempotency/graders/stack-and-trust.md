---
type: llm
---

PASS if the plan keeps the existing Node backend instead of introducing a new platform, and authenticates webhook requests with the secret_token / X-Telegram-Bot-Api-Secret-Token header.
FAIL if it replaces the stack without a reason or omits webhook authentication.
