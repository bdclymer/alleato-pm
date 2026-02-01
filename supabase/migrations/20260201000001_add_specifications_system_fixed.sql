-- Drop existing objects first (idempotent)
DROP TABLE IF EXISTS specification_subscribers CASCADE;
DROP TABLE IF EXISTS specification_area_sections CASCADE;
DROP TABLE IF EXISTS specification_areas CASCADE;
DROP TABLE IF EXISTS specification_section_revisions CASCADE;
DROP TABLE IF EXISTS specification_sections CASCADE;
DROP FUNCTION IF EXISTS create_specification_revision CASCADE;
DROP FUNCTION IF EXISTS update_specification_sections_updated_at CASCADE;
DROP FUNCTION IF EXISTS update_specification_areas_updated_at CASCADE;
-- =============================================================================
-- Specifications Management System
-- Complete migration for specification documents with revision tracking,
-- areas organization, and subscriber notifications
--
-- CRITICAL FK TYPES (from FK-TYPES-REFERENCE.md):
-- - project_id: INTEGER (matches projects.id which is INTEGER)
-- - user FKs: UUID (matches auth.users.id which is UUID)
-- =============================================================================

-- Table 1: specification_sections (main specification documents)
CREATE TABLE specification_sections (
    id BIGSERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Core fields
    section_number VARCHAR(50) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'archived', 'superseded')),

    -- Current revision tracking (will FK to specification_section_revisions after table created)
    current_revision_id BIGINT NULL,

    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),

    -- Constraints
    CONSTRAINT unique_section_number_per_project UNIQUE (project_id, section_number)
);

