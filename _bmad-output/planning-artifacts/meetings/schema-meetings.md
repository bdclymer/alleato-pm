---
title: SCHEMA Meetings
description: SCHEMA Meetings documentation
---

# Meetings Database Schema

## Database Tables Overview

The meetings system uses three primary tables with several supporting views and functions:

### Core Tables

1. **`document_metadata`** - Main meeting records storage
2. **`meeting_segments`** - Meeting transcripts and segments analysis
3. **`document_chunks`** - Detailed meeting content chunks for search
4. **`contacts`** - Meeting participants management

### Supporting Views

- **`document_metadata_manual_only`** - Manually created meetings view
- **`project_activity_view`** - Project meeting activity summary

### Analytics Functions

- **`get_meeting_analytics`** - Meeting statistics and insights
- **`get_meeting_frequency_stats`** - Meeting frequency analysis
- **`search_meeting_chunks`** - Meeting content search

## Table Definitions

### 1. document_metadata (Meeting Records)

```sql
CREATE TABLE public.document_metadata (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id bigint NOT NULL,
    title text NOT NULL,
    summary text,
    type text CHECK (type IN ('meeting', 'document', 'transcript')) DEFAULT 'meeting',
    status text CHECK (status IN ('pending', 'processing', 'complete', 'error')),
    access_level text CHECK (access_level IN ('public', 'private', 'restricted')) DEFAULT 'public',
    date timestamptz,
    duration_minutes integer,
    participants text, -- JSON array of participant names
    metadata jsonb DEFAULT '{}'::jsonb,
    file_path text,
    file_size bigint,
    upload_progress integer DEFAULT 0,
    pipeline_status text DEFAULT 'pending',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    -- Constraints
    CONSTRAINT valid_duration CHECK (duration_minutes > 0 AND duration_minutes <= 1440),
    CONSTRAINT valid_upload_progress CHECK (upload_progress >= 0 AND upload_progress <= 100)
);

-- Indexes for performance
CREATE INDEX idx_document_metadata_project_id ON document_metadata(project_id);
CREATE INDEX idx_document_metadata_type ON document_metadata(type);
CREATE INDEX idx_document_metadata_date ON document_metadata(date DESC);
CREATE INDEX idx_document_metadata_status ON document_metadata(status);
CREATE INDEX idx_document_metadata_project_type ON document_metadata(project_id, type);

-- RLS Policies
ALTER TABLE document_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view meetings for projects they have access to"
ON document_metadata FOR SELECT
USING (
    project_id IN (
        SELECT p.id FROM projects p
        JOIN project_users pu ON p.id = pu.project_id
        WHERE pu.user_id = auth.uid()
    )
);

CREATE POLICY "Users can create meetings for projects they have access to"
ON document_metadata FOR INSERT
WITH CHECK (
    project_id IN (
        SELECT p.id FROM projects p
        JOIN project_users pu ON p.id = pu.project_id
        WHERE pu.user_id = auth.uid()
        AND pu.role IN ('owner', 'admin', 'editor')
    )
);

CREATE POLICY "Users can update meetings for projects they have access to"
ON document_metadata FOR UPDATE
USING (
    project_id IN (
        SELECT p.id FROM projects p
        JOIN project_users pu ON p.id = pu.project_id
        WHERE pu.user_id = auth.uid()
        AND pu.role IN ('owner', 'admin', 'editor')
    )
);
```sql
### 2. meeting_segments (Meeting Analysis)

