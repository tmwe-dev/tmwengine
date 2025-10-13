// Bar Chat Orchestrator con integrazione ElevenLabs TTS
// Versione: 4.0 - Rollback + Sync Summaries
// Data: 2025-01-20
// Changes: Restored stable architecture + synchronous summary generation for Economy Mode

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Helper: Generate message summaries SYNCHRONOUSLY
async function generateMessageSummary(
  content: string,
  type: 'user_friendly' | 'ultra_compressed',
  lovableApiKey: string
): Promise<string> {
  const prompts = {
    user_friendly: `Riassumi questo messaggio in max 60 parole, usando linguaggio naturale e NON tecnico. Focus su aspetti pratici e comprensibili:

${content}

Riassunto user-friendly:`,
    ultra_compressed: `Estrai SOLO i concetti tecnici chiave essenziali da questo messaggio in max 25 parole. Formato: "Problema + Soluzione" o "Concetto chiave":

${content}

Riassunto ultra-compresso:`
  };

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: prompts[type] }
        ],
        temperature: 0.3,
        max_tokens: type === 'user_friendly' ? 100 : 50
      })
    });

    if (!response.ok) {
      throw new Error(`Summary generation failed: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content?.trim() || content.substring(0, type === 'user_friendly' ? 200 : 100);
  } catch (error) {
    console.error(`Error generating ${type} summary:`, error);
    return content.substring(0, type === 'user_friendly' ? 200 : 100) + '...';
  }
}

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
    
    console.log('🍹 Bar Chat Orchestrator v4.0 riceve:', { conversationId, action, userMessage, participants });

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
    
    // ✅ RECUPERA ELEVENLABS DA voice_agent_config (come fa il frontend)
    const { data: voiceConfig, error: voiceError } = await supabase
      .from('voice_agent_config')
      .select('elevenlabs_api_key, enabled')
      .eq('enabled', true)
      .maybeSingle();
    
    const elevenLabsKey = voiceConfig?.elevenlabs_api_key || null;
    
    console.log('🔑 ElevenLabs config recuperata da voice_agent_config:', {
      trovato: !!voiceConfig,
      hasKey: !!elevenLabsKey,
      enabled: voiceConfig?.enabled,
      error: voiceError?.message
    });

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

    // ✅ Map provider type to DB-compatible sender_type
    const senderTypeMap: Record<string, string> = {
      'anthropic': 'claude',
      'openai': 'chatgpt',
      'lovable': 'gemini',
      'gemini': 'gemini',
      'claude': 'claude',
      'chatgpt': 'chatgpt'
    };
    const dbSenderType = senderTypeMap[selectedParticipant.type] || selectedParticipant.type;

    // ✅ SYNC SUMMARY GENERATION - Execute BEFORE saving message
    console.log('🔄 Generazione summaries SINCRONA...');
    const [userFriendlySummary, ultraCompressedSummary] = await Promise.all([
      generateMessageSummary(aiResponse, 'user_friendly', lovableAIKey!),
      generateMessageSummary(aiResponse, 'ultra_compressed', lovableAIKey!)
    ]);
    
    console.log('✅ Summaries generate:', {
      userFriendly: userFriendlySummary.substring(0, 50) + '...',
      ultraCompressed: ultraCompressedSummary.substring(0, 30) + '...'
    });

    // Generate audio with ElevenLabs TTS (se voice enabled)
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
        
        // ✅ USA user_friendly summary per TTS (no testo completo)
        const textForTTS = userFriendlySummary.length > 4096 
          ? userFriendlySummary.substring(0, 4096) + '...'
          : userFriendlySummary;
        
        console.log('📝 Testo per TTS (user_friendly, primi 100 char):', textForTTS.substring(0, 100));

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
          const audioBlob = await ttsResponse.blob();
          const audioBuffer = await audioBlob.arrayBuffer();
          console.log('📦 Audio buffer size:', audioBuffer.byteLength, 'bytes');
          
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
        }
      } catch (ttsError) {
        console.error('❌ Errore TTS completo:', ttsError);
      }
    } else {
      console.log('⏭️ Audio skip: voice_enabled =', voiceEnabled, ', hasKey =', !!elevenLabsKey, ', voiceId =', elevenLabsVoiceId);
    }

    // ✅ Save message with ALL 3 content types + is_summary_available=true
    const { data: savedMessage, error: saveError } = await supabase
      .from('chat_laboratory_messages')
      .insert({
        conversation_id: conversationId,
        sender_type: dbSenderType,
        sender_name: selectedParticipant.name,
        content: aiResponse,
        content_user_friendly: userFriendlySummary,
        content_summary: ultraCompressedSummary,
        is_summary_available: true,
        token_input: tokenInput,
        token_output: tokenOutput,
        tempo_risposta_ms: responseTime,
        audio_url: audioUrl
      })
      .select()
      .single();

    if (saveError) {
      console.error('❌ Errore salvataggio messaggio:', saveError);
      throw saveError;
    }

    console.log('✅ Messaggio salvato con ID:', savedMessage.id);
    console.log('✅ Economy Mode attivo: is_summary_available =', savedMessage.is_summary_available);

    // AI Cost Tracking
    const providerMap: Record<string, string> = {
      'anthropic': 'anthropic',
      'openai': 'openai',
      'lovable': 'lovable_ai'
    };
    const provider = providerMap[selectedParticipant.type] || selectedParticipant.type;
    
    const modelMap: Record<string, string> = {
      'anthropic': 'claude-sonnet-4-5',
      'openai': 'gpt-4o',
      'lovable': 'google/gemini-2.5-flash'
    };
    const model = modelMap[selectedParticipant.type] || 'unknown';

    // Cost calculation (EUR)
    const pricePerMillionInput: Record<string, number> = {
      'anthropic': 3.00,
      'openai': 2.50,
      'lovable': 0.00 // Gemini free
    };
    const pricePerMillionOutput: Record<string, number> = {
      'anthropic': 15.00,
      'openai': 10.00,
      'lovable': 0.00
    };

    const costInputEur = (tokenInput / 1_000_000) * (pricePerMillionInput[selectedParticipant.type] || 0);
    const costOutputEur = (tokenOutput / 1_000_000) * (pricePerMillionOutput[selectedParticipant.type] || 0);
    
    console.log(`💰 Cost tracking: ${tokenInput} in + ${tokenOutput} out = €${(costInputEur + costOutputEur).toFixed(6)}`);
    
    // Save to ai_cost_tracking (cost_total_eur is auto-calculated by DB)
    const { error: costError } = await supabase
      .from('ai_cost_tracking')
      .insert({
        provider,
        model,
        operation_type: 'chat_laboratory',
        lab_conversation_id: conversationId,
        input_tokens: tokenInput,
        output_tokens: tokenOutput,
        cost_input_eur: costInputEur,
        cost_output_eur: costOutputEur
      });
    
    if (costError) {
      console.error('⚠️ Cost tracking error (non-blocking):', costError);
    }

    // Update conversation turn tracking
    const { error: updateError } = await supabase
      .from('chat_laboratory_conversations')
      .update({
        current_turn_index: currentTurnIndex,
        last_speaker_index: currentTurnIndex
      })
      .eq('id', conversationId);

    if (updateError) {
      console.error('⚠️ Errore aggiornamento turno (non-blocking):', updateError);
    }

    return new Response(
      JSON.stringify({
        content: aiResponse,
        speaker: selectedParticipant.name,
        tokenInput,
        tokenOutput,
        responseTime,
        audioUrl,
        userFriendlySummary,
        ultraCompressedSummary,
        economyModeReady: true
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ Errore orchestrator:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
