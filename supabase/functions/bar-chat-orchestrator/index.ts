// Bar Chat Orchestrator con integrazione ElevenLabs TTS
// Versione: 3.1 - Tripartite Message System + Economy Mode
// Data: 2025-01-12

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Helper: Generate message summaries
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

    // Fetch conversation data + economy mode settings
    const { data: conversation, error: convError } = await supabase
      .from('chat_laboratory_conversations')
      .select('economy_mode, show_summaries_only, current_turn_index, last_speaker_index')
      .eq('id', conversationId)
      .single();

    if (convError) throw convError;

    const useEconomyMode = conversation?.economy_mode && conversation?.show_summaries_only;
    console.log(`⚙️ Economy Mode: ${useEconomyMode ? 'ATTIVO' : 'Disattivo'}`);

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

    // Fetch conversation messages WITH summaries
    const { data: messages } = await supabase
      .from('chat_laboratory_messages')
      .select('sender_type, sender_name, content, content_summary, is_summary_available')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    const historyMessages = (messages || []).map((msg: any) => {
      let messageContent = msg.content; // Default: completo
      
      // Economy Mode: usa content_summary per AI (SOLO per messaggi AI, non utente)
      if (useEconomyMode && msg.is_summary_available && msg.content_summary && msg.sender_type !== 'user') {
        messageContent = msg.content_summary;
        console.log(`📉 [${msg.sender_name}] usa summary: "${messageContent.substring(0, 40)}..."`);
      }
      
      return {
        role: msg.sender_type === 'user' ? 'user' : 'assistant',
        content: `[${msg.sender_name}]: ${messageContent}`
      };
    });

    // ✅ HOTFIX Sprint 0: Filtra solo partecipanti attivi prima della selezione
    const activeParticipants = participants.filter(p => p.is_active);
    const activeCount = activeParticipants.length;

    if (activeCount === 0) {
      throw new Error('❌ Nessun partecipante attivo disponibile per la conversazione');
    }

    console.log(`👥 Partecipanti attivi: ${activeCount}/${participants.length}`);

    // Turn-taking logic (30% random, 70% sequential)
    const useRandom = Math.random() < 0.3;
    let currentTurnIndex: number;
    
    if (useRandom) {
      currentTurnIndex = Math.floor(Math.random() * activeCount);
      console.log(`🎲 Turno randomizzato: indice ${currentTurnIndex} su ${activeCount} attivi`);
    } else {
      const lastSpeakerIndex = conversation.last_speaker_index || 0;
      currentTurnIndex = (lastSpeakerIndex + 1) % activeCount;
      console.log(`➡️ Turno sequenziale: indice ${currentTurnIndex} (dopo ${lastSpeakerIndex})`);
    }

    const selectedParticipant = activeParticipants[currentTurnIndex];
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

    // ✅ Moderazione lunghezza interventi (prompt engineering comportamentale)
    composedPrompt += `
=== STILE CONVERSAZIONE ===
🍺 Sei al bar con colleghi esperti, non in aula universitaria.
- Interventi rapidi e diretti: concetto chiave → esempio concreto → passa la palla
- Se qualcuno monopolizza, gli altri si annoiano e cambiano discorso
- Evita paragrafi lunghi: nessuno legge saggi al bar
- Pensa "caffè veloce" non "conferenza TED"

✅ Buon intervento: "Per la logistica, suggerisco hub regionali. Esempio: Milano-Roma riduce costi 30%. Vittorio, tu come gestiresti i picchi?"
❌ Male: *tre paragrafi su supply chain theory con citazioni accademiche*
\n\n`;

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

    // ✅ Soft truncation fallback: solo per risposte eccessive (>150 parole)
    const wordCount = aiResponse.trim().split(/\s+/).length;
    console.log(`📊 Risposta: ${wordCount} parole`);

    if (wordCount > 150) {
      console.warn(`⚠️ ${selectedParticipant.name}: ${wordCount} parole, troncamento a frase completa`);
      
      const sentences = aiResponse.match(/[^.!?]+[.!?]+/g) || [];
      let truncated = '';
      let currentWords = 0;
      
      for (const sentence of sentences) {
        const sentenceWords = sentence.trim().split(/\s+/).length;
        if (currentWords + sentenceWords <= 120) {
          truncated += sentence;
          currentWords += sentenceWords;
        } else {
          break;
        }
      }
      
      if (truncated.length > 0) {
        aiResponse = truncated.trim();
        console.log(`✂️ Troncato a ${currentWords} parole (preservando coerenza)`);
      }
    }

    // Mappa provider type a sender_type compatibile col DB
    const senderTypeMap: Record<string, string> = {
      'anthropic': 'claude',
      'openai': 'chatgpt', 
      'lovable': 'gemini',
      'human': 'human'
    };
    const dbSenderType = senderTypeMap[selectedParticipant.type] || selectedParticipant.type;

    // Get next sequence number
    const { data: maxSeq } = await supabase
      .from('chat_laboratory_messages')
      .select('message_sequence')
      .eq('conversation_id', conversationId)
      .order('message_sequence', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextSequence = (maxSeq?.message_sequence || 0) + 1;

    // ✅ Salva messaggio IMMEDIATAMENTE senza summaries (saranno generate in background)
    const { data: savedMessage, error: saveError } = await supabase
      .from('chat_laboratory_messages')
      .insert({
        conversation_id: conversationId,
        message_sequence: nextSequence,
        sender_type: dbSenderType,
        sender_name: selectedParticipant.name,
        content: aiResponse,                           // ✅ Messaggio completo (per UI)
        content_user_friendly: null,                   // ⏳ Sarà popolato in background
        content_summary: null,                         // ⏳ Sarà popolato in background
        is_summary_available: false,                   // ⏳ Diventerà true quando pronto
        token_input: tokenInput,
        token_output: tokenOutput,
        tempo_risposta_ms: responseTime,
        is_visible_to_ai: true,
        audio_url: null // ⚠️ Verrà popolato da generate-audio in background
      })
      .select()
      .single();

    if (saveError) {
      console.error('❌ Errore salvataggio messaggio:', saveError);
      throw saveError;
    }

    console.log('✅ Messaggio salvato con ID:', savedMessage.id);

    // 🚀 NON-BLOCKING: Genera summaries in background
    supabase.functions.invoke('generate-message-summaries', {
      body: { 
        messageId: savedMessage.id, 
        content: aiResponse,
        conversationId,
        table: 'chat_laboratory_messages'
      }
    }).then(() => {
      console.log('🔄 Background summary generation triggered');
    }).catch((err) => {
      console.error('⚠️ Background summary generation failed:', err);
    });

    // ✅ Update conversation turn index with optimistic lock (CAS)
    const expectedPreviousTurnIndex = conversation?.current_turn_index ?? 0;
    const nextTurnIndex = (currentTurnIndex + 1) % activeAICount;
    
    let retryCount = 0;
    let updateSuccess = false;
    
    while (retryCount < 3 && !updateSuccess) {
      const { data: updated, error: updateError } = await supabase
        .from('chat_laboratory_conversations')
        .update({ 
          current_turn_index: nextTurnIndex,
          last_speaker_index: currentTurnIndex,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)
        .eq('current_turn_index', expectedPreviousTurnIndex) // Optimistic lock
        .select('current_turn_index')
        .maybeSingle();
      
      if (updated && !updateError) {
        updateSuccess = true;
        console.log(`✅ Turn index updated: ${expectedPreviousTurnIndex} → ${nextTurnIndex}`);
      } else {
        retryCount++;
        console.warn(`⚠️ Concurrent update detected (attempt ${retryCount}/3), retrying...`);
        
        // Exponential backoff: 50ms, 100ms, 200ms
        await new Promise(resolve => setTimeout(resolve, 50 * Math.pow(2, retryCount - 1)));
        
        // Re-fetch current turn index for next attempt
        const { data: freshConv } = await supabase
          .from('chat_laboratory_conversations')
          .select('current_turn_index')
          .eq('id', conversationId)
          .single();
        
        if (freshConv) {
          // Recalculate based on fresh data
          const freshExpected = freshConv.current_turn_index;
          const freshNext = (freshExpected + 1) % activeAICount;
          // Note: For simplicity, we keep currentTurnIndex as the speaker for this message
          // but update the next turn based on fresh data
        }
      }
    }
    
    if (!updateSuccess) {
      console.error('❌ Failed to update turn index after 3 attempts');
      // Continue anyway - the message was saved, just the turn tracking might be slightly off
    }

    // ✅ Determina se generare audio (delegato al frontend)
    const shouldGenerateAudio = voiceEnabled && elevenLabsKey && elevenLabsVoiceId;

    if (!shouldGenerateAudio) {
      if (!voiceEnabled) {
        console.log('🔇 Voice non abilitato per questa conversazione');
      } else if (!elevenLabsKey) {
        console.log('⚠️ ElevenLabs API key mancante - audio non generato');
      } else {
        console.log('⚠️ Voice ID mancante - audio non generato');
      }
    }

    // ✅ Restituisci risposta immediata con flag audioGenerating
    return new Response(
      JSON.stringify({ 
        success: true,
        participant: selectedParticipant.name,
        content: aiResponse,
        tokens: { input: tokenInput, output: tokenOutput },
        responseTime: responseTime,
        messageId: savedMessage.id, // ⚡ Necessario per generate-audio
        audioGenerating: shouldGenerateAudio, // ⚡ Flag per frontend
        audioUrl: null // ⚠️ Sarà popolato da generate-audio
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
