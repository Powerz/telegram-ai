---
type: llm
---

PASS if the response says deployed endpoints receive platform-verified initData but still need their own authorization and input validation, and that backend runtime restrictions (no npm packages, no Node APIs) do not apply to the Vite frontend build.
FAIL if either point is missing or contradicted.
