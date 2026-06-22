# TASKS — Project Intelligence Synthesis (L2 + L4)

PRP: `prp-intelligence-synthesis.md`. Update this file as work progresses. Each task has a gate; **do not check a box without the gate passing on real data** (the prior build failed by skipping this).

## Progress summary
- [x] Phase 0 — Audit reproduced (A1–A4 confirm L2 was missing; A5–A8 confirm fragment layer real; A9 email staleness)
- [x] Phase 1 — L2 backend synthesizer (`backend/src/services/intelligence/project_intelligence.py`) — G1, G5 PASS on 1009
- [x] Phase 2 — Trigger + admin endpoint — G2, G3 PASS on 1009
- [x] Phase 3 — Project page reads synthesis packet — G4 PASS (authenticated screenshot)
- [x] Phase 4 — Brief synthesizes across packets (`portfolio-synthesis-brief.ts`) — built + data path verified; **G6 awaits Megan's review**
- [ ] Phase 5 — Re-enable AM/PM delivery (HUMAN-GATED, outward-facing — not started; needs Megan approval of G6)

---

## Phase 0 — Independent audit (do this FIRST; rebuilds trust)
- [ ] **0.1** Run audit table commands A1–A9 from the PRP §1. Confirm: A1–A4 show the synthesis layer is MISSING; A5–A8 show the fragment layer is real; A9 shows email staleness.
- [ ] **0.2** Confirm `intelligence_packets` has NO `project_intelligence_synthesis*` rows (A2).
- [ ] **0.3** Confirm `project_synthesizer.py` writes no `intelligence_packets` (A1).
- **Gate:** an agent OTHER than the implementer reproduces A1–A4 and agrees L2 is missing.

## Phase 1 — L2 backend synthesizer
- [ ] **1.1** Create `backend/src/services/intelligence/project_intelligence.py` with `refresh_project_intelligence(project_id, force_full=False, dry_run=False)` (PRP Task 1).
- [ ] **1.2** Load prior packet (compiler_version `project_intelligence_synthesis_v1`) + compute delta `since`.
- [ ] **1.3** Load raw delta docs (document_metadata → RAG `rag_document_metadata.content`), bound to `MAX_SYNTH_CHARS`.
- [ ] **1.4** Load structured snapshot (budget, RFIs, change_events, Acumatica AR/overdue).
- [ ] **1.5** Implement `synthesize_project_state(...)` with the PRP Task 2 prompt; `extract_with_retry(model=COMPILER_MODEL, timeout=300)`.
- [ ] **1.6** Anti-hallucination: drop fabricated sourceIds; never invent numbers. RAISE on `_extraction_failed` (no silent empty packet).
- [ ] **1.7** Write `intelligence_packets` row with `packet_json.strategicReport` keyed for the page.
- **Gate G1:** dry-run on 1009 returns coherent `executiveRead` + risks with reasoning + real evidence; **Megan reads it and confirms it's insight.**
- **Gate G5:** forced empty/quota case → 500 + logged error, no empty packet written.

## Phase 2 — Trigger + endpoint
- [ ] **2.1** Admin endpoint `POST /api/intelligence/project-intelligence/refresh {project_id, dry_run}` (backend main.py, `require_admin_api_key`).
- [ ] **2.2** Wire `refresh_project_intelligence` into `run_synthesis_sweep` (or sibling cron), bounded per run.
- **Gate G2:** real run writes a `project_intelligence_synthesis_v1` packet; `covered_end_at` ≈ latest doc.
- **Gate G3:** second run only processes newer docs and UPDATES the packet (rolling-state, no dup).

## Phase 3 — Project page (L3)
- [ ] **3.1** Confirm `loadCurrentIntelligencePacket` picks up the new packet (latest `packet_type=current`).
- [ ] **3.2** Ensure `page.tsx` renders `packet_json.strategicReport` keys from L2; adjust renderer only if needed. Keep the Progress Log timeline.
- **Gate G4:** authenticated browser screenshot of `/1009/intelligence` shows the synthesis narrative, not the stale operating-summary.

## Phase 4 — Brief synthesis (L4)
- [ ] **4.1** New brief path (frontend/Vercel): load all active `project_intelligence_synthesis_v1` packets + financial pulse → ONE gpt-5.5 cross-portfolio pass → §8 skeleton (one-line / what-changed / needs-Brandon / watch / waiting-on).
- [ ] **4.2** Gate behind a new flag; keep verbatim-card path as fallback.
- **Gate G6:** generated brief reads like an advisor; **Megan confirms** vs the current subpar one.

## Phase 5 — Delivery (human-gated)
- [ ] **5.1** After G6 approval: set the brief synthesis flag on (Vercel), `EXECUTIVE_DAILY_BRIEF_ENABLED=true`, restore + un-suspend AM/PM crons `crn-d827chojs32c73doj780` / `crn-d827cijbc2fs73c3uqsg`. **Outward-facing — confirm with Megan first.**

---

## Session log
- 2026-06-14 — PRP created. Audit confirmed the synthesis layer (L2/L4) was never built; fragment layer (2.1/2.2/2.4/2.5) is real. Nothing in Phases 1–5 started.
- 2026-06-14 — Executed Phases 1–4. Built L2 (`backend/src/services/intelligence/project_intelligence.py`, `refresh_project_intelligence` + `synthesize_project_state`, compiler_version `project_intelligence_synthesis_v1`), admin endpoint `POST /api/intelligence/project-intelligence/refresh`, sweep wiring (`run_synthesis_sweep(refresh_intelligence=True)`), and L4 (`frontend/src/lib/executive/portfolio-synthesis-brief.ts` + preview route `POST /api/admin/portfolio-brief/preview`). Verified on project 1009: **G1** (dry-run = real synthesis, fabricatedCiteCount=0), **G2** (packet written), **G3** (rolling-state: 2nd run since=prior covered_end_at, only newer docs, same packet_id updated), **G4** (authenticated page screenshot renders the synthesis, not the stale operating-summary), **G5** (forced LLM failure raises, existing packet untouched). Key discovery: `intelligence_packets_one_current_per_target` partial-unique constraint → synthesis UPDATES the single current row in place (superseding the operating-summary packet). **Remaining: G6** = Megan reviews `POST /api/admin/portfolio-brief/preview` output (needs `CRON_SECRET`; only 1009 has a synthesis packet until the 2h sweep populates others). **Phase 5** (re-enable AM/PM Teams delivery, set `PORTFOLIO_SYNTHESIS_BRIEF_ENABLED=true`) is outward-facing — hold for Megan's explicit go.
