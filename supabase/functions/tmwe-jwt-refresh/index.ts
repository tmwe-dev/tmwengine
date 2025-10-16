import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OAuthRefreshRequest {
  email: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 Refreshing OAuth2 token...');
    
    const { email }: OAuthRefreshRequest = await req.json();
    
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

    console.log('📋 Fetching stored OAuth2 credentials...');

    // 1. Get stored OAuth2 credentials from database
    const { data: credentials, error: credsError } = await supabaseAdmin
      .from('user_tmwe_credentials')
      .select('*')
      .eq('email', email)
      .eq('token_type', 'oauth2')
      .single();

    if (credsError || !credentials) {
      console.error('❌ OAuth2 credentials not found:', credsError);
      throw new Error('OAuth2 credentials not found for user');
    }

    if (!credentials.refresh_token) {
      throw new Error('No refresh token available');
    }

    console.log('🔑 Refreshing OAuth2 token with TMWE API...');

    // 2. Refresh OAuth2 token using refresh_token grant type
    const tokenResponse = await fetch('https://findair.it/erp/tmwe_json/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: credentials.refresh_token,
        client_id: credentials.client_id,
        client_secret: credentials.client_secret,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      console.error('❌ OAuth2 refresh failed:', errorData);
      throw new Error(`OAuth2 refresh failed: ${errorData.error?.message || errorData.error || 'Unknown error'}`);
    }

    const tokenData = await tokenResponse.json();
    console.log('✅ New OAuth2 tokens obtained');

    const { access_token, expires_in } = tokenData;

    if (!access_token) {
      throw new Error('Invalid OAuth2 token response');
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
      .eq('token_type', 'oauth2');

    if (updateError) {
      console.error('Error updating OAuth2 credentials:', updateError);
      throw updateError;
    }

    console.log('✅ OAuth2 credentials updated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        access_token: access_token,
        expires_in: expires_in,
        token_format: 'oauth2',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('❌ OAuth2 refresh error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'OAuth2 refresh failed',
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
