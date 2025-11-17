// ═══════════════════════════════════════════════════════
// TMWE EMAIL SEARCH PROXY - DEDICATED /email_search API
// Version: email-search-v1.0
// Purpose: Clean, dedicated proxy for RabbitMQ + Elasticsearch API
// ═══════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TMWE_API_BASE = 'https://findair.it/erp/tmwe_json';
const TMWE_API_ENDPOINT = '/email_search';
const VERSION = 'email-search-v1.0';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`\n${'═'.repeat(55)}`);
  console.log(`🔄 [${VERSION}] REQUEST START`);
  console.log(`📍 Request ID: ${requestId}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log(`${'═'.repeat(55)}`);

  try {
    // Parse request body
    const body = await req.json();
    const { handler, timeout = 45, ...params } = body;

    console.log(`🎯 Handler: ${handler}`);
    console.log(`📦 Parameters:`, JSON.stringify(params, null, 2));

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user?.email) {
      throw new Error('Authentication failed');
    }

    console.log(`✅ User authenticated: ${user.email}`);

    // Get TMWE token
    const { data: tokenData, error: tokenError } = await supabase
      .from('user_profiles')
      .select('tmwe_token')
      .eq('user_id', user.id)
      .single();

    if (tokenError || !tokenData?.tmwe_token) {
      throw new Error('TMWE token not found');
    }

    console.log(`🔑 TMWE Token retrieved`);

    // Build request body for TMWE API
    const tmweRequestBody = {
      handler,
      ...params
    };

    console.log(`📤 Calling TMWE API: ${TMWE_API_BASE}${TMWE_API_ENDPOINT}`);
    console.log(`📦 Request body:`, JSON.stringify(tmweRequestBody, null, 2));

    // Call TMWE API
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout * 1000);

    const response = await fetch(`${TMWE_API_BASE}${TMWE_API_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenData.tmwe_token}`,
      },
      body: JSON.stringify(tmweRequestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log(`📊 TMWE API Response Status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ TMWE API Error: ${errorText}`);
      throw new Error(`TMWE API error: ${response.status}`);
    }

    const responseData = await response.json();
    console.log(`✅ TMWE API Response received`);
    console.log(`📦 Response keys:`, Object.keys(responseData).join(', '));

    if (responseData.emails) {
      console.log(`📧 Emails count: ${responseData.emails.length}`);
    }
    if (responseData.folders) {
      console.log(`📁 Folders count: ${responseData.folders.length}`);
    }

    console.log(`${'═'.repeat(55)}`);
    console.log(`✅ [${VERSION}] REQUEST COMPLETE`);
    console.log(`📍 Request ID: ${requestId}`);
    console.log(`${'═'.repeat(55)}\n`);

    return new Response(JSON.stringify(responseData), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-Proxy-Version': VERSION,
        'X-API-Type': 'email_search',
        'X-Request-Id': requestId,
      },
    });

  } catch (error: any) {
    console.error(`${'═'.repeat(55)}`);
    console.error(`❌ [${VERSION}] REQUEST FAILED`);
    console.error(`📍 Request ID: ${requestId}`);
    console.error(`🔥 Error:`, error.message);
    console.error(`${'═'.repeat(55)}\n`);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        version: VERSION,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-Proxy-Version': VERSION,
          'X-Request-Id': requestId,
        },
      }
    );
  }
});
