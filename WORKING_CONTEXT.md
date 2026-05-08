# Alleato — Working Context

> Claude: Read this before touching anything. Update this before ending any session.
> Megan: This file is your project's short-term memory. Keep it current.

---

## Current focus

**Status:** Communications data pipeline stable. Render cron infrastructure complete. All working changes committed and pushed to main.
**Last updated:** 2026-05-06
**Last worked on by:** Claude Code (session ending ~18:30 ET)

---

## What was done this session (2026-05-06)

### 1. GitHub Actions — billing lock identified, two workflows deleted

The CI startup_failure was NOT a code bug — GitHub billing was locked, preventing all workflow runs. The `actions/checkout@v6` fix in `ci-handler.yml` was applied but didn't resolve it (billing lock is the real blocker).

**Two costly workflows deleted:**
- `.github/workflows/rag-meeting-vectorization-health.yml` — was a scheduled daily Node.js health check consuming Actions minutes. Replaced by Render cron.
- `.github/workflows/chromatic.yml` — visual regression running on every PR. Deleted (no replacement needed yet).

**Action required:** Update payment at github.com/settings/billing to restore CI.

### 2. RAG health check → Render cron

Ported the Node.js health check script to Python:
- **New file:** `backend/src/services/health/rag_meeting_health.py`
- **New file:** `backend/src/services/health/__init__.py`
- **Render cron added:** `alleato-rag-health` — daily at 12:15 UTC — `python3 -m src.services.health.rag_meeting_health`
- Posts Slack alert via `SLACK_WEBHOOK_URL` on failure.
- Checks: embedding coverage, staleness (>7 days lag), chunk coverage, Fireflies job health, embedding provider probe.

### 3. Task extraction → Render cron

- **New file:** `backend/src/services/task_extraction.py` — extracts action items from meetings/emails/Teams messages
- **Render cron added:** `alleato-task-extraction` — daily at 7 AM UTC
- Replaces the old Vercel cron route `/api/admin/cron/extract-brandon-tasks`
- Backend scheduler also updated (`scheduler.py`)

### 4. Teams DM sync status

After Azure AD admin consent was granted in a prior session:
- **273/283 chats syncing successfully** ✅
- **10 permanent 403s** on cross-tenant (`@unq.gbl.spaces`) and meeting chat (`@thread.v2`) IDs — hard Graph API limitation with app-only auth. Cannot be fixed.

### 5. Teams compiler → automatic (wired into sync pipeline)

The Teams DM compiler previously only ran via API endpoint. Now wired into `run_graph_sync()` in `backend/src/services/integrations/microsoft_graph/sync.py`:

Pipeline order: sync → embed → **compile** (batch of 25 per run)

The compiler (`backend/src/services/intelligence/teams_compiler.py`):
- Processes `teams_dm_conversation` docs with `status IN ('raw_ingested', 'embedded')` and no overview
- Has 170s internal time limit
- Writes to `project_insights`, `tasks`, `insights`, `source_signal_candidates`

### 6. Large uncommitted working-tree batch committed and pushed

All previously uncommitted changes (product board, emails pipeline, executive briefing, nav, tasks API) were committed in 8 logical commits and pushed to main.

Notable: `email-sync-client.tsx` — a tabbed email view (All / Assigned / Needs Review / Attachments) was committed and wired into the emails table page.

---

## Active task

Nothing actively blocked. Render cron infrastructure is complete. All changes pushed.

**Pending action (requires user):** GitHub billing lock — update payment at github.com/settings/billing to restore CI workflows.

---

## Architecture — Communications Data Pipeline

Full reference: `docs/architecture/COMMUNICATIONS-DATA-PIPELINE.md`

Key facts:
- **Render cron** `alleato-graph-sync` — every 30 min — `backend/src/services/integrations/microsoft_graph/sync.py`
- Sync → embed (`embed_pending_graph_documents`) → compile (`run_compiler_batch`)
- **Four tables:** `outlook_email_intake` ⊇ `document_metadata` ⊇ `project_emails`. `document_chunks` = vector store.
- **Embedding:** `embed_pending_graph_documents()` runs synchronously at end of each sync run
- **Teams DM compiler:** 30 min cadence, batch 25, 170s limit

## Render cron jobs (all in render.yaml)

| Name | Schedule | Purpose |
|------|----------|---------|
| `alleato-graph-sync` | every 30 min | Outlook + Teams + OneDrive sync, embed, compile |
| `alleato-task-extraction` | daily 7 AM UTC | Extract action items from comms |
| `alleato-rag-health` | daily 12:15 UTC | RAG embedding health check + Slack alert |

All three use the Docker image from `./backend/Dockerfile`.

---

## File map — things confirmed this session

| Thing | Location |
|-------|----------|
| Graph sync orchestrator | `backend/src/services/integrations/microsoft_graph/sync.py` |
| Teams compiler | `backend/src/services/intelligence/teams_compiler.py` |
| Task extraction | `backend/src/services/task_extraction.py` |
| RAG health check | `backend/src/services/health/rag_meeting_health.py` |
| Render cron config | `render.yaml` |
| Email sync client (tabbed) | `frontend/src/app/(tables)/emails/email-sync-client.tsx` |
| Emails table page | `frontend/src/app/(tables)/emails/page.tsx` |

---

## Known pre-existing TypeScript errors (not from our work)

These exist in HEAD and are NOT caused by recent changes:
- `dev-panel.tsx` / `enhanced-dev-panel.tsx` — `params possibly null`
- `ChangeManagementDashboard.tsx` — `projectId` type error
- `knowledge-document-edit-dialog.tsx` — missing `useUpdateKnowledgeDocument` export
- `sheet-editor` components — `RenderCellProps` type incompatibility
- `instrumentation.ts` — `enrich` not in type

---

## What's next

1. **GitHub billing** — restore CI by updating payment (github.com/settings/billing)
2. **Verify Render crons live** — once render.yaml deploys, confirm `alleato-rag-health` has `SLACK_WEBHOOK_URL` set in Render env
3. **Low-confidence review queue** — `document_attribution_candidates` table has no UI yet
4. **Teams DM 403s** — the 10 permanent failures are documented; no further action needed

---

*This file is maintained by Claude Code and should be committed to the repo.*
*It is the single most important file for session continuity.*