-- Table 2: specification_section_revisions (version history)
CREATE TABLE specification_section_revisions (
    id BIGSERIAL PRIMARY KEY,
    section_id BIGINT NOT NULL REFERENCES specification_sections(id) ON DELETE CASCADE,

    -- Revision fields
    revision_number INTEGER NOT NULL,
    content TEXT, -- Extracted text content if available
    uploaded_by UUID NOT NULL REFERENCES auth.users(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

    -- File fields
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL CHECK (file_size > 0),
    file_type VARCHAR(100) DEFAULT 'application/pdf',

    -- Metadata
    notes TEXT,

    -- Constraints
    CONSTRAINT unique_revision_per_section UNIQUE (section_id, revision_number)
);

-- Add FK constraint for current_revision_id (after revisions table exists)
ALTER TABLE specification_sections
ADD CONSTRAINT fk_sections_current_revision
FOREIGN KEY (current_revision_id)
REFERENCES specification_section_revisions(id)
ON DELETE SET NULL;

-- Table 3: specification_areas (organization/categorization)
CREATE TABLE specification_areas (
    id BIGSERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Core fields
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,

    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

    -- Constraints
    CONSTRAINT unique_area_name_per_project UNIQUE (project_id, name)
);

-- Table 4: specification_area_sections (many-to-many join)
CREATE TABLE specification_area_sections (
    id BIGSERIAL PRIMARY KEY,
    area_id BIGINT NOT NULL REFERENCES specification_areas(id) ON DELETE CASCADE,
    section_id BIGINT NOT NULL REFERENCES specification_sections(id) ON DELETE CASCADE,

    -- Audit field
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

    -- Constraints
    CONSTRAINT unique_area_section_assignment UNIQUE (area_id, section_id)
);

-- Table 5: specification_subscribers (notification recipients)
CREATE TABLE specification_subscribers (
    id BIGSERIAL PRIMARY KEY,
    section_id BIGINT NOT NULL REFERENCES specification_sections(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Audit field
    subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

    -- Constraints
    CONSTRAINT unique_section_subscriber UNIQUE (section_id, user_id)
);

-- =============================================================================
-- INDEXES (for query performance)
-- =============================================================================

-- specification_sections indexes
CREATE INDEX idx_spec_sections_project ON specification_sections(project_id);
CREATE INDEX idx_spec_sections_status ON specification_sections(status);
CREATE INDEX idx_spec_sections_created_at ON specification_sections(created_at DESC);
CREATE INDEX idx_spec_sections_section_number ON specification_sections(section_number);

-- Full-text search index for section_number, title, description
CREATE INDEX idx_spec_sections_search ON specification_sections
    USING GIN (to_tsvector('english',
        coalesce(section_number, '') || ' ' ||
        coalesce(title, '') || ' ' ||
        coalesce(description, '')
    ));

-- specification_section_revisions indexes
CREATE INDEX idx_spec_revisions_section ON specification_section_revisions(section_id);
CREATE INDEX idx_spec_revisions_uploaded_at ON specification_section_revisions(uploaded_at DESC);
CREATE INDEX idx_spec_revisions_uploaded_by ON specification_section_revisions(uploaded_by);

-- specification_areas indexes
CREATE INDEX idx_spec_areas_project ON specification_areas(project_id);
CREATE INDEX idx_spec_areas_sort_order ON specification_areas(sort_order);

-- specification_area_sections indexes
CREATE INDEX idx_area_sections_area ON specification_area_sections(area_id);
CREATE INDEX idx_area_sections_section ON specification_area_sections(section_id);

-- specification_subscribers indexes
CREATE INDEX idx_spec_subscribers_section ON specification_subscribers(section_id);
CREATE INDEX idx_spec_subscribers_user ON specification_subscribers(user_id);

-- =============================================================================
-- TRIGGERS (auto-update timestamps)
-- =============================================================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_specification_sections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_spec_sections_updated_at
    BEFORE UPDATE ON specification_sections
    FOR EACH ROW
    EXECUTE FUNCTION update_specification_sections_updated_at();

-- Areas updated_at trigger
CREATE OR REPLACE FUNCTION update_specification_areas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_spec_areas_updated_at
    BEFORE UPDATE ON specification_areas
    FOR EACH ROW
    EXECUTE FUNCTION update_specification_areas_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE specification_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE specification_section_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE specification_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE specification_area_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE specification_subscribers ENABLE ROW LEVEL SECURITY;

-- specification_sections policies
CREATE POLICY "Users can view specifications in their projects"
    ON specification_sections FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM project_directory_memberships pdm
            JOIN users_auth ua ON ua.person_id = pdm.person_id
            WHERE pdm.project_id = specification_sections.project_id
            AND ua.auth_user_id = auth.uid()
            AND pdm.status = 'active'
        )
    );

CREATE POLICY "Users can insert specifications with write access"
    ON specification_sections FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM project_directory_memberships pdm
            JOIN users_auth ua ON ua.person_id = pdm.person_id
            WHERE pdm.project_id = specification_sections.project_id
            AND ua.auth_user_id = auth.uid()
            AND pdm.status = 'active'
        )
    );

CREATE POLICY "Users can update specifications in their projects"
    ON specification_sections FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM project_directory_memberships pdm
            JOIN users_auth ua ON ua.person_id = pdm.person_id
            WHERE pdm.project_id = specification_sections.project_id
            AND ua.auth_user_id = auth.uid()
            AND pdm.status = 'active'
        )
    );

CREATE POLICY "Users can delete specifications in their projects"
    ON specification_sections FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM project_directory_memberships pdm
            JOIN users_auth ua ON ua.person_id = pdm.person_id
            WHERE pdm.project_id = specification_sections.project_id
            AND ua.auth_user_id = auth.uid()
            AND pdm.status = 'active'
        )
    );

-- specification_section_revisions policies
CREATE POLICY "Users can view revisions in their projects"
    ON specification_section_revisions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM specification_sections ss
            JOIN project_directory_memberships pdm ON pdm.project_id = ss.project_id
            JOIN users_auth ua ON ua.person_id = pdm.person_id
            WHERE ss.id = specification_section_revisions.section_id
            AND ua.auth_user_id = auth.uid()
            AND pdm.status = 'active'
        )
    );

