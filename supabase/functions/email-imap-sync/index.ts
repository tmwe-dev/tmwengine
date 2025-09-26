import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('🚀 Email IMAP Sync function called');
  console.log('Method:', req.method);
  console.log('URL:', req.url);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📬 Processing sync request...');
    
    // Log environment variables (without revealing values)
    console.log('SUPABASE_URL exists:', !!Deno.env.get('SUPABASE_URL'));
    console.log('SUPABASE_SERVICE_ROLE_KEY exists:', !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));

    // Try to read request body
    let requestBody;
    try {
      const bodyText = await req.text();
      console.log('Raw body:', bodyText);
      requestBody = JSON.parse(bodyText);
      console.log('Parsed body:', requestBody);
    } catch (parseError: any) {
      console.error('❌ Error parsing request body:', parseError);
      return new Response(
        JSON.stringify({ error: 'Formato richiesta non valido', details: parseError.message || 'Parse error' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { provider_id, tipo_sync = 'manuale' } = requestBody;

    console.log('Request params:', { provider_id, tipo_sync });

    if (!provider_id) {
      console.error('❌ Missing provider_id');
      return new Response(
        JSON.stringify({ error: 'provider_id è obbligatorio' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Simulate successful sync for testing
    console.log('✅ Simulating successful sync...');
    
    const mockResult = {
      success: true,
      sync_id: 'test-sync-' + Date.now(),
      messaggi_totali: 5,
      messaggi_nuovi: 3,
      messaggi_aggiornati: 2,
      errori: 0,
      note: 'Sincronizzazione IMAP simulata - test di debug completato'
    };

    console.log('📤 Returning result:', mockResult);

    return new Response(
      JSON.stringify(mockResult),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('❌ Error in IMAP sync function:', error);
    console.error('Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error',
        stack: error.stack,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});