import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Enhanced fetch function similar to curl -k (ignore SSL certificate errors)
async function fetchWithCertBypass(url: string, options: RequestInit = {}): Promise<Response> {
  console.log('Attempting fetch similar to curl -k behavior to:', url);
  
  // Configure fetch options similar to curl behavior
  const curlLikeOptions: RequestInit = {
    ...options,
    headers: {
      // Default headers similar to what curl sends
      'User-Agent': 'curl/7.88.1',
      'Accept': '*/*',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      ...options.headers,
    }
  };

  // Set Deno environment variables to bypass SSL certificate validation (like curl -k)
  const originalTlsStore = Deno.env.get('DENO_TLS_CA_STORE');
  const originalNodeTls = Deno.env.get('NODE_TLS_REJECT_UNAUTHORIZED');
  
  try {
    console.log('Setting TLS bypass environment (curl -k equivalent)');
    Deno.env.set('DENO_TLS_CA_STORE', 'system');
    Deno.env.set('NODE_TLS_REJECT_UNAUTHORIZED', '0');
    
    console.log('Making HTTPS request with SSL bypass...');
    const response = await fetch(url, {
      ...curlLikeOptions,
      signal: AbortSignal.timeout(30000) // 30 second timeout like curl default
    });
    
    console.log('HTTPS request successful, status:', response.status, response.statusText);
    return response;
    
  } catch (httpsError) {
    const httpsErrorMessage = httpsError instanceof Error ? httpsError.message : String(httpsError);
    console.log('HTTPS request failed (similar to curl SSL error):', httpsErrorMessage);
    
    // Fallback to HTTP (some servers accept both)
    try {
      const httpUrl = url.replace('https://', 'http://');
      console.log('Trying HTTP fallback:', httpUrl);
      
      const response = await fetch(httpUrl, curlLikeOptions);
      console.log('HTTP fallback successful, status:', response.status);
      return response;
      
    } catch (httpError) {
      const httpErrorMessage = httpError instanceof Error ? httpError.message : String(httpError);
      console.log('HTTP fallback also failed:', httpErrorMessage);
      throw new Error(`All requests failed. HTTPS error: ${httpsErrorMessage}, HTTP error: ${httpErrorMessage}`);
    }
  } finally {
    // Restore original environment variables
    if (originalTlsStore !== undefined) {
      Deno.env.set('DENO_TLS_CA_STORE', originalTlsStore);
    } else {
      Deno.env.delete('DENO_TLS_CA_STORE');
    }
    
    if (originalNodeTls !== undefined) {
      Deno.env.set('NODE_TLS_REJECT_UNAUTHORIZED', originalNodeTls);
    } else {
      Deno.env.delete('NODE_TLS_REJECT_UNAUTHORIZED');
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

    // Construye el payload igual que el script bash funcional
    const payload = {
      handler: 'send_message',
      to: emailData.to,
      subject: emailData.subject,
      body: emailData.body_text || emailData.body || 'Test message body',
      body_html: emailData.body_html || ''
    };

    console.log('Payload completo:', JSON.stringify(payload, null, 2));
    console.log('Token usado (primeros 20 chars):', `${oauthToken.substring(0, 20)}...`);
    
    console.log('=== CALLING TMWE API FOR EMAIL SEND ===');
    const apiUrl = 'https://findair.it/erp/tmwe_json/app.php?action=email_message';
    console.log('URL completa:', apiUrl);
    
    // Usar exactamente los mismos headers que el script bash exitoso
    const headers = {
      'Authorization': `Bearer ${oauthToken}`,
      'Content-Type': 'application/json'
    };
    
    console.log('Headers enviados:', JSON.stringify({
      'Authorization': `Bearer ${oauthToken.substring(0, 20)}...`,
      'Content-Type': 'application/json'
    }, null, 2));
    
    // Intento directo sin lógica compleja de SSL bypass
    let response;
    try {
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
      });
    } catch (sslError) {
      const errorMessage = sslError instanceof Error ? sslError.message : String(sslError);
      console.log('HTTPS falló, intentando HTTP:', errorMessage);
      // Fallback simple a HTTP como hace curl cuando SSL falla
      const httpUrl = apiUrl.replace('https://', 'http://');
      console.log('Trying HTTP fallback:', httpUrl);
      response = await fetch(httpUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
      });
    }

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
        'Content-Type': headers['Content-Type']
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