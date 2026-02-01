-- Create table_metadata table to store metadata about database tables
-- This enables dynamic table directory listing

CREATE TABLE IF NOT EXISTS table_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    icon_name TEXT NOT NULL,
    is_visible BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Create index on table_name for fast lookups
CREATE INDEX IF NOT EXISTS idx_table_metadata_table_name ON table_metadata(table_name);

-- Create index on category for filtering
CREATE INDEX IF NOT EXISTS idx_table_metadata_category ON table_metadata(category);

-- Create index on is_visible for filtering active tables
CREATE INDEX IF NOT EXISTS idx_table_metadata_is_visible ON table_metadata(is_visible);

-- Create index on sort_order for ordering
CREATE INDEX IF NOT EXISTS idx_table_metadata_sort_order ON table_metadata(sort_order);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_table_metadata_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER table_metadata_updated_at
    BEFORE UPDATE ON table_metadata
    FOR EACH ROW
    EXECUTE FUNCTION update_table_metadata_updated_at();

-- Enable RLS
ALTER TABLE table_metadata ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow authenticated users to read, only admins can write
CREATE POLICY "table_metadata_select_policy" ON table_metadata
    FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "table_metadata_insert_policy" ON table_metadata
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "table_metadata_update_policy" ON table_metadata
    FOR UPDATE
    USING (auth.role() = 'authenticated');

CREATE POLICY "table_metadata_delete_policy" ON table_metadata
    FOR DELETE
    USING (auth.role() = 'authenticated');

-- Insert initial seed data for existing tables
INSERT INTO table_metadata (table_name, display_name, description, category, icon_name, sort_order) VALUES
-- Core Data Tables
('daily_logs', 'Daily Logs', 'Track daily activities, weather conditions, and workforce on site', 'Core Data', 'CalendarDays', 1),
('daily_reports', 'Daily Reports', 'Comprehensive daily construction reports with photos and notes', 'Core Data', 'FileText', 2),
('meeting_segments', 'Meeting Segments', 'Parsed and searchable meeting transcripts with timestamps', 'Core Data', 'MessageSquare', 3),
('notes', 'Notes', 'Project notes, observations, and important reminders', 'Core Data', 'FileText', 4),

-- Project Management Tables
('project_tasks', 'Tasks', 'Project tasks, assignments, and completion tracking', 'Project Management', 'ListTodo', 10),
('rfis', 'RFIs', 'Requests for Information and their responses', 'Project Management', 'ClipboardList', 11),
('punch_list', 'Punch List', 'Track punch list items and completion status', 'Project Management', 'FileCheck', 12),
('document_metadata', 'Meetings', 'Meeting records, attendees, and action items', 'Project Management', 'Calendar', 13),
('risks', 'Risks', 'Identified project risks and mitigation strategies', 'Project Management', 'AlertCircle', 14),

-- Financial Tables
('commitments_unified', 'Commitments', 'Purchase orders and subcontracts commitments', 'Financial', 'DollarSign', 20),

-- Directory Tables
('clients', 'Clients', 'Client information and contact details', 'Directory', 'Briefcase', 30),
('companies', 'Companies', 'Vendor, subcontractor, and partner companies', 'Directory', 'Building2', 31),
('people', 'Contacts', 'Individual contacts across all companies', 'Directory', 'Users', 32),
('employees', 'Employees', 'Company employees and team members', 'Directory', 'UserCheck', 33),
('users', 'Users', 'System users and their permissions', 'Directory', 'Users', 34),

-- AI Insights Tables
('ai_decisions', 'Decisions', 'AI-extracted decisions from meetings and documents', 'AI Insights', 'Brain', 40),
('ai_insights', 'Insights', 'AI-generated insights and recommendations', 'AI Insights', 'Lightbulb', 41),
('opportunities', 'Opportunities', 'Identified business opportunities and growth areas', 'AI Insights', 'TrendingUp', 42),
('issues', 'Issues', 'Tracked issues and their resolution status', 'AI Insights', 'AlertCircle', 43)
ON CONFLICT (table_name) DO NOTHING;
