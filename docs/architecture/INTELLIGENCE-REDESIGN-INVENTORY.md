# Intelligence Path Inventory & KEEP/KILL/REPLACE Manifest

**Purpose:** Ground-truth map of every file, cron, flag, table, and consumer in the
compiler → insight_card → intelligence_packet → executive-brief path, traced by `grep`
(not by docs), so we can rip out the broken path safely and rebuild on full-context synthesis.

**Status:** ✅ Step 1 COMPLETE. 🔨 Step 2 in progress — Slice 2.1 (schema) DONE (2026-06-14).

### Step 2 slice tracker
> 🚨 **BLOCKED on external billing (2026-06-14):** backend AI is down — OpenAI account hit
> `429 insufficient_quota` (all backend LLM calls fail; verified directly). 2.2b code is correct but
> can't be live-verified, and 2.3–2.5 can't proceed, until the OpenAI account is funded (Megan's action)
> or the backend is routed through the working AI Gateway. See memory `incident_openai_quota_backend_ai_down.md`.
> Diagnosed via the synthesizer's own `extraction_failed`/`extraction_error` instrumentation — the silent
> 429 surfaced loudly, which is exactly why that instrumentation was added.

- ✅ **2.1 Schema** (migration `20260614140000_insight_cards_timeline_fields.sql`): added `occurred_at`,
  `severity` (1–5 check), `related_card_ids uuid[]` to `insight_cards`; widened `current_status`
  (+materialized/did_not_materialize/superseded) and `card_type` (+flag/solution/milestone); backfilled
  `occurred_at` on all 10,618 rows; added timeline index. Applied to PM APP + verified (test flag/materialized
  insert accepted & rolled back, 0 rows broken). Types regenerated.
- ✅ **2.2 Synthesizer** — generalized deep-extraction to email/Teams (`project_synthesizer.py` +
  `extract_deep_communication_intelligence`). **VERIFIED end-to-end on project 1009 (2026-06-14, after OpenAI
  funded):** 3 emails → 17 promoted insight_cards (decision/risk/schedule_risk/initiative_signal/**flag**/
  project_update) with verbatim evidence, `severity` (2,3), `occurred_at`=real email date, + 9 tasks with
  `source_system='email'` and named assignees. A real predictive `flag` card surfaced ("team may adopt a
  mechanical scope change removing Make Up Air..."). Quality matches the meeting path. Added `max_extractions`
  cap (deep extraction is ~seconds/doc; large sync batches exceed the request timeout — the auto-trigger in
  2.4 must process incrementally).
- ⬜ **2.3 Flag→outcome calibration loop.**
- ⬜ **2.4 Trigger + staleness gate.**
- ⬜ **2.5 Page + AM/PM brief wiring.**
**Verified:** 2026-06-14 against live code AND live Render prod env.

### Step 1 completion record (2026-06-14)
- Commit `10a1af5f0` pushed to main; Render deploy `dep-d8n4t7jbc2fs73ejm5q0` reached `live`, booted clean
  (`Application startup complete`), zero ImportError/deleted-module refs in startup logs.
- Prod: `alleato-task-extraction` cron suspended; `DEEP_AGENTS_PROJECT_INTELLIGENCE_ENABLED=false`.
- Deleted: `teams_compiler.py`, `email_compiler.py`, `task_extraction.py` + all wiring + 5 dead test files.
- 3,795 line deletions, content-clean; all pre-commit gates passed.
- ⚠️ Render auto-deploy was NOT tracking pushes (was stuck on 2026-06-12 commit `c5903f49`). Deploy was
  triggered manually via API. **Follow-up: check why backend auto-deploy isn't firing on push to main.**

## Verified prod state (Render API, 2026-06-14)

| Flag (on `alleato-backend`) | Value | Meaning |
|---|---|---|
| `DEEP_EXTRACTION_ENABLED` | `true` | Meeting deep extraction LIVE (gpt-5.5). **KEEP — becomes spine.** |
| `DEEP_AGENTS_PROJECT_INTELLIGENCE_ENABLED` | `true` | Path #6 LIVE. Likely the current project-packet writer. |
| `DEEP_AGENTS_PROJECT_INTELLIGENCE_MODEL` | `gpt-5.4-mini` | **Mini model** on the heavy Deep-Agents harness — prime suspect for weak project intelligence. **KILL.** |
| `DEEP_AGENTS_PROJECT_INTELLIGENCE_RUNTIME` | `deep_agents` | LangGraph harness. **KILL** in favor of the single synthesizer. |
| `EXECUTIVE_BRIEF_FROM_INSIGHT_CARDS` | unset | Brief runs the RAG path. **REPLACE.** |
| `INTELLIGENCE_USE_OPERATING_SUMMARY_COMPILER` | unset → default `true` | Path #4 enabled but drain stalled (`packet_limit=0`). |

**Two live project-packet writers competing:** stalled operating-summary (#4) + live Deep-Agents-mini (#6). This is the mush. Both replaced by the single rolling-state synthesizer (gpt-5.5).

**AM/PM brief crons already exist:** `alleato-executive-daily-brief-morning` (`crn-d827chojs32c73doj780`), `alleato-executive-daily-brief-evening` (`crn-d827cijbc2fs73c3uqsg`). Delivery scaffolding present; synthesis behind it is what we rebuild.

---

## 0. The reality (what's actually running vs. what the docs imply)

There are **six** code paths that produce "project intelligence," all writing to the same
two tables (`insight_cards`, `intelligence_packets`) with different keys and dedup logic.
This is the sprawl. Several are partially neutered in production — which is *why* the
project intelligence page and brief feel half-built.

| # | Producer | Writes | Live state (prod) | Model |
|---|----------|--------|-------------------|-------|
| 1 | `intelligence/teams_compiler.py` | cards (via `compiler.promote_signal_candidate`) | **LIVE** — drained by `intelligence-compiler-drain` (source jobs) | `gpt-4.1-mini` (LIGHT) |
| 2 | `intelligence/email_compiler.py` | cards (same promotion path) | **LIVE** — same drain | `gpt-4.1-mini` (LIGHT) |
| 3 | `pipeline/extractor.py` (meeting deep extraction) | cards + tasks | **LIVE** — `DEEP_EXTRACTION_ENABLED` declared in render.yaml | `gpt-5.5` |
| 4 | `intelligence/operating_summary.py` | packets + cards | **STALLED** — see below | `gpt-5.5` |
| 5 | `intelligence/domain_compiler.py` | domain packets + cards | **LIVE** — `domain-packet-compiler` cron, 4×/day | `gpt-5.4-mini` |
| 6 | `agents/deep_project_intelligence.py` (Render Deep Agents) | packets | Gated by `DEEP_AGENTS_PROJECT_INTELLIGENCE_ENABLED` | configurable |

### Why operating-summary packets are STALLED
- `alleato-packet-refresh-periodic` cron runs with **`--dry-run`** → writes nothing.
- `alleato-intelligence-compiler-drain` runs with **`packet_limit=0`** → it drains *source*
  jobs (signal → card) but never processes *packet-refresh* jobs.
- So meeting signals enqueue packet-refresh jobs (`compiler.enqueue_packet_refresh`, meeting-only
  gate added 2026-06-12) that **nothing drains**. Project operating packets go stale.
- Net effect: the `[projectId]/intelligence` page renders increasingly stale packet JSON.
  This matches the "subpar" symptom.

### The executive brief has two competing paths
- Default: **28 RAG searches** (`search_document_chunks`, threshold `0.08` → post-filter `0.35`)
  + **2× gpt-5.5** synthesis. (`brandon-daily-update.ts`)
- Flag `EXECUTIVE_BRIEF_FROM_INSIGHT_CARDS` (Phase 3): reads cards verbatim, no LLM. Built,
  tested, **off**.

---

## 1. Files — verdicts

### Backend — intelligence/

| File | Verdict | Notes |
|------|---------|-------|
| `intelligence/teams_compiler.py` | **KILL** | Per-item, out-of-context, cheap-model extraction. Teams threads become raw input to the new synthesizer instead. |
| `intelligence/email_compiler.py` | **KILL** | Same. |
| `intelligence/compiler.py` | **REPLACE** | Owns `promote_signal_candidate`, dedup (`normalized_signal_key`), packet enqueue, drain orchestration. Gutted down to the parts the new synthesizer needs (card upsert helper, target resolution). Most of it goes. |
| `intelligence/operating_summary.py` | **REPLACE** | Right spirit (reads raw), wrong execution (full rescan, one of six paths, stalled). Becomes the basis of the new **rolling-state + delta** project synthesizer. |
| `intelligence/domain_compiler.py` | **DECIDE** | Cross-project *domain* packets ("what's going on with accounting?"), powers `getDomainIntelligence`. Different axis (domain, not project). Keep for now or fold into synthesis later — **open question, see §6**. |
| `intelligence/client.py` | **KEEP** | LLM client wrapper (`extract_with_retry`, model env config). Reused by the synthesizer. |
| `intelligence/prompts.py` | **REPLACE** | Prompts rewritten for full-transcript synthesis. |

### Backend — pipeline/

| File | Verdict | Notes |
|------|---------|-------|
| `pipeline/extractor.py` deep-extraction pass | **PROMOTE → spine** | `extract_deep_meeting_intelligence` (whole transcript vs project ground truth) is *already the right idea*. Generalize it into the Layer-2 synthesizer for all sources. |
| `pipeline/extractor.py` shallow pass + `_promote_meeting_signals` card plumbing | **KILL** | The fragment path. |
| `pipeline/orchestrator.py`, `parser.py`, `document_parser.py`, `financial_parser.py`, `embedder.py` | **KEEP** | Ingestion + embedding (Layer 0/1). Untouched. |
| `services/task_extraction.py` | **KILL** | 2nd gpt-5.5 task pass. Tasks fall out of the synthesizer. (Covers email/Teams tasks too — confirm synthesizer covers those before deleting; see §6.) |

### Frontend — read surface (KEEP, repoint writers only)

These **read** cards/packets and must keep working. We change *who writes*, not the tables or these consumers.

| File | Reads | Verdict |
|------|-------|---------|
| `app/(main)/[projectId]/intelligence/page.tsx` | packets + cards (`packet-service`, `InsightCardShowcase`) | **KEEP** |
| `lib/ai/intelligence/packet-service.ts`, `page-state.ts`, `types.ts` | packets | **KEEP** |
| `app/(tables)/insights/page.tsx` | cards | **KEEP** |
| `lib/ai/tools/project-tools.ts`, `intelligence-tools.ts`, `operational.ts` | cards/packets | **KEEP** (assistant reads synthesized state) |
| `lib/executive/brandon-daily-update.ts` | RAG **and** cards | **REPLACE** — rebuild on packets + today's raw meetings |
| `lib/executive/owner-briefing-*.ts`, `executive-briefing-workflow.ts` | cards/packets | **REVIEW** — repoint to new packet shape |
| `app/api/insight-cards/[cardId]/{snooze,acknowledge}` | cards (write: user feedback) | **KEEP** — feedback UI survives |
| `app/(admin)/intelligence-{compiler,packets}` | health/admin | **REVIEW** — compiler health panel loses meaning once compilers die |

---

## 2. Crons (render.yaml) — verdicts

| Cron | Schedule | Verdict | Action |
|------|----------|---------|--------|
| `alleato-graph-sync` | */30 | **KEEP** | Ingestion (email/Teams/OneDrive). |
| `alleato-fireflies-sync` | hourly :15 | **KEEP** | Meeting ingestion. |
| `alleato-teams-channel-sync` / `-dm-sync` | hourly | **KEEP** | Ingestion. |
| `alleato-intelligence-compiler-drain` | */15 | **REPLACE** | Becomes the new synthesizer drain (rolling-state delta), or retired in favor of event-driven synthesis. |
| `alleato-packet-refresh-periodic` | 4×/day (dry-run) | **REPLACE** | Already a no-op. Replaced by staleness-gated synthesis trigger. |
| `alleato-domain-packet-compiler` | 4×/day | **DECIDE** | Tied to `domain_compiler.py` verdict (§6). |
| `alleato-task-extraction` | daily 7am | **KILL** | Redundant 2nd task pass. |
| `alleato-daily-recap` | daily 9:30 | **KEEP/REVIEW** | Brief delivery — repoint to new brief. |
| `alleato-source-sync-health`, `-rag-health`, `-source-rag-health` | various | **KEEP** | Health monitoring. |
| `alleato-microsoft-executive-assistant-check` | */15 | **KEEP** | Separate feature. |

---

## 3. Tables — verdicts

| Table | Verdict | Notes |
|-------|---------|-------|
| `document_metadata` | **KEEP** | Raw capture + attribution. |
| `document_chunks` (RAG) | **KEEP — demote** | Only consumer becomes the chat "search archive" tool. Not read for intelligence. |
| `intelligence_packets` | **KEEP — redefine** | Cached output of the new synthesizer (one writer). |
| `insight_cards` | **KEEP — presentation only** | Rendered sections of a packet, single writer. UI + feedback survive. |
| `source_signal_candidates` | **KILL** | Review queue for the fragment path. |
| `insight_card_evidence` / `insight_card_targets` | **KEEP** | Evidence/attribution linking — synthesizer populates them. |
| `source_intelligence_jobs` / packet-refresh job tables | **REPLACE** | New trigger/queue model. |
| `tasks` | **KEEP** | Synthesizer writes tasks. |
| `daily_recaps` | **KEEP** | Brief storage. |

---

## 4. Flags — verdicts

| Flag | Current | Verdict |
|------|---------|---------|
| `DEEP_EXTRACTION_ENABLED` | on (render.yaml) | **KEEP → becomes default** (the synthesis path) |
| `EXECUTIVE_BRIEF_FROM_INSIGHT_CARDS` | off | **RETIRE** — brief is rebuilt; flag becomes moot |
| `INTELLIGENCE_USE_OPERATING_SUMMARY_COMPILER` | default true | **RETIRE** — single path, no toggle |
| `INTELLIGENCE_COMPILER_PACKET_LIMIT` / drain limits | `0` in cron | **REPLACE** — new trigger model |
| `COMPILER_MODEL` / `_LIGHT` / `_LARGE` | gpt-5.5 / gpt-4.1-mini | **CONSOLIDATE** — synthesizer uses `gpt-5.5` |
| `DEEP_TRANSCRIPT_MAX_CHARS`, `DEEP_TASK_CONFIDENCE_THRESHOLD`, `DEEP_PRIOR_CONTEXT_TOPK` | various | **KEEP** — synthesizer tuning knobs |
| `DOMAIN_PACKET_*` | active | **DECIDE** (§6) |
| `DEEP_AGENTS_PROJECT_INTELLIGENCE_ENABLED` | render.yaml | **DECIDE** — is the Render Deep Agents packet writer (path #6) wanted, or does it compete? (§6) |

---

## 5. Target architecture (the spine we build toward)

```
L0 Ingest (KEEP)        email/Teams/Fireflies/OneDrive → document_metadata (+ project attribution)
L1 Embed  (KEEP/demote) → document_chunks   [consumer: chat "search archive" ONLY]
L2 Synthesize (NEW)     trigger: new raw docs for a project (staleness-gated)
                        input: prior packet + raw text of docs-since-last-packet + structured snapshot (SQL/Acumatica)
                        one gpt-5.5 pass → structured packet (status/risks/decisions/financial/actions/tasks + evidence)
                        write: intelligence_packets (1 writer) → insight_cards sections → tasks
L3 Project page (KEEP)  reads latest packet. zero model calls.
L4 Brief (REPLACE)      read all active packets + today's raw meetings → 1 gpt-5.5 pass → deterministic scoring → daily_recaps
L5 Assistant (REWIRE)   status→packet | lookup→RAG | numbers→SQL
```

Decisions locked: **rolling-state + delta** · **gpt-5.5** · **rip-out-first, slice-by-slice with proof gates**.

---

## 6. Open questions — RESOLVED (2026-06-14)

1. **Domain compiler (#5):** KEEP as-is for now. Revisit after the project spine lands.
2. **Deep Agents project intelligence (#6):** Verified LIVE on `gpt-5.4-mini`. **KILL** — it's a
   competing packet writer on a weak model; replaced by the synthesizer.
3. **Email/Teams tasks:** The synthesizer MUST emit tasks from ALL source types, not just meetings.
   Requirement (Megan): "if Brandon tells an employee to do something → task for that employee; if a
   client emails Brandon something needing action → task for Brandon." Assignee resolution is part of
   the synthesis contract. → `task_extraction.py` cron KILLED; coverage absorbed by the synthesizer.
4. **Brief lineage:** Partially live; Teams *send* was turned OFF because output was incoherent. Rebuild
   the synthesis, then re-enable AM/PM Teams delivery (crons already exist).

---

## 7. Project Intelligence Page — spec (from sketch IMG_1426 + Megan's description)

Two parts. Only Part B uses AI.

### Part A — Snapshot (structured app data, NO AI)
Read directly from existing app tables/tools and display. AI must not re-derive these.
- **Details:** project name, client, start date, substantial completion date
- **Project Team:** PM, Superintendent, Engineer
- **Budget:** committed costs · prime invoices · subcontractor invoices · direct costs
- **Change:** change events · potential change orders · change orders
- **Schedule** · **Open RFIs** · **Recent Meetings**
- **Reports:** weekly · daily
- **Documents:** files · drawings · submittals · photos
- **Tasks:** open tasks grouped by assignee
- **Current Read (only AI part of the snapshot):** 1-paragraph state + top risks + top actions, lifted from the latest packet narrative.

### Part B — Progress Log / Timeline + AI Insights (the synthesizer output)
Most-recent-first, `occurred_at DESC`. Each entry is a typed timeline event = one `insight_card`:

| Field | Notes |
|---|---|
| `type` | decision · issue · risk · solution · action_item · **flag** · update · milestone |
| `occurred_at` | real source date |
| `title` / `summary` | concise |
| `evidence` | verbatim quote + source link (meeting/email/Teams/report) |
| `assignee` | action_items only |
| `severity` | risks only, AI 1–5 |
| `status` | open · resolved · **materialized** · **did_not_materialize** · superseded |
| `related_ids` | causal/outcome links to other entries |

**Flag→outcome calibration loop:** flags (predicted change events, scored risks) are `status: open`.
Each synthesis run re-checks open flags against new events; matches flip to `materialized` (or
`did_not_materialize`) and link to the realizing entry. Timeline then shows "AI predicted this N days
early — correct." Same for risk-severity accuracy.

**Schema delta:** extend `insight_cards` with `occurred_at`, `severity`, `status`, `related_card_ids`,
and an expanded `card_type` set. No new core table.

---

## 8. Executive Daily Brief — spec (AM + PM to Megan + Brandon)

One `gpt-5.5` pass over already-synthesized project packets + today's new timeline events (NOT raw RAG).
Rigid skeleton with hard caps to prevent overwhelm:

1. **The one line** — single most important thing across the portfolio right now.
2. **What changed** since last brief — max 5 bullets (project · what · why it matters). "Nothing material" allowed.
3. **Needs Brandon** — ranked action items/tasks — max 5 (what · project · why now).
4. **Watch list** — escalating risks/flags, no action yet — max 3, one line each.
5. **Waiting on** — blocked-on-others — only if non-empty.

Rules: every item cites evidence; no padding; strip AR/collections language. AM = overnight + today's
look-ahead; PM = what landed today + what's now open. Re-enable Teams delivery once output passes review.

---

## 9. Step 1 rip-out list (execute as ONE tracked slice on approval)

**Disable (Render crons — stop writing bad data first):**
- `alleato-task-extraction` (suspend)
- `alleato-packet-refresh-periodic` (already dry-run; suspend)
- set `DEEP_AGENTS_PROJECT_INTELLIGENCE_ENABLED=false` (kill competing packet writer #6)
- `alleato-intelligence-compiler-drain` → stop card promotion (suspend or gut)

**Delete code (grep consumers first, each checked off here):**
- `intelligence/teams_compiler.py`, `intelligence/email_compiler.py`
- `services/task_extraction.py`
- card-promotion machinery in `compiler.py` (`promote_signal_candidate`, source-job drain) + `extractor.py` shallow `_promote_meeting_signals`
- `source_signal_candidates` writes

**Keep untouched:** ingestion crons, embedding, SQL/Acumatica tools, `intelligence_packets` + `insight_cards` tables, all frontend read surface + card feedback UI, `domain_compiler` (#5), `deep_project_intelligence.py` deep-extraction (#3, the meeting transcript pass we promote).

**Proof gate after Step 1:** backend boots, app loads, no import references the deleted modules, project page renders (stale-but-present), brief still generates. Then Step 2 builds the synthesizer.
