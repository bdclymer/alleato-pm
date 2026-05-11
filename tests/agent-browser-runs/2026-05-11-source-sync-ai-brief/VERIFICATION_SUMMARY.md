# Source Sync AI Brief Verification

Date: 2026-05-11
Route: `http://localhost:3000/source-sync`
Linear: AAI-353

## Result

Passed after one implementation fix.

## Steps

1. Opened `/source-sync`.
2. Redirected to `/auth/login?callbackUrl=%2Fsource-sync`.
3. Signed in with the Alleato app test credential family from `.env`.
4. Confirmed the Source Sync page loaded and the `AI brief` button became enabled.
5. Clicked `AI brief`.
6. Initial click exposed a loud route failure: `Project intelligence summary supports at most 20 sources per call.`
7. Fixed the source-sync mapper to cap generated source records at 20 and added regression coverage.
8. Reloaded the page and clicked `AI brief` again.
9. Confirmed an AI summary rendered on the page.

## Evidence

- `01-login.png` - Login redirect state.
- `02-after-login.png` - Authenticated Source Sync page load.
- `03-source-sync-loaded.png` - Source Sync controls enabled.
- `04-after-ai-brief-click.png` - Initial failure state with source-count error.
- `05-after-cap-fix-refresh.png` - Page after mapper cap fix refresh.
- `06-after-cap-fix-loaded.png` - Source Sync controls enabled after fix.
- `07-after-cap-fix-ai-brief-click.png` - Post-click state after fix.
- `08-final-ai-brief-state.png` - Final verified state.
- `page-text-final.txt` - Captured page text showing rendered summary.
- `console-final.txt` - Browser console after final click.
- `errors-final.txt` - Browser errors after final click.

## Verified Output

The final page text included:

- `Source synchronization is experiencing critical errors across multiple platforms, impacting data freshness and searchability.`
- `medium confidence`
- `AI next actions`
- `Investigate and resolve sync issues with Outlook email, SharePoint, and OneDrive to address staleness.`
- `Examine Fireflies transcript failures and attempt reprocessing.`
- `Resolve document pipeline vectorization failure to enable effective document processing.`
- `AI brief used 20 source sync records.`

## Failure Cause, Detection Gap, Prevention

Cause: the source-sync mapper could produce 25 source records while the shared summarizer enforces a 20-source max.

Detection gap: unit coverage validated representative source mapping but did not cover a noisy live source-sync health payload.

Prevention: `source-sync-summary.test.ts` now includes a noisy payload test that asserts the mapper caps output at exactly 20 records.
