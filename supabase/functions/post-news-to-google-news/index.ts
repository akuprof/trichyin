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

type SitemapPost = {
  slug: string;
  title: string;
  published_at: string | null;
  updated_at: string;
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

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");

const buildNewsSitemapXml = (baseUrl: string, posts: SitemapPost[]) => {
  const urlEntries = posts
    .map((post) => {
      const articleUrl = `${baseUrl}/news/${post.slug}`;
      const publishedAt = post.published_at || post.updated_at;
      const lastMod = new Date(post.updated_at).toISOString();
      const publicationDate = new Date(publishedAt).toISOString();

      return `<url>
  <loc>${escapeXml(articleUrl)}</loc>
  <lastmod>${lastMod}</lastmod>
  <news:news>
    <news:publication>
      <news:name>Trichy Insight</news:name>
      <news:language>ta</news:language>
    </news:publication>
    <news:publication_date>${publicationDate}</news:publication_date>
    <news:title>${escapeXml(post.title)}</news:title>
  </news:news>
</url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urlEntries}
</urlset>`;
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
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!backendUrl || !backendAnonKey || !serviceRoleKey) {
      throw new Error("Required backend secrets are missing.");
    }

    const supabase = createClient(backendUrl, backendAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const adminClient = createClient(backendUrl, serviceRoleKey);

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
      .select("id, is_published")
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

    const { data: sitemapPosts, error: sitemapPostsError } = await adminClient
      .from("news_posts")
      .select("slug, title, published_at, updated_at")
      .eq("is_published", true)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(200);

    if (sitemapPostsError) {
      return new Response(JSON.stringify({ success: false, error: sitemapPostsError.message }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const typedPosts = (sitemapPosts || []) as SitemapPost[];

    if (!typedPosts.length) {
      return new Response(JSON.stringify({ success: false, skipped: true, error: "No published posts found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const xml = buildNewsSitemapXml(baseUrl, typedPosts);

    const { error: uploadError } = await adminClient.storage
      .from("news-media")
      .upload("news-sitemap.xml", new TextEncoder().encode(xml), {
        contentType: "application/xml; charset=utf-8",
        upsert: true,
      });

    if (uploadError) {
      return new Response(JSON.stringify({ success: false, error: uploadError.message }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sitemapUrl = `${backendUrl}/storage/v1/object/public/news-media/news-sitemap.xml`;

    return new Response(
      JSON.stringify({
        success: true,
        sitemap_url: sitemapUrl,
        message: "News sitemap generated and updated successfully.",
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
