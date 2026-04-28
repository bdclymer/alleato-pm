# AI Assistant Response Contract Verification

Date: 2026-04-26

## Scope

Verify that the AI Assistant no longer fails silently when the model/tool stream does not return usable final assistant text.

## Result

Partial pass with a separate dev-server blocker.

- The AI Assistant page loaded after a clean `.next` rebuild on `http://localhost:3001/ai-assistant`.
- A real authenticated UI message was submitted through the composer.
- The chat route returned `200` and persisted an assistant response for session `11200c4d-ae66-45a0-84db-404c65a7a4ab`.
- The persisted assistant response used the new structured fallback instead of a blank/generic reply:
  - It stated that a retrieval/generation failure happened.
  - It explained that no trustworthy final assistant text was returned.
  - It clarified that no project, meeting, email, Teams, OneDrive, or Acumatica context was retrieved.
  - It gave a concrete next move and preserved the tool trace metadata.
- Follow-up code hardening now appends that same structured fallback to the live UI stream when the model/tool run ends with tool output but no final assistant text.
- Follow-up route hardening now forces a first-step read/retrieval attempt for business/project/status prompts and injects a server-side project lookup preflight so the run has recorded retrieval evidence even if model tool routing fails.
- API verification after the live fallback hardening produced `recovery-api-stream.sse`, which streamed the recovery answer immediately and persisted the same content.

## Evidence

- `login-page.png` - initial 3000 login failure against the existing server.
- `ai-assistant-loaded.png` - chat page loaded on the isolated 3001 server after `.next` cleanup.
- `message-filled-retry.png` - composer filled with the test prompt.
- `after-send-retry.png` - submitted UI session after chat route accepted the request.
- `session.webm` - attempted recording; recording itself coincided with a Next dev overlay/client manifest failure.
- Database evidence from `chat_history` confirmed one user message and one assistant fallback message for session `11200c4d-ae66-45a0-84db-404c65a7a4ab`.

## Blocker

The final browser reload check was blocked by Next dev-server manifest instability, not by the AI chat route:

- Earlier blocker: missing `.next/server/edge-instrumentation.js` after cache cleanup and route compilation.
- Later blocker: missing `.next/routes-manifest.json` on `/auth/login`.
- Additional blocker during the preflight verification retry: missing `.next/server/next-font-manifest.json` and repeated `.next/cache/webpack/*pack.gz` ENOENT errors.
- Next also emitted a React Client Manifest error for `next-devtools/userspace/app/segment-explorer-node.js#SegmentViewNode` during the run.

## Prevention

The new code guardrail is `npm run rag:verify:response-contract`, which fails if the route loses the structured fallback response, if the live fallback stream path is removed, if forced first-step retrieval or server preflight are removed, if context-provider failures become silent again, or if retrieval tool wrappers revert to throwing raw errors.
