# PRP — Daily Briefs & Project Intelligence: Write-Time Extraction Strategy

**Status:** In progress (Phase 2 partial — operating-summary dedup landed)
**Branch:** `claude/daily-briefs-strategy-hq8xb2`
**Author context:** Strategy discussion with owner, 2026-06-09
**Domain:** `backend/src/services/intelligence/`, `backend/src/services/pipeline/`, `frontend/src/lib/executive/`

---

## 1. Problem

Owner-facing daily/executive briefs read **shallow**. Empirically: when a model re-reads the
original meeting transcript and compares it against project ground truth, it surfaces far more
risk, dependency, and nuance than the brief reported. The summarized layer the brief is built
from loses signal — "compression drift":

> Transcript → segment summary → extraction → project summary → daily brief.
> Each hop sheds detail. "Discussed permitting challenges" replaces "fire marshal rejected the
> design twice, landlord approval outstanding, Hy-Tek waiting on structural calcs, schedule
> likely slipping 4–6 weeks."

At Alleato's volume (~5–15 meaningful meetings/day, each fits in a context window) there is no
scale reason to generate daily intelligence from lossy retrieval. The transcript is the source
of truth and should be read whole at ingestion.

## 2. Core principle

Separate two jobs that today share one mechanism:

| Job | Right tool | Notes |
|-----|-----------|-------|
| **Institutional memory** (historical recall, cross-project Q&A, "has this happened before") | RAG / embeddings | Keep embedding everything. Correct use of retrieval. |
| **Daily operational intelligence** (briefs, risks, tasks, project state) | **Full-transcript extraction at write time** + deterministic project state + *targeted* semantic lookup | Read the transcript whole. Assemble briefs from typed rows, not vectors. |

"Don't use RAG to *generate* today's intelligence. Use today's transcripts to generate it. Use
RAG to provide historical context and evidence when needed."

Extraction must judge the transcript **against ground truth** (budget, schedule, open items),
fetched deterministically by `project_id` — not guessed at via vector search. The "that's not
what it should be" insight comes from comparison, not from reading alone.

## 3. Corrected diagnosis (what's actually in the codebase)

Investigation 2026-06-09. **It is not "everything uses RAG."** Only the brief does, and the
typed layer it should read from is half-built.

| Generation path | Reads from | Writes | Dedup |
|---|---|---|---|
| Meeting extractor (`pipeline/extractor.py`) | **Full transcript** ✅ | only `tasks` — risk/decision/insight writer is a **no-op stub** (`:491-505`) | tasks: strong (`UNIQUE(metadata_id, description)` + delete-then-reinsert) |
| Teams compiler (`teams_compiler.py`) | Full transcript (capped 6k chars, `:56`) | tasks + `insight_cards` (via candidate promotion) | deduped on `normalized_signal_key` |
| Operating summary (`operating_summary.py`) | structured tables | `insight_cards` | ~~blind insert — duplicated every run~~ **FIXED (Phase 2)** |
| **Daily/Executive Brief (`brandon-daily-update.ts`)** | **RAG vector chunks, clipped to 900 chars** (`:1776`) | `daily_recaps`, `executive_briefing_follow_ups` | strong (fingerprint + recap_date) |

**The typed, lifecycle-aware layer already exists — it is `insight_cards` (Pipeline B).** Do NOT
revive the dropped `risks`/`decisions`/`opportunities`/`project_insights` tables. They were
deliberately removed in two migrations:
- `20260320100000_consolidate_rag_schema.sql` — folded risks/decisions/opportunities into `insights`.
- `20260515080000_drop_pipeline_a_intelligence.sql` — dropped Pipeline A (`insights`,
  `project_insights`, `ai_insights`) in favor of Pipeline B (`insight_cards`,
  `intelligence_packets`, `insight_card_evidence`, `intelligence_targets`).

