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
    
    console.log('🎵 [GENERATE-AUDIO] Richiesta ricevuta:', { messageId });
    
    if (!messageId) {
      console.error('❌ [GENERATE-AUDIO] messageId mancante');
      throw new Error('messageId è obbligatorio');
    }

    console.log('🎵 [GENERATE-AUDIO] Avvio generazione per messageId:', messageId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch messaggio
    console.log('📥 [GENERATE-AUDIO] Recupero messaggio dal DB...');
    const { data: message, error: msgError } = await supabase
      .from('chat_laboratory_messages')
      .select('*, conversation_id')
      .eq('id', messageId)
      .single();

    if (msgError || !message) {
      console.error('❌ [GENERATE-AUDIO] Messaggio non trovato:', msgError);
      throw new Error('Messaggio non trovato');
    }
    
    console.log('✅ [GENERATE-AUDIO] Messaggio trovato:', {
      sender: message.sender_name,
      contentLength: message.content?.length,
      conversationId: message.conversation_id
    });

    // Fetch settings conversazione
    console.log('⚙️ [GENERATE-AUDIO] Recupero impostazioni Bar Mode...');
    const { data: barSettings, error: barError } = await supabase
      .from('chat_laboratory_bar_mode')
      .select('*')
      .eq('conversation_id', message.conversation_id)
      .single();
    
    if (barError) {
      console.warn('⚠️ [GENERATE-AUDIO] Bar settings non trovate:', barError);
    } else {
      console.log('✅ [GENERATE-AUDIO] Bar settings:', {
        voiceEnabled: barSettings?.voice_enabled,
        userId: barSettings?.user_id
      });
    }

    // Fetch ElevenLabs config
    console.log('🔑 [GENERATE-AUDIO] Recupero configurazione ElevenLabs...');
    const { data: voiceConfig, error: configError } = await supabase
      .from('voice_agent_config')
      .select('elevenlabs_api_key, enabled')
      .eq('enabled', true)
      .maybeSingle();
    
    if (configError) {
      console.error('❌ [GENERATE-AUDIO] Errore config:', configError);
    }
    
    const elevenLabsKey = voiceConfig?.elevenlabs_api_key;

    if (!elevenLabsKey) {
      console.warn('⚠️ [GENERATE-AUDIO] ElevenLabs API key non configurata');
      return new Response(
        JSON.stringify({ success: false, retryable: false, reason: 'no_api_key' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('✅ [GENERATE-AUDIO] API key ElevenLabs trovata');

    // Fetch agenti vocali attivi
    console.log('👥 [GENERATE-AUDIO] Recupero agenti vocali attivi...');
    const { data: activeAgents, error: agentsError } = await supabase
      .from('elevenlabs_agents')
      .select('*')
      .eq('user_id', barSettings?.user_id)
      .eq('is_active', true)
      .order('order_index');
    
    if (agentsError) {
      console.error('❌ [GENERATE-AUDIO] Errore recupero agenti:', agentsError);
    }
    
    console.log(`✅ [GENERATE-AUDIO] Trovati ${activeAgents?.length || 0} agenti attivi`);

    // Trova voice_id corrispondente all'agente
    let voiceId = '';
    let matchedAgent = '';
    
    if (activeAgents && activeAgents.length > 0) {
      console.log('🔍 [GENERATE-AUDIO] Ricerca agente per sender:', message.sender_name);
      
      for (const agent of activeAgents) {
        console.log(`  - Controllo agente: ${agent.name} (voice: ${agent.voice_id})`);
        if (agent.name?.toLowerCase().includes(message.sender_name.toLowerCase())) {
          voiceId = agent.voice_id || '';
          matchedAgent = agent.name;
          console.log(`  ✅ Match trovato: ${agent.name}`);
          break;
        }
      }
      
      // Fallback: primo agente disponibile
      if (!voiceId && activeAgents.length > 0) {
        voiceId = activeAgents[0].voice_id || '';
        matchedAgent = activeAgents[0].name;
        console.log(`  ⚠️ Nessun match, uso fallback: ${matchedAgent}`);
      }
    }

    if (!voiceId) {
      console.warn('⚠️ [GENERATE-AUDIO] Voice ID non trovato');
      return new Response(
        JSON.stringify({ success: false, retryable: false, reason: 'no_voice_id' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🎤 [GENERATE-AUDIO] TTS con agente "${matchedAgent}" (voice: ${voiceId})`);

    // Limita testo per TTS (500 char per quick win)
    const textForTTS = message.content.length > 500 
      ? message.content.substring(0, 500) + '...'
      : message.content;
    
    console.log(`📝 [GENERATE-AUDIO] Testo da sintetizzare (${textForTTS.length} chars)`);

    // Chiama ElevenLabs TTS
    console.log('🌐 [GENERATE-AUDIO] Chiamata API ElevenLabs...');
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
