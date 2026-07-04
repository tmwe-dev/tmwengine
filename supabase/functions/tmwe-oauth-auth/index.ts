import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";

const BodySchema = z.object({
  code: z.string().min(1),
  redirectUri: z.string().url(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const parsed = BodySchema.safeParse(await req.json());

    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { code, redirectUri } = parsed.data;
    const clientId = Deno.env.get("TMWE_CLIENT_ID");
    const clientSecret = Deno.env.get("TMWE_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      throw new Error("TMWE OAuth credentials not configured");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const tokenEndpoint = "https://sandbox.findair.net/erp/tmwe_json/token";
    const formData = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    });

    console.log("📤 TMWE OAuth token exchange", {
      token_endpoint: tokenEndpoint,
      grant_type: "authorization_code",
      has_code: true,
      client_id_prefix: clientId.slice(0, 8),
      redirect_uri: redirectUri,
    });

    const tokenResponse = await fetch(tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    const tokenText = await tokenResponse.text();

    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${tokenResponse.status} ${tokenText}`);
    }

    const tokenData = JSON.parse(tokenText);

    if (!tokenData.access_token || !tokenData.expires_in) {
      throw new Error("Invalid token response");
    }

    const profileResponse = await fetch("https://sandbox.findair.net/erp/tmwe_json/get_my_profile", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "Content-Type": "application/json",
      },
    });

    const profileText = await profileResponse.text();

    if (!profileResponse.ok) {
      throw new Error(`Failed to fetch profile: ${profileResponse.status} ${profileText}`);
    }

    const profileRaw = JSON.parse(profileText);
    const profileData = profileRaw?.data ?? profileRaw?.profile ?? profileRaw;
    const email = tokenData.email ?? profileData?.email;

    if (!email) {
      throw new Error("Email not returned by TMWE token/profile response");
    }

    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) throw listError;

    let supabaseUser = existingUsers.users.find((user) => user.email === email);

    if (!supabaseUser) {
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          tmwe_oauth: true,
          name: profileData?.name || profileData?.username || email.split("@")[0],
        },
      });

      if (createError) throw createError;
      supabaseUser = newUser.user;
    }

    const displayName = profileData?.name || profileData?.username || email.split("@")[0];

    const { error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .upsert({
        user_id: supabaseUser.id,
        tmwe_email: email,
        display_name: displayName,
      }, { onConflict: "user_id" });

    if (profileError) throw profileError;

    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
    const { error: credentialsError } = await supabaseAdmin
      .from("user_tmwe_credentials")
      .upsert({
        email,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || null,
        expires_at: expiresAt,
        client_id: clientId,
        client_secret: clientSecret,
        token_type: "oauth",
      }, { onConflict: "email" });

    if (credentialsError) throw credentialsError;

    const supabaseExpiresInSeconds = Math.max(60, Math.floor(tokenData.expires_in * 0.8));
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { expiresIn: supabaseExpiresInSeconds },
    });

    if (linkError || !linkData?.properties?.action_link) {
      throw new Error(`Failed to generate magic link: ${linkError?.message || "missing action link"}`);
    }

    return new Response(JSON.stringify({
      success: true,
      email,
      profile: {
        name: profileData?.name,
        username: profileData?.username,
        enterprise_name: profileData?.enterprise_name,
        rubrica: profileData?.rubrica,
      },
      supabaseUserId: supabaseUser.id,
      magicLink: linkData.properties.action_link,
      tmwe_access_token: tokenData.access_token,
      token_format: "oauth",
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ TMWE OAuth auth error:", error instanceof Error ? error.message : String(error));

    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});