```sql
CREATE TABLE public.meeting_segments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    metadata_id uuid NOT NULL REFERENCES document_metadata(id) ON DELETE CASCADE,
    title text NOT NULL,
    content text NOT NULL,
    segment_type text DEFAULT 'discussion' CHECK (segment_type IN ('discussion', 'decision', 'action_item', 'summary', 'presentation')),
    decisions jsonb DEFAULT '[]'::jsonb,
    action_items jsonb DEFAULT '[]'::jsonb,
    participants jsonb DEFAULT '[]'::jsonb,
    start_time integer, -- seconds from meeting start
    end_time integer,   -- seconds from meeting start
    speaker_info jsonb,
    confidence_score numeric(3,2) DEFAULT 0.0 CHECK (confidence_score >= 0 AND confidence_score <= 1),
    embedding vector(1536), -- For semantic search
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    -- Constraints
    CONSTRAINT valid_time_range CHECK (end_time > start_time),
    CONSTRAINT valid_confidence CHECK (confidence_score >= 0 AND confidence_score <= 1)
);

-- Indexes
CREATE INDEX idx_meeting_segments_metadata_id ON meeting_segments(metadata_id);
CREATE INDEX idx_meeting_segments_type ON meeting_segments(segment_type);
CREATE INDEX idx_meeting_segments_time ON meeting_segments(start_time);
CREATE INDEX idx_meeting_segments_embedding ON meeting_segments USING ivfflat (embedding vector_cosine_ops);

-- RLS Policies
ALTER TABLE meeting_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view meeting segments for accessible meetings"
ON meeting_segments FOR SELECT
USING (
    metadata_id IN (
        SELECT dm.id FROM document_metadata dm
        JOIN projects p ON dm.project_id = p.id
        JOIN project_users pu ON p.id = pu.project_id
        WHERE pu.user_id = auth.uid()
    )
);
```sql
### 3. document_chunks (Detailed Meeting Content)

```sql
CREATE TABLE public.document_chunks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    metadata_id uuid NOT NULL REFERENCES document_metadata(id) ON DELETE CASCADE,
    chunk_index integer NOT NULL,
    content text NOT NULL,
    chunk_type text DEFAULT 'transcript' CHECK (chunk_type IN ('transcript', 'summary', 'notes', 'agenda')),
    start_timestamp integer, -- For transcript chunks
    end_timestamp integer,
    speaker_info jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    embedding vector(1536),
    created_at timestamptz DEFAULT now(),

    -- Constraints
    UNIQUE(metadata_id, chunk_index),
    CONSTRAINT valid_timestamp_range CHECK (end_timestamp > start_timestamp)
);

-- Indexes
CREATE INDEX idx_document_chunks_metadata_id ON document_chunks(metadata_id);
CREATE INDEX idx_document_chunks_type ON document_chunks(chunk_type);
CREATE INDEX idx_document_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops);

-- RLS Policies
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view meeting chunks for accessible meetings"
ON document_chunks FOR SELECT
USING (
    metadata_id IN (
        SELECT dm.id FROM document_metadata dm
        JOIN projects p ON dm.project_id = p.id
        JOIN project_users pu ON p.id = pu.project_id
        WHERE pu.user_id = auth.uid()
    )
);
```sql
### 4. contacts (Meeting Participants)

```sql
-- Contacts table for participant management
CREATE TABLE public.contacts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id bigint NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    company text,
    role text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    -- Constraints
    CONSTRAINT valid_email CHECK (email ~ '^[^@]+@[^@]+\.[^@]+$'),
    UNIQUE(project_id, email)
);

-- Indexes
CREATE INDEX idx_contacts_project_id ON contacts(project_id);
CREATE INDEX idx_contacts_email ON contacts(email);

-- RLS Policies
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view contacts for accessible projects"
ON contacts FOR SELECT
USING (
    project_id IN (
        SELECT p.id FROM projects p
        JOIN project_users pu ON p.id = pu.project_id
        WHERE pu.user_id = auth.uid()
    )
);
```

## Data Migration Scripts

### Migration from Legacy Structure

```sql
-- Migrate existing meetings data if needed
DO $$
BEGIN
    -- Ensure all meetings have proper type set
    UPDATE document_metadata
    SET type = 'meeting'
    WHERE type IS NULL
    AND (
        title ILIKE '%meeting%' OR
        metadata->>'source' = 'meeting' OR
        participants IS NOT NULL
    );

    -- Set default access level for existing meetings
    UPDATE document_metadata
    SET access_level = 'public'
    WHERE access_level IS NULL AND type = 'meeting';

    -- Set default status for meetings
    UPDATE document_metadata
    SET status = 'complete'
    WHERE status IS NULL AND type = 'meeting';

    RAISE NOTICE 'Migration completed successfully';
END
$$;
```sql
### Participant Contact Migration

