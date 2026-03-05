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

    // ============ MULTI-AGENT: ALL ACTIVE AGENTS RESPOND ============
    const activeParticipants = participants.filter((p: any) => p.is_active);
    
    // Use strategy to determine ORDER of responses
    const selectionContext = {
      userMessage,
      recentMessages,
      cumulativeSummary,
      conversationStyle
    };

    // Determine order: use strategy to pick the "first" agent, then rotate from there
    const { newTurnIndex } = await selectNextAgent(
      turnStrategy,
      activeParticipants,
      currentTurnIndex,
      lastSpeakerIndex,
      selectionContext,
      supabaseClient,
      conversationId
    );

    // Build ordered list: start from selected agent, then cycle through rest
    const orderedAgents: any[] = [];
    for (let i = 0; i < activeParticipants.length; i++) {
      const idx = (newTurnIndex + i) % activeParticipants.length;
      orderedAgents.push(activeParticipants[idx]);
    }

    console.log(`🎯 Ordine risposte (${turnStrategy}): ${orderedAgents.map((a: any) => a.name).join(' → ')}`);

    // ============ SEQUENTIAL MULTI-AGENT RESPONSES ============
    const allResponses: Array<{ agentName: string; content: string; messageId: string }> = [];
    const responseResults: any[] = [];

    for (let agentIdx = 0; agentIdx < orderedAgents.length; agentIdx++) {
      const currentAgent = orderedAgents[agentIdx];
      console.log(`\n🤖 [${agentIdx + 1}/${orderedAgents.length}] Generando risposta per ${currentAgent.name} (${currentAgent.type})...`);

      // Add delay between agents (skip first)
      if (agentIdx > 0 && pauseBetweenTurnsMs > 0) {
        console.log(`⏳ Pausa ${pauseBetweenTurnsMs}ms tra agenti...`);
        await delay(pauseBetweenTurnsMs);
      }

      // ============ BUILD SYSTEM PROMPT PER QUESTO AGENTE ============
      let systemPrompt: string;
      
      if (isComposedPrompt) {
        systemPrompt = globalSystemPrompt;
      } else {
        const agentPersonality = finalCachedPrompts.agentPersonalities instanceof Map
          ? finalCachedPrompts.agentPersonalities.get(currentAgent.name.toLowerCase()) || ''
          : finalCachedPrompts.agentPersonalities[currentAgent.name.toLowerCase()] || '';
        
        systemPrompt = buildSystemPrompt({
          globalPrompt: globalSystemPrompt,
          baseContent: baseContent,
          agentPersonality: agentPersonality,
          conversationStyle: conversationStyle,
          agentMode: agentMode,
          previousResponses: allResponses, // Pass previous agent responses for context
          wasCalledDirectly: false,
          styleSections: finalCachedPrompts.conversationStyles,
          conversationPersonality: finalCachedPrompts.conversationPersonality
        });
      }

      // ============ BUILD CONVERSATION HISTORY ============
      const turnContext = [{ role: 'user', content: userMessage }];
      
      // Add previous agents' responses in this turn as assistant messages
      for (const prevResp of allResponses) {
        turnContext.push({ role: 'assistant', content: `[${prevResp.agentName}]: ${prevResp.content}` });
      }
      
      const conversationHistory = buildConversationHistory({
        systemPrompt,
        cumulativeSummary,
        historyMessages,
        turnContext
      });

      // ============ CALL AI PROVIDER ============
      let aiResponse = null;
      let rawResponse = null;
      const callStartTime = Date.now();

      try {
        if (currentAgent.type === 'anthropic' || currentAgent.type === 'claude') {
          const result = await callClaude({
            apiKey: anthropicConfig.apiKey,
            model: anthropicConfig.model,
            conversationHistory,
            callStartTime
          });
          aiResponse = result.content;
          rawResponse = result;
        } else if (currentAgent.type === 'openai' || currentAgent.type === 'chatgpt') {
          const result = await callChatGPT({
            lovableApiKey: LOVABLE_API_KEY,
            openaiConfig,
            conversationHistory,
            callStartTime
          });
          aiResponse = result.content;
          rawResponse = result;
        } else if (currentAgent.type === 'lovable_ai' || currentAgent.type === 'gemini') {
          const result = await callGemini({
            lovableApiKey: LOVABLE_API_KEY,
            conversationHistory,
            callStartTime
          });
          aiResponse = result.content;
          rawResponse = result;
        } else {
          console.warn(`⚠️ Tipo agente sconosciuto: ${currentAgent.type}, skip`);
          continue;
        }
      } catch (aiError: any) {
        console.error(`❌ Errore AI per ${currentAgent.name}:`, aiError.message);
        continue; // Skip this agent, try next
      }

      if (!aiResponse) {
        console.warn(`⚠️ Nessuna risposta da ${currentAgent.name}, skip`);
        continue;
      }

      aiResponse = aiResponse.trim();

      // Skip if agent explicitly says SKIP
      if (aiResponse === '[SKIP]' || aiResponse === 'SKIP') {
        console.log(`⏭️ ${currentAgent.name} ha scelto di non rispondere (SKIP)`);
        continue;
      }

      console.log(`✅ Risposta ${currentAgent.name}: ${aiResponse.substring(0, 100)}...`);

      // ============ GENERATE MESSAGE ID & AUDIO ============
      const messageId = crypto.randomUUID();
      let audioUrl = null;

      if (voiceEnabled && elevenLabsApiKey) {
        const voiceAgent = activeVoiceAgents.find((v: any) => 
          v.elevenlabs_agent_id === currentAgent.id ||
          v.name.toLowerCase().includes(currentAgent.name.toLowerCase()) ||
          currentAgent.name.toLowerCase().includes(v.name.toLowerCase())
        ) || activeVoiceAgents[0];
        
        if (voiceAgent?.voice_id) {
          try {
            audioUrl = await generateAudioForSingleResponse({
              supabaseClient, conversationId, messageId,
              content: aiResponse,
              voiceId: voiceAgent.voice_id,
              elevenLabsApiKey
            });
            console.log(`🔊 Audio generato per ${currentAgent.name}`);
          } catch (audioError) {
            console.error(`❌ Errore audio per ${currentAgent.name}:`, audioError);
          }
        }
      }

      // ============ SAVE TO DATABASE ============
      const { error: insertError } = await supabaseClient
        .from('chat_laboratory_messages')
        .insert({
          id: messageId,
          conversation_id: conversationId,
          sender_type: currentAgent.type,
          sender_name: currentAgent.name,
          content: aiResponse,
          audio_url: audioUrl,
          token_input: rawResponse?.tokensIn || 0,
          token_output: rawResponse?.tokensOut || 0,
          tempo_risposta_ms: rawResponse?.duration || 0,
          created_at: new Date().toISOString()
        });

      if (insertError) {
        console.error(`❌ Errore salvataggio ${currentAgent.name}:`, insertError);
      } else {
        console.log(`✅ ${currentAgent.name} salvato nel DB con ID ${messageId}`);
        allResponses.push({ agentName: currentAgent.name, content: aiResponse, messageId });
        responseResults.push({
          speaker: currentAgent.name,
          response: aiResponse,
          audioUrl,
          messageId
        });
      }
    }

    // ============ UPDATE TURN INDEX ============
    const finalTurnIndex = (newTurnIndex + orderedAgents.length - 1) % activeParticipants.length;
    await supabaseClient
      .from('chat_laboratory_conversations')
      .update({
        current_turn_index: finalTurnIndex,
        last_speaker_index: finalTurnIndex,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);

    // ============ RETURN RESPONSE ============
    console.log(`\n✅ Multi-agent completato: ${responseResults.length}/${orderedAgents.length} risposte generate`);
    return new Response(
      JSON.stringify({
        responses: responseResults,
        totalResponses: responseResults.length,
        strategy: turnStrategy,
        // Backward compat: first response as primary
        response: responseResults[0]?.response || '',
        speaker: responseResults[0]?.speaker || '',
        audioUrl: responseResults[0]?.audioUrl || null,
        tempResponse: null,
        turnIndex: finalTurnIndex
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
