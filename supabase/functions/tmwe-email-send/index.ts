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

serve(async (req) => {
  console.log('=== TMWE Email Send Test - START ===');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('1. Reading request body...');
    const emailData = await req.json();
    console.log('2. Email data received:', { to: emailData.to, subject: emailData.subject });

    // Validazione input
    if (!emailData.to || !emailData.subject) {
      throw new Error('Destinatario e oggetto sono obbligatori');
    }

    console.log('3. Querying database for TMWE provider...');
    
    // Query semplificata
    const { data: provider, error: providerError } = await supabase
      .from('email_provider')
      .select('*')
      .eq('provider', 'TMWE')
      .eq('attivo', true)
      .limit(1);

    console.log('4. Provider query result:', { 
      hasData: !!provider, 
      dataLength: provider?.length || 0, 
      error: providerError 
    });

    if (providerError) {
      console.error('Provider query error:', providerError);
      throw new Error(`Database error: ${providerError.message}`);
    }

    if (!provider || provider.length === 0) {
      console.error('No TMWE provider found');
      throw new Error('Provider TMWE non configurato o non attivo');
    }

    const providerData = provider[0];
    console.log('5. Provider found:', providerData.id);

    // Query credenziali separata
    console.log('6. Querying credentials...');
    const { data: credentials, error: credError } = await supabase
      .from('email_provider_credenziali')
      .select('api_key')
      .eq('provider_id', providerData.id)
      .limit(1);

    console.log('7. Credentials query result:', { 
      hasData: !!credentials, 
      dataLength: credentials?.length || 0, 
      error: credError 
    });

    if (credError) {
      console.error('Credentials query error:', credError);
      throw new Error(`Credentials error: ${credError.message}`);
    }

    if (!credentials || credentials.length === 0) {
      console.error('No credentials found');
      throw new Error('Credenziali TMWE non configurate');
    }

    const apiKey = credentials[0]?.api_key;
    if (!apiKey) {
      console.error('API key not found in credentials');
      throw new Error('API Key TMWE non configurata');
    }

    console.log('8. API Key found, length:', apiKey.length);

    // Test semplice senza chiamata esterna per ora
    console.log('9. Simulation mode - not calling external API yet');

    // Simula una risposta di successo
    const mockResult = {
      success: true,
      message_id: `test-${Date.now()}`,
      simulation: true
    };

    console.log('10. Returning success response');

    return new Response(JSON.stringify(mockResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('=== ERROR ===');
    console.error('Error type:', typeof error);
    console.error('Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorName = error instanceof Error ? error.name : 'Unknown';
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage,
      debug: {
        errorType: typeof error,
        errorName: errorName,
        timestamp: new Date().toISOString()
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});