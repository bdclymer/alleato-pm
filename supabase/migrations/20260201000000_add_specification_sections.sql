-- =============================================================================
-- Specification Sections Table - Core table for managing specification documents
-- Follows FK-TYPES-REFERENCE.md: project_id is INTEGER (matches projects.id)
-- =============================================================================

-- Create specification_sections table
CREATE TABLE IF NOT EXISTS specification_sections (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign key to projects (MUST be INTEGER, not UUID!)
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Core fields from PRP schema
    section_number VARCHAR(50) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'superseded')),

    -- Current revision tracking
    current_revision_id UUID NULL, -- Will FK to specification_section_revisions after that table is created
    current_revision_number INTEGER DEFAULT 1,
    current_upload_date TIMESTAMPTZ NULL,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),

    -- Unique constraint: section_number must be unique within a project
    CONSTRAINT unique_section_number_per_project UNIQUE (project_id, section_number)
);

-- Indexes (always index foreign keys and frequently filtered columns)
CREATE INDEX IF NOT EXISTS idx_specification_sections_project_id ON specification_sections(project_id);
CREATE INDEX IF NOT EXISTS idx_specification_sections_status ON specification_sections(status);
CREATE INDEX IF NOT EXISTS idx_specification_sections_section_number ON specification_sections(section_number);
CREATE INDEX IF NOT EXISTS idx_specification_sections_created_at ON specification_sections(created_at DESC);

-- Full text search index for title and description
CREATE INDEX IF NOT EXISTS idx_specification_sections_search ON specification_sections
    USING GIN (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')));

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_specification_sections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_specification_sections_updated_at ON specification_sections;
CREATE TRIGGER trigger_specification_sections_updated_at
    BEFORE UPDATE ON specification_sections
    FOR EACH ROW
    EXECUTE FUNCTION update_specification_sections_updated_at();

-- Enable RLS
ALTER TABLE specification_sections ENABLE ROW LEVEL SECURITY;

-- RLS Policies - User must be member of the project
-- SELECT: User must be member of the project
CREATE POLICY "specification_sections_select_policy" ON specification_sections
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM project_directory_memberships pdm
            JOIN people p ON p.id = pdm.person_id
            WHERE pdm.project_id = specification_sections.project_id
            AND p.auth_user_id = auth.uid()
            AND pdm.status = 'active'
        )
    );

-- INSERT: User must be member of the project
CREATE POLICY "specification_sections_insert_policy" ON specification_sections
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM project_directory_memberships pdm
            JOIN people p ON p.id = pdm.person_id
            WHERE pdm.project_id = specification_sections.project_id
            AND p.auth_user_id = auth.uid()
            AND pdm.status = 'active'
        )
    );

-- UPDATE: User must be member of the project
CREATE POLICY "specification_sections_update_policy" ON specification_sections
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM project_directory_memberships pdm
            JOIN people p ON p.id = pdm.person_id
            WHERE pdm.project_id = specification_sections.project_id
            AND p.auth_user_id = auth.uid()
            AND pdm.status = 'active'
        )
    );

-- DELETE: User must be member of the project
CREATE POLICY "specification_sections_delete_policy" ON specification_sections
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM project_directory_memberships pdm
            JOIN people p ON p.id = pdm.person_id
            WHERE pdm.project_id = specification_sections.project_id
            AND p.auth_user_id = auth.uid()
            AND pdm.status = 'active'
        )
    );

-- Table comment
COMMENT ON TABLE specification_sections IS 'Specification section records for each project with revision tracking';
