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

const PRIVATE_IPV4_CIDRS = [
  ["10.0.0.0", 8],
  ["172.16.0.0", 12],
  ["192.168.0.0", 16],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["0.0.0.0", 8],
] as const;

const isIPv4 = (value: string) => /^(\d{1,3}\.){3}\d{1,3}$/.test(value);

const ipv4ToInt = (ip: string) =>
  ip
    .split(".")
    .map((part) => Number(part))
    .reduce((acc, octet) => (acc << 8) + octet, 0) >>> 0;

const isPrivateIPv4 = (ip: string) => {
  if (!isIPv4(ip)) return false;
  const octets = ip.split(".").map((part) => Number(part));
  if (octets.some((octet) => Number.isNaN(octet) || octet < 0 || octet > 255)) return false;

  const ipInt = ipv4ToInt(ip);
  return PRIVATE_IPV4_CIDRS.some(([base, mask]) => {
    const baseInt = ipv4ToInt(base);
    const netmask = mask === 0 ? 0 : (~0 << (32 - mask)) >>> 0;
    return (ipInt & netmask) === (baseInt & netmask);
  });
};

const isPrivateIPv6 = (ip: string) => {
  const normalized = ip.toLowerCase();
  return (
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb")
  );
};

const isForbiddenHost = (hostname: string) => {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    return true;
  }

  if (isPrivateIPv4(host) || isPrivateIPv6(host)) {
    return true;
  }

  return false;
};

const resolveHostAddresses = async (hostname: string) => {
  if (isIPv4(hostname) || hostname.includes(":")) {
    return [hostname];
  }

  try {
    const [ipv4, ipv6] = await Promise.all([
      Deno.resolveDns(hostname, "A").catch(() => []),
      Deno.resolveDns(hostname, "AAAA").catch(() => []),
    ]);

    return [...ipv4, ...ipv6];
  } catch {
    return [];
  }
};

const assertSafeSourceUrl = async (value: string) => {
  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    throw new Error("Invalid source URL");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("Only https:// source URLs are allowed");
  }

  if (parsed.username || parsed.password) {
    throw new Error("Credentials in source URL are not allowed");
  }

  if (isForbiddenHost(parsed.hostname)) {
    throw new Error("Source URL host is not allowed");
  }

  const resolvedAddresses = await resolveHostAddresses(parsed.hostname);
  if (resolvedAddresses.some((address) => isPrivateIPv4(address) || isPrivateIPv6(address))) {
    throw new Error("Source URL resolves to a private network address");
  }

  return parsed.toString();
};

const readSourceUrl = async (url: string) => {
  const safeUrl = await assertSafeSourceUrl(url);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  const response = await fetch(safeUrl, {
    signal: controller.signal,
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; TrichyInsightBot/1.0)",
    },
  });

  clearTimeout(timeout);

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
- If media URL is unknown, return null.`;

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
      cover_image_url: (parsed.cover_image_url || imageUrlInput || ogImage || null)?.trim() || null,
      video_url: (parsed.video_url || ogVideo || null)?.trim() || null,
      meta_title: (parsed.meta_title || normalizedTitle).trim().slice(0, 60),
      meta_description: (parsed.meta_description || normalizedExcerpt).trim().slice(0, 160),
      meta_keywords: normalizeKeywords(parsed.meta_keywords),
    };
    const { data: insertedPost, error: insertError } = await supabase
      .from("news_posts")
      .insert({
        title: article.title,
        slug: article.slug,
        category: article.category,
        excerpt: article.excerpt,
        content: article.content,
        cover_image_url: article.cover_image_url,
        video_url: article.video_url,
        meta_title: article.meta_title,
        meta_description: article.meta_description,
        meta_keywords: article.meta_keywords,
        is_published: true,
        published_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to insert article: ${insertError.message}`);
    }

    return new Response(JSON.stringify(insertedPost), {
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
