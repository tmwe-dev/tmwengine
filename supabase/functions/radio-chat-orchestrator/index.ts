// RADIO CHAT ORCHESTRATOR - Dynamic Multi-Round with Cognitive Buffers
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

// Import moduli
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
import { sanitizeForTTS, validateTTSText } from './lib/tts-sanitizer.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============ COGNITIVE BUFFER TYPES ============
interface CognitiveBuffer {
  agent_id: string;
  agent_name: string;
  pending_context: string[];
  last_speak_time: number | null;
  priority_score: number;
  response_count: number;
}

type TurnStrategy = 'RANDOM_30' | 'ROUND_ROBIN' | 'SMART_PRIORITY' | 'INTERRUPT_BASED';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversationId, userMessage, participants } = await req.json();
    console.log('📻 Radio Chat Orchestrator riceve:', { conversationId, userMessage, participants });

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

    // ============ LOAD CACHED PROMPTS ============
    const cachedPrompts = await getCachedPrompts(supabaseClient);
    const globalSystemPrompt = cachedPrompts.globalPrompt;
    const baseContent = cachedPrompts.baseSections;
    console.log(`📦 Prompts cached caricati (BASE: ${baseContent.length} chars)`);

    // ============ FORMAT HISTORY MESSAGES ============
    const historyMessages = formatHistoryMessages(recentMessages);

    // ============ LOAD/INITIALIZE COGNITIVE BUFFERS ============
    const { data: barMode } = await supabaseClient
      .from('chat_laboratory_bar_mode')
      .select('cognitive_buffers, turn_strategy')
      .eq('conversation_id', conversationId)
      .single();

    let cognitiveBuffers: CognitiveBuffer[] = barMode?.cognitive_buffers || [];
    const turnStrategy: TurnStrategy = barMode?.turn_strategy || 'SMART_PRIORITY';

    // Initialize buffers if empty
    const activeParticipants = participants.filter((p: any) => p.is_active && p.type !== 'human');
    if (cognitiveBuffers.length === 0) {
      cognitiveBuffers = activeParticipants.map((p: any) => ({
        agent_id: p.type,
        agent_name: p.name,
        pending_context: [],
        last_speak_time: null,
        priority_score: 0,
        response_count: 0
      }));
    }

    console.log(`🧠 Cognitive Buffers: ${cognitiveBuffers.length} agenti tracciati`);
    console.log(`🎯 Turn Strategy: ${turnStrategy}`);

    // ============ MULTI-ROUND ORCHESTRATION ============
    const MAX_AI_TURNS_BEFORE_USER = 6;
    let aiTurnsCount = 0;
    const allResponses: any[] = [];

    // PRIMO TURNO: Sequenziale (Gemini → ChatGPT → Claude)
    console.log('\n🎬 === PRIMO TURNO SEQUENZIALE ===');
    const geminiAgent = activeParticipants.find((p: any) => 
      p.type === 'lovable_ai' || p.type === 'gemini'
    );
    const openaiAgent = activeParticipants.find((p: any) => 
      p.type === 'openai' || p.type === 'chatgpt'
    );
    const claudeAgent = activeParticipants.find((p: any) => 
      p.type === 'anthropic' || p.type === 'claude'
    );

    const firstTurnAgents = [geminiAgent, openaiAgent, claudeAgent].filter(Boolean);

    for (const agent of firstTurnAgents) {
      if (aiTurnsCount >= MAX_AI_TURNS_BEFORE_USER) break;

      try {
        const result = await executeAgentTurn({
          agent,
          userMessage,
          allResponses,
          conversationId,
          supabaseClient,
          config,
          cachedPrompts,
          historyMessages,
          cumulativeSummary,
          cognitiveBuffers,
          activeVoiceAgents,
          globalSystemPrompt,
          baseContent,
          conversationStyle,
          agentMode,
          voiceEnabled,
          elevenLabsApiKey,
          pauseBetweenTurnsMs,
          anthropicConfig,
          openaiConfig,
          LOVABLE_API_KEY
        });

        if (result.skipped) {
          console.log(`⏭️ ${agent.name} ha fatto SKIP`);
          continue;
        }

        allResponses.push(result.response);
        cognitiveBuffers = result.updatedBuffers;
        aiTurnsCount++;

        // Pausa tra turni
        if (pauseBetweenTurnsMs > 0 && aiTurnsCount < MAX_AI_TURNS_BEFORE_USER) {
          await delay(pauseBetweenTurnsMs);
        }
        
      } catch (error: any) {
        console.error(`❌ ${agent.name} fallito durante primo turno:`, error.message);
        // Continua con il prossimo agente invece di interrompere tutto
        continue;
      }
    }

    // TURNI SUCCESSIVI: Dynamic Selection
    console.log('\n🎲 === TURNI DINAMICI ===');
    while (aiTurnsCount < MAX_AI_TURNS_BEFORE_USER) {
      // Seleziona prossimo speaker
      const selectedAgentType = selectNextSpeaker(
        turnStrategy,
        activeParticipants,
        cognitiveBuffers,
        userMessage,
        allResponses
      );

      const selectedAgent = activeParticipants.find((p: any) => p.type === selectedAgentType);
      if (!selectedAgent) break;

      console.log(`\n🎯 Turno ${aiTurnsCount + 1}: ${selectedAgent.name} (${turnStrategy})`);

      try {
        const result = await executeAgentTurn({
          agent: selectedAgent,
          userMessage,
          allResponses,
          conversationId,
          supabaseClient,
          config,
          cachedPrompts,
          historyMessages,
          cumulativeSummary,
          cognitiveBuffers,
          activeVoiceAgents,
          globalSystemPrompt,
          baseContent,
          conversationStyle,
          agentMode,
          voiceEnabled,
          elevenLabsApiKey,
          pauseBetweenTurnsMs,
          anthropicConfig,
          openaiConfig,
          LOVABLE_API_KEY
        });

        if (result.skipped) {
          console.log(`⏭️ ${selectedAgent.name} ha fatto SKIP`);
          // Se tutti skippano, ferma il loop
          const allSkipped = activeParticipants.every(p => {
            const buffer = cognitiveBuffers.find(b => b.agent_id === p.type);
            return buffer && buffer.response_count === 0;
          });
          if (allSkipped) break;
          continue;
        }

        allResponses.push(result.response);
        cognitiveBuffers = result.updatedBuffers;
        aiTurnsCount++;

        // Pausa tra turni
        if (pauseBetweenTurnsMs > 0 && aiTurnsCount < MAX_AI_TURNS_BEFORE_USER) {
          await delay(pauseBetweenTurnsMs);
        }
        
      } catch (error: any) {
        console.error(`❌ ${selectedAgent.name} fallito durante turno dinamico:`, error.message);
        // Continua con il prossimo agente
        continue;
      }
    }

    // ============ SAVE COGNITIVE BUFFERS ============
    await supabaseClient
      .from('chat_laboratory_bar_mode')
      .update({ cognitive_buffers: cognitiveBuffers })
      .eq('conversation_id', conversationId);

    console.log(`\n✅ Orchestrazione completata: ${aiTurnsCount} turni AI totali`);

    // ============ AUTO-SUMMARY TRIGGER ============
    const totalMessages = recentMessages.length + aiTurnsCount + 1;
    if (totalMessages >= 10 && totalMessages % 10 === 0) {
      console.log('📚 Trigger auto-summary (10 messaggi raggiunti)');
      // Trigger summary generation (non-blocking)
      supabaseClient.functions.invoke('generate-conversation-summary', {
        body: { conversationId }
      }).catch(err => console.error('❌ Summary trigger failed:', err));
    }

    // Return first response to client
    const firstResponse = allResponses[0];
    return new Response(
      JSON.stringify({
        speaker: firstResponse.agentType,
        speakerName: firstResponse.agentName,
        content: firstResponse.content,
        audioUrl: firstResponse.audioUrl,
        tempResponse: {
          id: firstResponse.messageId,
          sender_type: firstResponse.agentType,
          sender_name: firstResponse.agentName,
          content: firstResponse.content,
          audio_url: firstResponse.audioUrl
        },
        tokensIn: firstResponse.tokensIn,
        tokensOut: firstResponse.tokensOut,
        responseTime: firstResponse.responseTime,
        totalTurns: aiTurnsCount,
        strategy: turnStrategy
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Radio Chat Orchestrator Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// ============ AGENT TURN EXECUTION ============
async function executeAgentTurn(params: any) {
  const {
    agent,
    userMessage,
    allResponses,
    conversationId,
    supabaseClient,
    cachedPrompts,
    historyMessages,
    cumulativeSummary,
    cognitiveBuffers,
    activeVoiceAgents,
    globalSystemPrompt,
    baseContent,
    conversationStyle,
    agentMode,
    voiceEnabled,
    elevenLabsApiKey,
    anthropicConfig,
    openaiConfig,
    LOVABLE_API_KEY
  } = params;

  console.log(`\n🎯 Esecuzione turno: ${agent.name}`);

  // ============ BUILD TURN CONTEXT ============
  const turnContext = [
    { role: 'user', content: userMessage },
    ...allResponses.map((r: any) => ({
      role: 'assistant',
      content: r.content
    }))
  ];

  // ============ DETECT DIRECT CALLS ============
  const lastResponse = allResponses[allResponses.length - 1];
  const wasCalledByAgent = lastResponse && (
    lastResponse.content.toLowerCase().includes(agent.name.toLowerCase()) ||
    lastResponse.content.toLowerCase().includes(`@${agent.name.toLowerCase()}`)
  );

  // ============ GET AGENT PERSONALITY ============
  const agentPersonality = agent.effective_prompt || 
    cachedPrompts.agentPersonalities.get(agent.name.toLowerCase()) || 
    '';

  // ============ GET WORD LIMIT ============
  let maxWordsLimit = 60;
  const agentKeywords: Record<string, string[]> = {
    'chatgpt': ['gpt', 'openai', 'renny'],
    'claude': ['anthropic', 'claude', 'tonino'],
    'gemini': ['gemini', 'google', 'vittorio']
  };

  const agentKey = agent.name.toLowerCase();
  const searchKeywords = agentKeywords[agentKey] || [agentKey];
  const associatedVoiceAgent = activeVoiceAgents.find((v: any) => {
    const voiceName = v.name.toLowerCase();
    return searchKeywords.some(keyword => voiceName.includes(keyword));
  });

  if (associatedVoiceAgent?.max_words_per_response) {
    maxWordsLimit = associatedVoiceAgent.max_words_per_response;
  }

  // ============ BUILD PROMPT ============
  const wordLimitInstruction = `
LIMITE LUNGHEZZA RISPOSTA
Massimo ${maxWordsLimit} parole per questa risposta.
Conta mentalmente le parole prima di rispondere.
Risposte più brevi sono preferibili se complete.
NON includere il conteggio parole nel testo finale.
NON usare formattazione markdown nel testo.
NON usare placeholder tra parentesi quadre.

IMPORTANTE: Se non hai nulla di rilevante da aggiungere alla conversazione, rispondi SOLO con "[SKIP]" e lascia parlare gli altri agenti.
`;

  const composedPrompt = buildSystemPrompt({
    globalPrompt: globalSystemPrompt,
    baseContent,
    agentPersonality,
    conversationStyle,
    agentMode,
    previousResponses: allResponses,
    wasCalledDirectly: wasCalledByAgent,
    lastResponse,
    dynamicWordLimit: wordLimitInstruction
  });

  // ============ BUILD CONVERSATION HISTORY ============
  const conversationHistory = buildConversationHistory({
    systemPrompt: composedPrompt,
    cumulativeSummary,
    historyMessages,
    turnContext
  });

  const { totalContextChars, estimatedTokens } = calculateContextSize(conversationHistory);
  console.log(`📊 Context: ${estimatedTokens} tokens`);

  // ============ CALL AI PROVIDER ============
  let aiResponse = '';
  let tokenInput = 0;
  let tokenOutput = 0;
  const startTime = Date.now();

  if ((agent.type === 'anthropic' || agent.type === 'claude') && anthropicConfig?.apiKey) {
    try {
      const result = await callClaude({
        conversationHistory,
        apiKey: anthropicConfig.apiKey,
        model: anthropicConfig.model,
        startTime
      });
      aiResponse = result.content;
      tokenInput = result.tokensIn;
      tokenOutput = result.tokensOut;
    } catch (error: any) {
      if (error.message.includes('INSUFFICIENT_CREDITS')) {
        console.warn(`⚠️ ${agent.name}: Crediti Anthropic insufficienti, SKIP`);
        return { skipped: true, updatedBuffers: cognitiveBuffers };
      }
      throw error; // Re-throw altri errori
    }
  }
  else if (agent.type === 'openai' || agent.type === 'chatgpt') {
    const result = await callChatGPT({
      conversationHistory,
      lovableApiKey: LOVABLE_API_KEY,
      openaiConfig,
      startTime
    });
    aiResponse = result.content;
    tokenInput = result.tokensIn;
    tokenOutput = result.tokensOut;
  }
  else if (agent.type === 'gemini' && LOVABLE_API_KEY) {
    const result = await callGemini({
      conversationHistory,
      lovableApiKey: LOVABLE_API_KEY,
      startTime
    });
    aiResponse = result.content;
    tokenInput = result.tokensIn;
    tokenOutput = result.tokensOut;
  }
  else {
    throw new Error(`No API key available for ${agent.type}`);
  }

  const responseTime = Date.now() - startTime;

  // ============ CHECK FOR SKIP ============
  if (aiResponse.trim() === '[SKIP]' || aiResponse.trim().toLowerCase().includes('[skip]')) {
    console.log(`⏭️ ${agent.name} ha scelto di fare SKIP`);
    return { skipped: true, updatedBuffers: cognitiveBuffers };
  }

  // ============ SANITIZE FOR TTS ============
  const validation = validateTTSText(aiResponse);
  if (!validation.isValid) {
    aiResponse = sanitizeForTTS(aiResponse);
  }

  // ============ SAVE MESSAGE ============
  const { data: maxSeq } = await supabaseClient
    .from('chat_laboratory_messages')
    .select('message_sequence')
    .eq('conversation_id', conversationId)
    .order('message_sequence', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextSequence = (maxSeq?.message_sequence || 0) + 1;

  const { data: savedMessage } = await supabaseClient
    .from('chat_laboratory_messages')
    .insert({
      conversation_id: conversationId,
      message_sequence: nextSequence,
      sender_type: agent.type,
      sender_name: agent.name,
      content: aiResponse,
      token_input: tokenInput,
      token_output: tokenOutput,
      tempo_risposta_ms: responseTime
    })
    .select()
    .single();

  // ============ GENERATE AUDIO ============
  let audioUrl = null;
  if (voiceEnabled && elevenLabsApiKey && associatedVoiceAgent) {
    await generateAudioForSingleResponse({
      supabaseClient,
      conversationId,
      messageId: savedMessage.id,
      content: aiResponse,
      voiceId: associatedVoiceAgent.voice_id,
      elevenLabsApiKey
    });

    const { data: updatedMsg } = await supabaseClient
      .from('chat_laboratory_messages')
      .select('audio_url')
      .eq('id', savedMessage.id)
      .single();

    audioUrl = updatedMsg?.audio_url;
  }

  // ============ UPDATE COGNITIVE BUFFERS ============
  const updatedBuffers = updateCognitiveBuffers(
    cognitiveBuffers,
    agent.type,
    userMessage,
    allResponses
  );

  return {
    skipped: false,
    response: {
      messageId: savedMessage.id,
      agentName: agent.name,
      agentType: agent.type,
      content: aiResponse,
      audioUrl,
      tokensIn: tokenInput,
      tokensOut: tokenOutput,
      responseTime
    },
    updatedBuffers
  };
}

// ============ TURN SELECTION STRATEGIES ============
function selectNextSpeaker(
  strategy: TurnStrategy,
  participants: any[],
  buffers: CognitiveBuffer[],
  userMessage: string,
  allResponses: any[]
): string {
  const activeAgents = participants.filter(p => p.type !== 'human');

  switch (strategy) {
    case 'ROUND_ROBIN':
      return roundRobinSelect(activeAgents, buffers);
    
    case 'SMART_PRIORITY':
      return smartPrioritySelect(activeAgents, buffers, userMessage);
    
    case 'INTERRUPT_BASED':
      return interruptBasedSelect(activeAgents, buffers);
    
    case 'RANDOM_30':
    default:
      if (Math.random() < 0.3) {
        return activeAgents[Math.floor(Math.random() * activeAgents.length)].type;
      }
      return smartPrioritySelect(activeAgents, buffers, userMessage);
  }
}

function roundRobinSelect(agents: any[], buffers: CognitiveBuffer[]): string {
  const counts = agents.map(a => {
    const buffer = buffers.find(b => b.agent_id === a.type);
    return { type: a.type, count: buffer?.response_count || 0 };
  });
  counts.sort((a, b) => a.count - b.count);
  return counts[0].type;
}

function smartPrioritySelect(agents: any[], buffers: CognitiveBuffer[], userMessage: string): string {
  const now = Date.now();
  const scores = agents.map(a => {
    const buffer = buffers.find(b => b.agent_id === a.type);
    
    const timeSinceSpeak = buffer?.last_speak_time 
      ? (now - buffer.last_speak_time) / 60000
      : 100;
    
    const relevanceScore = calculateRelevance(a.type, userMessage);
    const pendingScore = (buffer?.pending_context.length || 0) * 0.2;
    const balanceScore = 1 / (1 + (buffer?.response_count || 0));
    
    const totalScore = 
      timeSinceSpeak * 0.4 +
      relevanceScore * 0.3 +
      pendingScore * 0.2 +
      balanceScore * 0.1;
    
    return { type: a.type, score: totalScore };
  });
  
  scores.sort((a, b) => b.score - a.score);
  return scores[0].type;
}

function interruptBasedSelect(agents: any[], buffers: CognitiveBuffer[]): string {
  const scores = agents.map(a => {
    const buffer = buffers.find(b => b.agent_id === a.type);
    return { type: a.type, priority: buffer?.priority_score || 0 };
  });
  scores.sort((a, b) => b.priority - a.priority);
  return scores[0].type;
}

function calculateRelevance(agentType: string, message: string): number {
  const lowerMessage = message.toLowerCase();
  const keywords: { [key: string]: string[] } = {
    'chatgpt': ['code', 'programming', 'technical', 'algorithm', 'debug'],
    'claude': ['write', 'explain', 'analyze', 'creative', 'detailed'],
    'gemini': ['research', 'data', 'multi', 'video', 'image']
  };
  
  const agentKeywords = keywords[agentType] || [];
  let matchCount = 0;
  
  for (const keyword of agentKeywords) {
    if (lowerMessage.includes(keyword)) {
      matchCount++;
    }
  }
  
  return matchCount > 0 ? matchCount * 0.5 : 0.1;
}

function updateCognitiveBuffers(
  buffers: CognitiveBuffer[],
  selectedAgent: string,
  userMessage: string,
  allResponses: any[]
): CognitiveBuffer[] {
  const now = Date.now();
  const updatedBuffers = buffers.map(b => ({ ...b }));
  
  let agentBuffer = updatedBuffers.find(b => b.agent_id === selectedAgent);
  if (!agentBuffer) return updatedBuffers;
  
  // Update selected agent
  agentBuffer.last_speak_time = now;
  agentBuffer.response_count += 1;
  agentBuffer.pending_context = [];
  agentBuffer.priority_score = 0;
  
  // Add context to other agents
  for (const buffer of updatedBuffers) {
    if (buffer.agent_id !== selectedAgent) {
      buffer.pending_context.push(userMessage);
      if (buffer.pending_context.length > 3) {
        buffer.pending_context.shift();
      }
    }
  }
  
  return updatedBuffers;
}
