import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    const apiKey = Deno.env.get('TMWE_API_KEY');
    if (!apiKey) {
      throw new Error('TMWE_API_KEY non configurata negli environment secrets');
    }

    const baseUrl = 'https://findair.it/erp/tmwe_json';
    
    let endpoint;
    let params = new URLSearchParams();
    
    if (requestData.uid) {
      // Get specific email
      endpoint = '/app.php?action=get_email';
      params.append('uid', requestData.uid);
    } else {
      // Get email list
      endpoint = '/app.php?action=get_email_list';
      if (requestData.folder) params.append('folder', requestData.folder);
      if (requestData.criteria) params.append('criteria', requestData.criteria);
      if (requestData.offset !== undefined) params.append('offset', requestData.offset.toString());
      if (requestData.limit !== undefined) params.append('limit', requestData.limit.toString());
    }

    const response = await fetch(`${baseUrl}${endpoint}&${params}`, {
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