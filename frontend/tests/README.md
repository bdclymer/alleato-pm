Playwright E2E: Unified Run Modes

- Base URL: default `http://localhost:3002` (override with `BASE_URL`).
- Reports: `tests/playwright-report`.
- Artifacts: `frontend/playwright-results`.

Scripts (run from `frontend/`):
- `npm run test` — Default config, `retain-on-failure` videos.
- `npm run test:video` — Always save videos.
- `npm run test:video:ui` — Same as above with Playwright UI.

Notes
- To force videos with the default config: `PW_VIDEO=on npm run test`.
- If you prefer Playwright to start the dev server for you, use `frontend/playwright.config.ts` with optional env `PW_VIDEO=on`.
