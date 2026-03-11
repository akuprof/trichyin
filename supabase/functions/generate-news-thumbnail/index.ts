import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ThumbnailPayload = {
  title?: string | null;
  category?: string | null;
  excerpt?: string | null;
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
  if (imageUrl.startsWith("data:")) {
    return decodeDataUrl(imageUrl);
  }

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error("AI image download failed");
  }

  const mimeType = response.headers.get("content-type") || "image/png";
  const extension = mimeType.split("/")[1] || "png";
  const bytes = new Uint8Array(await response.arrayBuffer());
  return { bytes, mimeType, extension };
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
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY") ?? "";

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey || !lovableApiKey) {
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

    const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (roleError || !isAdmin) {
      return new Response(JSON.stringify({ error: "Admin permission required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as ThumbnailPayload;
    const title = body.title?.trim() || "";
    const category = body.category?.trim() || "உள்ளூர்";
    const excerpt = body.excerpt?.trim() || "";

    if (!title) {
      return new Response(JSON.stringify({ error: "Title is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Generate a realistic editorial news thumbnail image without any text overlays.
News title: ${title}
Category: ${category}
Summary: ${excerpt || "N/A"}
Style: documentary, high detail, natural lighting, Tamil Nadu local-news context, 16:9 composition.`;

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
      const status = aiResponse.status;
      const errorText = await aiResponse.text();
      console.error("AI thumbnail generation error", status, errorText);
      return new Response(JSON.stringify({ error: `AI generation failed (${status})` }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const generatedImageUrl = aiData?.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!generatedImageUrl || typeof generatedImageUrl !== "string") {
      throw new Error("AI did not return an image");
    }

    const file = await imageUrlToFile(generatedImageUrl);
    const fileName = `${Date.now()}-${slugify(title) || "news-thumbnail"}.${file.extension}`;
    const filePath = `ai/${user.id}/${fileName}`;

    const adminStorage = createClient(supabaseUrl, serviceRoleKey);
    const { error: uploadError } = await adminStorage.storage.from("news-media").upload(filePath, file.bytes, {
      contentType: file.mimeType,
      upsert: false,
      cacheControl: "3600",
    });

    if (uploadError) throw uploadError;

    const { data: publicData } = adminStorage.storage.from("news-media").getPublicUrl(filePath);

    return new Response(JSON.stringify({ imageUrl: publicData.publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-news-thumbnail error:", error);
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
