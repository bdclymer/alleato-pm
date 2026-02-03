-- Add drawings management system tables
-- This migration creates all tables needed for drawing management including hierarchical areas,
-- drawing sets, drawings, revisions, sketches, downloads, and related items tracking

-- Drawing areas/folders for hierarchical organization
CREATE TABLE drawing_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    parent_area_id UUID NULL REFERENCES drawing_areas(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    
    CONSTRAINT unique_drawing_area_name_per_project UNIQUE(project_id, parent_area_id, name)
);

-- Drawing sets for grouping revisions
CREATE TABLE drawing_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    issued_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    description TEXT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    
    CONSTRAINT unique_set_name_per_project UNIQUE(project_id, name)
);

-- Main drawings table
CREATE TABLE drawings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    area_id UUID NULL REFERENCES drawing_areas(id) ON DELETE SET NULL,
    drawing_number VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    discipline VARCHAR(50) NULL,
    drawing_type VARCHAR(50) NULL,
    current_revision_id UUID NULL, -- Will be populated after drawing_revisions table
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    
    CONSTRAINT unique_drawing_number_per_project UNIQUE(project_id, drawing_number)
);

-- Drawing revisions for version control
CREATE TABLE drawing_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drawing_id UUID NOT NULL REFERENCES drawings(id) ON DELETE CASCADE,
    revision_number VARCHAR(10) NOT NULL DEFAULT 'A',
    drawing_set_id UUID NULL REFERENCES drawing_sets(id) ON DELETE SET NULL,
    drawing_date DATE NULL,
    received_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'under_review' CHECK (status IN ('draft', 'under_review', 'approved', 'superseded', 'void')),
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    is_current_revision BOOLEAN NOT NULL DEFAULT false,
    description TEXT NULL,
    uploaded_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    
    CONSTRAINT unique_revision_per_drawing UNIQUE(drawing_id, revision_number),
    CONSTRAINT positive_file_size CHECK (file_size > 0)
);

-- Add foreign key constraint for current_revision_id
ALTER TABLE drawings 
ADD CONSTRAINT fk_drawings_current_revision 
FOREIGN KEY (current_revision_id) REFERENCES drawing_revisions(id) ON DELETE SET NULL;

-- Drawing sketches (markups/annotations on revisions)
CREATE TABLE drawing_sketches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drawing_revision_id UUID NOT NULL REFERENCES drawing_revisions(id) ON DELETE CASCADE,
    sketch_number VARCHAR(10) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    sketch_date DATE NOT NULL DEFAULT CURRENT_DATE,
    file_url TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    
    CONSTRAINT unique_sketch_number_per_revision UNIQUE(drawing_revision_id, sketch_number)
);

-- Download tracking for audit trail
CREATE TABLE drawing_downloads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drawing_revision_id UUID NOT NULL REFERENCES drawing_revisions(id) ON DELETE CASCADE,
    downloaded_by UUID NOT NULL REFERENCES auth.users(id),
    downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    ip_address INET NULL,
    user_agent TEXT NULL
);

-- Related items linking drawings to other project entities
CREATE TABLE drawing_related_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drawing_id UUID NOT NULL REFERENCES drawings(id) ON DELETE CASCADE,
    related_type VARCHAR(50) NOT NULL, -- 'rfi', 'submittal', 'change_order', etc.
    related_id UUID NOT NULL, -- ID of the related item
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    
    CONSTRAINT unique_drawing_relation UNIQUE(drawing_id, related_type, related_id)
);

-- Indexes for performance
CREATE INDEX idx_drawing_areas_project_id ON drawing_areas(project_id);
CREATE INDEX idx_drawing_areas_parent_id ON drawing_areas(parent_area_id);
CREATE INDEX idx_drawing_areas_sort_order ON drawing_areas(sort_order);

CREATE INDEX idx_drawing_sets_project_id ON drawing_sets(project_id);
CREATE INDEX idx_drawing_sets_status ON drawing_sets(status);

