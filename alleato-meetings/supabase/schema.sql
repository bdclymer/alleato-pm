-- Alleato Meetings — database schema (run once in your OWN Supabase project,
-- separate from alleato-pm). Supabase SQL editor → paste → run.

create extension if not exists "pgcrypto";

-- ── Meetings ─────────────────────────────────────────────────────────────────
create table if not exists public.meetings (
  id text primary key,                       -- deterministic: teamsmtg_<hash(meetingId)>
  teams_meeting_id text unique,              -- Graph onlineMeeting id
  title text not null default 'Teams Meeting',
  started_at timestamptz,
  duration_minutes int,
  organizer_email text,
  participants text[] default '{}',
  summary text,                              -- AI executive summary
  notes text,                                -- AI structured notes (markdown)
  keywords text[] default '{}',
  recording_storage_path text,               -- bucket-qualified MP4 path
  transcript_vtt_path text,                  -- stored raw VTT path
  metadata_resolved boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists meetings_started_at_idx on public.meetings (started_at desc);

-- ── Transcript segments (speaker turns) ──────────────────────────────────────
create table if not exists public.meeting_segments (
  id uuid primary key default gen_random_uuid(),
  meeting_id text not null references public.meetings(id) on delete cascade,
  idx int not null,
  timestamp_label text,                      -- MM:SS
  speaker text,
  text text not null
);
create index if not exists meeting_segments_meeting_idx on public.meeting_segments (meeting_id, idx);

-- ── Action items (the deliverable: who / what / when) ─────────────────────────
create table if not exists public.action_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id text not null references public.meetings(id) on delete cascade,
  title text not null,
  owner text,                                -- who is responsible (name or email)
  due_date date,                             -- when (parsed if stated)
  status text not null default 'open',       -- open | done
  created_at timestamptz not null default now()
);
create index if not exists action_items_meeting_idx on public.action_items (meeting_id);

-- ── Decisions / risks captured from the meeting ──────────────────────────────
create table if not exists public.meeting_insights (
  id uuid primary key default gen_random_uuid(),
  meeting_id text not null references public.meetings(id) on delete cascade,
  kind text not null,                        -- decision | risk
  text text not null
);
create index if not exists meeting_insights_meeting_idx on public.meeting_insights (meeting_id);

-- ── Sync watermark (incremental getAllTranscripts/getAllRecordings) ──────────
create table if not exists public.sync_state (
  source text primary key,                   -- 'transcripts' | 'recordings'
  watermark text,                            -- max createdDateTime processed
  last_run_at timestamptz,
  last_status text,
  last_error text
);

-- ── Private storage bucket for recordings ────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit)
values ('recordings', 'recordings', false, 5368709120)
on conflict (id) do nothing;

-- The app reads/writes these tables with the service role (server-side only),
-- which bypasses RLS. RLS is still enabled so nothing is exposed if you later
-- add anon/auth client access.
alter table public.meetings enable row level security;
alter table public.meeting_segments enable row level security;
alter table public.action_items enable row level security;
alter table public.meeting_insights enable row level security;
