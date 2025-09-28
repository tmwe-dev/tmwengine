import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TMWEApiRequest {
  action: string;
  params?: Record<string, any>;
}

interface TMWEEmailItem {
  uid: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  size: number;
  flags: string[];
  folder: string;
}

const TMWE_API_BASE = 'https://erp.tmwe.it/erp/tmwe_json';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const tmweApiKey = Deno.env.get('TMWE_API_KEY');
    if (!tmweApiKey) {
      console.error('TMWE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'TMWE API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, params }: TMWEApiRequest = await req.json();
    console.log('TMWE API request:', { action, params });

    let endpoint = '';
    let queryParams = new URLSearchParams();

    // Configure API endpoint based on action
    switch (action) {
      case 'get_email_list':
        endpoint = '/?app.php=get_email_list';
        if (params?.folder) queryParams.set('folder', params.folder);
        if (params?.criteria) queryParams.set('criteria', params.criteria);
        if (params?.offset !== undefined) queryParams.set('offset', params.offset.toString());
        if (params?.limit !== undefined) queryParams.set('limit', params.limit.toString());
        break;

      case 'get_email':
        endpoint = '/?app.php=get_email';
        if (params?.uid) queryParams.set('uid', params.uid);
        if (params?.folder) queryParams.set('folder', params.folder);
        break;

      case 'get_account_info':
        endpoint = '/?app.php=get_account_info';
        break;

      case 'get_quota_info':
        endpoint = '/?app.php=get_quota_info';
        break;

      case 'email_sync':
        endpoint = '/?app.php=email_sync';
        if (params?.action) queryParams.set('action', params.action);
        if (params?.folder_name) queryParams.set('folder_name', params.folder_name);
        if (params?.date_from) queryParams.set('date_from', params.date_from);
        if (params?.date_to) queryParams.set('date_to', params.date_to);
        break;

      case 'get_folders':
        endpoint = '/?app.php=get_folders';
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Action '${action}' not supported` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Build the full URL
    const url = `${TMWE_API_BASE}${endpoint}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    console.log('Making request to TMWE API:', url);

    // Make the API request
    const headers = {
      'Authorization': `Bearer ${tmweApiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    const response = await fetch(url, {
      method: action === 'email_sync' ? 'POST' : 'GET',
      headers
    });

    if (!response.ok) {
      console.error('TMWE API error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error response:', errorText);
      
      return new Response(
        JSON.stringify({ 
          error: `TMWE API error: ${response.status} ${response.statusText}`,
          details: errorText
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('TMWE API response:', data);

    // Transform response for consistency
    const transformedData = {
      success: data.success || true,
      data: data.results || data.folders || data.account_info || data.quota_info || data,
      provider: 'tmwe',
      timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify(transformedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in TMWE email API function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});