CREATE INDEX idx_drawings_project_id ON drawings(project_id);
CREATE INDEX idx_drawings_area_id ON drawings(area_id);
CREATE INDEX idx_drawings_number ON drawings(drawing_number);
CREATE INDEX idx_drawings_discipline ON drawings(discipline);
CREATE INDEX idx_drawings_type ON drawings(drawing_type);

CREATE INDEX idx_drawing_revisions_drawing_id ON drawing_revisions(drawing_id);
CREATE INDEX idx_drawing_revisions_status ON drawing_revisions(status);
CREATE INDEX idx_drawing_revisions_current ON drawing_revisions(is_current_revision);
CREATE INDEX idx_drawing_revisions_received_date ON drawing_revisions(received_date);

CREATE INDEX idx_drawing_sketches_revision_id ON drawing_sketches(drawing_revision_id);

CREATE INDEX idx_drawing_downloads_revision_id ON drawing_downloads(drawing_revision_id);
CREATE INDEX idx_drawing_downloads_user ON drawing_downloads(downloaded_by);
CREATE INDEX idx_drawing_downloads_date ON drawing_downloads(downloaded_at);

CREATE INDEX idx_drawing_related_items_drawing_id ON drawing_related_items(drawing_id);
CREATE INDEX idx_drawing_related_items_type ON drawing_related_items(related_type);
CREATE INDEX idx_drawing_related_items_related_id ON drawing_related_items(related_id);

-- Update triggers for updated_at timestamps
CREATE TRIGGER update_drawing_areas_updated_at
    BEFORE UPDATE ON drawing_areas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drawing_sets_updated_at
    BEFORE UPDATE ON drawing_sets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drawings_updated_at
    BEFORE UPDATE ON drawings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to ensure only one current revision per drawing
CREATE OR REPLACE FUNCTION ensure_single_current_revision()
RETURNS TRIGGER AS $$
BEGIN
    -- If setting this revision as current, unset all others for this drawing
    IF NEW.is_current_revision = true THEN
        UPDATE drawing_revisions 
        SET is_current_revision = false 
        WHERE drawing_id = NEW.drawing_id 
        AND id != NEW.id;
        
        -- Update the drawing's current_revision_id
        UPDATE drawings 
        SET current_revision_id = NEW.id 
        WHERE id = NEW.drawing_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_single_current_revision
    AFTER INSERT OR UPDATE ON drawing_revisions
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_current_revision();

-- RLS Policies for security

-- Drawing areas - users can see areas for projects they have access to
ALTER TABLE drawing_areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view drawing areas for accessible projects" ON drawing_areas
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM project_directory_memberships pdm
            JOIN users_auth ua ON ua.person_id = pdm.person_id
            WHERE pdm.project_id = drawing_areas.project_id
            AND ua.auth_user_id = auth.uid()
            AND pdm.status = 'active'
        )
    );

CREATE POLICY "Users can create drawing areas in accessible projects" ON drawing_areas
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM project_directory_memberships pdm
            JOIN users_auth ua ON ua.person_id = pdm.person_id
            WHERE pdm.project_id = drawing_areas.project_id
            AND ua.auth_user_id = auth.uid()
            AND pdm.status = 'active'
        )
    );

CREATE POLICY "Users can update drawing areas in accessible projects" ON drawing_areas
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM project_directory_memberships pdm
            JOIN users_auth ua ON ua.person_id = pdm.person_id
            WHERE pdm.project_id = drawing_areas.project_id
            AND ua.auth_user_id = auth.uid()
            AND pdm.status = 'active'
        )
    );

CREATE POLICY "Users can delete drawing areas in accessible projects" ON drawing_areas
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM project_directory_memberships pdm
            JOIN users_auth ua ON ua.person_id = pdm.person_id
            WHERE pdm.project_id = drawing_areas.project_id
            AND ua.auth_user_id = auth.uid()
            AND pdm.status = 'active'
        )
    );

