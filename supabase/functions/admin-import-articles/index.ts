import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type IncomingArticle = {
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
  is_published?: boolean;
  published_at?: string | null;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const normalizeKeywords = (value: IncomingArticle["meta_keywords"]) => {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [] as string[];
};

const asValidDateOrNow = (value: string | null | undefined) => {
  if (!value) return new Date().toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
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

    const body = (await req.json()) as { articles?: IncomingArticle[] };
    const articles = Array.isArray(body.articles) ? body.articles : [];

    if (!articles.length) {
      return new Response(JSON.stringify({ inserted: 0, skipped: 0, errors: ["articles array is required"] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let inserted = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let index = 0; index < articles.length; index += 1) {
      const row = articles[index];
      const title = row.title?.trim() || "";
      const content = row.content?.trim() || "";
      const category = row.category?.trim() || "உள்ளூர்";
      const baseSlug = row.slug?.trim() || slugify(title);

      if (!title || !content || !baseSlug) {
        skipped += 1;
        errors.push(`Row ${index + 1}: title/content/slug missing`);
        continue;
      }

      const mediaImage = row.cover_image_url?.trim() || null;
      const mediaVideo = row.video_url?.trim() || null;
      if (!mediaImage && !mediaVideo) {
        skipped += 1;
        errors.push(`Row ${index + 1}: media missing (cover_image_url or video_url required)`);
        continue;
      }

      let uniqueSlug = baseSlug;
      let suffix = 2;

      while (true) {
        const { count, error: slugCheckError } = await supabase
          .from("news_posts")
          .select("id", { count: "exact", head: true })
          .eq("slug", uniqueSlug);

        if (slugCheckError) {
          skipped += 1;
          errors.push(`Row ${index + 1}: slug check failed (${slugCheckError.message})`);
          uniqueSlug = "";
          break;
        }

        if ((count || 0) === 0) break;
        uniqueSlug = `${baseSlug}-${suffix}`;
        suffix += 1;
        if (suffix > 1000) {
          skipped += 1;
          errors.push(`Row ${index + 1}: unique slug generation failed`);
          uniqueSlug = "";
          break;
        }
      }

      if (!uniqueSlug) continue;

      const excerpt = row.excerpt?.trim() || content.slice(0, 220);
      const metaTitle = (row.meta_title?.trim() || title).slice(0, 60);
      const metaDescription = (row.meta_description?.trim() || excerpt).slice(0, 160);
      const metaKeywords = normalizeKeywords(row.meta_keywords);
      const published = row.is_published ?? true;

      const { error: insertError } = await supabase.from("news_posts").insert({
        title,
        slug: uniqueSlug,
        category,
        excerpt,
        content,
        cover_image_url: mediaImage,
        video_url: mediaVideo,
        meta_title: metaTitle,
        meta_description: metaDescription,
        meta_keywords: metaKeywords,
        is_published: published,
        published_at: published ? asValidDateOrNow(row.published_at) : null,
        created_by: user.id,
      });

      if (insertError) {
        skipped += 1;
        errors.push(`Row ${index + 1}: insert failed (${insertError.message})`);
      } else {
        inserted += 1;
      }
    }

    return new Response(JSON.stringify({ inserted, skipped, errors }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("admin-import-articles error:", error);
    return new Response(
      JSON.stringify({
        inserted: 0,
        skipped: 0,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
