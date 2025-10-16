import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface JwtRefreshRequest {
  email: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 Refreshing JWT token...');
    
    const { email }: JwtRefreshRequest = await req.json();
    
    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Missing email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    console.log('📋 Fetching stored JWT credentials...');

    // 1. Get stored JWT credentials from database
    const { data: credentials, error: credsError } = await supabaseAdmin
      .from('user_tmwe_credentials')
      .select('*')
      .eq('email', email)
      .eq('token_type', 'jwt')
      .single();

    if (credsError || !credentials) {
      console.error('❌ JWT credentials not found:', credsError);
      throw new Error('JWT credentials not found for user');
    }

    if (!credentials.refresh_token) {
      throw new Error('No refresh token available');
    }

    console.log('🔑 Refreshing JWT token with TMWE API...');

    // 2. Refresh JWT token using refresh_token_jwt grant type
    const tokenEndpoint = 'https://findair.it/erp/tmwe_json/token';
    const formData = new URLSearchParams({
      grant_type: 'refresh_token_jwt',
      refresh_token: credentials.refresh_token,
    });
    
    console.log('🌐 API Call Details:');
    console.log('  📍 Endpoint:', tokenEndpoint);
    console.log('  📋 Method: POST');
    console.log('  📦 Content-Type: application/x-www-form-urlencoded');
    console.log('  📝 Parameters:', {
      grant_type: 'refresh_token_jwt',
      refresh_token_length: credentials.refresh_token.length
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
    
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      console.error('❌ JWT refresh failed - Response:', errorData);
      throw new Error(`JWT refresh failed: ${errorData.error?.message || errorData.error || 'Unknown error'}`);
    }

    const tokenData = await tokenResponse.json();
    console.log('✅ New JWT tokens obtained:', {
      has_access_token: !!tokenData.access_token,
      expires_in: tokenData.expires_in
    });

    const { access_token, expires_in } = tokenData;

    if (!access_token) {
      throw new Error('Invalid JWT token response');
    }

    // 3. Update stored credentials with new tokens
    const expiresAt = expires_in ? new Date(Date.now() + (expires_in * 1000)).toISOString() : null;
    
    const updateData: any = {
      access_token: access_token,
      expires_at: expiresAt,
    };
    
    // Update refresh_token if a new one was provided
    if (tokenData.refresh_token) {
      updateData.refresh_token = tokenData.refresh_token;
    }
    
    const { error: updateError } = await supabaseAdmin
      .from('user_tmwe_credentials')
      .update(updateData)
      .eq('email', email)
      .eq('token_type', 'jwt');

    if (updateError) {
      console.error('Error updating JWT credentials:', updateError);
      throw updateError;
    }

    console.log('✅ JWT credentials updated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        access_token: access_token,
        expires_in: expires_in,
        token_format: 'jwt',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('❌ JWT refresh error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'JWT refresh failed',
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
