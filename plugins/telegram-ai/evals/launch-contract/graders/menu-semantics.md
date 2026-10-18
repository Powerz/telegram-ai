---
type: llm
---

PASS if the response explains that a menu button configured with a t.me Mini App link opens with link-launch semantics, so query_id is not provided (unlike an inline-keyboard or raw-URL menu launch), and that this is expected rather than a bug.
FAIL if it treats the missing query_id as an error to work around or promises it will appear.
