import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TMWEEmailAccountRequest {
  action: 'test_connection' | 'get_account_info' | 'get_quota';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: TMWEEmailAccountRequest = await req.json();
    console.log('TMWE Email Account request:', { action: requestData.action });

    const apiKey = Deno.env.get('TMWE_API_KEY');
    if (!apiKey) {
      throw new Error('TMWE_API_KEY non configurata negli environment secrets');
    }

    const baseUrl = 'https://findair.it/erp/tmwe_json';
    const params = new URLSearchParams({ 
      action: requestData.action 
    });

    const response = await fetch(`${baseUrl}/app.php?action=email_account&${params}`, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
        'Accept': 'application/json'
      }
    });

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