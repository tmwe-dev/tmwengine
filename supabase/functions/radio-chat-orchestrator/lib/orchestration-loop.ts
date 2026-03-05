/**
 * ============ ORCHESTRATION LOOP ============
 * Sequential multi-agent response generation
 */

import { delay } from './utils.ts';
import { buildSystemPrompt, buildConversationHistory, formatHistoryMessages } from './prompt-builder.ts';
import { callClaude } from './claude-provider.ts';
import { callChatGPT } from './chatgpt-provider.ts';
import { callGemini } from './gemini-provider.ts';
import { generateAudioForSingleResponse } from './audio-generator.ts';

interface AgentResponseResult {
  speaker: string;
  response: string;
  audioUrl: string | null;
  messageId: string;
}

interface OrchestratorLoopParams {
  orderedAgents: any[];
  turnStrategy: string;
  pauseBetweenTurnsMs: number;
  isComposedPrompt: boolean;
  globalSystemPrompt: string;
  baseContent: string;
  finalCachedPrompts: any;
  conversationStyle: string;
  agentMode: string;
  cumulativeSummary: string | null;
  historyMessages: any[];
  userMessage: string;
  voiceEnabled: boolean;
  elevenLabsApiKey: string | null;
  activeVoiceAgents: any[];
  anthropicConfig: { apiKey: string; model: string };
  openaiConfig: any;
  LOVABLE_API_KEY: string | null;
  supabaseClient: any;
  conversationId: string;
}

export async function runAgentLoop(params: OrchestratorLoopParams): Promise<AgentResponseResult[]> {
  const {
    orderedAgents, pauseBetweenTurnsMs, isComposedPrompt,
    globalSystemPrompt, baseContent, finalCachedPrompts,
    conversationStyle, agentMode, cumulativeSummary,
    historyMessages, userMessage, voiceEnabled, elevenLabsApiKey,
    activeVoiceAgents, anthropicConfig, openaiConfig, LOVABLE_API_KEY,
    supabaseClient, conversationId
  } = params;

  const allResponses: Array<{ agentName: string; content: string; messageId: string }> = [];
  const responseResults: AgentResponseResult[] = [];

  for (let agentIdx = 0; agentIdx < orderedAgents.length; agentIdx++) {
    const currentAgent = orderedAgents[agentIdx];
    console.log(`\n🤖 [${agentIdx + 1}/${orderedAgents.length}] Generando risposta per ${currentAgent.name} (${currentAgent.type})...`);

    if (agentIdx > 0 && pauseBetweenTurnsMs > 0) {
      await delay(pauseBetweenTurnsMs);
    }

    // Build system prompt
    let systemPrompt: string;
    if (isComposedPrompt) {
      systemPrompt = globalSystemPrompt;
    } else {
      const agentPersonality = finalCachedPrompts.agentPersonalities instanceof Map
        ? finalCachedPrompts.agentPersonalities.get(currentAgent.name.toLowerCase()) || ''
        : finalCachedPrompts.agentPersonalities[currentAgent.name.toLowerCase()] || '';

      systemPrompt = buildSystemPrompt({
        globalPrompt: globalSystemPrompt,
        baseContent,
        agentPersonality,
        conversationStyle,
        agentMode,
        previousResponses: allResponses,
        wasCalledDirectly: false,
        styleSections: finalCachedPrompts.conversationStyles,
        conversationPersonality: finalCachedPrompts.conversationPersonality
      });
    }

    // Build conversation history
    const turnContext = [{ role: 'user', content: userMessage }];
    for (const prevResp of allResponses) {
      turnContext.push({ role: 'assistant', content: `[${prevResp.agentName}]: ${prevResp.content}` });
    }

    const conversationHistory = buildConversationHistory({
      systemPrompt, cumulativeSummary, historyMessages, turnContext
    });

    // Call AI provider
    let aiResponse = null;
    let rawResponse = null;
    const callStartTime = Date.now();

    try {
      if (currentAgent.type === 'anthropic' || currentAgent.type === 'claude') {
        const result = await callClaude({ apiKey: anthropicConfig.apiKey, model: anthropicConfig.model, conversationHistory, callStartTime });
        aiResponse = result.content;
        rawResponse = result;
      } else if (currentAgent.type === 'openai' || currentAgent.type === 'chatgpt') {
        const result = await callChatGPT({ lovableApiKey: LOVABLE_API_KEY, openaiConfig, conversationHistory, callStartTime });
        aiResponse = result.content;
        rawResponse = result;
      } else if (currentAgent.type === 'lovable_ai' || currentAgent.type === 'gemini') {
        const result = await callGemini({ lovableApiKey: LOVABLE_API_KEY, conversationHistory, callStartTime });
        aiResponse = result.content;
        rawResponse = result;
      } else {
        console.warn(`⚠️ Tipo agente sconosciuto: ${currentAgent.type}, skip`);
        continue;
      }
    } catch (aiError: any) {
      console.error(`❌ Errore AI per ${currentAgent.name}:`, aiError.message);
      continue;
    }

    if (!aiResponse) continue;
    aiResponse = aiResponse.trim();
    if (aiResponse === '[SKIP]' || aiResponse === 'SKIP') continue;

    // Generate audio
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
            content: aiResponse, voiceId: voiceAgent.voice_id, elevenLabsApiKey
          });
        } catch (audioError) {
          console.error(`❌ Errore audio per ${currentAgent.name}:`, audioError);
        }
      }
    }

    // Save to database
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

    if (!insertError) {
      allResponses.push({ agentName: currentAgent.name, content: aiResponse, messageId });
      responseResults.push({ speaker: currentAgent.name, response: aiResponse, audioUrl, messageId });
    }
  }

  return responseResults;
}
