// DEPLOYED: 2025-10-19 - Fixed whitespace trim
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

// Import moduli refactored
import { delay } from './lib/utils.ts';
import { getCachedPrompts, loadBarModeConfig, loadConversationData } from './lib/config-loader.ts';
import { 
  buildSystemPrompt, 
  buildConversationHistory, 
  formatHistoryMessages,
  calculateContextSize 
} from './lib/prompt-builder.ts';
import { callClaude, callChatGPT, callGemini } from './lib/ai-providers.ts';
import { generateAudioForSingleResponse } from './lib/audio-generator.ts';
import { selectNextAgent } from './lib/agent-selector.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversationId, userMessage, participants, cachedPrompts } = await req.json();
    console.log('📻 Radio Chat Orchestrator riceve:', { conversationId, userMessage, participants, hasPrompts: !!cachedPrompts });

    // ============ VALIDATION: Check participants ============
    if (!participants || participants.length === 0) {
      console.error('❌ Nessun partecipante fornito');
      return new Response(
        JSON.stringify({ 
          error: 'Nessun agente disponibile. Attiva almeno un agente nella sidebar.' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const activeParticipantsCheck = participants.filter((p: any) => p.is_active);
    if (activeParticipantsCheck.length === 0) {
      console.error('❌ Nessun agente attivo trovato');
      return new Response(
        JSON.stringify({ 
          error: 'Tutti gli agenti sono disattivati. Attiva almeno un agente nella sidebar.' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // ============ ⚡ LIVELLO 1: PARALLELIZZAZIONE LOAD CONFIGURATIONS ============
    const loadTasks = [
      loadBarModeConfig(supabaseClient, conversationId),
      loadConversationData(supabaseClient, conversationId)
    ];
    
    // ⚡ LIVELLO 2: Skip getCachedPrompts se prompt arrivano dal client
    if (!cachedPrompts) {
      loadTasks.push(getCachedPrompts(supabaseClient, conversationId));
    }
    
    const results = await Promise.all(loadTasks);
    const config = results[0];
    const conversationData = results[1];
    const dbCachedPrompts = results[2] || null;
    
    const { 
      anthropicConfig, 
      openaiConfig, 
      LOVABLE_API_KEY,
      barModeSettings,
      elevenLabsApiKey,
      activeVoiceAgents
    } = config;

    const { 
      agentMode, 
      conversationStyle, 
      conversationPace, 
      pauseBetweenTurnsMs,
      voiceEnabled,
      turnStrategy
    } = barModeSettings;

    console.log('⚙️ Configurazione:', {
      agentMode,
      conversationStyle,
      conversationPace,
      pauseBetweenTurnsMs,
      voiceEnabled,
      turnStrategy
    });
    
    // Check if paused
    if (conversationData.isPaused) {
      console.log('⏸️ Conversazione in pausa, AI non risponde');
      return new Response(
        JSON.stringify({
          error: 'conversation_paused',
          message: 'La conversazione è in pausa. Ripremi Play per continuare.',
          speaker: null,
          tempResponse: null
        }),
        { 
          status: 423,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // ⚡ LIVELLO 2: Usa prompt dal client se disponibili, altrimenti usa cached
    const finalCachedPrompts = cachedPrompts || dbCachedPrompts;
    
    if (cachedPrompts) {
      console.log('⚡ [LIVELLO 2] Usando prompt dal CLIENT (skip DB query)');
    } else {
      console.log('📦 [DB] Caricati prompt dal database');
    }
    
    const { conversation, recentMessages, cumulativeSummary } = conversationData;
    
    // ✅ Carica turn tracking per strategie di turno
    const currentTurnIndex = conversation?.current_turn_index || 0;
    const lastSpeakerIndex = conversation?.last_speaker_index || 0;
    console.log(`📊 Turn tracking: current=${currentTurnIndex}, last_speaker=${lastSpeakerIndex}`);
    
    // FIX 5: DIAGNOSTICA SUMMARY
    console.log('📚 DIAGNOSTICA SUMMARY:', {
      conversationId,
      hasRecentMessages: recentMessages.length > 0,
      recentMessagesCount: recentMessages.length,
      hasCumulativeSummary: !!cumulativeSummary,
      summaryLength: cumulativeSummary?.length || 0,
      summaryPreview: cumulativeSummary ? cumulativeSummary.substring(0, 100) + '...' : 'NULL'
    });

    // ============ USE FINAL CACHED PROMPTS (client or DB) ============
    const globalSystemPrompt = finalCachedPrompts.globalPrompt;
    const baseContent = finalCachedPrompts.baseSections;
    
    // ✅ RILEVA SE È UN PROMPT COMPOSTO (non inizia con testo generico)
    const isComposedPrompt = globalSystemPrompt && 
                             globalSystemPrompt.length > 500 && 
                             !globalSystemPrompt.startsWith('Sei un assistente') &&
                             globalSystemPrompt.includes('IDENTITÀ:');
    
    if (isComposedPrompt) {
      console.log(`🎯 [COMPOSED] Usando prompt composto (${globalSystemPrompt.length} chars) - NO assemblaggio`);
    } else {
      console.log(`🔧 [LEGACY] Assemblaggio prompt dinamico da sezioni separate (BASE: ${baseContent.length} chars)`);
    }

    // ============ FORMAT HISTORY MESSAGES ============
    const historyMessages = formatHistoryMessages(recentMessages);

    // ============ AGENT SELECTION BASED ON TURN STRATEGY ============
    const activeParticipants = participants.filter((p: any) => p.is_active);
    
    console.log(`🎯 Selezione agente usando strategia: ${turnStrategy}`);
    
    const selectionContext = {
      userMessage,
      recentMessages,
      cumulativeSummary,
      conversationStyle
    };

    const { selectedAgent, newTurnIndex } = await selectNextAgent(
      turnStrategy,
      activeParticipants,
      currentTurnIndex,
      lastSpeakerIndex,
      selectionContext,
      supabaseClient,
      conversationId
    );

    console.log(`🎯 Agente selezionato: ${selectedAgent.name} (tipo: ${selectedAgent.type})`);

    // ============ BUILD SYSTEM PROMPT PER AGENTE SELEZIONATO ============
    let systemPrompt: string;
    
    if (isComposedPrompt) {
      // ✅ USA DIRETTAMENTE il prompt composto - NO assemblaggio
      systemPrompt = globalSystemPrompt;
      console.log(`🎯 [${selectedAgent.name}] Usando prompt composto diretto (${systemPrompt.length} chars)`);
    } else {
      // 🔧 Assemblaggio dinamico per prompt legacy
      const agentPersonality = finalCachedPrompts.agentPersonalities instanceof Map
        ? finalCachedPrompts.agentPersonalities.get(selectedAgent.name.toLowerCase()) || ''
        : finalCachedPrompts.agentPersonalities[selectedAgent.name.toLowerCase()] || '';
      
      systemPrompt = buildSystemPrompt({
        globalPrompt: globalSystemPrompt,
        baseContent: baseContent,
        agentPersonality: agentPersonality,
        conversationStyle: conversationStyle,
        agentMode: agentMode,
        previousResponses: [],
        wasCalledDirectly: false,
        styleSections: finalCachedPrompts.conversationStyles,
        conversationPersonality: finalCachedPrompts.conversationPersonality
      });
      console.log(`🔧 [${selectedAgent.name}] Prompt assemblato dinamicamente (${systemPrompt.length} chars)`);
    }

    // ============ BUILD CONVERSATION HISTORY ============
    const turnContext = [
      { role: 'user', content: userMessage }
    ];
    
    const conversationHistory = buildConversationHistory({
      systemPrompt: systemPrompt,
      cumulativeSummary: cumulativeSummary,
      historyMessages: historyMessages,
      turnContext: turnContext
    });

    // ============ CALCULATE CONTEXT SIZE ============
    const contextSize = calculateContextSize(conversationHistory);
    console.log(`📊 Context: ${contextSize.totalContextChars} chars, ~${contextSize.estimatedTokens} tokens`);

    // ============ CALL AI PROVIDER ============
    let aiResponse = null;
    let provider = null;
    let rawResponse = null;
    const callStartTime = Date.now();

    if (selectedAgent.type === 'anthropic' || selectedAgent.type === 'claude') {
      provider = 'claude';
      const result = await callClaude({
        apiKey: anthropicConfig.apiKey,
        model: anthropicConfig.model,
        conversationHistory: conversationHistory,
        callStartTime: callStartTime
      });
      aiResponse = result.content;
      rawResponse = result;
    } else if (selectedAgent.type === 'openai' || selectedAgent.type === 'chatgpt') {
      provider = 'chatgpt';
      const result = await callChatGPT({
        lovableApiKey: LOVABLE_API_KEY,
        openaiConfig: openaiConfig,
        conversationHistory: conversationHistory,
        callStartTime: callStartTime
      });
      aiResponse = result.content;
      rawResponse = result;
    } else if (selectedAgent.type === 'lovable_ai' || selectedAgent.type === 'gemini') {
      provider = 'gemini';
      const result = await callGemini({
        lovableApiKey: LOVABLE_API_KEY,
        conversationHistory: conversationHistory,
        callStartTime: callStartTime
      });
      aiResponse = result.content;
      rawResponse = result;
    } else {
      console.warn(`⚠️ Tipo agente sconosciuto: ${selectedAgent.type}`);
      throw new Error(`Tipo agente non supportato: ${selectedAgent.type}`);
    }

    if (!aiResponse) {
      throw new Error(`Nessuna risposta da ${selectedAgent.name}`);
    }

    // Trim whitespace from the AI response
    aiResponse = aiResponse.trim();

    console.log(`✅ Risposta (${provider}): ${aiResponse.substring(0, 100)}...`);

    // ============ GENERATE MESSAGE ID (BEFORE AUDIO) ============
    const messageId = crypto.randomUUID();

    // ============ AUDIO GENERATION ============
    let audioUrl = null;
    if (voiceEnabled && elevenLabsApiKey && activeVoiceAgents.some((v: any) => v.elevenlabs_agent_id === selectedAgent.id)) {
      try {
        const voiceAgent = activeVoiceAgents.find((v: any) => v.elevenlabs_agent_id === selectedAgent.id);
        audioUrl = await generateAudioForSingleResponse({
          supabaseClient: supabaseClient,
          conversationId: conversationId,
          messageId: messageId,
          content: aiResponse,
          voiceId: voiceAgent?.voice_id || 'EXAVITQu4vr4xnSDxMaL',
          elevenLabsApiKey: elevenLabsApiKey
        });
        console.log(`🔊 Audio generato per ${selectedAgent.name} (messageId: ${messageId})`);
      } catch (audioError) {
        console.error(`❌ Errore generazione audio per ${selectedAgent.name}:`, audioError);
      }
    } else {
      console.log(`🔇 Audio disabilitato o agente non abilitato: ${selectedAgent.name}`);
    }

    // ============ SAVE TO DATABASE ============
    const { error: insertError } = await supabaseClient
      .from('chat_laboratory_messages')
      .insert({
        id: messageId,
        conversation_id: conversationId,
        sender_type: selectedAgent.type,
        sender_name: selectedAgent.name,
        content: aiResponse,
        audio_url: audioUrl,
        token_input: rawResponse?.tokensIn || 0,
        token_output: rawResponse?.tokensOut || 0,
        tempo_risposta_ms: rawResponse?.duration || 0,
        created_at: new Date().toISOString()
      });

    if (insertError) {
      console.error(`❌ Errore salvataggio ${selectedAgent.name}:`, insertError);
      throw insertError;
    } else {
      console.log(`✅ ${selectedAgent.name} salvato nel DB con ID ${messageId}`);
    }

    // ============ UPDATE TURN INDEX ============
    const { error: updateError } = await supabaseClient
      .from('chat_laboratory_conversations')
      .update({
        current_turn_index: newTurnIndex,
        last_speaker_index: newTurnIndex,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);

    if (updateError) {
      console.error(`❌ Errore aggiornamento turn index:`, updateError);
    } else {
      console.log(`✅ Turn index aggiornato: ${newTurnIndex}`);
    }

    // ============ RETURN RESPONSE ============
    console.log(`\n✅ Risposta generata da ${selectedAgent.name} con strategia ${turnStrategy}`);
    return new Response(
      JSON.stringify({
        response: aiResponse,
        speaker: selectedAgent.name,
        audioUrl: audioUrl,
        tempResponse: null,
        turnIndex: newTurnIndex,
        strategy: turnStrategy
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Errore orchestrator:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
