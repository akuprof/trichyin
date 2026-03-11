-- Admin roles enum
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- User roles table (separate from users/profiles)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer helper to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Generic updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Policies for user_roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- News management table
CREATE TABLE IF NOT EXISTS public.news_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  cover_image_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.news_posts ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_news_posts_updated_at ON public.news_posts;
CREATE TRIGGER update_news_posts_updated_at
BEFORE UPDATE ON public.news_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_news_posts_category ON public.news_posts(category);
CREATE INDEX IF NOT EXISTS idx_news_posts_published ON public.news_posts(is_published, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_posts_slug ON public.news_posts(slug);

DROP POLICY IF EXISTS "Public can read published news" ON public.news_posts;
CREATE POLICY "Public can read published news"
ON public.news_posts
FOR SELECT
TO anon, authenticated
USING (is_published = true);

DROP POLICY IF EXISTS "Admins can read all news" ON public.news_posts;
CREATE POLICY "Admins can read all news"
ON public.news_posts
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert news" ON public.news_posts;
CREATE POLICY "Admins can insert news"
ON public.news_posts
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update news" ON public.news_posts;
CREATE POLICY "Admins can update news"
ON public.news_posts
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete news" ON public.news_posts;
CREATE POLICY "Admins can delete news"
ON public.news_posts
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Lightweight analytics table for admin dashboard
CREATE TABLE IF NOT EXISTS public.page_view_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  post_id UUID REFERENCES public.news_posts(id) ON DELETE SET NULL,
  viewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  path TEXT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.page_view_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_page_view_events_viewed_at ON public.page_view_events(viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_view_events_post_id ON public.page_view_events(post_id);

DROP POLICY IF EXISTS "Anyone can insert page views" ON public.page_view_events;
CREATE POLICY "Anyone can insert page views"
ON public.page_view_events
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view page views" ON public.page_view_events;
CREATE POLICY "Admins can view page views"
ON public.page_view_events
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
