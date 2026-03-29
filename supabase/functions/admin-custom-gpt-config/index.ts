import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ConfigAction = "status" | "rotate" | "disable";

const textEncoder = new TextEncoder();

const hashToken = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", textEncoder.encode(value));
  return Array.from(new Uint8Array(digest))
    .map((item) => item.toString(16).padStart(2, "0"))
    .join("");
};

const randomToken = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return `tgpt_${Array.from(bytes)
    .map((item) => item.toString(16).padStart(2, "0"))
    .join("")}`;
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

    const body = (await req.json().catch(() => ({}))) as { action?: ConfigAction; name?: string };
    const action = body.action || "status";
    const name = (body.name || "main").trim().toLowerCase();

    if (action === "status") {
      const { data: tokenRow, error } = await supabase
        .from("custom_gpt_tokens")
        .select("name, enabled, updated_at")
        .eq("name", name)
        .maybeSingle();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          enabled: !!tokenRow?.enabled,
          tokenConfigured: !!tokenRow,
          tokenHint: tokenRow?.name || null,
          updatedAt: tokenRow?.updated_at || null,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (action === "disable") {
      const { data, error } = await supabase
        .from("custom_gpt_tokens")
        .update({ enabled: false, created_by: user.id })
        .eq("name", name)
        .select("name, enabled, updated_at")
        .maybeSingle();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          enabled: !!data?.enabled,
          tokenConfigured: !!data,
          tokenHint: data?.name || name,
          updatedAt: data?.updated_at || null,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (action === "rotate") {
      const token = randomToken();
      const tokenHash = await hashToken(token);

      const { data, error } = await supabase
        .from("custom_gpt_tokens")
        .upsert(
          {
            name,
            token_hash: tokenHash,
            enabled: true,
            created_by: user.id,
          },
          { onConflict: "name" },
        )
        .select("name, enabled, updated_at")
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          enabled: !!data.enabled,
          tokenConfigured: true,
          tokenHint: data.name,
          updatedAt: data.updated_at,
          token,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("admin-custom-gpt-config error:", error);
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
