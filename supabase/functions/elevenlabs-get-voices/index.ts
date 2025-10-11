/**
 * ElevenLabs Get Voices Function - v2.0
 * Fetches available voices from ElevenLabs API
 * API Key is provided by the frontend from localStorage
 */
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
    console.log('🚀 ElevenLabs Get Voices v2.0 - Starting...');
    
    const { apiKey } = await req.json();
    
    if (!apiKey) {
      throw new Error('API Key ElevenLabs non fornita. Configurala in Impostazioni > Voice Agent (ElevenLabs).');
    }

    console.log('✅ API Key ricevuta dal frontend');
    console.log('📞 Fetching voices from ElevenLabs API...');

    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ ElevenLabs API Error:', response.status, errorText);
      
      if (response.status === 401) {
        throw new Error('API Key ElevenLabs non valida. Verifica la chiave nelle Impostazioni AI.');
      }
      
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ Fetched ${data.voices?.length || 0} voices`);

    return new Response(
      JSON.stringify({ voices: data.voices || [] }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Error:', error.message);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        hint: 'Assicurati di aver configurato l\'API Key ElevenLabs in Impostazioni > Voice Agent (ElevenLabs) e di aver salvato la configurazione.'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
