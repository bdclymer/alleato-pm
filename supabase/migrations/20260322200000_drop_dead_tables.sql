-- Drop confirmed dead tables from the database
--
-- Audit verified these tables have ZERO code references AND zero or negligible data.
-- They are leftover from AI SDK templates, abandoned chat thread prototypes,
-- or superseded by newer tables (e.g. document_chunks, insights, conversations, chat_history).
--
-- Tables dropped (with row counts at time of audit):
--   chats (3 rows)              — AI SDK template leftover, single varchar id column
--   parts (7 rows)              — AI SDK demo template with data_weather_* columns
--   chunks (0 rows)             — old chunking table, replaced by document_chunks
--   chat_threads (8 rows)       — never integrated
--   chat_thread_items (6 rows)  — never integrated
--   chat_thread_attachments (0) — never integrated
--   chat_thread_attachment_files (0) — never integrated
--   chat_thread_feedback (0)    — never integrated
--   document_insights (0 rows)  — replaced by insights table
--   fm_text_chunks              — KEPT (user requested preservation)
--   actionable_insights (0)     — likely a view, never used
--   rag_pipeline_state (1 row)  — replaced by fireflies_ingestion_jobs
--   chat_sessions (0 rows)      — never used; active chat uses conversations table
--   chat_messages (0 rows)      — never used; active chat uses chat_history table

-- ============================================================
-- 1. Drop child tables first (chat_thread_* children before chat_threads)
-- ============================================================

DROP TABLE IF EXISTS chat_thread_attachment_files CASCADE;
DROP TABLE IF EXISTS chat_thread_attachments CASCADE;
DROP TABLE IF EXISTS chat_thread_feedback CASCADE;
DROP TABLE IF EXISTS chat_thread_items CASCADE;
DROP TABLE IF EXISTS chat_threads CASCADE;

-- ============================================================
-- 2. Drop chat_messages before chat_sessions (potential FK)
-- ============================================================

DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_sessions CASCADE;

-- ============================================================
-- 3. Drop remaining standalone dead tables
-- ============================================================

DROP TABLE IF EXISTS chats CASCADE;
DROP TABLE IF EXISTS parts CASCADE;
DROP TABLE IF EXISTS chunks CASCADE;
DROP TABLE IF EXISTS document_insights CASCADE;
-- fm_text_chunks kept per user request
DROP TABLE IF EXISTS rag_pipeline_state CASCADE;

-- ============================================================
-- 4. actionable_insights — may be a VIEW or TABLE, handle both
-- ============================================================

DROP VIEW IF EXISTS actionable_insights;
DROP TABLE IF EXISTS actionable_insights CASCADE;
