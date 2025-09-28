import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Custom fetch con configuración SSL personalizada
async function fetchWithSelfSignedCert(url: string, options: RequestInit) {
  // Configurar agente HTTP personalizado que acepta certificados autofirmados
  const httpsAgent = {
    rejectUnauthorized: false, // Acepta certificados autofirmados
    checkServerIdentity: () => undefined // Ignora verificación de hostname
  };

  try {
    // En Deno, usamos fetch con configuración de TLS personalizada
    const response = await fetch(url, {
      ...options,
      // @ts-ignore - Configuración específica de Deno para SSL
      tls: {
        rejectUnauthorized: false,
        checkServerIdentity: false
      }
    });
    return response;
  } catch (error) {
    console.log('First attempt failed, trying with different approach:', error);
    
    // Fallback: intenta con fetch normal y captura el error
    try {
      return await fetch(url, options);
    } catch (secondError) {
      console.log('Both approaches failed:', secondError);
      throw secondError;
    }
  }
}

serve(async (req) => {
  console.log('=== TMWE API TEST (SSL SELF-SIGNED) ===');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const emailData = await req.json();
    console.log('Email data:', emailData);

    // Recupera API Key dal database
    const { data: provider } = await supabase
      .from('email_provider')
      .select('*, email_provider_credenziali(*)')
      .eq('provider', 'TMWE')
      .eq('attivo', true)
      .limit(1);

    const apiKey = provider?.[0]?.email_provider_credenziali?.[0]?.api_key;
    console.log('API Key found:', !!apiKey, 'Length:', apiKey?.length || 0);

    // Payload para la API TMWE
    const tmwePayload = {
      action: 'send_message',
      to: emailData.to,
      subject: emailData.subject,
      body: emailData.body_text,
      body_html: emailData.body_html
    };

    console.log('=== CALLING FINDAIR API (HTTPS + SSL BYPASS) ===');
    console.log('URL:', 'https://findair.it/erp/tmwe_json?app.php=email_message&action=send_message');
    console.log('Payload:', tmwePayload);
    console.log('SSL: Accepting self-signed certificates');

    // Llamada a la API TMWE con certificados autofirmados aceptados
    const response = await fetchWithSelfSignedCert('https://findair.it/erp/tmwe_json?app.php=email_message&action=send_message', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'TMWE-CRM-Integration/1.0'
      },
      body: JSON.stringify(tmwePayload)
    });

    console.log('=== API RESPONSE ===');
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));

    let responseText;
    let responseJson = null;
    
    try {
      responseText = await response.text();
      console.log('Response Text:', responseText);
      
      // Intenta parsear como JSON
      if (responseText) {
        responseJson = JSON.parse(responseText);
        console.log('Response JSON:', responseJson);
      }
    } catch (parseError) {
      console.log('JSON Parse Error:', parseError);
      console.log('Raw response was:', responseText);
    }

    // Retorna toda la información para debug
    return new Response(JSON.stringify({
      success: false, // Marcamos como false para debug
      debug: {
        api_called: true,
        api_url: 'https://findair.it/erp/tmwe_json?app.php=email_message&action=send_message',
        ssl_self_signed_accepted: true,
        api_status: response.status,
        api_status_text: response.statusText,
        api_headers: Object.fromEntries(response.headers.entries()),
        api_response_text: responseText,
        api_response_json: responseJson,
        payload_sent: tmwePayload,
        has_api_key: !!apiKey,
        api_key_length: apiKey?.length || 0
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Function Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: String(error),
      debug: {
        error_type: typeof error,
        error_name: error?.constructor?.name,
        timestamp: new Date().toISOString(),
        ssl_note: 'Attempted to accept self-signed certificates'
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});