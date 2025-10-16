import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface JWTRefreshRequest {
  email: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔐 Starting JWT refresh flow...');

    const { email }: JWTRefreshRequest = await req.json();

    if (!email) {
      throw new Error('Email is required');
    }

    console.log('📧 Email:', email);

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

    // Fetch existing JWT credentials from database
    const { data: credentials, error: fetchError } = await supabaseAdmin
      .from('user_tmwe_credentials')
      .select('*')
      .eq('email', email)
      .single();

    if (fetchError || !credentials) {
      throw new Error(`Failed to fetch credentials: ${fetchError?.message || 'No credentials found'}`);
    }

    console.log('✅ Credentials found');
    console.log('   Refresh token present:', !!credentials.refresh_token);

    if (!credentials.refresh_token) {
      throw new Error('No refresh token available');
    }

    if (!credentials.client_id || !credentials.client_secret) {
      throw new Error('Missing client credentials');
    }

    // CRITICAL: Use refresh_token_jwt grant type for JWT according to jwt-api.yaml
    console.log('📤 Refreshing JWT access token...');

    const tokenResponse = await fetch('https://findair.it/erp/tmwe_json/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token_jwt', // CRITICAL FIX: use refresh_token_jwt for JWT
        refresh_token: credentials.refresh_token,
        client_id: credentials.client_id,
        client_secret: credentials.client_secret,
      }),
    });

    console.log('📥 Token response status:', tokenResponse.status);

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('❌ Token refresh failed:', errorText);
      throw new Error(`Token refresh failed: ${tokenResponse.status} ${errorText}`);
    }

    const tokenData = await tokenResponse.json();

    console.log('✅ New tokens received');
    console.log('   Access token:', tokenData.access_token?.substring(0, 20) + '...');
    console.log('   Expires in:', tokenData.expires_in);

    // Calculate expiration timestamp
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    // Update credentials in database
    const { error: updateError } = await supabaseAdmin
      .from('user_tmwe_credentials')
      .update({
        access_token: tokenData.access_token,
        expires_at: expiresAt,
        // Only update refresh_token if a new one is provided
        ...(tokenData.refresh_token && { refresh_token: tokenData.refresh_token })
      })
      .eq('email', email);

    if (updateError) {
      console.error('❌ Error updating credentials:', updateError);
      throw new Error(`Failed to update credentials: ${updateError.message}`);
    }

    console.log('✅ Credentials updated successfully');

    return new Response(
      JSON.stringify({
        access_token: tokenData.access_token,
        expires_in: tokenData.expires_in,
        token_type: 'Bearer'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ JWT refresh error:', error);
    console.error('   Error message:', error instanceof Error ? error.message : String(error));
    console.error('   Stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'JWT refresh failed',
        details: error instanceof Error ? error.stack : String(error)
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
