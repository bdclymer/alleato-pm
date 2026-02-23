-- DRAWINGS DOMAIN SCHEMA
-- Auto-generated from Procore crawl data for module: drawings
-- Review and adjust types/constraints before applying as a migration

CREATE TABLE app_drawings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id integer NOT NULL REFERENCES projects(id),
  discipline text, -- Discipline
  drawing_date date, -- Drawing Date
  drawing_no text, -- Drawing No.
  drawing_title text, -- Drawing Title
  received_date date, -- Received Date
  revision text, -- Revision
  set text, -- Set
  status text, -- Status
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index on project_id for RLS and queries
CREATE INDEX idx_app_drawings_project ON app_drawings(project_id);

-- Enable RLS
ALTER TABLE app_drawings ENABLE ROW LEVEL SECURITY;

-- RLS policy: users can access rows for projects they belong to
CREATE POLICY "app_drawings_project_access" ON app_drawings
  FOR ALL
  USING (
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

-- updated_at trigger
CREATE TRIGGER set_app_drawings_updated_at
  BEFORE UPDATE ON app_drawings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
