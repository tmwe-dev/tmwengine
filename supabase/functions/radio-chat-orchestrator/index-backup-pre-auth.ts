// DEPLOYED: 2025-10-19 - Fixed whitespace trim
// REFACTORED: 2026-03-05 - Extracted orchestration loop
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

import { getCachedPrompts, loadBarModeConfig, loadConversationData } from './lib/config-loader.ts';
import { formatHistoryMessages } from './lib/prompt-builder.ts';
import { selectNextAgent } from './lib/agent-selector.ts';
import { runAgentLoop } from './lib/orchestration-loop.ts';

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

    // ============ VALIDATION ============
    const activeParticipantsCheck = (participants || []).filter((p: any) => p.is_active);
    if (!participants?.length || !activeParticipantsCheck.length) {
      return new Response(
        JSON.stringify({ error: 'Nessun agente disponibile. Attiva almeno un agente nella sidebar.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // ============ LOAD CONFIGURATIONS IN PARALLEL ============
    const loadTasks: Promise<any>[] = [
      loadBarModeConfig(supabaseClient, conversationId),
      loadConversationData(supabaseClient, conversationId)
    ];
    if (!cachedPrompts) loadTasks.push(getCachedPrompts(supabaseClient, conversationId));

    const results = await Promise.all(loadTasks);
    const config = results[0];
    const conversationData = results[1];
    const dbCachedPrompts = results[2] || null;

    const { anthropicConfig, openaiConfig, LOVABLE_API_KEY, barModeSettings, elevenLabsApiKey, activeVoiceAgents } = config;
    const { agentMode, conversationStyle, pauseBetweenTurnsMs, voiceEnabled, turnStrategy } = barModeSettings;

    // Check if paused
    if (conversationData.isPaused) {
      return new Response(
        JSON.stringify({ error: 'conversation_paused', message: 'La conversazione è in pausa.' }),
        { status: 423, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const finalCachedPrompts = cachedPrompts || dbCachedPrompts;
    const { conversation, recentMessages, cumulativeSummary } = conversationData;
    const currentTurnIndex = conversation?.current_turn_index || 0;
    const lastSpeakerIndex = conversation?.last_speaker_index || 0;

    const globalSystemPrompt = finalCachedPrompts.globalPrompt;
    const baseContent = finalCachedPrompts.baseSections;
    const isComposedPrompt = globalSystemPrompt?.length > 500 &&
      !globalSystemPrompt.startsWith('Sei un assistente') &&
      globalSystemPrompt.includes('IDENTITÀ:');

    const historyMessages = formatHistoryMessages(recentMessages);
    const activeParticipants = participants.filter((p: any) => p.is_active);

    // ============ DETERMINE AGENT ORDER ============
    const { newTurnIndex } = await selectNextAgent(
      turnStrategy, activeParticipants, currentTurnIndex, lastSpeakerIndex,
      { userMessage, recentMessages, cumulativeSummary, conversationStyle },
      supabaseClient, conversationId
    );

    const orderedAgents: any[] = [];
    for (let i = 0; i < activeParticipants.length; i++) {
      orderedAgents.push(activeParticipants[(newTurnIndex + i) % activeParticipants.length]);
    }

    // ============ RUN AGENT LOOP ============
    const responseResults = await runAgentLoop({
      orderedAgents, turnStrategy, pauseBetweenTurnsMs, isComposedPrompt,
      globalSystemPrompt, baseContent, finalCachedPrompts,
      conversationStyle, agentMode, cumulativeSummary, historyMessages,
      userMessage, voiceEnabled, elevenLabsApiKey, activeVoiceAgents,
      anthropicConfig, openaiConfig, LOVABLE_API_KEY,
      supabaseClient, conversationId
    });

    // ============ UPDATE TURN INDEX ============
    const finalTurnIndex = (newTurnIndex + orderedAgents.length - 1) % activeParticipants.length;
    await supabaseClient
      .from('chat_laboratory_conversations')
      .update({ current_turn_index: finalTurnIndex, last_speaker_index: finalTurnIndex, updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    return new Response(
      JSON.stringify({
        responses: responseResults,
        totalResponses: responseResults.length,
        strategy: turnStrategy,
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
