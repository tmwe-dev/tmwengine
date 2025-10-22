// ALBERT ADVISOR ORCHESTRATOR - Multi-Agent Consultation with Tools
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

import { delay, estimateTokens } from './lib/utils.ts';
import { loadBarModeConfig, loadConversationData } from './lib/config-loader.ts';
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

// ============ AI TOOLS DEFINITION ============
const AI_TOOLS = [
  {
    type: "function",
    function: {
      name: "read_lovable_docs",
      description: "Leggi documentazione Lovable per analizzare struttura progetto, errori runtime, task proposti o cronologia modifiche",
      parameters: {
        type: "object",
        properties: {
          docType: {
            type: "string",
            enum: ["overview", "errors", "tasks", "history"],
            description: "Tipo di documento: overview=struttura app, errors=errori rilevati, tasks=coda task, history=modifiche recenti"
          }
        },
        required: ["docType"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "propose_lovable_task",
      description: "Proponi un task di miglioramento/fix per Lovable basato su analisi codice o errori rilevati",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Titolo breve del task (max 80 char)"
          },
          file: {
            type: "string",
            description: "Path del file da modificare (es: ChatLaboratory.tsx)"
          },
          problem: {
            type: "string",
            description: "Descrizione dettagliata del problema da risolvere"
          },
          solution: {
            type: "string",
            description: "Soluzione proposta (opzionale)"
          },
          priority: {
            type: "string",
            enum: ["alta", "media", "bassa"],
            description: "Priorità del task"
          }
        },
        required: ["title", "file", "problem", "priority"]
      }
    }
  }
];

