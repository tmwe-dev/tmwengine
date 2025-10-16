import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface JWTSignRequest {
  clientId: string;
  clientSecret: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📍 Request URL:', req.url);
    console.log('📍 Request method:', req.method);
    console.log('📍 Timestamp:', new Date().toISOString());
    console.log('🔐 Starting JWT signature generation...');

    const { clientId, clientSecret }: JWTSignRequest = await req.json();

    if (!clientId || !clientSecret) {
      throw new Error('Missing clientId or clientSecret');
    }

    console.log('🔑 Client ID:', clientId);

    // Initialize Supabase Admin Client to verify user
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

    // Get current user from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      throw new Error(`User authentication failed: ${userError?.message}`);
    }

    console.log('✅ User authenticated:', user.email);

    // Generate JWT Header (FIXED: use HS256 according to JWT_IMPLEMENTATION.md)
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };

    // Generate JWT Payload according to RFC 7523 and JWT_IMPLEMENTATION.md
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: 'https://findair.it/erp/tmwe_json', // CRITICAL FIX: correct issuer
      sub: clientId,
      aud: 'https://findair.it/erp/tmwe_json/token',
      exp: now + 300, // 5 minutes expiration
      iat: now,
      jti: crypto.randomUUID()
    };

    console.log('📝 JWT Payload:', payload);

    // Encode header and payload
    const encoder = new TextEncoder();
    const headerBase64 = btoa(JSON.stringify(header))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    const payloadBase64 = btoa(JSON.stringify(payload))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    // Sign with HS256 (HMAC-SHA256) using client_secret as key
    const message = `${headerBase64}.${payloadBase64}`;
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(clientSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(message)
    );

    // Convert signature to base64url
    const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    const jwt = `${message}.${signatureBase64}`;

    console.log('✅ JWT signed successfully');
    console.log('   JWT length:', jwt.length);
    console.log('   JWT preview:', jwt.substring(0, 50) + '...');

    return new Response(
      JSON.stringify({
        jwt,
        expiresIn: 300
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ JWT signing error:', error);
    console.error('   Error message:', error instanceof Error ? error.message : String(error));
    console.error('   Stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'JWT signing failed',
        details: error instanceof Error ? error.stack : String(error)
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
