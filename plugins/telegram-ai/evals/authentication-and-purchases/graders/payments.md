---
type: llm
---

PASS if the response says the digital skin should be sold for Telegram Stars (currency XTR) with a price set by the server, and that the skin is granted only after the bot receives the successful_payment update, never from the openInvoice callback or invoiceClosed status.
FAIL if it keeps granting from the client callback or does not require server-side confirmation of payment.
