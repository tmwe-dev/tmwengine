// Generate Audio - Async TTS Generation
// Version: 1.0 - Hybrid Approach (Opzione D)
// Data: 2025-01-12

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messageId } = await req.json();
    
    if (!messageId) {
      throw new Error('messageId è obbligatorio');
    }

    console.log('🎵 [GENERATE-AUDIO] Avvio generazione per messageId:', messageId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch messaggio
    const { data: message, error: msgError } = await supabase
      .from('chat_laboratory_messages')
      .select('*, conversation_id')
      .eq('id', messageId)
      .single();

    if (msgError || !message) {
      throw new Error('Messaggio non trovato');
    }

    // Fetch settings conversazione
    const { data: barSettings } = await supabase
      .from('chat_laboratory_bar_mode')
      .select('*')
      .eq('conversation_id', message.conversation_id)
      .single();

    // Fetch ElevenLabs config
    const { data: voiceConfig } = await supabase
      .from('voice_agent_config')
      .select('elevenlabs_api_key, enabled')
      .eq('enabled', true)
      .maybeSingle();
    
    const elevenLabsKey = voiceConfig?.elevenlabs_api_key;

    if (!elevenLabsKey) {
      console.warn('⚠️ ElevenLabs API key non configurata, skip audio');
      return new Response(
        JSON.stringify({ success: false, retryable: false, reason: 'no_api_key' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch agenti vocali attivi
    const { data: activeAgents } = await supabase
      .from('elevenlabs_agents')
      .select('*')
      .eq('user_id', barSettings?.user_id)
      .eq('is_active', true)
      .order('order_index');

    // Trova voice_id corrispondente all'agente
    let voiceId = '';
    if (activeAgents && activeAgents.length > 0) {
      for (const agent of activeAgents) {
        if (agent.name?.toLowerCase().includes(message.sender_name.toLowerCase())) {
          voiceId = agent.voice_id || '';
          break;
        }
      }
      
      // Fallback: primo agente disponibile
      if (!voiceId && activeAgents.length > 0) {
        voiceId = activeAgents[0].voice_id || '';
      }
    }

    if (!voiceId) {
      console.warn('⚠️ Voice ID non trovato, skip audio');
      return new Response(
        JSON.stringify({ success: false, retryable: false, reason: 'no_voice_id' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🎤 Generazione TTS con voice_id:', voiceId);

    // Limita testo per TTS (500 char per quick win)
    const textForTTS = message.content.length > 500 
      ? message.content.substring(0, 500) + '...'
      : message.content;

    // Chiama ElevenLabs TTS
    const ttsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'xi-api-key': elevenLabsKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: textForTTS,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.5,
            use_speaker_boost: true
          }
        })
      }
    );

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      console.error('❌ ElevenLabs error:', ttsResponse.status, errorText);
      
      // Retry se 429 (rate limit) o 503 (temporaneo)
      const retryable = ttsResponse.status === 429 || ttsResponse.status === 503;
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          retryable, 
          reason: `elevenlabs_error_${ttsResponse.status}` 
        }),
        { 
          status: ttsResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Upload audio a Supabase Storage
    const audioBlob = await ttsResponse.blob();
    const fileName = `bar-chat/${message.conversation_id}/${Date.now()}.mp3`;
    
    console.log('☁️ Upload audio a Storage:', fileName);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('audio-responses')
      .upload(fileName, audioBlob, {
        contentType: 'audio/mpeg',
        upsert: false
      });

    if (uploadError) {
      console.error('❌ Errore upload Storage:', uploadError);
      return new Response(
        JSON.stringify({ success: false, retryable: true, reason: 'storage_error' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Ottieni URL pubblico
    const { data: urlData } = supabase.storage
      .from('audio-responses')
      .getPublicUrl(fileName);
    
    const audioUrl = urlData.publicUrl;
    console.log('🔗 Audio URL pubblico:', audioUrl);

    // Aggiorna messaggio con audio_url
    const { error: updateError } = await supabase
      .from('chat_laboratory_messages')
      .update({ audio_url: audioUrl })
      .eq('id', messageId);

    if (updateError) {
      console.error('❌ Errore update messaggio:', updateError);
      return new Response(
        JSON.stringify({ success: false, retryable: true, reason: 'db_update_error' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ [GENERATE-AUDIO] Completato con successo');

    return new Response(
      JSON.stringify({ success: true, audioUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ [GENERATE-AUDIO] Errore:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        retryable: true, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
