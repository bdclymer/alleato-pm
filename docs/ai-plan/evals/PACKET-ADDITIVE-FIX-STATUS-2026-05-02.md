# Packet Additive Fix — Status Report 2026-05-02

## TL;DR

The deterministic-intercept fix from the eval suite findings was attempted twice today. **Neither attempt successfully shipped to `main`.** Both attempts produced staged or working-tree changes that either bundle unrelated work or crash the dev server under load.

**Current state of `main`:** unchanged from `dc7e3c15f test(ai-evals): first real eval suite run`. The 9 deterministic-bypass failures still exist.

## Attempt 1 — spawned agent (general-purpose, agentId `abb4fdac0cdd26643`)

**Outcome:** Agent applied a fix that flipped 3 target cases from 1 tool → 13–26 tools each, but the working tree was **bundled with ~50 lines of unrelated Brandon daily update widget code** (recent in-flight feature work from another session). Agent never committed. Final eval re-run stalled at case 14/30 (auth or dev-server stall) and the agent stopped.

Verification reported by agent (single-case, before stall):
- `project-briefing-westfield`: pass, 26 tools (was 1)
- `financial-budget-summary`: pass, 13 tools (was 1)
- `what-changed`: 15 tools (was 1), hit eval timeout

Local artifacts left at:
- `/tmp/chat-route-with-everything.ts` — full bundled file (intercept fix + Brandon widget)
- `/tmp/full-staged-diff.patch` — full diff vs `origin/main`
- `docs/ai-plan/evals/runs/2026-05-02T12-38-55-763Z/` — single-case pass artifact (project-briefing-westfield)
- `docs/ai-plan/evals/runs/2026-05-02T12-42-43-386Z/` — partial 14-case run (no summary written, run died)

## Attempt 2 — isolated extraction (this session, autonomous tick)

**Outcome:** Extracted ONLY the intercept-related hunk (~14 insertions / 42 deletions in `chat/route.ts`) from the agent's staged diff. Reset to `origin/main` baseline, applied the isolated fix.

**Verification result:** The fix **crashed the dev server**. Two consecutive runs of `--case project-briefing-westfield` failed:
1. First run: 14 stream events captured (status messages + 2 tool-input-start), then `stream read error: terminated`. Server log shows `api_request_succeeded duration_ms: 698, status: 200` — but the response body stream was killed mid-flight. No error stack in the log.
2. Second run: `fetch failed` immediately. Dev server process was no longer listening on port 3000. Final dev log line is `[?25h` (terminal cursor reset escape sequence) — strongly suggests Node exited without writing an error.

**Hypothesis on the divergence:** the agent's bundled version (with Brandon widget imports + executive briefing type additions) may have provided shared module init or types that the isolated diff doesn't satisfy at runtime. The Brandon widget changes were not just additive — they also added imports for `loadAppCapabilityAccessForUser`, `BrandonDailyUpdatePacket`, etc., that may participate in the route's request handling path even when not directly invoked.

The diff that was applied is preserved at:
- `/tmp/chat-route-with-everything.ts` (full bundled)
- `/tmp/full-staged-diff.patch` (full diff)

The actual isolated change applied (now reverted) was these two hunks vs `origin/main`:
- Rename local `const content` → `const packetContent`
- Replace early-return block (writer.write/persist/return) with `systemPrompt = packetContextHeader + packetContent + ... + systemPrompt`, change status to "knowledge", remove `return`
- Add `mode: "additive-context"` to toolTrace output

## What stopped working

After applying the isolated fix:
- Dev server accepts the request, returns headers (200 in 698ms)
- Streams: memory status → packet status → start → 2 tool-input-start events
- Then dies. Process disappears from port 3000.

The 698ms "duration" is the API request handler returning the SSE Response to the client; streaming continues async. Something in that async path is killing the process.

## Recommended next steps (human or fresh agent)

1. **Check `frontend/.next/` cache and recompile cleanly.** A Next.js HMR/RSC cache mismatch is plausible since the Brandon widget feature added new imports to the route file. `rm -rf frontend/.next && npm run dev:frontend`.

2. **Run the route under inspector.** `NODE_OPTIONS='--inspect-brk' npm run dev:frontend`, attach Chrome DevTools, set a breakpoint at the modified intercept block, fire a single chat request, watch the actual error.

3. **Try the agent's full bundled version on a feature branch.** It's verified to pass 3 target cases. Risk: ships unrelated Brandon widget feature into the same commit. Acceptable if Brandon widget is finished work; not acceptable if it's WIP.

4. **Defer the fix.** The 9-case failure mode is documented and the eval suite catches it. It's not blocking new work — just blocking the assistant from being maximally useful on Westfield-scoped briefings. Could wait until someone has a clean head to debug.

## Files and commits

- Strategy doc: `docs/ai-plan/rag-pipeline/RAG-STRATEGY-2026-04-29/AI-ASSISTANT-RAG-STRATEGY-2026-04-29.md`
- First-run findings: `docs/ai-plan/evals/EVAL-SUITE-FIRST-RUN-FINDINGS-2026-05-02.md`
- Eval runner: `scripts/verify/verify_ai_assistant_eval_suite.mjs`
- Eval suite cases: `docs/ai-plan/evals/assistant-eval-suite.json`
- Last passing eval baseline: commit `dc7e3c15f` (18/30 pass)

## Verdict on the autonomous tick

I attempted the cleanest path (isolated fix on top of `origin/main`). It produced a runtime crash that's not visible in user-space logs. Without an interactive debugger session, I can't confidently ship the fix. The autonomous-loop guidance is "don't ship a half-fix" — so the working tree is reverted and `main` is unchanged. Picking this back up requires a debugger, not another autonomous tick.
