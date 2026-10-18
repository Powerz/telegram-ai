---
type: llm
---

PASS if the response says this is wrong: login_url data uses the legacy login-widget scheme where the secret key is SHA256(bot_token), not the Mini App WebAppData derivation, and the hash is HMAC-SHA256 of the sorted data-check-string under that key.
FAIL if it approves the WebAppData derivation or gives a different key.