-- Drawing sets
ALTER TABLE drawing_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view drawing sets for accessible projects" ON drawing_sets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM project_directory_memberships pdm
            JOIN users_auth ua ON ua.person_id = pdm.person_id
            WHERE pdm.project_id = drawing_sets.project_id
            AND ua.auth_user_id = auth.uid()
            AND pdm.status = 'active'
        )
    );

CREATE POLICY "Users can manage drawing sets in accessible projects" ON drawing_sets
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM project_directory_memberships pdm
            JOIN users_auth ua ON ua.person_id = pdm.person_id
            WHERE pdm.project_id = drawing_sets.project_id
            AND ua.auth_user_id = auth.uid()
            AND pdm.status = 'active'
        )
    );

-- Drawings
ALTER TABLE drawings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view drawings for accessible projects" ON drawings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM project_directory_memberships pdm
            JOIN users_auth ua ON ua.person_id = pdm.person_id
            WHERE pdm.project_id = drawings.project_id
            AND ua.auth_user_id = auth.uid()
            AND pdm.status = 'active'
        )
    );

CREATE POLICY "Users can manage drawings in accessible projects" ON drawings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM project_directory_memberships pdm
            JOIN users_auth ua ON ua.person_id = pdm.person_id
            WHERE pdm.project_id = drawings.project_id
            AND ua.auth_user_id = auth.uid()
            AND pdm.status = 'active'
        )
    );

-- Drawing revisions
ALTER TABLE drawing_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view drawing revisions for accessible projects" ON drawing_revisions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM drawings d
            JOIN project_directory_memberships pdm ON pdm.project_id = d.project_id
            JOIN users_auth ua ON ua.person_id = pdm.person_id
            WHERE d.id = drawing_revisions.drawing_id
            AND ua.auth_user_id = auth.uid()
            AND pdm.status = 'active'
        )
    );

CREATE POLICY "Users can manage drawing revisions in accessible projects" ON drawing_revisions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM drawings d
            JOIN project_directory_memberships pdm ON pdm.project_id = d.project_id
            JOIN users_auth ua ON ua.person_id = pdm.person_id
            WHERE d.id = drawing_revisions.drawing_id
            AND ua.auth_user_id = auth.uid()
            AND pdm.status = 'active'
        )
    );

-- Drawing sketches
ALTER TABLE drawing_sketches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view drawing sketches for accessible projects" ON drawing_sketches
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM drawing_revisions dr
            JOIN drawings d ON d.id = dr.drawing_id
            JOIN project_directory_memberships pdm ON pdm.project_id = d.project_id
            JOIN users_auth ua ON ua.person_id = pdm.person_id
            WHERE dr.id = drawing_sketches.drawing_revision_id
            AND ua.auth_user_id = auth.uid()
            AND pdm.status = 'active'
        )
    );

CREATE POLICY "Users can manage drawing sketches in accessible projects" ON drawing_sketches
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM drawing_revisions dr
            JOIN drawings d ON d.id = dr.drawing_id
            JOIN project_directory_memberships pdm ON pdm.project_id = d.project_id
            JOIN users_auth ua ON ua.person_id = pdm.person_id
            WHERE dr.id = drawing_sketches.drawing_revision_id
            AND ua.auth_user_id = auth.uid()
            AND pdm.status = 'active'
        )
    );

-- Drawing downloads (audit only - users can only insert their own downloads)
ALTER TABLE drawing_downloads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own drawing downloads" ON drawing_downloads
    FOR SELECT USING (downloaded_by = auth.uid());

CREATE POLICY "Users can record their own drawing downloads" ON drawing_downloads
    FOR INSERT WITH CHECK (downloaded_by = auth.uid());

-- Drawing related items
ALTER TABLE drawing_related_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view drawing related items for accessible projects" ON drawing_related_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM drawings d
            JOIN project_directory_memberships pdm ON pdm.project_id = d.project_id
            JOIN users_auth ua ON ua.person_id = pdm.person_id
            WHERE d.id = drawing_related_items.drawing_id
            AND ua.auth_user_id = auth.uid()
            AND pdm.status = 'active'
        )
    );

