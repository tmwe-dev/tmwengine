import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { agentId, voiceId } = await req.json();
    
    console.log('Testing ElevenLabs connection:', { agentId, voiceId });
    
    // Testa connessione ElevenLabs API
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    
    if (!ELEVENLABS_API_KEY) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'ElevenLabs API key non configurata' 
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const response = await fetch(`https://api.elevenlabs.io/v1/voices/${voiceId}`, {
      headers: { 
        'xi-api-key': ELEVENLABS_API_KEY 
      }
    });
    
    if (!response.ok) {
      console.error('ElevenLabs API error:', response.status, await response.text());
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Voice ID non valido o non accessibile' 
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const voiceData = await response.json();
    
    console.log('Voice validated successfully:', voiceData.name);
    
    return new Response(
      JSON.stringify({ 
        valid: true, 
        voiceName: voiceData.name 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (error) {
    console.error('Error testing ElevenLabs agent:', error);
    return new Response(
      JSON.stringify({ 
        valid: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
