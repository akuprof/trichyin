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

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey =
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
      Deno.env.get("SUPABASE_ANON_KEY") ??
      "";

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Required backend secrets are missing.");
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
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
      .select("id, title, slug, category, excerpt, content, cover_image_url, video_url, published_at, is_published")
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

    const { data: settings, error: settingsError } = await supabase
      .from("social_publish_settings")
      .select("webhook_url, enabled, secret_token")
      .eq("enabled", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (settingsError) {
      return new Response(JSON.stringify({ success: false, error: settingsError.message }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!settings?.webhook_url) {
      return new Response(JSON.stringify({ success: false, skipped: true, error: "Social webhook is not configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseUrl = safeBaseUrl(body.publicBaseUrl) || safeBaseUrl(req.headers.get("origin") || undefined);
    const articleUrl = baseUrl ? `${baseUrl}/news/${post.slug}` : null;

    const webhookPayload = {
      event: "news_published",
      source: body.source || "manual-form",
      post: {
        id: post.id,
        title: post.title,
        slug: post.slug,
        category: post.category,
        excerpt: post.excerpt,
        content: post.content,
        cover_image_url: post.cover_image_url,
        video_url: post.video_url,
        published_at: post.published_at,
        article_url: articleUrl,
        public_url: articleUrl,
      },
      sent_at: new Date().toISOString(),
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (settings.secret_token?.trim()) {
      headers["X-Webhook-Secret"] = settings.secret_token.trim();
    }

    const webhookResponse = await fetch(settings.webhook_url, {
      method: "POST",
      headers,
      body: JSON.stringify(webhookPayload),
    });

    if (!webhookResponse.ok) {
      const responseText = await webhookResponse.text();
      return new Response(
        JSON.stringify({
          success: false,
          error: `Webhook failed (${webhookResponse.status}): ${responseText.slice(0, 500)}`,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("post-news-to-social error:", error);
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
