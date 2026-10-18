---
type: llm
---

PASS if the response proposes saving scores through the app's own backend endpoint authenticated with verified initData, and notes that a verified identity does not prove the submitted score is genuine (scores are client input).
FAIL if scores are saved without server-side authentication or treated as trustworthy because the user is authenticated.
