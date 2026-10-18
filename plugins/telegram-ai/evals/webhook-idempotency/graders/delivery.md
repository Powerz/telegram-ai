---
type: llm
---

PASS if the plan acknowledges a webhook only after the update is durably accepted or processed, deduplicates retried updates by update_id, and separately makes the confirmation action idempotent because two button presses arrive as different updates.
FAIL if it relies on update_id deduplication alone for the double press, or acknowledges before work can survive a crash without saying so.