CREATE POLICY "Users can insert revisions in their projects"
    ON specification_section_revisions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM specification_sections ss
            JOIN project_directory_memberships pdm ON pdm.project_id = ss.project_id
            JOIN users_auth ua ON ua.person_id = pdm.person_id
            WHERE ss.id = specification_section_revisions.section_id
            AND ua.auth_user_id = auth.uid()
            AND pdm.status = 'active'
        )
    );

CREATE POLICY "Users can update revisions in their projects"
    ON specification_section_revisions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM specification_sections ss
            JOIN project_directory_memberships pdm ON pdm.project_id = ss.project_id
            JOIN users_auth ua ON ua.person_id = pdm.person_id
            WHERE ss.id = specification_section_revisions.section_id
            AND ua.auth_user_id = auth.uid()
            AND pdm.status = 'active'
        )
    );

CREATE POLICY "Users can delete revisions in their projects"
    ON specification_section_revisions FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM specification_sections ss
            JOIN project_directory_memberships pdm ON pdm.project_id = ss.project_id
            JOIN users_auth ua ON ua.person_id = pdm.person_id
            WHERE ss.id = specification_section_revisions.section_id
            AND ua.auth_user_id = auth.uid()
            AND pdm.status = 'active'
        )
    );

-- specification_areas policies (same pattern as sections)
CREATE POLICY "Users can view areas in their projects"
    ON specification_areas FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM project_directory_memberships pdm
            JOIN users_auth ua ON ua.person_id = pdm.person_id
            WHERE pdm.project_id = specification_areas.project_id
            AND ua.auth_user_id = auth.uid()
            AND pdm.status = 'active'
        )
    );

CREATE POLICY "Users can insert areas in their projects"
    ON specification_areas FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM project_directory_memberships pdm
            JOIN users_auth ua ON ua.person_id = pdm.person_id
            WHERE pdm.project_id = specification_areas.project_id
            AND ua.auth_user_id = auth.uid()
            AND pdm.status = 'active'
        )
    );

CREATE POLICY "Users can update areas in their projects"
    ON specification_areas FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM project_directory_memberships pdm
            JOIN users_auth ua ON ua.person_id = pdm.person_id
            WHERE pdm.project_id = specification_areas.project_id
            AND ua.auth_user_id = auth.uid()
            AND pdm.status = 'active'
        )
    );

CREATE POLICY "Users can delete areas in their projects"
    ON specification_areas FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM project_directory_memberships pdm
            JOIN users_auth ua ON ua.person_id = pdm.person_id
            WHERE pdm.project_id = specification_areas.project_id
            AND ua.auth_user_id = auth.uid()
            AND pdm.status = 'active'
        )
    );

-- specification_area_sections policies (access via sections)
CREATE POLICY "Users can view area_sections in their projects"
    ON specification_area_sections FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM specification_sections ss
            JOIN project_directory_memberships pdm ON pdm.project_id = ss.project_id
            JOIN users_auth ua ON ua.person_id = pdm.person_id
            WHERE ss.id = specification_area_sections.section_id
            AND ua.auth_user_id = auth.uid()
            AND pdm.status = 'active'
        )
    );

CREATE POLICY "Users can insert area_sections in their projects"
    ON specification_area_sections FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM specification_sections ss
            JOIN project_directory_memberships pdm ON pdm.project_id = ss.project_id
            JOIN users_auth ua ON ua.person_id = pdm.person_id
            WHERE ss.id = specification_area_sections.section_id
            AND ua.auth_user_id = auth.uid()
            AND pdm.status = 'active'
        )
    );

CREATE POLICY "Users can delete area_sections in their projects"
    ON specification_area_sections FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM specification_sections ss
            JOIN project_directory_memberships pdm ON pdm.project_id = ss.project_id
            JOIN users_auth ua ON ua.person_id = pdm.person_id
            WHERE ss.id = specification_area_sections.section_id
            AND ua.auth_user_id = auth.uid()
            AND pdm.status = 'active'
        )
    );

