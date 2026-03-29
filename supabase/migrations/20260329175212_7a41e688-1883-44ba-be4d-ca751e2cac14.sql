-- Custom GPT token store for secure direct publishing endpoint
CREATE TABLE IF NOT EXISTS public.custom_gpt_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  token_hash TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_gpt_tokens ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_custom_gpt_tokens_updated_at ON public.custom_gpt_tokens;
CREATE TRIGGER update_custom_gpt_tokens_updated_at
BEFORE UPDATE ON public.custom_gpt_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP POLICY IF EXISTS "Admins can view custom gpt tokens" ON public.custom_gpt_tokens;
CREATE POLICY "Admins can view custom gpt tokens"
ON public.custom_gpt_tokens
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert custom gpt tokens" ON public.custom_gpt_tokens;
CREATE POLICY "Admins can insert custom gpt tokens"
ON public.custom_gpt_tokens
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update custom gpt tokens" ON public.custom_gpt_tokens;
CREATE POLICY "Admins can update custom gpt tokens"
ON public.custom_gpt_tokens
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete custom gpt tokens" ON public.custom_gpt_tokens;
CREATE POLICY "Admins can delete custom gpt tokens"
ON public.custom_gpt_tokens
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_custom_gpt_tokens_enabled ON public.custom_gpt_tokens(enabled);