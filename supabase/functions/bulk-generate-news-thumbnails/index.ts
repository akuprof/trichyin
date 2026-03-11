import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type BulkPayload = {
  limit?: number;
};

type NewsPostLite = {
  id: string;
  title: string;
  category: string;
  excerpt: string | null;
  cover_image_url: string | null;
  video_url: string | null;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);

const decodeDataUrl = (dataUrl: string) => {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!match) throw new Error("Invalid AI image data format");

  const mimeType = match[1] || "image/png";
  const base64 = match[2];
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  const extension = mimeType.split("/")[1] || "png";

  return { bytes, mimeType, extension };
};

const imageUrlToFile = async (imageUrl: string) => {
  if (imageUrl.startsWith("data:")) return decodeDataUrl(imageUrl);

  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error("AI image download failed");

  const mimeType = response.headers.get("content-type") || "image/png";
  const extension = mimeType.split("/")[1] || "png";
  const bytes = new Uint8Array(await response.arrayBuffer());
  return { bytes, mimeType, extension };
};

const needsImageGeneration = (post: NewsPostLite) => {
  const hasVideo = Boolean(post.video_url?.trim());
  if (hasVideo) return false;

  const image = post.cover_image_url?.trim() || "";
  return !image || image.includes("/placeholder.svg");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY") ?? "";

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey || !lovableApiKey) {
      throw new Error("Required backend secrets are missing.");
    }

    const client = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await client.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin, error: roleError } = await client.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (roleError || !isAdmin) {
      return new Response(JSON.stringify({ error: "Admin permission required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json().catch(() => ({}))) as BulkPayload;
    const maxItems = Math.max(1, Math.min(body.limit ?? 10, 25));

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: postsData, error: postsError } = await adminClient
      .from("news_posts")
      .select("id,title,category,excerpt,cover_image_url,video_url")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (postsError) throw postsError;

    const candidates = ((postsData || []) as NewsPostLite[]).filter(needsImageGeneration).slice(0, maxItems);

    const failed: Array<{ postId: string; reason: string }> = [];
    let updated = 0;

    for (const post of candidates) {
      try {
        const prompt = `Generate a realistic editorial news thumbnail image without text overlays.
News title: ${post.title}
Category: ${post.category || "உள்ளூர்"}
Summary: ${(post.excerpt || "").slice(0, 250) || "N/A"}
Style: documentary photojournalism, natural lighting, Tamil Nadu context, 16:9 composition.`;

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3.1-flash-image-preview",
            messages: [{ role: "user", content: prompt }],
            modalities: ["image", "text"],
          }),
        });

        if (!aiResponse.ok) {
          const reason = aiResponse.status === 429
            ? "Rate limited"
            : aiResponse.status === 402
              ? "AI credits exhausted"
              : `AI generation failed (${aiResponse.status})`;
          failed.push({ postId: post.id, reason });
          continue;
        }

        const aiData = await aiResponse.json();
        const generatedImageUrl = aiData?.choices?.[0]?.message?.images?.[0]?.image_url?.url;

        if (!generatedImageUrl || typeof generatedImageUrl !== "string") {
          failed.push({ postId: post.id, reason: "AI image missing" });
          continue;
        }

        const file = await imageUrlToFile(generatedImageUrl);
        const fileName = `${Date.now()}-${slugify(post.title) || "news-thumbnail"}.${file.extension}`;
        const filePath = `ai/${user.id}/${fileName}`;

        const { error: uploadError } = await adminClient.storage.from("news-media").upload(filePath, file.bytes, {
          contentType: file.mimeType,
          upsert: false,
          cacheControl: "3600",
        });

        if (uploadError) throw uploadError;

        const { data: publicData } = adminClient.storage.from("news-media").getPublicUrl(filePath);

        const { error: updateError } = await adminClient
          .from("news_posts")
          .update({ cover_image_url: publicData.publicUrl })
          .eq("id", post.id);

        if (updateError) throw updateError;
        updated += 1;
      } catch (error) {
        failed.push({ postId: post.id, reason: error instanceof Error ? error.message : "Unknown error" });
      }
    }

    return new Response(
      JSON.stringify({
        scanned: (postsData || []).length,
        processed: candidates.length,
        updated,
        failed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("bulk-generate-news-thumbnails error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
