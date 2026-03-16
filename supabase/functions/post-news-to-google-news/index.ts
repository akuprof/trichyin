import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type PublishPayload = {
  postId?: string;
  source?: "chat" | "manual-form" | "toggle-publish";
  publicBaseUrl?: string;
};

const safeBaseUrl = (value?: string) => {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return parsed.origin;
  } catch {
    return null;
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const backendUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const backendAnonKey =
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
      Deno.env.get("SUPABASE_ANON_KEY") ??
      "";

    if (!backendUrl || !backendAnonKey) {
      throw new Error("Required backend secrets are missing.");
    }

    const supabase = createClient(backendUrl, backendAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleRow, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !roleRow) {
      return new Response(JSON.stringify({ error: "Admin permission required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as PublishPayload;
    const postId = body.postId?.trim();

    if (!postId) {
      return new Response(JSON.stringify({ success: false, error: "postId is required" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: post, error: postError } = await supabase
      .from("news_posts")
      .select("slug, is_published")
      .eq("id", postId)
      .maybeSingle();

    if (postError || !post) {
      return new Response(JSON.stringify({ success: false, error: "Published post not found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!post.is_published) {
      return new Response(JSON.stringify({ success: false, skipped: true, error: "Post is not published" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseUrl = safeBaseUrl(body.publicBaseUrl) || safeBaseUrl(req.headers.get("origin") || undefined);
    if (!baseUrl) {
      return new Response(JSON.stringify({ success: false, skipped: true, error: "Public base URL is missing" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sitemapUrl = `${baseUrl}/news-sitemap.xml`;
    const pingUrl = `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;

    const pingResponse = await fetch(pingUrl, { method: "GET" });

    if (!pingResponse.ok) {
      const responseText = await pingResponse.text();
      return new Response(
        JSON.stringify({
          success: false,
          error: `Google ping failed (${pingResponse.status}): ${responseText.slice(0, 500)}`,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        sitemap_url: sitemapUrl,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("post-news-to-google-news error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
