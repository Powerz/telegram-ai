---
type: llm
---

PASS if the response makes fulfillment idempotent per payment charge (for example unique telegram_payment_charge_id) and proposes tests for duplicate payment updates, a crash between payment and grant, and a mismatched amount, currency or payload.
FAIL if idempotency per charge is missing or no such failure-mode tests are proposed.
