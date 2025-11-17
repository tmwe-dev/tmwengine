import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEBUG_MODE = Deno.env.get('DEBUG_MODE') === 'true';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (DEBUG_MODE) console.log('=== TMWE EMAIL SEND ===');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const emailData = await req.json();
    if (DEBUG_MODE) console.log('Request data:', { to: emailData.to, subject: emailData.subject });

    // Recuperar configuración TMWE
    const { data: provider, error: providerError } = await supabase
      .from('email_provider')
      .select('email_provider_credenziali(*)')
      .eq('provider', 'TMWE')
      .eq('attivo', true)
      .maybeSingle();

    if (providerError) {
      throw new Error(`Database error: ${providerError.message}`);
    }

    if (!provider) {
      throw new Error('Provider TMWE no encontrado o inactivo');
    }

    // email_provider_credenziali è un oggetto singolo (relazione 1:1), NON un array
    const creds = provider.email_provider_credenziali;
    
    if (!creds || (!creds.oauth_token?.trim() && !creds.api_key?.trim())) {
      throw new Error('Credenciales TMWE no configuradas o vacías');
    }

    const oauthToken = creds.oauth_token || creds.api_key;
    
    if (!oauthToken || oauthToken.trim() === '') {
      throw new Error('OAuth Token TMWE no configurado');
    }

    if (DEBUG_MODE) console.log('Configuration loaded, OAuth token available');

    // Construye el payload igual que el script bash funcional
    const payload = {
      handler: 'send_message',
      to: emailData.to,
      subject: emailData.subject,
      body: emailData.body_text || emailData.body || 'Test message body',
      body_html: emailData.body_html || ''
    };

    if (DEBUG_MODE) {
      console.log('Payload:', JSON.stringify(payload, null, 2));
      console.log('Token length:', oauthToken.length);
    }
    
    const apiUrl = 'https://findair.it/erp/tmwe_json/app.php?action=email_message';
    
    const headers = {
      'Authorization': `Bearer ${oauthToken}`,
      'Content-Type': 'application/json'
    };
    
    // Normal fetch without SSL bypass
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });

    if (DEBUG_MODE) {
      console.log('API Response Status:', response.status, response.statusText);
    }
    
    const responseText = await response.text();
    let responseJson = null;
    
    try {
      if (responseText.trim()) {
        responseJson = JSON.parse(responseText);
        if (DEBUG_MODE) console.log('Response:', JSON.stringify(responseJson, null, 2));
      }
    } catch (jsonError) {
      if (DEBUG_MODE) console.log('JSON parse error:', jsonError);
    }

    const debugInfo = DEBUG_MODE ? {
      api_status: response.status,
      api_status_text: response.statusText,
      api_response_json: responseJson,
      timestamp: new Date().toISOString(),
      is_success: response.ok
    } : undefined;

    // Determinar si fue exitoso
    const isSuccess = response.ok && (responseJson?.success !== false);

    return new Response(JSON.stringify({
      success: isSuccess,
      message_id: responseJson?.message_id,
      tmwe_response: responseJson,
      ...(DEBUG_MODE && { debug: debugInfo })
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Function error:', error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});