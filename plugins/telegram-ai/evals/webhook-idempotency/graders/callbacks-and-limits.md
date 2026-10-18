---
type: llm
---

PASS if the plan answers callback queries (answerCallbackQuery) and handles rate limiting (429 with retry_after) or the ambiguity of a send that timed out.
FAIL if both callback acknowledgement and rate-limit or ambiguous-send handling are missing.
