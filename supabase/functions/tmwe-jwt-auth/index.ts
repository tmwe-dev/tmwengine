import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface JwtAuthRequest {
  code: string;
  redirectUri: string;
}

// Helper function to decode JWT payload (without verification)
function decodeJwtPayload(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }
    
    // Decode base64url payload
    const payload = parts[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = atob(base64);
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔐 Iniciando JWT authentication flow...');
    console.log('📍 Request URL:', req.url);
    console.log('📍 Request method:', req.method);
    
    const requestBody = await req.json();
    console.log('📦 Request body received:', JSON.stringify(requestBody, null, 2));
    
    const { code, redirectUri }: JwtAuthRequest = requestBody;
    
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

    console.log('📤 Exchanging authorization code for JWT tokens...');
    
    const tokenRequestBody = {
      grant_type: 'authorization_code',
      code: code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    };
    
    console.log('📤 Token request body:', JSON.stringify(tokenRequestBody, null, 2));

    // 1. Exchange authorization code for JWT tokens using /exchange_code_for_jwt endpoint
    // Using application/json as documented in jwt-api-3.yaml
    const tokenResponse = await fetch('https://findair.it/erp/tmwe_json/exchange_code_for_jwt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tokenRequestBody),
    });

    console.log('📥 Token response status:', tokenResponse.status);
    console.log('📥 Token response headers:', JSON.stringify(Object.fromEntries(tokenResponse.headers.entries()), null, 2));
    
    const responseText = await tokenResponse.text();
    console.log('📥 Token response body (raw):', responseText);

    if (!tokenResponse.ok) {
      console.error('❌ JWT token exchange failed with status:', tokenResponse.status);
      console.error('❌ Response text:', responseText);
      
      let errorData;
      try {
        errorData = JSON.parse(responseText);
        console.error('❌ Parsed error data:', JSON.stringify(errorData, null, 2));
      } catch (e) {
        console.error('❌ Could not parse error response as JSON');
        errorData = { error: responseText || 'Unknown error' };
      }
      
      throw new Error(`JWT token exchange failed: ${errorData.error?.message || errorData.error || 'Unknown error'}`);
    }
    
    let tokenData;
    try {
      tokenData = JSON.parse(responseText);
      console.log('✅ Parsed token data:', JSON.stringify(tokenData, null, 2));
    } catch (e) {
      console.error('❌ Could not parse success response as JSON');
      throw new Error('Invalid JSON response from token endpoint');
    }

    console.log('✅ JWT tokens obtained');
    console.log('📧 User email:', tokenData.email);
    console.log('🆔 User ID:', tokenData.user_id);
    console.log('🏢 Anagrafica ID:', tokenData.anagrafica_id);
    console.log('🔑 Access token present:', !!tokenData.access_token);
    console.log('🔑 Refresh token present:', !!tokenData.refresh_token);
    console.log('⏱️ Expires in:', tokenData.expires_in);

    const { access_token, refresh_token, expires_in, email, user_id, anagrafica_id } = tokenData;

    if (!access_token || !email) {
      console.error('❌ Invalid token response:', { 
        has_access_token: !!access_token, 
        has_email: !!email,
        email_value: email 
      });
      throw new Error('Invalid token response: missing access_token or email');
    }

    // Decode JWT to extract claims
    console.log('🔓 Decoding JWT token...');
    const jwtPayload = decodeJwtPayload(access_token);
    if (!jwtPayload) {
      console.error('❌ Failed to decode JWT token');
      throw new Error('Failed to decode JWT token');
    }
    console.log('✅ JWT payload decoded:', JSON.stringify(jwtPayload, null, 2));

    console.log('👤 Fetching user profile from TMWE API...');
    console.log('👤 User ID for profile fetch:', user_id);

    // 2. Get user profile using the JWT access token
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
          tmwe_jwt: true,
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
      
      // Update user metadata with JWT info
      const { error: updateMetaError } = await supabaseAdmin.auth.admin.updateUserById(
        supabaseUser.id,
        {
          user_metadata: {
            tmwe_jwt: true,
            tmwe_user_id: user_id,
            tmwe_anagrafica_id: anagrafica_id,
          }
        }
      );
      
      if (updateMetaError) {
        console.error('Error updating user metadata:', updateMetaError);
      }
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

    // 5. Save TMWE JWT credentials in database with token_type = 'jwt'
    const expiresAt = expires_in ? new Date(Date.now() + (expires_in * 1000)).toISOString() : null;
    
    const { error: credsError } = await supabaseAdmin
      .from('user_tmwe_credentials')
      .upsert({
        email: email,
        access_token: access_token,
        refresh_token: refresh_token,
        expires_at: expiresAt,
        client_id: clientId,
        client_secret: clientSecret,
        token_type: 'jwt', // ✅ CRITICAL: Mark as JWT token
      }, {
        onConflict: 'email'
      });

    if (credsError) {
      console.error('Error saving JWT credentials:', credsError);
      throw credsError;
    }

    console.log('✅ TMWE JWT credentials saved');

    // 6. Generate Supabase session using generateLink (magic link flow)
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
    console.log('✅ JWT authentication flow completed successfully');
    
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
      // ✅ Return Supabase JWT tokens (not TMWE tokens)
      access_token: supabaseAccessToken,
      refresh_token: supabaseRefreshToken,
      // Include TMWE JWT info for reference
      tmwe_user_id: user_id,
      tmwe_anagrafica_id: anagrafica_id,
      token_format: 'jwt',
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
    console.error('❌ JWT authentication error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'JWT authentication failed',
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
