import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TMWEEmailAccountRequest {
  handler: 'test_connection' | 'get_account_info' | 'get_quota';
  imap_port?: number;
  imap_use_ssl?: boolean;
  imap_use_tls?: boolean;
  smtp_port?: number;
  smtp_use_ssl?: boolean;
  smtp_use_tls?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: TMWEEmailAccountRequest = await req.json();
    console.log('TMWE Email Account request:', { handler: requestData.handler });

    // Usa l'OAuth token dall'environment o dal database
    let oauthToken = Deno.env.get('TMWE_OAUTH_TOKEN');
    
    if (!oauthToken) {
      // Fallback al database se non presente nell'environment
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      const { data: provider } = await supabase
        .from('email_provider')
        .select('email_provider_credenziali(*)')
        .eq('provider', 'TMWE')
        .eq('attivo', true)
        .maybeSingle();
      
      // email_provider_credenziali è un oggetto singolo (relazione 1:1), NON un array
      const creds = provider?.email_provider_credenziali;
      if (creds) {
        // Cerca prima in oauth_token poi in api_key come fallback
        oauthToken = creds.oauth_token || creds.api_key;
      }
    }
    
    if (!oauthToken) {
      throw new Error('TMWE OAuth token non configurato nel database o environment');
    }

    const baseUrl = 'https://findair.it/erp/tmwe_json';
    const apiUrl = `${baseUrl}/app.php?action=email_account`;

    console.log('API v2.0.0 - POST request to:', apiUrl);
    console.log('Request body:', JSON.stringify(requestData));

    // Usar headers mínimos como tmwe-email-send exitoso
    let response;
    try {
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${oauthToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });
    } catch (error) {
      console.log('HTTPS falló, intentando HTTP:', error);
      // Fallback a HTTP como tmwe-email-send exitoso  
      const httpUrl = apiUrl.replace('https://', 'http://');
      response = await fetch(httpUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${oauthToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });
    }

    console.log('Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('TMWE API Error response:', errorText);
      throw new Error(`TMWE API Error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    console.log('TMWE API Response received');

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in tmwe-email-account function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});