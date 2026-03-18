import { supabase } from "@/integrations/supabase/client";

export type GoogleNewsPublishSource = "chat" | "manual-form" | "toggle-publish";

type GoogleNewsPublishResponse = {
  success?: boolean;
  skipped?: boolean;
  error?: string;
  sitemap_url?: string;
};

export const triggerGoogleNewsPublish = async (postId: string, source: GoogleNewsPublishSource) => {
  const { data, error } = await supabase.functions.invoke("post-news-to-google-news", {
    body: {
      postId,
      source,
      publicBaseUrl: window.location.origin,
    },
  });

  if (error) {
    return {
      success: false,
      skipped: false,
      error: error.message,
      sitemapUrl: null,
    };
  }

  const payload = (data || {}) as GoogleNewsPublishResponse;

  return {
    success: !!payload.success,
    skipped: !!payload.skipped,
    error: payload.error || null,
    sitemapUrl: payload.sitemap_url || null,
  };
};
