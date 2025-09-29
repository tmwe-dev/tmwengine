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
    console.log('Credentials found:', credentials?.length || 0);
    
    if (!credentials || credentials.length === 0) {
      throw new Error('Credenciales TMWE no configuradas');
    }

    // Buscar la credencial más reciente con token válido
    let validCredential = null;
    for (const cred of credentials) {
      console.log('Checking credential:', { 
        id: cred.id, 
        has_oauth: !!cred.oauth_token, 
        has_api_key: !!cred.api_key,
        oauth_length: cred.oauth_token?.length,
        api_key_length: cred.api_key?.length,
        created_at: cred.created_at
      });
      
      if ((cred.oauth_token && cred.oauth_token.trim() !== '') || 
          (cred.api_key && cred.api_key.trim() !== '')) {
        if (!validCredential || new Date(cred.created_at) > new Date(validCredential.created_at)) {
          validCredential = cred;
          console.log('Found valid credential:', validCredential.id);
        }
      }
    }

    if (!validCredential) {
      throw new Error('Credenciales TMWE válidas no encontradas');
    }

    const oauthToken = validCredential.oauth_token || validCredential.api_key;
    console.log('Using token length:', oauthToken?.length);
    
    if (!oauthToken || oauthToken.trim() === '') {
      throw new Error('OAuth Token TMWE no configurado');
    }

    console.log('Configuration loaded, OAuth token available');

    // Preparar payload para TMWE según documentación OpenAPI
    const payload = {
      action: 'send_message',
      to: emailData.to,
      subject: emailData.subject,
      body: emailData.body_text || emailData.body || '',
      body_html: emailData.body_html || ''
    };

    console.log('=== CALLING TMWE API ===');
    const apiUrl = 'https://findair.it/erp/tmwe_json/app.php?action=email_message';
    console.log('URL completa:', apiUrl);
    console.log('Payload completo:', JSON.stringify(payload, null, 2));

    const headers = {
      'Authorization': `Bearer ${oauthToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'TMWE-CRM-Integration/1.0'
    };
    
    console.log('Headers enviados:', JSON.stringify(headers, null, 2));
    console.log('Token usado (primeros 20 chars):', oauthToken.substring(0, 20) + '...');

    // Realizar llamada con bypass de certificados usando OAuth
    const response = await fetchWithCertBypass(apiUrl, {
      method: 'POST',
      headers: headers,
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
      console.log('Raw response text:', responseText);
      
      if (responseText.trim()) {
        try {
          responseJson = JSON.parse(responseText);
          console.log('JSON parsed successfully:', JSON.stringify(responseJson, null, 2));
        } catch (jsonError) {
          console.log('JSON parse error:', jsonError);
          console.log('Raw response for JSON error:', responseText);
        }
      } else {
        console.log('Empty response body received');
      }
    } catch (parseError) {
      console.log('Text extraction failed:', parseError);
    }

    // Crear respuesta detallada del debug
    const debugInfo = {
      cert_bypass_used: true,
      api_status: response.status,
      api_status_text: response.statusText,
      api_headers: responseHeaders,
      api_response_text: responseText,
      api_response_json: responseJson,
      payload_sent: payload,
      url_used: apiUrl,
      headers_sent: {
        'Authorization': `Bearer ${oauthToken.substring(0, 20)}...`,
        'Content-Type': headers['Content-Type'],
        'Accept': headers['Accept'],
        'User-Agent': headers['User-Agent']
      },
      timestamp: new Date().toISOString(),
      is_success: response.ok,
      has_response_content: !!responseText.trim()
    };

    console.log('=== FINAL DEBUG INFO ===');
    console.log(JSON.stringify(debugInfo, null, 2));

    // Determinar si fue exitoso
    const isSuccess = response.ok && (responseJson?.success !== false);

    return new Response(JSON.stringify({
      success: isSuccess,
      message_id: responseJson?.message_id,
      tmwe_response: responseJson,
      error_details: !response.ok ? {
        status: response.status,
        status_text: response.statusText,
        response_body: responseText,
        headers: responseHeaders
      } : null,
      debug: debugInfo
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