```sql
-- Function to migrate meeting participants to contacts table
CREATE OR REPLACE FUNCTION backfill_meeting_participants_to_contacts()
RETURNS TABLE(total_contacts_added integer)
LANGUAGE plpgsql
AS $$
DECLARE
    meeting_record record;
    participant_name text;
    contact_count integer := 0;
BEGIN
    -- Loop through all meetings with participants
    FOR meeting_record IN
        SELECT id, project_id, participants
        FROM document_metadata
        WHERE type = 'meeting'
        AND participants IS NOT NULL
        AND participants != ''
    LOOP
        -- Split participants and create contact records
        FOR participant_name IN
            SELECT unnest(string_to_array(meeting_record.participants, ','))
        LOOP
            -- Clean up the name
            participant_name := trim(participant_name);

            -- Insert contact if not exists
            INSERT INTO contacts (project_id, name)
            VALUES (meeting_record.project_id, participant_name)
            ON CONFLICT (project_id, email) DO NOTHING;

            contact_count := contact_count + 1;
        END LOOP;
    END LOOP;

    RETURN QUERY SELECT contact_count;
END;
$$;
```sql
## Views and Helper Functions

### Meeting Analytics View

```sql
CREATE OR REPLACE VIEW meeting_analytics_view AS
SELECT
    dm.project_id,
    COUNT(*) as total_meetings,
    COUNT(*) FILTER (WHERE dm.date >= CURRENT_DATE - INTERVAL '30 days') as meetings_this_month,
    COUNT(*) FILTER (WHERE dm.date >= CURRENT_DATE - INTERVAL '7 days') as meetings_this_week,
    AVG(dm.duration_minutes) as avg_duration_minutes,
    COUNT(DISTINCT dm.participants) as unique_participants,
    MAX(dm.date) as last_meeting_date
FROM document_metadata dm
WHERE dm.type = 'meeting'
GROUP BY dm.project_id;
```sql
### Meeting Search Functions

```sql
-- Full text search for meetings
CREATE OR REPLACE FUNCTION search_meetings(search_query text, project_filter bigint DEFAULT NULL)
RETURNS TABLE (
    id uuid,
    title text,
    summary text,
    date timestamptz,
    participants text,
    rank_score real
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dm.id,
        dm.title,
        dm.summary,
        dm.date,
        dm.participants,
        ts_rank(
            to_tsvector('english', coalesce(dm.title, '') || ' ' || coalesce(dm.summary, '')),
            plainto_tsquery('english', search_query)
        ) as rank_score
    FROM document_metadata dm
    WHERE dm.type = 'meeting'
    AND (project_filter IS NULL OR dm.project_id = project_filter)
    AND (
        to_tsvector('english', coalesce(dm.title, '') || ' ' || coalesce(dm.summary, ''))
        @@ plainto_tsquery('english', search_query)
    )
    ORDER BY rank_score DESC, dm.date DESC;
END;
$$;

-- Semantic search for meeting content
CREATE OR REPLACE FUNCTION search_meeting_content_semantic(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 10,
    project_filter bigint DEFAULT NULL
)
RETURNS TABLE (
    meeting_id uuid,
    meeting_title text,
    meeting_date timestamptz,
    content text,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dm.id,
        dm.title,
        dm.date,
        ms.content,
        (ms.embedding <=> query_embedding) * -1 + 1 as similarity
    FROM meeting_segments ms
    JOIN document_metadata dm ON ms.metadata_id = dm.id
    WHERE dm.type = 'meeting'
    AND (project_filter IS NULL OR dm.project_id = project_filter)
    AND ms.embedding IS NOT NULL
    AND (ms.embedding <=> query_embedding) < (1 - match_threshold)
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$;
```

## Performance Considerations

### Indexing Strategy

- **Project-based queries**: Primary indexes on `project_id`
- **Date-based filtering**: Indexes on `date` for chronological queries
- **Search optimization**: Full-text indexes on title and summary
- **Vector search**: IVFFLAT indexes for embedding similarity

### Query Optimization

- Use materialized views for complex analytics queries
- Implement proper pagination for meeting lists
- Cache frequently accessed meeting statistics
- Use partial indexes for status-based queries

### Storage Optimization

- Compress large transcript content in `document_chunks`
- Archive old meetings based on project retention policies
- Use appropriate data types for timestamps and durations
- Implement proper cleanup procedures for deleted meetings

This schema provides a robust foundation for the meetings feature while maintaining excellent performance and data integrity.
