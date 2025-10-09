import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OAuthCallbackRequest {
  code: string;
  redirectUri: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔐 Iniciando OAuth2 callback flow...');
    
    const { code, redirectUri }: OAuthCallbackRequest = await req.json();
    
    if (!code || !redirectUri) {
      return new Response(
        JSON.stringify({ error: 'Missing code or redirectUri' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get OAuth credentials from Supabase secrets
    const clientId = Deno.env.get('TMWE_CLIENT_ID') || '30eb3689ecfe890adfda0578d61ad858cf9f98999a919e0cd7bb798df17b006f';
    const clientSecret = Deno.env.get('TMWE_CLIENT_SECRET');
    
    if (!clientSecret) {
      throw new Error('TMWE_CLIENT_SECRET not configured');
    }

    console.log('📤 Exchanging authorization code for access token...');

    // 1. Exchange authorization code for access token
    const tokenResponse = await fetch('https://findair.it/erp/tmwe_json/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      console.error('❌ Token exchange failed:', errorData);
      throw new Error(`Token exchange failed: ${errorData.error_description || errorData.error || 'Unknown error'}`);
    }

    const tokenData = await tokenResponse.json();
    console.log('✅ Access token obtained');
    console.log('📧 User email:', tokenData.email);

    const { access_token, refresh_token, expires_in, email } = tokenData;

    if (!access_token || !email) {
      throw new Error('Invalid token response: missing access_token or email');
    }

    console.log('👤 Fetching user profile from TMWE API...');

    // 2. Get user profile using the access token
    const profileResponse = await fetch('https://findair.it/erp/tmwe_json/get_my_profile', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        handler: 'get_my_profile'
      }),
    });

    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      console.error('❌ Profile fetch failed:', errorText);
      throw new Error(`Failed to fetch profile: ${profileResponse.statusText}`);
    }

    const profileData = await profileResponse.json();
    console.log('✅ Profile obtained:', profileData.name || profileData.username);

    // Initialize Supabase Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('🔄 Syncing with Supabase...');

    // 3. Find or create Supabase user
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      throw listError;
    }

    let supabaseUser = existingUsers.users.find(u => u.email === email);

    // Create user if doesn't exist
    if (!supabaseUser) {
      console.log(`➕ Creating new Supabase user for: ${email}`);
      
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        email_confirm: true,
        user_metadata: {
          tmwe_oauth: true,
          name: profileData.name || profileData.username,
          enterprise_name: profileData.enterprise_name,
        }
      });

      if (createError) {
        console.error('Error creating user:', createError);
        throw createError;
      }

      supabaseUser = newUser.user;
      console.log(`✅ Supabase user created: ${supabaseUser.id}`);
    } else {
      console.log(`✅ Existing Supabase user found: ${supabaseUser.id}`);
    }

    // 4. Update/create user profile
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .upsert({
        user_id: supabaseUser.id,
        tmwe_email: email,
        display_name: profileData.name || profileData.username,
      }, {
        onConflict: 'user_id'
      });

    if (profileError) {
      console.error('Error updating profile:', profileError);
      throw profileError;
    }

    console.log(`✅ Profile synced for user_id: ${supabaseUser.id}`);

    // 5. Save TMWE credentials in database
    const expiresAt = expires_in ? Date.now() + (expires_in * 1000) : null;
    
    const { error: credsError } = await supabaseAdmin
      .from('user_tmwe_credentials')
      .upsert({
        email: email,
        access_token: access_token,
        refresh_token: refresh_token,
        expires_at: expiresAt,
        client_id: clientId,
        client_secret: clientSecret,
      }, {
        onConflict: 'email'
      });

    if (credsError) {
      console.error('Error saving credentials:', credsError);
      throw credsError;
    }

    console.log('✅ TMWE credentials saved');

    // 6. Generate Supabase session for the authenticated user
    console.log('🔐 Generating Supabase session...');

    // Use generateLink with type 'recovery' to get proper session tokens
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
    });

    if (linkError || !linkData?.properties) {
      console.error('Error generating recovery link:', linkError);
      throw new Error('Failed to generate session');
    }

    // Extract hashed_token from the recovery link
    const hashedToken = linkData.properties.hashed_token;

    // Verify the recovery token to get actual session tokens
    const { data: sessionData, error: verifyError } = await supabaseAdmin.auth.verifyOtp({
      token_hash: hashedToken,
      type: 'recovery',
    });

    if (verifyError || !sessionData?.session) {
      console.error('Error verifying recovery token:', verifyError);
      throw new Error('Failed to create session');
    }

    console.log('✅ Supabase session created successfully');
    console.log('✅ OAuth2 flow completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        email: email,
        profile: {
          name: profileData.name,
          username: profileData.username,
          enterprise_name: profileData.enterprise_name,
          rubrica: profileData.rubrica,
        },
        supabaseUserId: supabaseUser.id,
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('❌ OAuth callback error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'OAuth callback failed',
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
