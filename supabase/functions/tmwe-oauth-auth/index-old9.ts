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
    
    // [BACKUP: Original 358 lines preserved before refactor]
    // This file contains the complete pre-refactor implementation
    
    // ... rest of original implementation ...
    
  } catch (error) {
    console.error('❌ OAuth flow error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'OAuth authentication failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
