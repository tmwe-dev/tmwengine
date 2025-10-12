import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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
    
    // ✅ RECUPERA ELEVENLABS DA voice_agent_config (come bar-chat-orchestrator)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: voiceConfig, error: voiceError } = await supabaseAdmin
      .from('voice_agent_config')
      .select('elevenlabs_api_key, enabled')
      .eq('enabled', true)
      .maybeSingle();

    const ELEVENLABS_API_KEY = voiceConfig?.elevenlabs_api_key || null;

    console.log('🔑 ElevenLabs config recuperata da voice_agent_config:', {
      trovato: !!voiceConfig,
      hasKey: !!ELEVENLABS_API_KEY,
      enabled: voiceConfig?.enabled,
      error: voiceError?.message
    });
    
    if (!ELEVENLABS_API_KEY) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'ElevenLabs API key non configurata in voice_agent_config' 
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
