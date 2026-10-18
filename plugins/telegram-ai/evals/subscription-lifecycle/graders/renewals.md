---
type: llm
---

PASS if the response says each renewal is a separate charge that must be recorded and deduplicated by its own charge identifier (telegram_payment_charge_id), so deduplicating by invoice payload wrongly discards later renewals.
FAIL if it keeps deduplicating renewals by invoice payload.
