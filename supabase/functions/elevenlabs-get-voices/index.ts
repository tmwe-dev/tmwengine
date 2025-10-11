import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Inizializza Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    console.log('📋 Caricamento configurazione ElevenLabs da database...');

    // Cerca la configurazione ElevenLabs nel database
    const { data: configs, error: configError } = await supabaseClient
      .from('config_ai')
      .select('api_key, attivo')
      .or('provider.ilike.%elevenlabs%,modello.ilike.%elevenlabs%')
      .eq('attivo', true)
      .limit(1)
      .single();

    if (configError) {
      console.error('❌ Errore nel recupero configurazione:', configError);
      throw new Error('Configurazione ElevenLabs non trovata. Aggiungila nelle Impostazioni AI.');
    }

    if (!configs || !configs.api_key) {
      throw new Error('API Key ElevenLabs non configurata. Vai in Impostazioni > Configurazione AI per aggiungerla.');
    }

    const apiKey = configs.api_key;
    console.log('✅ Configurazione ElevenLabs caricata');
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
        hint: 'Assicurati di aver aggiunto la configurazione ElevenLabs in Impostazioni > Configurazione AI con provider "elevenlabs" o modello contenente "elevenlabs"'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