// ============ TOOL EXECUTION HANDLER ============
async function handleToolCall(
  toolName: string,
  toolArgs: any,
  agentName: string,
  supabaseClient: any
): Promise<string> {
  console.log(`🔧 ${agentName} calling tool: ${toolName}`);

  if (toolName === 'read_lovable_docs') {
    const { docType } = toolArgs;
    
    try {
      const { data, error } = await supabaseClient.functions.invoke('get-ai-docs', {
        body: { docType }
      });

      if (error) throw error;

      console.log(`📄 ${agentName} read ${docType} doc (${JSON.stringify(data).length} chars)`);
      
      return typeof data.content === 'string' 
        ? data.content 
        : JSON.stringify(data.content, null, 2);
    } catch (err: any) {
      console.error(`❌ Failed to read ${docType}:`, err);
      return `Errore lettura ${docType}: ${err.message}`;
    }
  }

  if (toolName === 'propose_lovable_task') {
    const { title, file, problem, solution, priority } = toolArgs;
    
    try {
      const { data, error } = await supabaseClient.functions.invoke('manage-ai-tasks', {
        body: {
          action: 'propose',
          task: {
            title,
            file,
            problem,
            solution,
            priority,
            proposedBy: agentName
          }
        }
      });

      if (error) throw error;

      console.log(`✅ ${agentName} proposed task: ${title} (ID: ${data.taskId})`);
      
      return `Task proposto con successo. ID: ${data.taskId}. Sarà visibile in ai-tasks.md dopo approvazione utente.`;
    } catch (err: any) {
      console.error(`❌ Failed to propose task:`, err);
      return `Errore proposta task: ${err.message}`;
    }
  }

  return `Tool sconosciuto: ${toolName}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversationId, userMessage, participants } = await req.json();
    console.log('🧠 Albert Advisor Orchestrator riceve:', { conversationId, userMessage, participants });

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
    
    console.log('📚 DIAGNOSTICA SUMMARY:', {
      conversationId,
      hasRecentMessages: recentMessages.length > 0,
      recentMessagesCount: recentMessages.length,
      hasCumulativeSummary: !!cumulativeSummary,
      summaryLength: cumulativeSummary?.length || 0,
      summaryPreview: cumulativeSummary ? cumulativeSummary.substring(0, 100) + '...' : 'NULL'
    });

    // ✅ ALBERT: Carica prompt da tabella dedicata
    const { data: albertPrompt, error: promptError } = await supabaseClient
      .from('chat_laboratory_albert_prompts')
      .select('system_prompt')
      .eq('is_active', true)
      .single();

    if (promptError || !albertPrompt) {
      console.error('❌ Failed to load Albert prompt:', promptError);
      throw new Error('Albert system prompt not configured');
    }

    const globalSystemPrompt = albertPrompt.system_prompt;
    console.log(`🧠 Albert Prompt caricato: ${globalSystemPrompt.length} chars`);
    
    // Base content vuoto per Albert (usa solo il prompt dedicato)
    const baseContent = '';

    // ============ FORMAT HISTORY MESSAGES ============
    const historyMessages = formatHistoryMessages(recentMessages);

    // ============ SEQUENTIAL AGENT CALLS ============
    const activeParticipants = participants.filter((p: any) => p.is_active);
    
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
        const agentPersonality = currentAgent.effective_prompt || '';
        console.log(`👤 Personalità ${currentAgent.name}: ${agentPersonality.length} chars (DB modulare)`);

        // ============ LEGGI MAX_WORDS DAL VOICE AGENT ============
        let maxWordsLimit = 60;

        const agentKeywords: Record<string, string[]> = {
          'chatgpt': ['gpt', 'openai', 'renny'],
          'claude': ['anthropic', 'claude', 'tonino'],
          'gemini': ['gemini', 'google', 'vittorio']
        };

        const agentKey = currentAgent.name.toLowerCase();
        const searchKeywords = agentKeywords[agentKey] || [agentKey];

        const associatedVoiceAgent = activeVoiceAgents.find((v: any) => {
          const voiceName = v.name.toLowerCase();
          return searchKeywords.some(keyword => voiceName.includes(keyword));
        });

        if (associatedVoiceAgent && associatedVoiceAgent.max_words_per_response) {
          maxWordsLimit = associatedVoiceAgent.max_words_per_response;
          console.log(`📏 ✅ LIMITE TROVATO per ${currentAgent.name}: ${maxWordsLimit} parole`);
        } else {
          console.log(`📏 Uso default: ${maxWordsLimit} parole`);
        }

        const wordLimitInstruction = `
LIMITE LUNGHEZZA RISPOSTA
Massimo ${maxWordsLimit} parole per questa risposta.
Conta mentalmente le parole prima di rispondere.
Risposte più brevi sono preferibili se complete.
NON includere il conteggio parole nel testo finale.
NON usare formattazione markdown nel testo.
NON usare placeholder tra parentesi quadre.

`;

        // ============ BUILD PROMPT ============
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

        // ============ CALL AI PROVIDER WITH TOOLS ============
        let aiResponse = '';
        let tokenInput = 0;
        let tokenOutput = 0;
        const startTime = Date.now();

        if ((currentAgent.type === 'anthropic' || currentAgent.type === 'claude') && anthropicConfig?.api_key) {
          const result = await callClaude({
            conversationHistory,
            apiKey: anthropicConfig.api_key,
            startTime,
            tools: AI_TOOLS // ✅ ALBERT: Passa tools
          });
          
          aiResponse = result.content;
          tokenInput = result.tokensIn;
          tokenOutput = result.tokensOut;
          
          // ✅ ALBERT: Handle tool calls
          if (result.toolCalls && result.toolCalls.length > 0) {
            console.log(`🔧 ${currentAgent.name} ha chiamato ${result.toolCalls.length} tool(s)`);
            
            for (const toolCall of result.toolCalls) {
              const toolResult = await handleToolCall(
                toolCall.name,
                toolCall.arguments,
                currentAgent.name,
                supabaseClient
              );
              
              aiResponse += `\n\n[TOOL RESULT: ${toolCall.name}]\n${toolResult}\n[/TOOL RESULT]`;
            }
          }
        }
        else if (currentAgent.type === 'openai' || currentAgent.type === 'chatgpt') {
          const result = await callChatGPT({
            conversationHistory,
            lovableApiKey: LOVABLE_API_KEY,
            openaiConfig,
            startTime,
            tools: AI_TOOLS // ✅ ALBERT: Passa tools
          });
          
          aiResponse = result.content;
          tokenInput = result.tokensIn;
          tokenOutput = result.tokensOut;
          
          // ✅ ALBERT: Handle tool calls
          if (result.toolCalls && result.toolCalls.length > 0) {
            console.log(`🔧 ${currentAgent.name} ha chiamato ${result.toolCalls.length} tool(s)`);
            
            for (const toolCall of result.toolCalls) {
              const toolResult = await handleToolCall(
                toolCall.name,
                toolCall.arguments,
                currentAgent.name,
                supabaseClient
              );
              
              aiResponse += `\n\n[TOOL RESULT: ${toolCall.name}]\n${toolResult}\n[/TOOL RESULT]`;
            }
          }
          
          if (!aiResponse || aiResponse.trim().length === 0) {
            console.error(`❌ ChatGPT ha ritornato una risposta VUOTA!`);
            aiResponse = `[Errore Tecnico: ChatGPT ha generato ${tokenOutput} token ma il content è vuoto.]`;
          }
        }
        else if (currentAgent.type === 'gemini' && LOVABLE_API_KEY) {
          const result = await callGemini({
            conversationHistory,
            lovableApiKey: LOVABLE_API_KEY,
            startTime,
            tools: AI_TOOLS // ✅ ALBERT: Passa tools
          });
          
          aiResponse = result.content;
          tokenInput = result.tokensIn;
          tokenOutput = result.tokensOut;
          
          // ✅ ALBERT: Handle tool calls
          if (result.toolCalls && result.toolCalls.length > 0) {
            console.log(`🔧 ${currentAgent.name} ha chiamato ${result.toolCalls.length} tool(s)`);
            
            for (const toolCall of result.toolCalls) {
              const toolResult = await handleToolCall(
                toolCall.name,
                toolCall.arguments,
                currentAgent.name,
                supabaseClient
              );
              
              aiResponse += `\n\n[TOOL RESULT: ${toolCall.name}]\n${toolResult}\n[/TOOL RESULT]`;
            }
          }
        }
        else {
          throw new Error(`No API key available for ${currentAgent.type}`);
        }

        // ============ SAFETY: TRUNCATE LONG RESPONSES ============
        if (aiResponse && aiResponse.length > 15000) {
          console.warn(`⚠️ Risposta troppo lunga (${aiResponse.length} chars), troncamento a 15k...`);
          aiResponse = aiResponse.substring(0, 15000) + '\n\n[... risposta troncata per lunghezza]';
        }
        
        // ============ TTS SANITIZATION ============
        const validation = validateTTSText(aiResponse);
        if (!validation.isValid) {
          console.warn(`⚠️ Risposta contiene elementi problematici per TTS:`, validation.issues);
          const cleanedResponse = sanitizeForTTS(aiResponse);
          console.log(`🧹 Testo pulito: ${aiResponse.length} → ${cleanedResponse.length} chars`);
          aiResponse = cleanedResponse;
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

        const { data: savedMessage, error: saveError } = await supabaseClient
          .from('chat_laboratory_messages')
          .insert({
            conversation_id: conversationId,
            message_sequence: nextSequence,
            sender_type: currentAgent.type,
            sender_name: currentAgent.name,
            content: aiResponse,
            token_input: tokenInput,
            token_output: tokenOutput,
            tempo_risposta_ms: responseTime,
            attachments: {
              structured_prompt: {
                message_id: null,
                timestamp: new Date().toISOString(),
                global_system_prompt: globalSystemPrompt,
                base_sections: [],
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
            }
          })
          .select()
          .single();

        if (saveError || !savedMessage) {
          console.error('❌ Errore salvataggio messaggio:', saveError);
          throw new Error('Errore salvataggio messaggio');
        }

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

        // ============ GENERATE AUDIO IMMEDIATELY ============
        if (voiceEnabled && elevenLabsApiKey && activeVoiceAgents.length > 0) {
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
            console.warn(`⚠️ No voice agent found for ${currentAgent.name}`);
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
    console.error('❌ Albert Advisor Orchestrator error:', error);
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