`insight_cards` already carries everything needed for living state: `card_type`, `confidence`,
`current_status` (open/blocked/resolved), `first_seen_at`/`last_seen_at`, `source_count`,
`stale_after`, evidence via `insight_card_evidence`, and a dedup key at
`metadata.normalized_signal_key`. **Phase 0 (schema) is therefore a no-op — no migration.**

`document_insights` (live, 0 rows, dormant, no unique constraint, only a `resolved` boolean) is
NOT the target; `insight_cards` is.

## 4. The three real gaps

1. **Meeting full-transcript extraction never reaches `insight_cards`.** `extractor.py` reads
   the full transcript but its insight writer is a no-op; only the *Teams* compiler routes
   signals → `source_signal_candidates` → deduped `insight_cards`. Fireflies meeting
   risks/decisions are not becoming durable, deduped cards.
2. **`operating_summary.py` blind-inserted cards every run** (duplicate accumulation, bypassing
   the existing dedup path). — **FIXED.**
3. **The brief generates from RAG chunks**, not from the typed cards.

## 5. Decisions (owner, 2026-06-09)

- **Rollout:** Replace, flag-guarded (swap the brief's generation source behind a feature flag,
  all projects, quick rollback) — not a long shadow period.
- **Auto-write aggressiveness:** Review queue for actions. Items that **create a task or notify
  someone** require a confidence threshold or land in a `needs_review` state
  (`attribution_status = needs_review`); logging-only insights write directly. (Matches the
  existing `attribution_status` "approved"/"needs_review" mechanism on `insight_cards`.)

## 6. Plan

### Phase 0 — Schema foundations — **NO-OP**
`insight_cards` + `insight_card_evidence` + `intelligence_targets` already provide provenance,
lifecycle, confidence, dedup key. No migration. (This is the key finding — the earlier
"revive tables" framing was wrong.)

### Phase 1 — Meeting extraction → deduped `insight_cards` (critical path)
- **DONE:** Replaced the no-op insight writer in `pipeline/extractor.py` with
  `_promote_meeting_signals`, which routes meeting decisions/risks/opportunities through the
  **same candidate → `promote_signal_candidate` path** the Teams compiler uses, under a dedicated
  `compiler_version = meeting_extractor_compiler_v0_1`. They dedup on `normalized_signal_key`,
  carry evidence + target attribution, and re-extraction clears prior candidates first
  (idempotent). Risk categories map to `schedule_risk`/`financial_exposure`/`risk`; opportunities
  → `initiative_signal`. Heuristic per-item confidence; sub-0.85 items stay `needs_review`
  (review queue, per the owner decision). Tests:
  `backend/tests/test_meeting_signal_promotion.py` (4 passing).
- **TODO (needs a cost decision):** lift the 6k-char Teams conversation cap
  (`teams_compiler.py:MAX_LLM_CONVERSATION_CHARS`). At Alleato's volume the whole conversation
  fits; the cap *is* compression — but raising it changes Teams LLM token cost on every compile,
  so confirm before changing.
- **TODO:** feed extraction **deterministic project state** (budget/schedule/open items by
  `project_id`) + **bounded** semantic lookup ("seen before?") so extraction is judged against
  ground truth. (Larger change — own pass.)

### Phase 2 — Reconciliation / supersede
- **DONE:** `operating_summary._persist_operating_cards` — per-key dedup + in-place update +
  stale supersede + non-accumulating evidence/targets. Test:
  `backend/tests/test_project_operating_summary.py::test_persist_operating_cards_dedupes_supersedes_and_does_not_accumulate`.
- TODO: ensure the Phase-1 meeting path reuses the candidate dedup helper (no second
  inconsistent writer).

