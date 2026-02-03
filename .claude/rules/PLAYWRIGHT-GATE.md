# PLAYWRIGHT EXECUTION GATE (MANDATORY)

This gate BLOCKS reasoning until browser evidence exists.

---

## PHASE 1 — TOOL EXECUTION (NO REASONING)

Claude MUST:

- Run Playwright
- Inspect the actual browser DOM

Allowed output ONLY:

- Playwright command executed
- Result: FOUND / NOT FOUND
- Selector, DOM text, or screenshot reference

Any explanation here = FAILURE.

---

## PHASE 2 — FACT ASSERTION

State only what is confirmed by Phase 1.
No hypotheticals.
No conditional language.

---

## PHASE 3 — DIAGNOSIS / FIX

Now — and only now — explanation and fixes are allowed.
Every claim must trace back to Phase 1 or 2.

---

## BANNED BEFORE PHASE 1

- “if”
- “might”
- “likely”
- “assuming”
- “it seems”

Use of these terms before Phase 1 = HARD FAILURE.
