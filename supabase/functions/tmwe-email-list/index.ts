import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TMWEEmailListRequest {
  folder?: string;
  criteria?: string;
  offset?: number;
  limit?: number;
  uid?: string; // For get_email action
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: TMWEEmailListRequest = await req.json();
    console.log('TMWE Email List request:', requestData);

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
      
      if (provider?.email_provider_credenziali?.[0]) {
        // Cerca prima in oauth_token poi in api_key come fallback
        oauthToken = provider.email_provider_credenziali[0].oauth_token || 
                     provider.email_provider_credenziali[0].api_key;
      }
    }
    
    if (!oauthToken) {
      throw new Error('TMWE OAuth token non configurato nel database o environment');
    }

    const baseUrl = 'https://findair.it/erp/tmwe_json';
    
    let apiUrl;
    let requestBody: any;
    
    if (requestData.uid) {
      // Get specific email
      apiUrl = `${baseUrl}/app.php?action=get_email`;
      requestBody = { uid: requestData.uid };
    } else {
      // Get email list
      apiUrl = `${baseUrl}/app.php?action=get_email_list`;
      requestBody = {
        folder: requestData.folder || 'INBOX',
        criteria: requestData.criteria || 'ALL',
        offset: requestData.offset || 0,
        limit: requestData.limit || 10
      };
    }

    console.log('API v2.0.0 - POST request to:', apiUrl);
    console.log('Request body:', JSON.stringify(requestBody));

    // Usar headers mínimos como tmwe-email-send exitoso
    let response;
    try {
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${oauthToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
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
        body: JSON.stringify(requestBody)
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
    console.error('Error in tmwe-email-list function:', error);
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