-- RLS policies for drawing-related tables
-- Allow authenticated users to perform CRUD operations

-- drawing_sets
CREATE POLICY "Authenticated users can insert drawing sets"
  ON public.drawing_sets
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update drawing sets"
  ON public.drawing_sets
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete drawing sets"
  ON public.drawing_sets
  FOR DELETE
  TO authenticated
  USING (true);

-- drawing_areas
CREATE POLICY "Authenticated users can insert drawing areas"
  ON public.drawing_areas
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update drawing areas"
  ON public.drawing_areas
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete drawing areas"
  ON public.drawing_areas
  FOR DELETE
  TO authenticated
  USING (true);

-- drawing_revisions
CREATE POLICY "Authenticated users can insert drawing revisions"
  ON public.drawing_revisions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update drawing revisions"
  ON public.drawing_revisions
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- drawing_downloads
CREATE POLICY "Authenticated users can insert drawing downloads"
  ON public.drawing_downloads
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