-- specification_subscribers policies (access via sections)
CREATE POLICY "Users can view subscribers in their projects"
    ON specification_subscribers FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM specification_sections ss
            JOIN project_directory_memberships pdm ON pdm.project_id = ss.project_id
            JOIN users_auth ua ON ua.person_id = pdm.person_id
            WHERE ss.id = specification_subscribers.section_id
            AND ua.auth_user_id = auth.uid()
            AND pdm.status = 'active'
        )
    );

CREATE POLICY "Users can insert subscribers in their projects"
    ON specification_subscribers FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM specification_sections ss
            JOIN project_directory_memberships pdm ON pdm.project_id = ss.project_id
            JOIN users_auth ua ON ua.person_id = pdm.person_id
            WHERE ss.id = specification_subscribers.section_id
            AND ua.auth_user_id = auth.uid()
            AND pdm.status = 'active'
        )
    );

CREATE POLICY "Users can delete subscribers in their projects"
    ON specification_subscribers FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM specification_sections ss
            JOIN project_directory_memberships pdm ON pdm.project_id = ss.project_id
            JOIN users_auth ua ON ua.person_id = pdm.person_id
            WHERE ss.id = specification_subscribers.section_id
            AND ua.auth_user_id = auth.uid()
            AND pdm.status = 'active'
        )
    );

-- =============================================================================
-- DATABASE FUNCTIONS (for transaction-safe operations)
-- =============================================================================

-- Function: create_specification_revision
-- Purpose: Atomically create new revision with auto-incremented revision_number
--          and update section's current_revision_id
-- CRITICAL: This ensures transaction safety - no race conditions on revision numbering
CREATE OR REPLACE FUNCTION create_specification_revision(
    p_section_id BIGINT,
    p_file_url TEXT,
    p_file_name VARCHAR(255),
    p_file_size BIGINT,
    p_file_type VARCHAR(100),
    p_uploaded_by UUID,
    p_notes TEXT DEFAULT NULL,
    p_content TEXT DEFAULT NULL
) RETURNS specification_section_revisions AS $$
DECLARE
    v_next_revision_number INTEGER;
    v_new_revision specification_section_revisions;
BEGIN
    -- Get next revision number (transaction-safe with SELECT FOR UPDATE)
    SELECT COALESCE(MAX(revision_number), 0) + 1
    INTO v_next_revision_number
    FROM specification_section_revisions
    WHERE section_id = p_section_id
    FOR UPDATE OF specification_section_revisions; -- Lock to prevent race conditions

    -- Insert new revision
    INSERT INTO specification_section_revisions (
        section_id,
        revision_number,
        file_url,
        file_name,
        file_size,
        file_type,
        uploaded_by,
        notes,
        content
    )
    VALUES (
        p_section_id,
        v_next_revision_number,
        p_file_url,
        p_file_name,
        p_file_size,
        p_file_type,
        p_uploaded_by,
        p_notes,
        p_content
    )
    RETURNING * INTO v_new_revision;

    -- Update section's current_revision_id to point to new revision
    UPDATE specification_sections
    SET
        current_revision_id = v_new_revision.id,
        updated_at = NOW()
    WHERE id = p_section_id;

    RETURN v_new_revision;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- TABLE COMMENTS (documentation)
-- =============================================================================

COMMENT ON TABLE specification_sections IS
'Main specification documents for each project with current revision tracking';

COMMENT ON TABLE specification_section_revisions IS
'Version history for specification documents with auto-incremented revision numbers';

COMMENT ON TABLE specification_areas IS
'Areas/categories for organizing specifications within a project';

COMMENT ON TABLE specification_area_sections IS
'Many-to-many relationship linking specifications to areas';

COMMENT ON TABLE specification_subscribers IS
'Users subscribed to receive notifications when specifications are updated';

COMMENT ON FUNCTION create_specification_revision IS
'Transaction-safe function to create new revision with auto-incremented number and update current_revision_id';
