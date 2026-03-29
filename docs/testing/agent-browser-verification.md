# Agent Browser Verification Standard

## Purpose

Use this standard for frontend user-perspective verification runs.
It is designed to produce hard evidence, reduce context waste, and stop one-off testing workflows.

## Default Command

From repo root:

```bash
npm run verify:browser -- --url http://localhost:3000 --name "login-smoke"
```

Optional scripted journey:

```bash
npm run verify:browser -- \
  --url http://localhost:3000 \
  --name "chat-rag-smoke" \
  --actions-file scripts/templates/agent-browser-actions.example.txt
```

## Required Evidence Output

Each run writes to:

`tests/agent-browser-runs/<timestamp>-<run-name>/`

Required files:

- `session.webm`
- `01-initial.png`
- `99-final.png`
- `snapshot-initial.txt`
- `snapshot-final.txt`
- `actions.log`
- `console.log`
- `errors.log`
- `VERIFICATION_SUMMARY.md`

## Retention

Artifacts are cleaned automatically before each run.
Default retention: 48 hours.

Manual cleanup:

```bash
npm run verify:browser:cleanup
```

## Notes

- This verifies from a user/browser perspective using `agent-browser`.
- Use Playwright suites when deterministic CI test code is required.
