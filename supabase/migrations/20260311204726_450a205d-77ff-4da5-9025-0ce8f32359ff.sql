-- Add optional video URL support for news cards
ALTER TABLE public.news_posts
ADD COLUMN IF NOT EXISTS video_url text;

-- Enforce that each news post has either an image or a video
CREATE OR REPLACE FUNCTION public.validate_news_post_media()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NULLIF(BTRIM(NEW.cover_image_url), ''), NULLIF(BTRIM(NEW.video_url), '')) IS NULL THEN
    RAISE EXCEPTION 'Each news post must include either an image URL or a video URL.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_news_post_media_trigger ON public.news_posts;
CREATE TRIGGER validate_news_post_media_trigger
BEFORE INSERT OR UPDATE ON public.news_posts
FOR EACH ROW
EXECUTE FUNCTION public.validate_news_post_media();

-- Create a public bucket for news media uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('news-media', 'news-media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public reads from news media bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public can view news media'
  ) THEN
    CREATE POLICY "Public can view news media"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'news-media');
  END IF;
END
$$;

-- Allow admins to upload files to news media bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins can upload news media'
  ) THEN
    CREATE POLICY "Admins can upload news media"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'news-media'
      AND public.has_role(auth.uid(), 'admin'::public.app_role)
    );
  END IF;
END
$$;

-- Allow admins to update files in news media bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins can update news media'
  ) THEN
    CREATE POLICY "Admins can update news media"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'news-media'
      AND public.has_role(auth.uid(), 'admin'::public.app_role)
    )
    WITH CHECK (
      bucket_id = 'news-media'
      AND public.has_role(auth.uid(), 'admin'::public.app_role)
    );
  END IF;
END
$$;

-- Allow admins to delete files in news media bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins can delete news media'
  ) THEN
    CREATE POLICY "Admins can delete news media"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'news-media'
      AND public.has_role(auth.uid(), 'admin'::public.app_role)
    );
  END IF;
END
$$;