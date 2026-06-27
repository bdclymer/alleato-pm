-- Teams meeting transcripts + recordings (native Microsoft Graph ingestion).
-- Adds catalog columns to document_metadata so Teams-sourced meetings are
-- distinguishable from Fireflies and can carry a stored recording, plus a
-- private storage bucket for the MP4 recordings.
--
-- See: backend/src/services/integrations/microsoft_graph/meeting_transcripts.py
--      docs/architecture/AI-RAG-ARCHITECTURE.md (teams_graph meeting source)

ALTER TABLE public.document_metadata
  ADD COLUMN IF NOT EXISTS teams_meeting_id text,
  ADD COLUMN IF NOT EXISTS recording_storage_path text,
  ADD COLUMN IF NOT EXISTS recording_url text,
  ADD COLUMN IF NOT EXISTS transcript_source text;

COMMENT ON COLUMN public.document_metadata.teams_meeting_id IS
  'Microsoft Graph onlineMeeting id for meetings ingested via native Teams transcription (source=teams_graph).';
COMMENT ON COLUMN public.document_metadata.transcript_source IS
  'Origin of the transcript: fireflies | teams_graph.';
COMMENT ON COLUMN public.document_metadata.recording_storage_path IS
  'Bucket-qualified path to the stored MP4 recording (e.g. meeting-recordings/teams-meetings/<id>/recording.mp4).';

CREATE INDEX IF NOT EXISTS document_metadata_teams_meeting_id_idx
  ON public.document_metadata (teams_meeting_id)
  WHERE teams_meeting_id IS NOT NULL;

-- ─── Private storage bucket for Teams meeting recordings ──────────────────────
-- Recordings can contain sensitive content, so the bucket is NOT public; the app
-- generates short-lived signed URLs server-side when rendering the meeting page.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('meeting-recordings', 'meeting-recordings', false, 5368709120)  -- 5GB
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated can read meeting recordings" ON storage.objects;
CREATE POLICY "Authenticated can read meeting recordings"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'meeting-recordings');
