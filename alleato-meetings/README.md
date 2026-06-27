# Alleato Meetings

A standalone meeting-intelligence app that captures **Microsoft Teams** meetings —
transcript, AI executive summary, **action items with owner + due date**, decisions,
risks, and the video recording — using Teams' **native** transcription via Microsoft
Graph. No third-party meeting bot, no per-minute vendor.

It is fully independent of `alleato-pm` (its own Next.js app, its own Supabase
project, its own deploy). It was scaffolded inside the `alleato-pm` repo only because
of tooling access limits — **move this `alleato-meetings/` folder into its own GitHub
repo** and it stands alone.

> Scope: **Teams meetings only.** Externally-hosted Zoom / Google Meet calls are not
> covered (capturing those requires a joining bot like Recall.ai — a separate build).

---

## How it works

```
Teams records + transcribes a meeting (native)
        │
        ▼
Microsoft Graph  /communications/onlineMeetings/getAllTranscripts  (+ getAllRecordings)
        │  (app-only / client credentials, incremental by createdDateTime)
        ▼
src/lib/sync.ts → parse WebVTT (src/lib/vtt.ts) → OpenAI extraction (src/lib/ai.ts)
        │
        ▼
Supabase: meetings, meeting_segments, action_items, meeting_insights  (+ recordings bucket)
        │
        ▼
Next.js UI: meetings list + detail (summary, action items, decisions/risks, transcript, video)
```

`POST /api/sync` (or Vercel Cron GET) runs the pull. Re-runs are idempotent
(deterministic `teamsmtg_<hash>` ids; children are replaced per meeting).

---

## Setup

### 1. Create a Supabase project (its own, not alleato-pm's)
- New project at supabase.com → SQL Editor → paste & run [`supabase/schema.sql`](./supabase/schema.sql).
- Copy the project URL and the **service_role** key.

### 2. Microsoft Graph access (admin — required, app is inert without it)
Use the existing Alleato Graph app registration or create a dedicated one. Then:

- **Entra admin center → App registrations → [app] → API permissions** → add
  *Application* permissions and **Grant admin consent**:
  - `OnlineMeetingTranscript.Read.All`
  - `OnlineMeetingRecording.Read.All`
  - `OnlineMeetings.Read.All`
- **Teams application access policy** (PowerShell, Teams admin) — without this, Graph
  returns **403**:
  ```powershell
  Connect-MicrosoftTeams
  New-CsApplicationAccessPolicy -Identity "AlleatoMeetingCapture" -AppIds "<MS_CLIENT_ID>" -Description "Alleato Meetings transcript/recording read"
  Grant-CsApplicationAccessPolicy -PolicyName "AlleatoMeetingCapture" -Global
  ```
- **Teams admin center → Meetings → Meeting policies**: ensure recording +
  transcription are on (Graph can only return what Teams produced).

### 3. Environment
Copy [`.env.example`](./.env.example) → `.env.local` (local) or set in Vercel. You need
`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `MS_TENANT_ID`,
`MS_CLIENT_ID`, `MS_CLIENT_SECRET`, `OPENAI_API_KEY`, `SYNC_SECRET`, `APP_PASSWORD`.

### 4. Run
```bash
npm install
npm run dev          # http://localhost:3000  (Basic-auth: any user / APP_PASSWORD)
```
Trigger a sync:
```bash
curl -X POST "http://localhost:3000/api/sync" -H "x-sync-secret: $SYNC_SECRET"
# → { ok: true, transcripts_ingested: N, recordings_attached: M, errors: [] }
```

### 5. Deploy (Vercel)
- Import the repo, set the env vars above, deploy.
- [`vercel.json`](./vercel.json) schedules `/api/sync` every 30 min. Set a `CRON_SECRET`
  env var so the cron request is authorized (Vercel sends it as a Bearer token).

---

## Verifying it works
After consent + policy + a sync run:
```sql
select id, title, started_at, organizer_email, recording_storage_path
from meetings order by started_at desc limit 10;
select title, owner, due_date from action_items order by created_at desc limit 20;
```
Rows here = it's working. In the UI, a meeting shows summary, action items (owner/due),
decisions/risks, transcript, and a video player when a recording exists.

If `/api/sync` returns `403 meeting_access_denied`, step 2 (consent or Teams access
policy) is incomplete.

---

## Security notes
- The service-role key is used **server-side only** (route handlers + server
  components). Never import `src/lib/supabase.ts` into a client component.
- The recordings bucket is **private**; the detail page serves a short-lived signed URL.
- The whole UI is behind a Basic-auth password gate (`APP_PASSWORD`). Replace with
  Supabase Auth / SSO for per-user accounts before wider rollout.

## Next steps / not yet built
- Per-user auth (currently a shared password).
- Project/-tagging, search across meetings, semantic retrieval.
- Zoom / Google Meet coverage (needs a joining bot — out of scope here).
