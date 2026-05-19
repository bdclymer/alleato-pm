-- Point-in-time snapshots of the RAG pipeline, written 3x/day by the
-- alleato-rag-snapshot Render cron. Backs the /rag dashboard.
--
-- One row per snapshot. Each row records:
--   * For each source (OneDrive, Outlook, Meetings, Teams): how many docs
--     have been synced, chunked, and embedded.
--   * Compiler totals (Teams compiler, task extraction, insight extraction).
--   * Project Intelligence packet count.
--
-- Source definitions live in backend/src/services/health/rag_snapshot.py.
-- Do not back-fill this table by hand. Run the snapshot script or wait for
-- the next cron firing.

CREATE TABLE IF NOT EXISTS public.rag_pipeline_snapshots (
  id BIGSERIAL PRIMARY KEY,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- OneDrive / SharePoint documents
  onedrive_synced   INTEGER NOT NULL DEFAULT 0,
  onedrive_chunked  INTEGER NOT NULL DEFAULT 0,
  onedrive_embedded INTEGER NOT NULL DEFAULT 0,

  -- Outlook email (intake + attachments)
  outlook_synced   INTEGER NOT NULL DEFAULT 0,
  outlook_chunked  INTEGER NOT NULL DEFAULT 0,
  outlook_embedded INTEGER NOT NULL DEFAULT 0,

  -- Meeting transcripts (Fireflies + Interview + Zapier meetings)
  meetings_synced   INTEGER NOT NULL DEFAULT 0,
  meetings_chunked  INTEGER NOT NULL DEFAULT 0,
  meetings_embedded INTEGER NOT NULL DEFAULT 0,

  -- Teams messages + DM exports
  teams_synced   INTEGER NOT NULL DEFAULT 0,
  teams_chunked  INTEGER NOT NULL DEFAULT 0,
  teams_embedded INTEGER NOT NULL DEFAULT 0,

  -- Compilers (3)
  teams_compiler_total     INTEGER NOT NULL DEFAULT 0, -- insight_cards from teams_compiler
  task_extraction_total    INTEGER NOT NULL DEFAULT 0, -- tasks created from comms
  insight_extraction_total INTEGER NOT NULL DEFAULT 0, -- insight_cards (all sources)

  -- Project Intelligence packets
  project_intelligence_packets INTEGER NOT NULL DEFAULT 0,

  -- Diagnostics: per-source breakdowns, errors, freshness signals
  notes JSONB,

  CONSTRAINT rag_pipeline_snapshots_captured_at_unique UNIQUE (captured_at)
);

CREATE INDEX IF NOT EXISTS idx_rag_pipeline_snapshots_captured_at
  ON public.rag_pipeline_snapshots (captured_at DESC);

COMMENT ON TABLE public.rag_pipeline_snapshots IS
  'Point-in-time RAG pipeline snapshot. Written 3x/day by the alleato-rag-snapshot Render cron. Source of truth for the /rag dashboard. Never back-fill by hand.';

-- RLS: admin-only read. Service role bypasses RLS for the cron writer.
ALTER TABLE public.rag_pipeline_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rag_pipeline_snapshots_select_authenticated
  ON public.rag_pipeline_snapshots;
CREATE POLICY rag_pipeline_snapshots_select_authenticated
  ON public.rag_pipeline_snapshots
  FOR SELECT
  TO authenticated
  USING (true);
