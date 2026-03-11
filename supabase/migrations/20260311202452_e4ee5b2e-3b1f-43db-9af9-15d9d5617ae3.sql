DROP POLICY IF EXISTS "Anyone can insert page views" ON public.page_view_events;

CREATE POLICY "Public can insert constrained page views"
ON public.page_view_events
FOR INSERT
TO anon, authenticated
WITH CHECK (
  char_length(trim(path)) > 0
  AND char_length(path) <= 2048
  AND (viewer_id IS NULL OR viewer_id = auth.uid())
);