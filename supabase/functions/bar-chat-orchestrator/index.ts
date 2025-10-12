// Bar Chat Orchestrator con integrazione ElevenLabs TTS
// Versione: 3.0 - Interrupt Support + Bidirectional Audio
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
    const requestBody = await req.json();
    const { conversationId, userMessage, participants, action } = requestBody;
    
    console.log('🍹 Bar Chat Orchestrator v3.0 riceve:', { conversationId, action, userMessage, participants });

    // Handle INTERRUPT action
    if (action === 'interrupt') {
      console.log('⛔ Interrupt richiesto per conversazione:', conversationId);
      return new Response(
        JSON.stringify({ interrupted: true, message: 'Interrupt signal received' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normal flow continua...

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch API keys
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    const lovableAIKey = Deno.env.get('LOVABLE_API_KEY');
    
    // Leggi ElevenLabs API key dal database invece che dai secrets
    console.log('🔍 Controllo configurazione ElevenLabs nel database...');
    
    let elevenLabsKey: string | null = null;
    try {
      const { data: configData, error: configError } = await supabase
        .from('voice_agent_config')
        .select('*')
        .single();
      
      if (configError) {
        console.error('❌ Errore query voice_agent_config:', configError);
      }
      
      console.log('📊 Voice config trovata:', configData ? {
        enabled: configData.enabled,
        hasApiKey: !!configData.elevenlabs_api_key,
        agentId: configData.agent_id
      } : 'NESSUNA CONFIGURAZIONE TROVATA');
      
      elevenLabsKey = configData?.elevenlabs_api_key || null;
      console.log('🎤 ElevenLabs API key disponibile:', !!elevenLabsKey);
    } catch (error) {
      console.error('⚠️ Eccezione durante recupero config:', error);
    }

    if (!anthropicKey && !openAIKey && !lovableAIKey) {
      throw new Error('Nessuna chiave API AI configurata');
    }

    // Fetch Bar Mode settings
    const { data: barModeSettings } = await supabase
      .from('chat_laboratory_bar_mode')
      .select('*')
      .eq('conversation_id', conversationId)
      .single();

    if (barModeSettings?.mode !== 'bar') {
      throw new Error('Questa funzione è dedicata alla modalità Bar Chat');
    }

    const selectedTopic = barModeSettings.selected_topic;
    const activeKbId = barModeSettings.active_kb_id;
    const voiceEnabled = barModeSettings.voice_enabled || false;
    const interruptRequested = barModeSettings.interrupt_requested || false;
    
    // Carica agenti vocali attivi dalla configurazione globale
    const { data: activeElevenLabsAgents } = await supabase
      .from('elevenlabs_agents')
      .select('*')
      .eq('user_id', barModeSettings.user_id)
      .eq('is_active', true)
      .order('order_index');
    
    console.log('📌 Topic selezionato:', selectedTopic || 'Nessuno');
    console.log('📚 Knowledge Base attiva:', activeKbId || 'Nessuna');
    console.log('🎤 Agenti vocali attivi:', activeElevenLabsAgents?.length || 0);
    console.log('🔍 Debug agenti:', activeElevenLabsAgents?.map(a => ({ 
      id: a.id, 
      name: a.name, 
      voice_id: a.voice_id 
    })));
    console.log('🎤 Voice enabled:', voiceEnabled);
    console.log('⛔ Interrupt requested:', interruptRequested);

    // Se interrupt è stato richiesto, ferma e pulisci flag
    if (interruptRequested) {
      console.log('🛑 Interrupt attivo, annullo generazione');
      await supabase
        .from('chat_laboratory_bar_mode')
        .update({ interrupt_requested: false })
        .eq('conversation_id', conversationId);
      
      return new Response(
        JSON.stringify({ interrupted: true, message: 'Generation interrupted by user' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch conversation data
    const { data: conversation, error: convError } = await supabase
      .from('chat_laboratory_conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (convError) throw convError;

    // Fetch global system prompt
    const { data: systemPrompts } = await supabase
      .from('chat_laboratory_system_prompts')
      .select('contenuto')
      .eq('attivo', true)
      .order('created_at', { ascending: false })
      .limit(1);

    const globalSystemPrompt = systemPrompts?.[0]?.contenuto || 
      "Sei un assistente AI intelligente che partecipa a discussioni costruttive in un bar virtuale.";

    // Fetch BASE sections
    const { data: baseSections } = await supabase
      .from('chat_laboratory_prompt_sections')
      .select('content')
      .eq('section_type', 'BASE')
      .eq('is_active', true)
      .order('order_priority', { ascending: true });

    console.log(`📦 Sezioni BASE: ${baseSections?.length || 0}`);

    // Fetch TOPIC sections
    let topicSections: any[] = [];
    if (selectedTopic) {
      const { data } = await supabase
        .from('chat_laboratory_prompt_sections')
        .select('content')
        .eq('section_type', 'TOPIC')
        .eq('is_active', true)
        .contains('topic_tags', [selectedTopic])
        .order('order_priority', { ascending: true });
      
      topicSections = data || [];
      console.log(`📦 Sezioni TOPIC (${selectedTopic}): ${topicSections.length}`);
    }

    // Fetch conversation messages
    const { data: messages } = await supabase
      .from('chat_laboratory_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    const historyMessages = (messages || []).map((msg: any) => ({
      role: msg.sender_type === 'user' ? 'user' : 'assistant',
      content: `[${msg.sender_name}]: ${msg.content}`
    }));

    // Turn-taking logic
    let currentTurnIndex = conversation.current_turn_index || 0;
    const lastSpeakerIndex = conversation.last_speaker_index || 0;
    
    if (Math.random() < 0.3) {
      currentTurnIndex = Math.floor(Math.random() * participants.length);
      console.log('🎲 Turno randomizzato:', currentTurnIndex);
    } else {
      currentTurnIndex = (lastSpeakerIndex + 1) % participants.length;
      console.log('➡️ Turno sequenziale:', currentTurnIndex);
    }

    const selectedParticipant = participants[currentTurnIndex];
    console.log('🎯 Agente selezionato:', selectedParticipant.name);

    // Fetch AGENT_PERSONALITY sections
    const { data: agentPersonalitySections } = await supabase
      .from('chat_laboratory_prompt_sections')
      .select('content')
      .eq('section_type', 'AGENT_PERSONALITY')
      .eq('is_active', true)
      .ilike('section_name', `%${selectedParticipant.name}%`)
      .order('order_priority', { ascending: true });

    console.log(`👤 Sezioni AGENT_PERSONALITY: ${agentPersonalitySections?.length || 0}`);

    // Fallback su elevenlabs_agents.text_generation_prompt
    let agentTextPrompt = '';
    let elevenLabsVoiceId = '';
    
    if (activeElevenLabsAgents && activeElevenLabsAgents.length > 0) {
      // activeElevenLabsAgents è già un array di oggetti completi
      for (const agent of activeElevenLabsAgents) {
        if (agent.name?.toLowerCase().includes(selectedParticipant.name.toLowerCase())) {
          agentTextPrompt = agent.text_generation_prompt || '';
          elevenLabsVoiceId = agent.voice_id || '';
          console.log(`🎤 Agent match trovato: "${agent.name}", voice_id: ${elevenLabsVoiceId}`);
          break;
        }
      }
      
      // Fallback: se non trova match, usa primo agente
      if (!elevenLabsVoiceId && activeElevenLabsAgents.length > 0) {
        const firstAgent = activeElevenLabsAgents[0];
        elevenLabsVoiceId = firstAgent.voice_id || '';
        agentTextPrompt = firstAgent.text_generation_prompt || '';
        console.log(`⚠️ Nessun match trovato, uso primo agente: "${firstAgent.name}"`);
      }
    }

    // Log di debug CRITICO
    if (!elevenLabsVoiceId) {
      console.error('❌ CRITICO: elevenLabsVoiceId vuoto! Nessun audio verrà generato');
      console.error('Agenti disponibili:', activeElevenLabsAgents?.map(a => ({ 
        name: a.name, 
        voice_id: a.voice_id 
      })));
    } else {
      console.log('✅ Voice ID configurato:', elevenLabsVoiceId);
    }

    // Compose system prompt
    let composedPrompt = globalSystemPrompt + '\n\n';
    
    if (baseSections && baseSections.length > 0) {
      composedPrompt += '=== CONTESTO BASE ===\n';
      composedPrompt += baseSections.map(s => s.content).join('\n\n') + '\n\n';
    }

    if (agentPersonalitySections && agentPersonalitySections.length > 0) {
      composedPrompt += '=== TUA PERSONALITÀ ===\n';
      composedPrompt += agentPersonalitySections.map(s => s.content).join('\n\n') + '\n\n';
    } else if (agentTextPrompt) {
      composedPrompt += '=== TUA PERSONALITÀ ===\n';
      composedPrompt += agentTextPrompt + '\n\n';
    }

    if (topicSections.length > 0) {
      composedPrompt += `=== FOCUS TOPIC: ${selectedTopic} ===\n`;
      composedPrompt += topicSections.map(s => s.content).join('\n\n') + '\n\n';
    }

    console.log('📝 Prompt composto (primi 200 char):', composedPrompt.substring(0, 200) + '...');

    // Prepare conversation history
    const conversationHistory = [
      { role: 'system', content: composedPrompt },
      ...historyMessages,
      { role: 'user', content: userMessage }
    ];

    let aiResponse = '';
    let tokenInput = 0;
    let tokenOutput = 0;
    const startTime = Date.now();

    // Route to AI provider
    if (selectedParticipant.type === 'anthropic' && anthropicKey) {
      console.log('🤖 Calling Anthropic...');
      const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 8096,
          messages: conversationHistory.filter(m => m.role !== 'system'),
          system: composedPrompt
        })
      });

      if (!anthropicResponse.ok) {
        const errorText = await anthropicResponse.text();
        console.error('Anthropic error:', errorText);
        throw new Error(`Anthropic API error: ${anthropicResponse.statusText}`);
      }

      const anthropicData = await anthropicResponse.json();
      aiResponse = anthropicData.content[0].text;
      tokenInput = anthropicData.usage?.input_tokens || 0;
      tokenOutput = anthropicData.usage?.output_tokens || 0;
    } 
    else if (selectedParticipant.type === 'openai' && openAIKey) {
      console.log('🤖 Calling OpenAI...');
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openAIKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: conversationHistory,
          max_tokens: 4096
        })
      });

      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text();
        console.error('OpenAI error:', errorText);
        throw new Error(`OpenAI API error: ${openaiResponse.statusText}`);
      }

      const openaiData = await openaiResponse.json();
      aiResponse = openaiData.choices[0].message.content;
      tokenInput = openaiData.usage?.prompt_tokens || 0;
      tokenOutput = openaiData.usage?.completion_tokens || 0;
    }
    else if (lovableAIKey) {
      console.log('🤖 Calling Lovable AI...');
      const lovableResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${lovableAIKey}`
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: conversationHistory
        })
      });

      if (!lovableResponse.ok) {
        const errorText = await lovableResponse.text();
        console.error('Lovable AI error:', errorText);
        throw new Error(`Lovable AI error: ${lovableResponse.statusText}`);
      }

      const lovableData = await lovableResponse.json();
      aiResponse = lovableData.choices[0].message.content;
      tokenInput = lovableData.usage?.prompt_tokens || 0;
      tokenOutput = lovableData.usage?.completion_tokens || 0;
    }
    else {
      throw new Error(`No API key available for ${selectedParticipant.type}`);
    }

    const responseTime = Date.now() - startTime;
    console.log(`✅ Risposta AI ricevuta in ${responseTime}ms`);

    // Mappa provider type a sender_type compatibile col DB
    const senderTypeMap: Record<string, string> = {
      'anthropic': 'claude',
      'openai': 'chatgpt', 
      'lovable': 'gemini',
      'human': 'human'
    };
    const dbSenderType = senderTypeMap[selectedParticipant.type] || selectedParticipant.type;

    // Generate audio with ElevenLabs TTS (se voice enabled)
    // Check interrupt prima di generare audio (costoso)
    let audioUrl: string | null = null;
    
    console.log('🎵 Tentativo generazione audio - Voice enabled:', voiceEnabled, 'API key presente:', !!elevenLabsKey, 'Voice ID:', elevenLabsVoiceId);
    
    if (voiceEnabled && elevenLabsKey && elevenLabsVoiceId) {
      // Double-check interrupt flag prima di TTS
      const { data: interruptCheck } = await supabase
        .from('chat_laboratory_bar_mode')
        .select('interrupt_requested')
        .eq('conversation_id', conversationId)
        .single();

      if (interruptCheck?.interrupt_requested) {
        console.log('⛔ Interrupt rilevato prima di TTS, annullo');
        await supabase
          .from('chat_laboratory_bar_mode')
          .update({ interrupt_requested: false })
          .eq('conversation_id', conversationId);
        
        return new Response(
          JSON.stringify({ interrupted: true, message: 'Interrupted before TTS generation' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      try {
        console.log(`🎤 Generazione audio con ElevenLabs (voice_id: ${elevenLabsVoiceId})...`);
        console.log('📝 Testo da convertire (primi 100 char):', aiResponse.substring(0, 100));
        
        // Limita la lunghezza per TTS (max 4096 caratteri)
        const textForTTS = aiResponse.length > 4096 
          ? aiResponse.substring(0, 4096) + '...'
          : aiResponse;

        const ttsResponse = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${elevenLabsVoiceId}`,
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

        console.log('📡 ElevenLabs response status:', ttsResponse.status);
        
        if (ttsResponse.ok) {
          // Converti audio blob in base64 per storage
          const audioBlob = await ttsResponse.blob();
          const audioBuffer = await audioBlob.arrayBuffer();
          console.log('📦 Audio buffer size:', audioBuffer.byteLength, 'bytes');
          
          const audioBase64 = btoa(
            String.fromCharCode(...new Uint8Array(audioBuffer))
          );
          
          // Salva in Supabase Storage
          const fileName = `bar-chat/${conversationId}/${Date.now()}.mp3`;
          console.log('☁️ Uploading to Supabase Storage:', fileName);
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('audio-responses')
            .upload(fileName, audioBlob, {
              contentType: 'audio/mpeg',
              upsert: false
            });

          if (uploadError) {
            console.error('❌ Errore upload Supabase Storage:', uploadError);
            throw uploadError;
          } else {
            console.log('✅ Upload completato:', uploadData);
            
            const { data: urlData } = supabase.storage
              .from('audio-responses')
              .getPublicUrl(fileName);
            
            audioUrl = urlData.publicUrl;
            console.log('🔗 Audio URL pubblico:', audioUrl);
          }
        } else {
          const errorText = await ttsResponse.text();
          console.error('❌ ElevenLabs TTS error:', ttsResponse.status, errorText);
          throw new Error(`ElevenLabs API error: ${ttsResponse.status} - ${errorText}`);
        }
      } catch (ttsError) {
        console.error('❌ Errore TTS completo:', ttsError);
        console.error('Stack trace:', ttsError.stack);
        // Continua comunque senza audio - non bloccare la risposta
      }
    } else {
      if (!voiceEnabled) {
        console.log('🔇 Voice non abilitato per questa conversazione');
      } else if (!elevenLabsKey) {
        console.log('⚠️ ElevenLabs API key mancante - audio non generato');
      } else {
        console.log('⚠️ Voice ID mancante - audio non generato');
      }
    }

    // Save message con audio_url
    const { error: insertError } = await supabase
      .from('chat_laboratory_messages')
      .insert({
        conversation_id: conversationId,
        sender_type: dbSenderType,  // ✅ FIX DEFINITIVO: usa tipo mappato compatibile col DB
        sender_name: selectedParticipant.name,
        content: aiResponse,
        token_input: tokenInput,
        token_output: tokenOutput,
        tempo_risposta_ms: responseTime,
        audio_url: audioUrl
      });

    if (insertError) {
      console.error('❌ Errore insert messaggio:', insertError);
    }

    // Update conversation turn
    await supabase
      .from('chat_laboratory_conversations')
      .update({ 
        last_speaker_index: currentTurnIndex,
        current_turn_index: (currentTurnIndex + 1) % participants.length
      })
      .eq('id', conversationId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        content: aiResponse,
        speaker: selectedParticipant.name,
        tokens: { input: tokenInput, output: tokenOutput },
        responseTime,
        audioUrl 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Bar Chat Orchestrator error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