CREATE POLICY "Users can manage drawing related items in accessible projects" ON drawing_related_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM drawings d
            JOIN project_directory_memberships pdm ON pdm.project_id = d.project_id
            JOIN users_auth ua ON ua.person_id = pdm.person_id
            WHERE d.id = drawing_related_items.drawing_id
            AND ua.auth_user_id = auth.uid()
            AND pdm.status = 'active'
        )
    );

-- Create views for common queries

-- View for drawings with current revision info
CREATE VIEW drawing_log AS
SELECT 
    d.id,
    d.project_id,
    d.area_id,
    d.drawing_number,
    d.title,
    d.discipline,
    d.drawing_type,
    d.created_at as drawing_created_at,
    d.updated_at as drawing_updated_at,
    dr.id as revision_id,
    dr.revision_number,
    dr.drawing_date,
    dr.received_date,
    dr.status,
    dr.file_url,
    dr.file_name,
    dr.file_size,
    dr.file_type,
    dr.description as revision_description,
    dr.uploaded_by,
    dr.created_at as revision_created_at,
    da.name as area_name,
    ds.name as set_name,
    u.email as uploaded_by_email
FROM drawings d
LEFT JOIN drawing_revisions dr ON dr.id = d.current_revision_id
LEFT JOIN drawing_areas da ON da.id = d.area_id
LEFT JOIN drawing_sets ds ON ds.id = dr.drawing_set_id
LEFT JOIN auth.users u ON u.id = dr.uploaded_by;

-- View for hierarchical drawing areas with counts
CREATE VIEW drawing_areas_with_counts AS
WITH RECURSIVE area_hierarchy AS (
    -- Base case: root areas
    SELECT 
        id,
        parent_area_id,
        name,
        description,
        sort_order,
        project_id,
        0 as depth,
        ARRAY[id] as path
    FROM drawing_areas 
    WHERE parent_area_id IS NULL
    
    UNION ALL
    
    -- Recursive case: child areas
    SELECT 
        da.id,
        da.parent_area_id,
        da.name,
        da.description,
        da.sort_order,
        da.project_id,
        ah.depth + 1,
        ah.path || da.id
    FROM drawing_areas da
    JOIN area_hierarchy ah ON da.parent_area_id = ah.id
)
SELECT 
    ah.*,
    COALESCE(drawing_counts.count, 0) as drawing_count
FROM area_hierarchy ah
LEFT JOIN (
    SELECT 
        area_id,
        COUNT(*) as count
    FROM drawings
    GROUP BY area_id
) drawing_counts ON drawing_counts.area_id = ah.id
ORDER BY ah.project_id, ah.sort_order;

-- Grant permissions to authenticated users
GRANT SELECT ON drawing_log TO authenticated;
GRANT SELECT ON drawing_areas_with_counts TO authenticated;

-- Comments for documentation
COMMENT ON TABLE drawing_areas IS 'Hierarchical folder structure for organizing drawings';
COMMENT ON TABLE drawing_sets IS 'Collections of drawing revisions issued together';
COMMENT ON TABLE drawings IS 'Master drawing register with basic metadata';
COMMENT ON TABLE drawing_revisions IS 'Version control for drawing files with full audit trail';
COMMENT ON TABLE drawing_sketches IS 'Markup and annotation files associated with revisions';
COMMENT ON TABLE drawing_downloads IS 'Audit trail for who downloaded which drawing files';
COMMENT ON TABLE drawing_related_items IS 'Links between drawings and other project items (RFIs, etc.)';

COMMENT ON VIEW drawing_log IS 'Combined view of drawings with their current revision details for table displays';
COMMENT ON VIEW drawing_areas_with_counts IS 'Hierarchical view of drawing areas with drawing counts for tree navigation';
