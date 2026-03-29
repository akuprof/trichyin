import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-custom-gpt-token, x-token-name",
};

type PublishRequest = {
  title?: string;
  slug?: string;
  category?: string;
  excerpt?: string;
  content?: string;
  cover_image_url?: string | null;
  video_url?: string | null;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string[] | string;
  created_by?: string | null;
  auto_publish?: boolean;
};

const textEncoder = new TextEncoder();

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const hashToken = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", textEncoder.encode(value));
  return Array.from(new Uint8Array(digest))
    .map((item) => item.toString(16).padStart(2, "0"))
    .join("");
};

const normalizeKeywords = (value: PublishRequest["meta_keywords"]) => {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [] as string[];
};

const toSafeUrl = (value: string | null | undefined) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^https?:\/\//i.test(trimmed)) return null;
  return trimmed;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const backendUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!backendUrl || !serviceRoleKey) {
      throw new Error("Required backend secrets are missing.");
    }

    const adminClient = createClient(backendUrl, serviceRoleKey);

    const providedToken = req.headers.get("x-custom-gpt-token")?.trim();
    const tokenName = (req.headers.get("x-token-name") || "main").trim().toLowerCase();

    if (!providedToken) {
      return new Response(JSON.stringify({ error: "x-custom-gpt-token header is required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tokenHash = await hashToken(providedToken);

    const { data: tokenRow, error: tokenError } = await adminClient
      .from("custom_gpt_tokens")
      .select("id, enabled")
      .eq("name", tokenName)
      .eq("token_hash", tokenHash)
      .eq("enabled", true)
      .maybeSingle();

    if (tokenError || !tokenRow) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as PublishRequest;
    const title = body.title?.trim() || "";
    const content = body.content?.trim() || "";
    const category = body.category?.trim() || "உள்ளூர்";
    const autoPublish = body.auto_publish ?? true;
    const sourceSlug = body.slug?.trim() || slugify(title);

    if (!title || !content || !sourceSlug) {
      return new Response(JSON.stringify({ error: "title, content and slug/title are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const coverImageUrl = toSafeUrl(body.cover_image_url ?? null);
    const videoUrl = toSafeUrl(body.video_url ?? null);
    if (!coverImageUrl && !videoUrl) {
      return new Response(JSON.stringify({ error: "cover_image_url or video_url is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let uniqueSlug = sourceSlug;
    let suffix = 2;

    while (true) {
      const { count, error } = await adminClient
        .from("news_posts")
        .select("id", { count: "exact", head: true })
        .eq("slug", uniqueSlug);
      if (error) throw error;
      if ((count || 0) === 0) break;
      uniqueSlug = `${sourceSlug}-${suffix}`;
      suffix += 1;
      if (suffix > 1000) throw new Error("Failed to generate unique slug");
    }

    const excerpt = body.excerpt?.trim() || content.slice(0, 220);
    const metaTitle = (body.meta_title?.trim() || title).slice(0, 60);
    const metaDescription = (body.meta_description?.trim() || excerpt).slice(0, 160);
    const metaKeywords = normalizeKeywords(body.meta_keywords);

    const { data: inserted, error: insertError } = await adminClient
      .from("news_posts")
      .insert({
        title,
        slug: uniqueSlug,
        category,
        excerpt,
        content,
        cover_image_url: coverImageUrl,
        video_url: videoUrl,
        meta_title: metaTitle,
        meta_description: metaDescription,
        meta_keywords: metaKeywords,
        is_published: autoPublish,
        published_at: autoPublish ? new Date().toISOString() : null,
        created_by: body.created_by?.trim() || null,
      })
      .select("id, title, slug, is_published, published_at")
      .single();

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        post: inserted,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("custom-gpt-publish-article error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
