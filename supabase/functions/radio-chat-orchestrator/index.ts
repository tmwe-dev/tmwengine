// DEPLOYED: 2025-10-19 - Fixed whitespace trim
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

// Import moduli refactored
import { delay, estimateTokens } from './lib/utils.ts';
import { getCachedPrompts, loadBarModeConfig, loadConversationData } from './lib/config-loader.ts';
import { 
  buildSystemPrompt, 
  buildConversationHistory, 
  formatHistoryMessages,
  calculateContextSize 
} from './lib/prompt-builder.ts';
import { callClaude, callChatGPT, callGemini } from './lib/ai-providers.ts';
import { generateAudioForSingleResponse } from './lib/audio-generator.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversationId, userMessage, participants } = await req.json();
    console.log('📻 Radio Chat Orchestrator riceve:', { conversationId, userMessage, participants });

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

    // ============ LOAD CONFIGURATIONS ============
    const config = await loadBarModeConfig(supabaseClient, conversationId);
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
      voiceEnabled 
    } = barModeSettings;

    console.log('⚙️ Configurazione:', {
      agentMode,
      conversationStyle,
      conversationPace,
      pauseBetweenTurnsMs,
      voiceEnabled
    });

    // ============ LOAD CONVERSATION DATA ============
    const conversationData = await loadConversationData(supabaseClient, conversationId);
    
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

    const { recentMessages, cumulativeSummary } = conversationData;
    
    // FIX 5: DIAGNOSTICA SUMMARY
    console.log('📚 DIAGNOSTICA SUMMARY:', {
      conversationId,
      hasRecentMessages: recentMessages.length > 0,
      recentMessagesCount: recentMessages.length,
      hasCumulativeSummary: !!cumulativeSummary,
      summaryLength: cumulativeSummary?.length || 0,
      summaryPreview: cumulativeSummary ? cumulativeSummary.substring(0, 100) + '...' : 'NULL'
    });

    // ============ LOAD CACHED PROMPTS ============
    const cachedPrompts = await getCachedPrompts(supabaseClient);
    const globalSystemPrompt = cachedPrompts.globalPrompt;
    const baseContent = cachedPrompts.baseSections;
    console.log(`📦 Prompts cached caricati (BASE: ${baseContent.length} chars)`);

    // ============ FORMAT HISTORY MESSAGES ============
    const historyMessages = formatHistoryMessages(recentMessages);

    // ============ SEQUENTIAL AGENT CALLS ============
    const activeParticipants = participants.filter((p: any) => p.is_active);
    let aiTurnsCount = 0; // ✅ Contatore turni AI
    const MAX_AI_TURNS_BEFORE_USER = 6; // ✅ Limite turni
    
    // Optimize order: Gemini → ChatGPT → Claude
    const geminiAgent = activeParticipants.find((p: any) => 
      p.type === 'lovable_ai' || p.type === 'gemini'
    );
    const openaiAgent = activeParticipants.find((p: any) => 
      p.type === 'openai' || p.type === 'chatgpt'
    );
    const claudeAgent = activeParticipants.find((p: any) => 
      p.type === 'anthropic' || p.type === 'claude'
    );
    const otherAgents = activeParticipants.filter((p: any) => 
      p.type !== 'lovable_ai' && 
      p.type !== 'gemini' && 
      p.type !== 'openai' && 
      p.type !== 'chatgpt' &&
      p.type !== 'anthropic' && 
      p.type !== 'claude'
    );
    
    const sortedParticipants = [
      geminiAgent,
      openaiAgent,
      claudeAgent,
      ...otherAgents
    ].filter(Boolean);
    
    console.log(`⚡ Ordine chiamate ottimizzato: ${sortedParticipants.map((p: any) => p.name).join(' → ')}`);
    console.log(`🎯 Chiamata sequenziale di ${sortedParticipants.length} agenti attivi`);
    
    const allResponses: any[] = [];
    
    for (let i = 0; i < sortedParticipants.length; i++) {
      try {
        const currentAgent = sortedParticipants[i];
        console.log(`\n🎯 Agente ${i + 1}/${sortedParticipants.length}: ${currentAgent.name}`);
        
        // ============ BUILD TURN CONTEXT ============
        const turnContext = [
          { role: 'user', content: userMessage },
          ...allResponses.map(r => ({
            role: 'assistant',
            content: r.content
          }))
        ];
        
        console.log(`📝 Context include: messaggio utente + ${allResponses.length} risposte precedenti`);

        // ============ BUILD SYSTEM PROMPT ============
        const systemPrompt = buildSystemPrompt(
          globalSystemPrompt,
          baseContent,
          currentAgent.configuration.agentDescription,
          conversationStyle,
          currentAgent.name
        );
        const systemPromptTokens = estimateTokens(systemPrompt);
        console.log(`🤖 System prompt: ${systemPromptTokens} tokens`);

        // ============ BUILD CONVERSATION HISTORY ============
        const conversationHistory = buildConversationHistory(historyMessages);
        const conversationHistoryTokens = estimateTokens(conversationHistory);
        console.log(`📜 Cronologia: ${conversationHistoryTokens} tokens`);

        // ============ CALCULATE CONTEXT SIZE ============
        const contextSize = calculateContextSize(
          systemPromptTokens,
          conversationHistoryTokens,
          anthropicConfig.maxModelTokens,
          userMessage
        );

        // ============ CHOOSE AI PROVIDER ============
        let aiResponse = null;
        let provider = null;
        let rawResponse = null;

        if (currentAgent.type === 'anthropic' || currentAgent.type === 'claude') {
          provider = 'claude';
          const { response, raw } = await callClaude(
            anthropicConfig.apiKey,
            systemPrompt,
            conversationHistory,
            userMessage,
            contextSize
          );
          aiResponse = response;
          rawResponse = raw;
        } else if (currentAgent.type === 'openai' || currentAgent.type === 'chatgpt') {
          provider = 'chatgpt';
          const { response, raw } = await callChatGPT(
            openaiConfig.apiKey,
            systemPrompt,
            conversationHistory,
            userMessage,
            contextSize
          );
          aiResponse = response;
          rawResponse = raw;
        } else if (currentAgent.type === 'lovable_ai' || currentAgent.type === 'gemini') {
          provider = 'gemini';
          const { response, raw } = await callGemini(
            LOVABLE_API_KEY,
            systemPrompt,
            conversationHistory,
            userMessage
          );
          aiResponse = response;
          rawResponse = raw;
        } else {
          console.warn(`⚠️ Tipo agente sconosciuto: ${currentAgent.type}`);
          continue;
        }

        if (!aiResponse) {
          console.warn(`⚠️ Nessuna risposta da ${currentAgent.name}`);
          continue;
        }

        // Trim whitespace from the AI response
        aiResponse = aiResponse.trim();

        console.log(`✅ Risposta (${provider}): ${aiResponse}`);

        // ============ AUDIO GENERATION ============
        let audioUrl = null;
        if (voiceEnabled && elevenLabsApiKey && activeVoiceAgents.includes(currentAgent.name)) {
          try {
            audioUrl = await generateAudioForSingleResponse(
              aiResponse,
              elevenLabsApiKey,
              currentAgent.configuration.voiceId
            );
            console.log(`🔊 Audio generato per ${currentAgent.name}: ${audioUrl}`);
          } catch (audioError) {
            console.error(`❌ Errore generazione audio per ${currentAgent.name}:`, audioError);
          }
        } else {
          console.log(`🔇 Audio disabilitato o agente non abilitato: ${currentAgent.name}`);
        }

        // ============ STORE RESPONSE ============
        const responseData = {
          agentName: currentAgent.name,
          content: aiResponse,
          audioUrl: audioUrl,
          raw: rawResponse
        };
        allResponses.push(responseData);

        // ============ RETURN RESPONSE (FIRST AGENT ONLY) ============
        if (i === 0) {
          console.log(`\n✅ Prima risposta (${currentAgent.name}), ritorno al client`);
          return new Response(
            JSON.stringify({
              response: aiResponse,
              speaker: currentAgent.name,
              audioUrl: audioUrl,
              tempResponse: null
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          console.log(`\n⏳ Risposta da ${currentAgent.name} ricevuta, pausa di ${pauseBetweenTurnsMs}ms`);
          await delay(pauseBetweenTurnsMs);
        }

        aiTurnsCount++; // ✅ Incrementa il contatore

        if (aiTurnsCount >= MAX_AI_TURNS_BEFORE_USER) {
          console.warn(`⚠️ Raggiunto il limite di ${MAX_AI_TURNS_BEFORE_USER} turni AI consecutivi. Interrompo.`);
          break;
        }
      } catch (error) {
        console.error(`❌ Errore chiamata ${sortedParticipants[i]?.name}:`, error);
      }
    }
  } catch (error) {
    console.error('❌ Errore orchestrator:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
