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
    console.log('🍹 Bar Chat Orchestrator riceve:', { conversationId, userMessage, participants });

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
            content: `[${r.agentName}]: ${r.content}`
          }))
        ];
        
        console.log(`📝 Context include: messaggio utente + ${allResponses.length} risposte precedenti`);

        // ============ DETECT DIRECT CALLS ============
        const lastResponse = allResponses[allResponses.length - 1];
        const lastMessage = recentMessages.length > 0 ? recentMessages[recentMessages.length - 1] : null;
        
        const wasCalledByAgent = lastResponse && (
          lastResponse.content.toLowerCase().includes(currentAgent.name.toLowerCase()) ||
          lastResponse.content.toLowerCase().includes(`@${currentAgent.name.toLowerCase()}`) ||
          lastResponse.content.match(new RegExp(`\\b${currentAgent.name}\\b`, 'i'))
        );
        
        const wasDirectlyAddressed = lastMessage && (
          lastMessage.content.toLowerCase().includes(currentAgent.name.toLowerCase()) ||
          lastMessage.content.toLowerCase().includes(`@${currentAgent.name.toLowerCase()}`)
        );
        
        const isDirectCall = wasCalledByAgent || wasDirectlyAddressed;
        
        if (wasCalledByAgent) {
          console.log(`📢 ${lastResponse.agentName} ha chiamato ${currentAgent.name} → PRIORITÀ RISPOSTA`);
        }

        // ============ GET AGENT PERSONALITY ============
        const agentPersonality = cachedPrompts.agentPersonalities.get(
          currentAgent.name.toLowerCase()
        ) || '';
        
        console.log(`👤 Personalità ${currentAgent.name}: ${agentPersonality.length} chars (cached)`);

        // ============ BUILD PROMPT ============
        const composedPrompt = buildSystemPrompt({
          globalPrompt: globalSystemPrompt,
          baseContent,
          agentPersonality: currentAgent.effective_prompt || agentPersonality,
          conversationStyle,
          agentMode,
          previousResponses: allResponses,
          wasCalledDirectly: wasCalledByAgent,
          lastResponse,
          styleSections: cachedPrompts.conversationStyles
        });

        console.log('📝 Prompt finale composto:', composedPrompt ? composedPrompt.substring(0, 200) + '...' : 'Vuoto');

        // ============ BUILD CONVERSATION HISTORY ============
        const conversationHistory = buildConversationHistory({
          systemPrompt: composedPrompt,
          cumulativeSummary,
          historyMessages,
          turnContext
        });

        // ============ CALCULATE CONTEXT SIZE ============
        const { totalContextChars, estimatedTokens } = calculateContextSize(conversationHistory);

        console.log('📊 CONTEXT SIZE:', {
          systemPromptChars: composedPrompt.length,
          cumulativeSummaryChars: cumulativeSummary?.length || 0,
          historyMessagesCount: historyMessages.length,
          turnContextMessages: turnContext.length,
          totalContextChars,
          estimatedTokens
        });

        if (estimatedTokens > 50000) {
          console.warn('⚠️ CONTEXT SIZE ECCESSIVO!', estimatedTokens, 'tokens');
        }

        // ============ CALL AI PROVIDER ============
        let aiResponse = '';
        let tokenInput = 0;
        let tokenOutput = 0;
        const startTime = Date.now();

        if ((currentAgent.type === 'anthropic' || currentAgent.type === 'claude') && anthropicConfig?.api_key) {
          const result = await callClaude({
            conversationHistory,
            apiKey: anthropicConfig.api_key,
            startTime
          });
          
          aiResponse = result.content;
          tokenInput = result.tokensIn;
          tokenOutput = result.tokensOut;
        }
        else if (currentAgent.type === 'openai' || currentAgent.type === 'chatgpt') {
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
        else if (currentAgent.type === 'gemini' && LOVABLE_API_KEY) {
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
          throw new Error(`No API key available for ${currentAgent.type}`);
        }

        // ============ PARSE APPENDICI E REPORT ============
        let mainMessage = aiResponse;
        let appendixContent: string | null = null;
        let reportContent: string | null = null;
        
        // Parse APPENDICE
        const appendixMatch = aiResponse.match(/\[APPENDICE\](.*?)\[\/APPENDICE\]/s);
        if (appendixMatch) {
          appendixContent = appendixMatch[1].trim();
          mainMessage = aiResponse.replace(/\[APPENDICE\].*?\[\/APPENDICE\]/s, '').trim();
          console.log(`📎 ${currentAgent.name} ha aggiunto appendice (${appendixContent.length} chars)`);
        }
        
        // Parse REPORT
        const reportMatch = aiResponse.match(/\[REPORT\](.*?)\[\/REPORT\]/s);
        if (reportMatch) {
          reportContent = reportMatch[1].trim();
          mainMessage = aiResponse.replace(/\[REPORT\].*?\[\/REPORT\]/s, '').trim();
          console.log(`📊 ${currentAgent.name} ha aggiunto report (${reportContent.length} chars)`);
        }
        
        // ============ SAFETY: TRUNCATE LONG RESPONSES ============
        if (mainMessage && mainMessage.length > 15000) {
          console.warn(`⚠️ Risposta troppo lunga (${mainMessage.length} chars), troncamento a 15k...`);
          mainMessage = mainMessage.substring(0, 15000) + '\n\n[... risposta troncata per lunghezza]';
        }
        
        const responseTime = Date.now() - startTime;
        console.log(`✅ ${currentAgent.name} risposta ricevuta in ${responseTime}ms`);
      
        // ============ TELEMETRY ============
        const debugInfo = {
          provider: currentAgent.type,
          model: currentAgent.type === 'anthropic' ? 'claude-sonnet-4-5' 
               : currentAgent.type === 'openai' ? (openaiConfig?.modello || 'gpt-5-2025-08-07')
               : 'gemini-2.5-flash',
          timeout: 43000,
          tokens_estimated: estimatedTokens,
          agent_index_in_turn: i + 1,
          total_agents_in_turn: activeParticipants.length,
          turn_context_messages: turnContext.length
        };
        
        // ✅ Incrementa contatore turni AI
        aiTurnsCount++;
        console.log(`📊 Turni AI completati: ${aiTurnsCount}/${MAX_AI_TURNS_BEFORE_USER}`);
        
        const telemetry = {
          conversation_id: conversationId,
          provider: currentAgent.type,
          agent_name: currentAgent.name,
          latency_ms: responseTime,
          tokens_in: tokenInput,
          tokens_out: tokenOutput,
          debug_info: debugInfo,
          timestamp: new Date().toISOString()
        };
        console.log('📊 TELEMETRY:', JSON.stringify(telemetry));

        // ============ SAVE MESSAGE ============
        const { data: maxSeq } = await supabaseClient
          .from('chat_laboratory_messages')
          .select('message_sequence')
          .eq('conversation_id', conversationId)
          .order('message_sequence', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        const nextSequence = (maxSeq?.message_sequence || 0) + 1;

        // ✅ Prepara attachments con appendice/report
        const messageAttachments: any = {
          structured_prompt: {
            message_id: null,
            timestamp: new Date().toISOString(),
            global_system_prompt: globalSystemPrompt,
            base_sections: baseContent ? [{ type: 'BASE', content: baseContent }] : [],
            agent_personality: agentPersonality ? [{ agent_name: currentAgent.name, content: agentPersonality }] : [],
            topic_sections: [],
            kb_context_sections: [],
            kb_documents: [],
            cumulative_summary: cumulativeSummary || null,
            message_history: historyMessages.map(msg => ({
              role: msg.role,
              content: msg.content
            })),
            turn_context: turnContext.map(msg => ({
              role: msg.role,
              content: msg.content
            })),
            current_user_message: userMessage,
            metadata: {
              agent_index: i + 1,
              total_agents: activeParticipants.length,
              history_count: historyMessages.length,
              turn_context_count: turnContext.length,
              economy_mode: false
            }
          },
          debug_info: debugInfo
        };
        
        // ✅ Aggiungi appendice/report agli attachments
        if (appendixContent) {
          messageAttachments.appendix = appendixContent;
        }
        if (reportContent) {
          messageAttachments.report = reportContent;
        }

        const { data: savedMessage, error: saveError } = await supabaseClient
          .from('chat_laboratory_messages')
          .insert({
            conversation_id: conversationId,
            message_sequence: nextSequence,
            sender_type: currentAgent.type,
            sender_name: currentAgent.name,
            content: mainMessage, // ✅ Solo messaggio principale senza tag
            token_input: tokenInput,
            token_output: tokenOutput,
            tempo_risposta_ms: responseTime,
            attachments: messageAttachments
          })
          .select()
          .single();

        if (saveError || !savedMessage) {
          console.error('❌ Errore salvataggio messaggio:', saveError);
          throw new Error('Errore salvataggio messaggio');
        }

        // Update message_id in attachments
        if (savedMessage?.id) {
          await supabaseClient
            .from('chat_laboratory_messages')
            .update({
              attachments: {
                ...savedMessage.attachments,
                structured_prompt: {
                  ...savedMessage.attachments.structured_prompt,
                  message_id: savedMessage.id
                }
              }
            })
            .eq('id', savedMessage.id);
        }
        
        console.log(`✅ Messaggio salvato (ID: ${savedMessage.id})`);
        
        // ============ ADD TO RESPONSES ============
        allResponses.push({
          agentName: currentAgent.name,
          agentType: currentAgent.type,
          content: aiResponse,
          tokensIn: tokenInput,
          tokensOut: tokenOutput,
          duration: responseTime,
          messageId: savedMessage.id,
          audioUrl: null
        });
        
        console.log(`✅ ${currentAgent.name} processato in ${responseTime}ms`);

        // ============ AUTONOMOUS ORCHESTRATOR (GEMINI-LITE) ============
        if (LOVABLE_API_KEY && cachedPrompts.orchestratorRules && currentAgent.type === 'gemini') {
          try {
            console.log(`🧠 Chiamata orchestrator autonomo (Gemini-Flash-Lite)...`);
            
            const orchestratorPrompt = `${cachedPrompts.orchestratorRules}

CONTESTO CORRENTE:
- Agente che ha appena parlato: ${currentAgent.name}
- Interventi totali di ${currentAgent.name} in questo turno: ${allResponses.filter(r => r.agentName === currentAgent.name).length}
- Altri agenti nel turno: ${allResponses.filter(r => r.agentName !== currentAgent.name).map(r => r.agentName).join(', ') || 'nessuno'}

⚠️ REGOLA CRITICA: ${currentAgent.name} NON può menzionare se stesso. Se trovi "@${currentAgent.name}" nel messaggio, IGNORALO dalla lista targets.

MESSAGGIO DA ANALIZZARE:
${aiResponse}

Analizza se ci sono menzioni esplicite (@ChatGPT, @Claude, @Gemini) o implicite ("ragazzi", "cosa ne pensate", "qualcuno").
Rispondi con JSON:
{
  "continue": true/false,
  "targets": ["chatgpt"] // solo se continue=true; lista agenti menzionati (ESCLUSO ${currentAgent.name}), o [] per tutti
}`;

            const orchestratorResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'google/gemini-2.5-flash-lite',
                messages: [{ role: 'user', content: orchestratorPrompt }],
                max_completion_tokens: 100
              })
            });

            if (orchestratorResponse.ok) {
              const data = await orchestratorResponse.json();
              const rawDecision = data.choices?.[0]?.message?.content || '';
              
              console.log(`🧠 Orchestrator decisione RAW:`, rawDecision);
              
              const decision = JSON.parse(rawDecision.replace(/```json|```/g, '').trim());
              
              if (decision.continue === true && aiTurnsCount < MAX_AI_TURNS_BEFORE_USER) {
                const targets: string[] = decision.targets || [];
                
                if (targets.length === 0) {
                  // Menzione implicita → aggiungo SOLO agenti NON ancora intervenuti (ESCLUSO currentAgent)
                  console.log(`🔄 Orchestrator: menzione implicita → aggiungo agenti mancanti (escluso ${currentAgent.name})`);
                  
                  const respondedAgents = new Set(allResponses.map(r => r.agentName));
                  const remainingAgents = activeParticipants.filter(p => 
                    !respondedAgents.has(p.name) && 
                    p.id !== currentAgent.id
                  );
                  
                  if (remainingAgents.length > 0) {
                    console.log(`🔄 Aggiungo alla coda: ${remainingAgents.map(a => a.name).join(', ')}`);
                    for (let j = 0; j < remainingAgents.length; j++) {
                      activeParticipants.splice(i + 1 + j, 0, remainingAgents[j]);
                    }
                  } else {
                    console.log(`✅ Tutti gli agenti hanno già risposto, fine turno`);
                  }
                } else {
                  // Menzione esplicita → solo agenti specifici
                  console.log(`🔄 Orchestrator: menzione esplicita → solo ${targets.join(', ')}`);
                  const targetParticipants = activeParticipants.filter(p => 
                    targets.some(t => p.type === t || p.name.toLowerCase().includes(t)) &&
                    p.id !== currentAgent.id
                  );
                  
                  if (targetParticipants.length > 0) {
                    allResponses.length = 0;
                    // Aggiungi solo target alla coda
                    for (let j = 0; j < targetParticipants.length; j++) {
                      activeParticipants.splice(i + 1 + j, 0, targetParticipants[j]);
                    }
                  }
                }
              } else {
                console.log(`✅ Orchestrator: nessuna menzione o limite raggiunto`);
              }
            }
          } catch (orchError) {
            console.warn('⚠️ Orchestrator errore (ignoro):', orchError.message);
          }
        }

        // ============ GENERATE AUDIO IMMEDIATELY ============
        if (voiceEnabled && elevenLabsApiKey && activeVoiceAgents.length > 0) {
          // Mapping keyword-based per trovare voice agent corretto
          const agentKeywords: Record<string, string[]> = {
            'chatgpt': ['gpt', 'openai', 'renny'],
            'claude': ['anthropic', 'claude', 'tonino'],
            'gemini': ['gemini', 'google', 'vittorio']
          };

          const agentKey = currentAgent.name.toLowerCase();
          const searchKeywords = agentKeywords[agentKey] || [agentKey];

          const agentVoice = activeVoiceAgents.find((v: any) => {
            const voiceName = v.name.toLowerCase();
            return searchKeywords.some(keyword => voiceName.includes(keyword));
          });

          if (agentVoice) {
            console.log(`🎤 Voice match: ${currentAgent.name} → ${agentVoice.name} (${agentVoice.voice_id.substring(0, 8)}...)`);
            
            generateAudioForSingleResponse({
              supabaseClient,
              conversationId,
              messageId: savedMessage.id,
              content: aiResponse,
              voiceId: agentVoice.voice_id,
              elevenLabsApiKey
            }).catch(err => {
              console.error(`❌ Audio generation failed for ${currentAgent.name}:`, err.message);
            });
          } else {
            console.warn(`⚠️ No voice agent found for ${currentAgent.name} among:`, 
              activeVoiceAgents.map((v: any) => v.name).join(', '));
          }
        }

        // ============ PAUSE BETWEEN AGENTS ============
        if (!isDirectCall && i < sortedParticipants.length - 1) {
          const pauseMs = pauseBetweenTurnsMs;
          if (pauseMs > 0) {
            console.log(`⏸️  Pausa ${pauseMs}ms prima del prossimo agente...`);
            await delay(pauseMs);
          }
        }

      } catch (error: any) {
        console.error(`❌ Errore con ${currentAgent.name}:`, error.message);
        continue;
      }
    }

    // ============ TURNO COMPLETATO ============
    console.log(`\n✅ Turno completato: ${allResponses.length} agenti hanno risposto`);

    // ============ AUTO-SUMMARY TRIGGER ============
    const { data: messages } = await supabaseClient
      .from('chat_laboratory_messages')
      .select('id')
      .eq('conversation_id', conversationId);
    
    const totalMessages = (messages?.length || 0);
    if (totalMessages % 20 === 0) {
      console.log(`🔄 Trigger auto-summary: ${totalMessages} messaggi raggiunti`);
      
      supabaseClient.functions.invoke('generate-chunked-summary', {
        body: {
          conversationId,
          chunkSize: 50,
          includeAll: false
        }
      }).then(({ error: summaryError }: any) => {
        if (summaryError) {
          console.error('⚠️ Errore auto-summary:', summaryError);
        } else {
          console.log('✅ Summary cumulativo rigenerato automaticamente');
        }
      });
    }

    // ============ FINAL RESPONSE ============
    return new Response(
      JSON.stringify({
        success: true,
        total_responses: allResponses.length,
        responses: allResponses.map(r => ({
          speaker: r.agentName,
          type: r.agentType,
          message_id: r.messageId,
          audioUrl: r.audioUrl || null,
          token_input: r.tokensIn,
          token_output: r.tokensOut,
          response_time_ms: r.duration
        })),
        message: `${allResponses.length} agenti hanno risposto in sequenza`,
        
        orchestration: {
          mode: 'sequential',
          total_agents: allResponses.length,
          total_latency_ms: allResponses.reduce((sum, r) => sum + r.duration, 0),
          avg_latency_ms: Math.round(allResponses.reduce((sum, r) => sum + r.duration, 0) / allResponses.length),
          total_tokens_in: allResponses.reduce((sum, r) => sum + r.tokensIn, 0),
          total_tokens_out: allResponses.reduce((sum, r) => sum + r.tokensOut, 0)
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ Bar Chat Orchestrator error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
