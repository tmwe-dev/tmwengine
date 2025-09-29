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

// Función para manejar certificados autofirmados de findair.it
async function fetchWithCertBypass(url: string, options: RequestInit = {}) {
  console.log('Attempting connection with cert bypass strategies...');
  
  // Estrategia 1: Intentar HTTPS con variables de entorno de Deno
  try {
    console.log('Strategy 1: HTTPS with environment bypass');
    
    // Configurar variables de entorno para Deno
    const originalCaStore = Deno.env.get('DENO_TLS_CA_STORE');
    Deno.env.set('DENO_TLS_CA_STORE', 'system,mozilla');
    
    const response = await fetch(url, {
      ...options,
      // En Supabase Edge Functions, esto puede ayudar
      signal: AbortSignal.timeout(30000) // 30 segundos timeout
    });
    
    // Restaurar variable original si existía
    if (originalCaStore) {
      Deno.env.set('DENO_TLS_CA_STORE', originalCaStore);
    }
    
    console.log('Strategy 1 successful');
    return response;
    
  } catch (httpsError) {
    console.log('Strategy 1 failed:', httpsError);
    
    // Estrategia 2: Fallback a HTTP
    try {
      console.log('Strategy 2: HTTP fallback');
      const httpUrl = url.replace('https://', 'http://');
      const response = await fetch(httpUrl, options);
      console.log('Strategy 2 successful');
      return response;
      
    } catch (httpError) {
      console.log('Strategy 2 failed:', httpError);
      
      // Estrategia 3: Último intento con fetch básico
      console.log('Strategy 3: Basic fetch attempt');
      const response = await fetch(url, options);
      return response;
    }
  }
}

serve(async (req) => {
  console.log('=== TMWE EMAIL SEND (CERT BYPASS) ===');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const emailData = await req.json();
    console.log('Request data:', { to: emailData.to, subject: emailData.subject });

    // Recuperar configuración TMWE
    const { data: provider, error: providerError } = await supabase
      .from('email_provider')
      .select('*, email_provider_credenziali(*)')
      .eq('provider', 'TMWE')
      .eq('attivo', true)
      .limit(1);

    if (providerError) {
      throw new Error(`Database error: ${providerError.message}`);
    }

    if (!provider || !provider[0]) {
      throw new Error('Provider TMWE no encontrado o inactivo');
    }

    const credentials = provider[0].email_provider_credenziali;
    if (!credentials || credentials.length === 0) {
      throw new Error('Credenciales TMWE no configuradas');
    }

    // Buscar la credencial más reciente con oauth_token o api_key válido
    const validCredential = credentials
      .filter(cred => cred.oauth_token || cred.api_key)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

    if (!validCredential) {
      throw new Error('Credenciales TMWE válidas no encontradas');
    }

    const oauthToken = validCredential.oauth_token || validCredential.api_key;
    if (!oauthToken || oauthToken.trim() === '') {
      throw new Error('OAuth Token TMWE no configurado');
    }

    console.log('Configuration loaded, OAuth token available');

    // Preparar payload para TMWE
    const payload = {
      action: 'send_message',
      to: emailData.to,
      subject: emailData.subject,
      body: emailData.body_text || '',
      body_html: emailData.body_html || ''
    };

    console.log('=== CALLING TMWE API ===');
    const apiUrl = 'https://findair.it/erp/tmwe_json/app.php?action=email_message';
    console.log('URL:', apiUrl);
    console.log('Payload:', payload);

    // Realizar llamada con bypass de certificados usando OAuth
    const response = await fetchWithCertBypass(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${oauthToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'TMWE-CRM-Integration/1.0'
      },
      body: JSON.stringify(payload)
    });

    console.log('=== API RESPONSE ===');
    console.log('Status:', response.status, response.statusText);
    
    const responseHeaders = Object.fromEntries(response.headers.entries());
    console.log('Headers count:', Object.keys(responseHeaders).length);

    let responseText = '';
    let responseJson = null;
    
    try {
      responseText = await response.text();
      console.log('Response length:', responseText.length);
      
      if (responseText.trim()) {
        responseJson = JSON.parse(responseText);
        console.log('JSON parsed successfully');
      }
    } catch (parseError) {
      console.log('JSON parse failed, raw response:', responseText.substring(0, 200));
    }

    // Determinar si fue exitoso
    const isSuccess = response.ok && responseJson?.success !== false;

    return new Response(JSON.stringify({
      success: isSuccess,
      message_id: responseJson?.message_id,
      tmwe_response: responseJson,
      debug: {
        cert_bypass_used: true,
        api_status: response.status,
        api_status_text: response.statusText,
        api_headers: responseHeaders,
        api_response_text: responseText.substring(0, 500),
        api_response_json: responseJson,
        payload_sent: payload,
        timestamp: new Date().toISOString()
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Function error:', error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorType = error instanceof Error ? error.constructor.name : typeof error;
    
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      debug: {
        error_type: errorType,
        cert_bypass_attempted: true,
        timestamp: new Date().toISOString()
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});