### Phase 3 — Repoint the brief off RAG (flag-guarded replace)
- **DONE (v1):** Added flag `EXECUTIVE_BRIEF_FROM_INSIGHT_CARDS` to `brandon-daily-update.ts`.
  When on, `generateBrandonDailyUpdate` skips the `search_document_chunks` embedding/chunk path
  and builds its three sections from the curated `insight_cards` layer via the existing
  `buildOwnerBriefingData` (owner-briefing-builder.ts) → `bucketInsightCardBriefSections`.
  Card content (title/summary/why-it-matters/next-action) is used **verbatim — no chunk-synthesis
  LLM re-summarization** (that step is the compression drift). Financial pulse, recent-comms
  signals, enrichment, source coverage, and the `daily_recaps`/follow-up fingerprint dedup are all
  unchanged. Default OFF → production unchanged until flipped; flip back = instant rollback.
  Test: `bucketInsightCardBriefSections` describe in `brandon-daily-update.test.ts`.
- **DONE (v2 — recurrence):** `insight_cards.source_count` is now read by `owner-briefing-builder`
  and exposed as `OwnerBriefingCardItem.sourceCount`. Recurring issues (sourceCount > 1) rank
  higher (`byUrgencyDesc` + `computeUrgency` bonus, capped) and each brief item gets a cross-time
  recurrence fact ("Recurring: surfaced in N updates since {date}") — the "this keeps coming up"
  signal a point-in-time RAG brief can't express. Test added.
- **TODO (v2):** **full-transcript read of the day's meetings** — adds an LLM pass over whole
  transcripts (not chunks). This is a new cost-bearing subsystem; own pass + cost decision.
- **TODO (v2):** populate the `importantUpdates` section — needs a separate query for
  update-type cards (`project_update`/`initiative_signal`), which the owner-briefing card loader
  currently excludes.
- Keep RAG **only** for "has this surfaced before / when first discussed."

### Phase 4 — Guardrails
- Confidence gating: task-creating/notifying items → `needs_review` unless high-confidence;
  logging-only insights write directly.
- Every AI row requires an evidence link (`insight_card_evidence`).
- Regression tests: fixture transcript → extraction populates typed cards; **re-run produces
  zero duplicate rows**; brief assembles from cards not chunks. Smoke entry per repo convention.

### Phase 5 — Embedding stays as a parallel sink
`meeting_segments` embeddings + RAG DB continue for recall/chat. Decoupled from generation;
the brief is simply demoted from depending on it.

## 7. Sequencing
Phase 1 → 2 are the critical path. Phase 3 (the headline flag-guarded replace) gates on 1–2 so
the brief has a populated typed layer to read. Phase 4 layers across all. Phase 0 is empty.

## 8. Done so far on this branch
- **Phase 2 (partial):** Fixed the `operating_summary.py` duplicate-`insight_cards`
  accumulation bug (`_persist_operating_cards`) — dedup + in-place update + stale supersede.
- **Phase 1 (core):** `pipeline/extractor.py` now routes meeting decisions/risks/opportunities
  into `insight_cards` via the candidate → promotion path (`_promote_meeting_signals`),
  replacing the no-op writer. Heuristic confidence gates promotion vs. review queue.
- Regression tests added for both (`test_project_operating_summary.py`,
  `test_meeting_signal_promotion.py`) — passing. Note: `test_teams_compiler_packet.py`'s
  promotion test makes an unmocked live OpenAI call (operating-summary synthesis) and fails in
  sandboxes without OpenAI egress; unrelated to these changes.
- `AI-RAG-ARCHITECTURE.md` updated (RAG-docs gate).

- **Phase 3 (v1):** `brandon-daily-update.ts` can now source the brief from `insight_cards`
  behind `EXECUTIVE_BRIEF_FROM_INSIGHT_CARDS` (default off), reusing the existing
  owner-briefing-builder card loader; no chunk-synthesis re-summarization. Test added.

## 9. Still ahead
- Phase 1 TODOs (Teams cap cost decision; deterministic ground-truth context in extraction).
- Phase 3 v2: full-transcript read of the day's meetings + cross-time recurrence signals;
  populate `importantUpdates`.
- Flip `EXECUTIVE_BRIEF_FROM_INSIGHT_CARDS=true` in staging, compare against the RAG brief for a
  few days, then default it on.
- Phase 4: confidence gating + evidence-required guardrails + smoke coverage.
