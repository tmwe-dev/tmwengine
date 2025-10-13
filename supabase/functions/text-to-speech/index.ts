import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { text, voice_id, model_id } = await req.json();
    
    if (!text) {
      throw new Error('No text provided');
    }

    const voiceId = voice_id || '9BWtsMINqrJLrRacOk9x'; // Default: Aria
    const modelId = model_id || 'eleven_turbo_v2_5'; // Default: Turbo v2.5

    console.log(`🔊 Generating speech with voice: ${voiceId}, model: ${modelId}`);

    // Leggi API key dal database CRM (voice_agent_config)
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.58.0');
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    const { data: config, error: configError } = await supabase
      .from('voice_agent_config')
      .select('elevenlabs_api_key')
      .eq('enabled', true)
      .single();

    if (configError || !config?.elevenlabs_api_key) {
      console.error('❌ ElevenLabs API key non trovata in voice_agent_config:', configError);
      throw new Error('ElevenLabs API key non configurata nel CRM');
    }

    const elevenLabsApiKey = config.elevenlabs_api_key;

    // Call ElevenLabs TTS API
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': elevenLabsApiKey,
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', errorText);
      throw new Error(`ElevenLabs API error: ${errorText}`);
    }

    // Get audio as array buffer
    const audioBuffer = await response.arrayBuffer();
    
    // Convert to base64
    const audioBytes = new Uint8Array(audioBuffer);
    const base64Audio = btoa(String.fromCharCode(...audioBytes));

    console.log('✅ Speech generation complete');

    return new Response(
      JSON.stringify({ audio: base64Audio }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ TTS error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
