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
    const { endpoint, data, optimizationFlags } = await req.json();
    
    // Flags di ottimizzazione (opzionali, retrocompatibili)
    const enableLogging = optimizationFlags?.enableLogging ?? true;
    const useDoubleSerializat = optimizationFlags?.useDoubleSerializat ?? true;
    const useTextResponse = optimizationFlags?.useTextResponse ?? true;
    const useSequentialExecution = optimizationFlags?.useSequentialExecution ?? true;
    
    if (enableLogging) {
      console.log('═══════════════════════════════════════════════════════');
      console.log('🔄 TMWE API PROXY - Richiesta ricevuta');
      console.log('═══════════════════════════════════════════════════════');
      console.log('⏰ Timestamp:', new Date().toISOString());
      console.log('📍 Endpoint:', endpoint);
      console.log('🎯 Handler:', data?.handler);
      console.log('═══════════════════════════════════════════════════════');
    }

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

    if (enableLogging) {
      console.log('✅ User authenticated:', user.email);
    }

    // Get TMWE access token from request body or database
    let tmweAccessToken = data.bearerToken;
    
    if (!tmweAccessToken) {
      // Try to get from database as fallback
      const { data: configData, error: configError } = await supabaseClient
        .from('user_tmwe_credentials')
        .select('access_token')
        .eq('email', user.email)
        .single();

      if (configError || !configData?.access_token) {
        console.error('❌ No TMWE access token found for user');
        throw new Error('TMWE access token not found. Please login to TMWE first.');
      }

      tmweAccessToken = configData.access_token;
    }
    
    if (enableLogging) {
      console.log('🔑 TMWE Token retrieved (primi 20 chars):', tmweAccessToken.substring(0, 20) + '...');
    }

    // 🚀 GESTIONE BATCH OPERATIONS (Mark as Read con array di message_ids)
    if (data.handler === 'mark_as_read' && Array.isArray(data.message_ids)) {
      const messageIds = data.message_ids;
      
      if (enableLogging) {
        console.log(`📧 Batch Mark as Read: ${messageIds.length} messaggi`);
        console.log(`⚡ Modalità: ${useSequentialExecution ? 'SEQUENTIAL' : 'PARALLEL'}`);
      }
      
      let batchResults: any[];
      const batchStartTime = Date.now();
      
      if (useSequentialExecution) {
        // SEQUENZIALE (lento)
        batchResults = [];
        for (const msgId of messageIds) {
          const singleResponse = await fetch(`https://findair.it/erp/tmwe_json${endpoint}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${tmweAccessToken}`,
              'Accept': 'application/json',
            },
            body: JSON.stringify({ handler: 'mark_as_read', message_id: msgId }),
          });
          const singleData = await singleResponse.json();
          batchResults.push(singleData);
        }
      } else {
        // PARALLELO (veloce) 🚀
        const promises = messageIds.map(msgId => 
          fetch(`https://findair.it/erp/tmwe_json${endpoint}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${tmweAccessToken}`,
              'Accept': 'application/json',
            },
            body: JSON.stringify({ handler: 'mark_as_read', message_id: msgId }),
          }).then(r => r.json())
        );
        batchResults = await Promise.all(promises);
      }
      
      const batchEndTime = Date.now();
      
      if (enableLogging) {
        console.log(`✅ Batch completato in ${batchEndTime - batchStartTime}ms`);
      }
      
      return new Response(JSON.stringify({ 
        success: true, 
        results: batchResults,
        executionTime: batchEndTime - batchStartTime
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // NORMALE SINGLE REQUEST
    const tmweUrl = `https://findair.it/erp/tmwe_json${endpoint}`;
    
    if (enableLogging) {
      console.log('📤 Chiamata a TMWE API:', tmweUrl);
      if (!useDoubleSerializat) {
        console.log('📦 Request body:', data);
      } else {
        console.log('📦 Request body:', JSON.stringify(data, null, 2));
      }
    }

    const tmweResponse = await fetch(tmweUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tmweAccessToken}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify(data),
    });

    // Response processing ottimizzato o tradizionale
    let responseData: any;
    if (useTextResponse) {
      const responseText = await tmweResponse.text();
      responseData = responseText;
      
      if (enableLogging) {
        console.log('═══════════════════════════════════════════════════════');
        console.log('📥 RISPOSTA TMWE API');
        console.log('═══════════════════════════════════════════════════════');
        console.log('📊 Status:', tmweResponse.status, tmweResponse.statusText);
        console.log('📦 Response (primi 500 chars):', responseText.substring(0, 500));
        console.log('═══════════════════════════════════════════════════════');
      }
    } else {
      // Ottimizzazione: usa .json() diretto
      const responseJson = await tmweResponse.json();
      responseData = JSON.stringify(responseJson);
      
      if (enableLogging) {
        console.log('═══════════════════════════════════════════════════════');
        console.log('📥 RISPOSTA TMWE API (JSON direct)');
        console.log('═══════════════════════════════════════════════════════');
        console.log('📊 Status:', tmweResponse.status, tmweResponse.statusText);
        console.log('═══════════════════════════════════════════════════════');
      }
    }

    if (!tmweResponse.ok) {
      if (enableLogging) {
        console.error('❌ ERRORE HTTP dalla TMWE API');
        console.error('📊 Status:', tmweResponse.status);
        console.error('📄 Response:', responseData);
      }
      
      return new Response(
        JSON.stringify({ 
          error: `TMWE API Error: ${tmweResponse.status}`,
          details: responseData 
        }),
        {
          status: tmweResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (enableLogging) {
      console.log('✅ Risposta TMWE API riuscita');
    }

    return new Response(responseData, {
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
