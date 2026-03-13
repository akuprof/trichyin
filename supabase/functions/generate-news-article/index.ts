import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type GeneratePayload = {
  sourceUrl?: string | null;
  sourceText?: string | null;
  imageUrl?: string | null;
};

type GeneratedArticle = {
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  content: string;
  cover_image_url: string | null;
  video_url: string | null;
  meta_title: string;
  meta_description: string;
  meta_keywords: string[];
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const extractJson = (content: string) => {
  const fenced = content.match(/```json\s*([\s\S]*?)\s*```/i)?.[1];
  const candidate = (fenced || content).trim();
  return JSON.parse(candidate);
};

const stripHtml = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const extractMeta = (html: string, property: string) => {
  const regex = new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
  return html.match(regex)?.[1] ?? null;
};

const normalizeKeywords = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((keyword) => String(keyword).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((keyword) => keyword.trim())
      .filter(Boolean);
  }

  return [];
};

const readSourceUrl = async (url: string) => {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; TrichyInsightBot/1.0)",
    },
  });

  if (!response.ok) {
    throw new Error(`Source URL fetch failed with status ${response.status}`);
  }

  const html = await response.text();
  const sourceText = stripHtml(html).slice(0, 12000);
  const ogImage = extractMeta(html, "og:image");
  const ogVideo = extractMeta(html, "og:video");

  return { sourceText, ogImage, ogVideo };
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
    const supabaseAnonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY") ?? "";

    if (!supabaseUrl || !supabaseAnonKey || !lovableApiKey) {
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

    const body = (await req.json()) as GeneratePayload;
    const sourceUrl = body.sourceUrl?.trim() || null;
    const sourceTextInput = body.sourceText?.trim() || null;
    const imageUrlInput = body.imageUrl?.trim() || null;

    if (!sourceUrl && !sourceTextInput) {
      return new Response(JSON.stringify({ error: "Provide sourceUrl or sourceText" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let urlContext = "";
    let ogImage: string | null = null;
    let ogVideo: string | null = null;

    if (sourceUrl) {
      const sourceData = await readSourceUrl(sourceUrl);
      urlContext = sourceData.sourceText;
      ogImage = sourceData.ogImage;
      ogVideo = sourceData.ogVideo;
    }

    const prompt = `Create a humanized Tamil news article draft.

Input URL: ${sourceUrl ?? "N/A"}
Input notes: ${sourceTextInput ?? "N/A"}
Input image URL: ${imageUrlInput ?? "N/A"}
Fetched URL context: ${urlContext || "N/A"}

Return ONLY valid JSON with these fields:
{
  "title": "string",
  "slug": "string",
  "category": "string",
  "excerpt": "string (max 220 chars)",
  "content": "string (minimum 4 paragraphs, natural journalistic tone)",
  "cover_image_url": "string or null",
  "video_url": "string or null",
  "meta_title": "string under 60 characters",
  "meta_description": "string under 160 characters",
  "meta_keywords": ["keyword1", "keyword2", "keyword3"]
}

Rules:
- Make writing natural and human-like, not robotic.
- Keep facts consistent with provided input.
- Prefer Tamil language output.
- SEO fields must be specific and relevant.
- If input image URL is provided and relevant, prefer it as cover_image_url.
- If media URL is unknown, return null.

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content:
              "You are an expert Tamil newsroom editor. Write reliable, clear, humanized articles with SEO metadata and return strict JSON only.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const text = await aiResponse.text();
      const status = aiResponse.status;
      const error =
        status === 429
          ? "Rate limits exceeded, please try again in a moment."
          : status === 402
            ? "AI credits exhausted, please add workspace credits."
            : `AI generation failed (${status})`;

      console.error("AI gateway error", status, text);
      return new Response(JSON.stringify({ error }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const message = aiData?.choices?.[0]?.message?.content;
    if (!message || typeof message !== "string") {
      throw new Error("Invalid AI response format");
    }

    const parsed = extractJson(message) as Partial<GeneratedArticle>;

    const normalizedTitle = (parsed.title || "").trim();
    const normalizedContent = (parsed.content || "").trim();

    if (!normalizedTitle || !normalizedContent) {
      throw new Error("AI output missing required fields");
    }

    const normalizedExcerpt = (parsed.excerpt || normalizedContent.slice(0, 220)).trim();

    const article: GeneratedArticle = {
      title: normalizedTitle,
      slug: slugify(parsed.slug || normalizedTitle),
      category: (parsed.category || "உள்ளூர்").trim(),
      excerpt: normalizedExcerpt,
      content: normalizedContent,
      cover_image_url: (parsed.cover_image_url || ogImage || null)?.trim() || null,
      video_url: (parsed.video_url || ogVideo || null)?.trim() || null,
      meta_title: (parsed.meta_title || normalizedTitle).trim().slice(0, 60),
      meta_description: (parsed.meta_description || normalizedExcerpt).trim().slice(0, 160),
      meta_keywords: normalizeKeywords(parsed.meta_keywords),
    };

    return new Response(JSON.stringify(article), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-news-article error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
