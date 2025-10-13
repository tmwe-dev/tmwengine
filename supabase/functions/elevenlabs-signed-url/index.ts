import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { agentId } = await req.json()

    if (!agentId) {
      throw new Error('Agent ID is required')
    }

    // Inizializza Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Leggi la chiave API da voice_agent_config
    const { data: config, error: configError } = await supabaseClient
      .from('voice_agent_config')
      .select('elevenlabs_api_key')
      .eq('enabled', true)
      .single()

    if (configError || !config?.elevenlabs_api_key) {
      console.error('❌ Errore caricamento config:', configError)
      throw new Error('ElevenLabs API key not found in voice_agent_config')
    }

    const elevenLabsApiKey = config.elevenlabs_api_key
    console.log('📞 Richiesta signed URL per agent:', agentId)

    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': elevenLabsApiKey,
        },
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('❌ Errore ElevenLabs API:', error)
      throw new Error(`ElevenLabs API error: ${response.status}`)
    }

    const data = await response.json()
    console.log('✅ Signed URL ottenuto')

    return new Response(
      JSON.stringify({ signedUrl: data.signed_url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('❌ Errore:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
