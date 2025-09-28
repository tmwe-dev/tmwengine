import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('=== TMWE Test Function START ===');
  
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request received');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('1. Method:', req.method);
    console.log('2. URL:', req.url);
    
    // Test semplice di lettura body
    let body;
    try {
      body = await req.json();
      console.log('3. Body parsed successfully:', Object.keys(body));
    } catch (e) {
      console.error('3. Body parse error:', e);
      throw new Error('Invalid JSON body');
    }

    // Test risposta semplice
    const response = {
      success: true,
      message: 'TMWE Test Function working!',
      receivedData: {
        to: body.to,
        subject: body.subject
      },
      timestamp: new Date().toISOString()
    };

    console.log('4. Sending response:', response);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      }
    });

  } catch (error) {
    console.error('=== ERROR CAUGHT ===');
    console.error('Error object:', error);
    console.error('Error string:', String(error));
    
    const errorResponse = {
      success: false,
      error: String(error),
      timestamp: new Date().toISOString()
    };

    console.log('Sending error response:', errorResponse);

    return new Response(JSON.stringify(errorResponse), {
      status: 200, // Cambio a 200 per evitare errori client
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      }
    });
  }
});