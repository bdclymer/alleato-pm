-- Drawing Annotations (freehand / shape / text markup)
-- Persists the drawn markup created in the drawing viewer's annotation layer
-- (pen, highlighter, rectangle, cloud, arrow, text). Before this table, markup
-- lived only in React state and was destroyed on every reload/navigation.
--
-- Geometry is stored in the viewer's image-pixel space inside `data` (the same
-- coordinate space the overlay draws in); the PDF is rendered to a stable
-- longest-side target so those coordinates reload consistently for a drawing.
--
-- `is_published` mirrors Procore's personal vs published markup layers: markup
-- is private to its author until published, after which the whole project can
-- see it.

CREATE TABLE drawing_annotations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  drawing_id uuid NOT NULL REFERENCES drawings(id) ON DELETE CASCADE,
  project_id integer NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  page integer NOT NULL DEFAULT 1,

  -- One of: 'pen' | 'highlighter' | 'rectangle' | 'cloud' | 'arrow' | 'text'
  annotation_type text NOT NULL,

  -- Full shape payload: color, strokeWidth, and geometry
  -- (points[] | start/end | position + text) in image-pixel space.
  data jsonb NOT NULL,

  -- Personal (author-only) until published to the project.
  is_published boolean NOT NULL DEFAULT false,

  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT drawing_annotations_type_check
    CHECK (annotation_type IN ('pen', 'highlighter', 'rectangle', 'cloud', 'arrow', 'text'))
);

CREATE INDEX drawing_annotations_drawing_id_idx ON drawing_annotations(drawing_id);
CREATE INDEX drawing_annotations_project_id_idx ON drawing_annotations(project_id);
CREATE INDEX drawing_annotations_created_by_idx ON drawing_annotations(created_by);

ALTER TABLE drawing_annotations ENABLE ROW LEVEL SECURITY;

-- Access is scoped to members of the drawing's project (matching the `drawings`
-- table's own membership boundary). Within a project a member sees published
-- markup plus their own personal (unpublished) markup; only the author can
-- create/update/delete, and only in projects they belong to. App admins see all.
CREATE POLICY "View project or own drawing annotations"
  ON drawing_annotations FOR SELECT
  TO authenticated
  USING (
    public.current_is_app_admin()
    OR (
      public.current_is_project_member(project_id)
      AND (is_published OR created_by = (select auth.uid()))
    )
  );

CREATE POLICY "Insert own drawing annotations in member projects"
  ON drawing_annotations FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = (select auth.uid())
    AND public.current_is_project_member(project_id)
  );

CREATE POLICY "Update own drawing annotations in member projects"
  ON drawing_annotations FOR UPDATE
  TO authenticated
  USING (
    created_by = (select auth.uid())
    AND public.current_is_project_member(project_id)
  )
  WITH CHECK (
    created_by = (select auth.uid())
    AND public.current_is_project_member(project_id)
  );

CREATE POLICY "Delete own drawing annotations in member projects"
  ON drawing_annotations FOR DELETE
  TO authenticated
  USING (
    created_by = (select auth.uid())
    AND public.current_is_project_member(project_id)
  );

CREATE POLICY "Service role full access to drawing annotations"
  ON drawing_annotations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
