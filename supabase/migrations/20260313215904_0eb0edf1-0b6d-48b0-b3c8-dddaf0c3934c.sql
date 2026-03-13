-- Social auto-publish webhook settings for admin users
CREATE TABLE IF NOT EXISTS public.social_publish_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_url TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  secret_token TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT social_publish_settings_webhook_not_empty CHECK (char_length(trim(webhook_url)) > 0)
);

ALTER TABLE public.social_publish_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view social publish settings"
ON public.social_publish_settings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert social publish settings"
ON public.social_publish_settings
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update social publish settings"
ON public.social_publish_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete social publish settings"
ON public.social_publish_settings
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_social_publish_settings_updated_at ON public.social_publish_settings;
CREATE TRIGGER update_social_publish_settings_updated_at
BEFORE UPDATE ON public.social_publish_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_social_publish_settings_updated_at
ON public.social_publish_settings (updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_social_publish_settings_enabled
ON public.social_publish_settings (enabled)
WHERE enabled = true;