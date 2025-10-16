import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { endpoint, data } = await req.json();
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔄 TMWE API PROXY - Richiesta ricevuta');
    console.log('═══════════════════════════════════════════════════════');
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('📍 Endpoint:', endpoint);
    console.log('🎯 Handler:', data?.handler);
    console.log('═══════════════════════════════════════════════════════');

    // Get auth header from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Extract JWT token from Authorization header
    const token = authHeader.replace('Bearer ', '');
    
    // Verify JWT and get user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      console.error('❌ Auth error:', authError);
      throw new Error('Unauthorized');
    }

    console.log('✅ User authenticated:', user.email);

    // Get TMWE access token from database
    const { data: configData, error: configError } = await supabaseClient
      .from('tmwe_api_config')
      .select('access_token')
      .eq('user_id', user.id)
      .single();

    if (configError || !configData?.access_token) {
      console.error('❌ No TMWE access token found for user');
      throw new Error('TMWE access token not found. Please login to TMWE first.');
    }

    const tmweAccessToken = configData.access_token;
    console.log('🔑 TMWE Token retrieved (primi 20 chars):', tmweAccessToken.substring(0, 20) + '...');

    // Make request to TMWE API
    const tmweUrl = `https://findair.it/erp/tmwe_json${endpoint}`;
    
    console.log('📤 Chiamata a TMWE API:', tmweUrl);
    console.log('📦 Request body:', JSON.stringify(data, null, 2));

    const tmweResponse = await fetch(tmweUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tmweAccessToken}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const responseText = await tmweResponse.text();

    console.log('═══════════════════════════════════════════════════════');
    console.log('📥 RISPOSTA TMWE API');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 Status:', tmweResponse.status, tmweResponse.statusText);
    console.log('📦 Response (primi 500 chars):', responseText.substring(0, 500));
    console.log('═══════════════════════════════════════════════════════');

    if (!tmweResponse.ok) {
      console.error('❌ ERRORE HTTP dalla TMWE API');
      console.error('📊 Status:', tmweResponse.status);
      console.error('📄 Response:', responseText);
      
      return new Response(
        JSON.stringify({ 
          error: `TMWE API Error: ${tmweResponse.status}`,
          details: responseText 
        }),
        {
          status: tmweResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('✅ Risposta TMWE API riuscita');

    return new Response(responseText, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.log('═══════════════════════════════════════════════════════');
    console.error('🔥 ERRORE nel Proxy');
    console.log('═══════════════════════════════════════════════════════');
    console.error('⚠️ Error:', error);
    console.error('📄 Error Message:', error.message);
    console.log('═══════════════════════════════════════════════════════');
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
