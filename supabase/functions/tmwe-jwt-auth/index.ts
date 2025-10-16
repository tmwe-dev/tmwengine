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
    console.log('🔐 Iniciando OAuth2 authentication flow...');
    console.log('📍 Request URL:', req.url);
    console.log('📍 Request method:', req.method);
    
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
    const clientId = Deno.env.get('TMWE_CLIENT_ID') || '30eb3689ecfe890adfda0578d61ad858cf9f98999a919e0cd7bb798df17b006f';
    const clientSecret = Deno.env.get('TMWE_CLIENT_SECRET');
    
    console.log('🔑 Client ID:', clientId);
    console.log('🔑 Client Secret present:', !!clientSecret);
    console.log('🔑 Code length:', code.length);
    console.log('🔑 Redirect URI:', redirectUri);
    
    if (!clientSecret) {
      console.error('❌ TMWE_CLIENT_SECRET not configured');
      throw new Error('TMWE_CLIENT_SECRET not configured');
    }

    console.log('📤 Exchanging authorization code for OAuth2 tokens...');
    
    // Prepare form data for OAuth2 token endpoint
    const formData = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    });
    
    console.log('📤 Token request (form-urlencoded):', formData.toString());

    // 1. Exchange authorization code for OAuth2 tokens using /token endpoint
    // Using application/x-www-form-urlencoded as per OAuth2 spec
    const tokenResponse = await fetch('https://findair.it/erp/tmwe_json/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    console.log('📥 Token response status:', tokenResponse.status);
    console.log('📥 Token response headers:', JSON.stringify(Object.fromEntries(tokenResponse.headers.entries()), null, 2));
    
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

    console.log('✅ OAuth2 tokens obtained');
    console.log('🔑 Access token present:', !!tokenData.access_token);
    console.log('⏱️ Expires in:', tokenData.expires_in);

    const { access_token, expires_in } = tokenData;

    if (!access_token) {
      console.error('❌ Invalid token response - missing access_token');
      throw new Error('Invalid token response: missing access_token');
    }

    console.log('👤 Fetching user info from TMWE API using access token...');

    // 2. Get user info using the OAuth2 access token
    const userInfoResponse = await fetch('https://findair.it/erp/tmwe_json/user_info', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    });

    console.log('📥 User info response status:', userInfoResponse.status);
    
    if (!userInfoResponse.ok) {
      const errorText = await userInfoResponse.text();
      console.error('❌ User info fetch failed:', errorText);
      throw new Error(`Failed to fetch user info: ${userInfoResponse.statusText}`);
    }

    const userInfo = await userInfoResponse.json();
    console.log('✅ User info obtained:', JSON.stringify(userInfo, null, 2));
    
    const { email, user_id, anagrafica_id } = userInfo;
    
    if (!email || !user_id) {
      console.error('❌ Invalid user info response:', { 
        has_email: !!email, 
        has_user_id: !!user_id 
      });
      throw new Error('Invalid user info response: missing email or user_id');
    }

    // 3. Get user profile from contatti endpoint
    console.log('👤 Fetching detailed profile from TMWE contatti API...');
    const profileResponse = await fetch('https://findair.it/erp/tmwe_json/contatti', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        handler: 'get',
        id: user_id,
      }),
    });

    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      console.error('❌ Profile fetch failed:', errorText);
      throw new Error(`Failed to fetch profile: ${profileResponse.statusText}`);
    }

    const profileData = await profileResponse.json();
    console.log('✅ Profile obtained:', JSON.stringify(profileData, null, 2));

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
          tmwe_user_id: user_id,
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
            tmwe_user_id: user_id,
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

    // 6. Save TMWE OAuth2 credentials in database with token_type = 'oauth2'
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
        token_type: 'oauth2', // ✅ CRITICAL: Mark as OAuth2 token
      }, {
        onConflict: 'email'
      });

    if (credsError) {
      console.error('Error saving OAuth2 credentials:', credsError);
      throw credsError;
    }

    console.log('✅ TMWE OAuth2 credentials saved');

    // 7. Generate Supabase session using generateLink (magic link flow)
    console.log('🔐 Generating Supabase session tokens...');

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: `${Deno.env.get('SUPABASE_URL')}/auth/v1/verify`,
      }
    });

    if (linkError || !linkData) {
      console.error('Error generating magic link:', linkError);
      throw new Error(`Failed to generate session: ${linkError?.message || 'No link generated'}`);
    }

    // Extract access and refresh tokens from the magic link
    const url = new URL(linkData.properties.action_link);
    const supabaseAccessToken = url.searchParams.get('access_token');
    const supabaseRefreshToken = url.searchParams.get('refresh_token');

    if (!supabaseAccessToken || !supabaseRefreshToken) {
      throw new Error('Failed to extract Supabase tokens from magic link');
    }

    console.log('✅ Supabase session tokens generated successfully');
    console.log('✅ OAuth2 authentication flow completed successfully');
    
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
      // ✅ Return Supabase JWT tokens (not TMWE OAuth2 tokens)
      access_token: supabaseAccessToken,
      refresh_token: supabaseRefreshToken,
      // Include TMWE OAuth2 info for reference
      tmwe_user_id: user_id,
      tmwe_anagrafica_id: anagrafica_id,
      token_format: 'oauth2',
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
    console.error('❌ OAuth2 authentication error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'OAuth2 authentication failed',
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
