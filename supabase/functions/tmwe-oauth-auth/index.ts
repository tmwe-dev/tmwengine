import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OAuthAuthRequest {
  code: string;
  redirectUri: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔐 Iniciando OAuth authentication flow...');
    console.log('📍 Request URL:', req.url);
    console.log('📍 Request method:', req.method);
    console.log('📍 Timestamp:', new Date().toISOString());
    
    const requestBody = await req.json();
    console.log('📦 Request body received:', JSON.stringify(requestBody, null, 2));
    
    const { code, redirectUri }: OAuthAuthRequest = requestBody;
    
    if (!code || !redirectUri) {
      console.error('❌ Missing required parameters:', { code: !!code, redirectUri: !!redirectUri });
      return new Response(
        JSON.stringify({ error: 'Missing code or redirectUri' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get OAuth credentials from Supabase secrets
    const clientId = Deno.env.get('TMWE_CLIENT_ID');
    const clientSecret = Deno.env.get('TMWE_CLIENT_SECRET');
    
    console.log('🔑 Client ID:', clientId);
    console.log('🔑 Client Secret present:', !!clientSecret);
    console.log('🔑 Code length:', code.length);
    console.log('🔑 Redirect URI:', redirectUri);
    
    if (!clientSecret) {
      console.error('❌ TMWE_CLIENT_SECRET not configured');
      throw new Error('TMWE_CLIENT_SECRET not configured');
    }

    console.log('📤 Exchanging authorization code for OAuth tokens via /token endpoint...');
    
    // 1. Exchange authorization code for OAuth tokens using /token endpoint
    // Using application/x-www-form-urlencoded as per OAuth2 standard
    const tokenEndpoint = 'https://findair.it/erp/tmwe_json/token';
    const formData = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    });
    
    console.log('🌐 API Call Details:');
    console.log('  📍 Endpoint:', tokenEndpoint);
    console.log('  📋 Method: POST');
    console.log('  📦 Content-Type: application/x-www-form-urlencoded');
    console.log('  📝 Parameters:', {
      grant_type: 'authorization_code',
      client_id: clientId,
      redirect_uri: redirectUri,
      code_length: code.length
    });

    const tokenResponse = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    console.log('📥 API Response:');
    console.log('  📊 Status Code:', tokenResponse.status);
    console.log('  📊 Status Text:', tokenResponse.statusText);
    console.log('  📋 Response Headers:', JSON.stringify(Object.fromEntries(tokenResponse.headers.entries()), null, 2));
    
    const responseText = await tokenResponse.text();
    console.log('📥 Token response body (raw):', responseText);

    if (!tokenResponse.ok) {
      console.error('❌ OAuth2 token exchange failed with status:', tokenResponse.status);
      console.error('❌ Response text:', responseText);
      
      let errorData;
      try {
        errorData = JSON.parse(responseText);
        console.error('❌ Parsed error data:', JSON.stringify(errorData, null, 2));
      } catch (e) {
        console.error('❌ Could not parse error response as JSON');
        errorData = { error: responseText || 'Unknown error' };
      }
      
      throw new Error(`OAuth2 token exchange failed: ${errorData.error?.message || errorData.error || 'Unknown error'}`);
    }
    
    let tokenData;
    try {
      tokenData = JSON.parse(responseText);
      console.log('✅ Parsed token data:', JSON.stringify(tokenData, null, 2));
    } catch (e) {
      console.error('❌ Could not parse success response as JSON');
      throw new Error('Invalid JSON response from token endpoint');
    }

    console.log('✅ OAuth tokens obtained');
    console.log('🔑 Access token present:', !!tokenData.access_token);
    console.log('⏱️ Expires in:', tokenData.expires_in);
    console.log('📧 Email from token response:', tokenData.email);

    const { access_token, expires_in, email } = tokenData;

    if (!access_token || !email) {
      console.error('❌ Invalid token response:', { 
        has_access_token: !!access_token, 
        has_email: !!email
      });
      throw new Error('Invalid token response: missing access_token or email');
    }

    // 2. Get user profile from get_my_profile endpoint
    console.log('👤 Fetching user profile from get_my_profile endpoint...');
    const myProfileEndpoint = 'https://findair.it/erp/tmwe_json/get_my_profile';
    
    console.log('🌐 API Call Details:');
    console.log('  📍 Endpoint:', myProfileEndpoint);
    console.log('  📋 Method: GET');
    console.log('  🔑 Authorization: Bearer [OAuth token]');
    
    const myProfileResponse = await fetch(myProfileEndpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('📥 API Response:');
    console.log('  📊 Status Code:', myProfileResponse.status);
    console.log('  📊 Status Text:', myProfileResponse.statusText);
    
    if (!myProfileResponse.ok) {
      const errorText = await myProfileResponse.text();
      console.error('❌ get_my_profile failed - Response body:', errorText);
      throw new Error(`Failed to fetch my profile: ${myProfileResponse.statusText}`);
    }

    const profileData = await myProfileResponse.json();
    console.log('✅ Profile obtained:', JSON.stringify(profileData, null, 2));
    
    // Use email as user_id (primary identifier)
    const user_id = email;
    const anagrafica_id = profileData.anagrafica_id || null;
    
    console.log('✅ Using email as user_id:', user_id);

    // 3. Initialize Supabase Admin Client
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

    // 4. Find or create Supabase user
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
          tmwe_user_id: user_id, // email
          tmwe_anagrafica_id: anagrafica_id,
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
      
      // Update user metadata with OAuth info
      const { error: updateMetaError } = await supabaseAdmin.auth.admin.updateUserById(
        supabaseUser.id,
        {
          user_metadata: {
            tmwe_oauth: true,
            tmwe_user_id: user_id, // email
            tmwe_anagrafica_id: anagrafica_id,
          }
        }
      );
      
      if (updateMetaError) {
        console.error('Error updating user metadata:', updateMetaError);
      }
    }

    // 5. Update/create user profile
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

    // 6. Save TMWE OAuth credentials in database with token_type = 'oauth'
    const expiresAt = expires_in ? new Date(Date.now() + (expires_in * 1000)).toISOString() : null;
    
    const { error: credsError } = await supabaseAdmin
      .from('user_tmwe_credentials')
      .upsert({
        email: email,
        access_token: access_token,
        refresh_token: tokenData.refresh_token || null,
        expires_at: expiresAt,
        client_id: clientId,
        client_secret: clientSecret,
        token_type: 'oauth', // ✅ CRITICAL: Mark as OAuth token
      }, {
        onConflict: 'email'
      });

    if (credsError) {
      console.error('Error saving OAuth credentials:', credsError);
      throw credsError;
    }

    console.log('✅ TMWE OAuth credentials saved');

    // 7. Generate Supabase session tokens directly
    console.log('🔐 Generating Supabase session tokens...');

    // Use the user's ID to create a session directly
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.createSession({
      user_id: supabaseUser.id
    });

    if (sessionError || !sessionData?.session) {
      console.error('Error creating session:', sessionError);
      throw new Error(`Failed to create session: ${sessionError?.message || 'No session created'}`);
    }

    const supabaseAccessToken = sessionData.session.access_token;
    const supabaseRefreshToken = sessionData.session.refresh_token;

    console.log('✅ Supabase session tokens generated successfully');
    console.log('✅ OAuth authentication flow completed successfully');
    
    const finalResponse = {
      success: true,
      email: email,
      profile: {
        name: profileData.name,
        username: profileData.username,
        enterprise_name: profileData.enterprise_name,
        rubrica: profileData.rubrica,
      },
      supabaseUserId: supabaseUser.id,
      // ✅ Return Supabase session tokens for authentication
      access_token: supabaseAccessToken,
      refresh_token: supabaseRefreshToken,
      // Include TMWE OAuth info for reference
      tmwe_user_id: user_id, // email
      tmwe_anagrafica_id: anagrafica_id,
      tmwe_access_token: access_token, // TMWE OAuth token stored in credentials
      token_format: 'oauth',
    };
    
    console.log('📤 Returning final response:', JSON.stringify(finalResponse, null, 2));

    return new Response(
      JSON.stringify(finalResponse),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('❌ OAuth authentication error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'OAuth authentication failed',
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
