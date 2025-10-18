import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ═══════════════════════════════════════════════════════════
// HELPERS PER ORCHESTRAZIONE SEQUENZIALE ROBUSTA
// ═══════════════════════════════════════════════════════════

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch con timeout e abort signal
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 45000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout dopo ${timeoutMs}ms`);
    }
    throw error;
  }
}

/**
 * Retry automatico con exponential backoff per errori transienti
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  options: { retries?: number; baseDelayMs?: number } = {}
): Promise<T> {
  const { retries = 2, baseDelayMs = 300 } = options;
  let attempt = 0;
  
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      const errorMsg = error.message || String(error);
      const isRetriable = /429|5\d\d|timeout/i.test(errorMsg);
      
      if (!isRetriable || attempt >= retries) {
        throw error;
      }
      
      const backoff = baseDelayMs * Math.pow(2, attempt);
      const jitter = Math.floor(Math.random() * 100);
      const waitTime = backoff + jitter;
      
      console.log(`⚠️ Tentativo ${attempt + 1}/${retries} fallito: ${errorMsg}. Retry tra ${waitTime}ms...`);
      await delay(waitTime);
      attempt++;
    }
  }
}

/**
 * Chiamata a un provider AI con timeout, retry e NO limiti token.
 */
async function callAIProvider(
  participant: any,
  config: {
    apiKey: string;
    model: string;
    basePrompt: string;
    visibleHistory: string;
    userMessage: string;
    timeoutMs: number;
  }
): Promise<{ content: string; tokensIn: number; tokensOut: number; duration: number }> {
  const startTime = Date.now();
  
  const concisePrompt = `${config.basePrompt}

**Linee guida di risposta**:
- Sii preciso e sintetico, ma completo
- Se serve codice/analisi approfondita, forniscila interamente
- Evita ripetizioni inutili o digressioni
- Target: 300-600 parole, ma estendi se necessario per completezza tecnica`;

  return withRetry(async () => {
    let url: string;
    let headers: Record<string, string>;
    let body: any;
    
    if (participant.type === 'claude' || participant.type === 'anthropic') {
      url = 'https://api.anthropic.com/v1/messages';
      headers = {
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      };
      body = {
        model: config.model,
        max_tokens: 2500,
        messages: [{
          role: 'user',
          content: `${concisePrompt}\n\nConversazione:\n${config.visibleHistory}\n\nNuovo:\n${config.userMessage}`
        }]
      };
    } else if (participant.type === 'chatgpt' || participant.type === 'openai') {
      url = 'https://api.openai.com/v1/chat/completions';
      headers = {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      };
      body = {
        model: config.model,
        max_completion_tokens: 2500,
        messages: [
          { role: 'system', content: concisePrompt },
          { 
            role: 'user', 
            content: `Conversazione:\n${config.visibleHistory}\n\nNuovo:\n${config.userMessage}` 
          }
        ]
      };
    } else if (participant.type === 'gemini' || participant.type === 'google') {
      url = 'https://ai.gateway.lovable.dev/v1/chat/completions';
      headers = {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      };
      body = {
        model: config.model,
        max_tokens: 2500,
        temperature: 0.7,
        messages: [{
          role: 'user',
          content: `${concisePrompt}\n\nConversazione:\n${config.visibleHistory}\n\nNuovo:\n${config.userMessage}`
        }]
      };
    } else {
      throw new Error(`Provider non supportato: ${participant.type}`);
    }
    
    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    }, config.timeoutMs);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ ${participant.name} error ${response.status}:`, errorText);
      
      if (response.status === 429) throw new Error('429');
      if (response.status >= 500) throw new Error(`5xx`);
      throw new Error(`API error ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    const duration = Date.now() - startTime;
    
    let content: string;
    let tokensIn: number;
    let tokensOut: number;
    
    if (participant.type === 'claude' || participant.type === 'anthropic') {
      content = data.content[0].text;
      tokensIn = data.usage?.input_tokens || 0;
      tokensOut = data.usage?.output_tokens || 0;
    } else {
      content = data.choices[0].message.content;
      tokensIn = data.usage?.prompt_tokens || 0;
      tokensOut = data.usage?.completion_tokens || 0;
    }
    
    console.log(`✅ ${participant.name}: ${tokensOut} token out (${tokensIn} in) in ${duration}ms`);
    
    if (tokensOut > 2000) {
      console.warn(`⚠️ ${participant.name} ha generato ${tokensOut} token (>2000). Considera ottimizzazione prompt.`);
    }
    
    return { content, tokensIn, tokensOut, duration };
  }, { retries: 2, baseDelayMs: 300 });
}

// ═══════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversationId, userMessage, participants } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY non configurata');
    }

    // Carica conversation settings
    const { data: conversation } = await supabaseClient
      .from('chat_laboratory_conversations')
      .select('last_speaker_index, economy_mode, pause_between_agents_ms')
      .eq('id', conversationId)
      .single();

    const useEconomyMode = conversation?.economy_mode ?? true;
    const pauseMs = conversation?.pause_between_agents_ms ?? 50;

    // Carica il prompt globale
    const { data: globalPrompt } = await supabaseClient
      .from('chat_laboratory_system_prompts')
      .select('contenuto')
      .eq('attivo', true)
      .maybeSingle();

    const basePrompt = globalPrompt?.contenuto || `Sei un esperto in una discussione a turni.

COMPORTAMENTO:
- Leggi attentamente tutti gli interventi precedenti
- Aspetta il tuo turno per parlare
- Riferisciti agli interventi precedenti
- Aggiungi prospettive nuove, non ripetere
- Cerca convergenza e compromesso
- Massimo 150 parole

REGOLE CRITICHE:
- NON rivelare di essere un'AI
- Parla in prima persona
- Tono professionale e colloquiale`;

    // Carica messaggi
    const { data: messages } = await supabaseClient
      .from('chat_laboratory_messages')
      .select('sender_name, content, content_summary, is_summary_available, is_visible_to_ai, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    // Filtra solo gli AI attivi
    const activeAIs = participants.filter((p: any) => p.type !== 'human');
    
    if (activeAIs.length === 0) {
      console.error('❌ Nessun agente AI attivo!');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Nessun agente AI attivo nella conversazione'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const startTime = Date.now();

    // Costruisci history completa
    let visibleHistory = (messages || [])
      .filter((msg: any) => msg.is_visible_to_ai !== false)
      .map((msg: any) => {
        let content = msg.content;
        
        if (useEconomyMode && msg.is_summary_available && msg.content_summary && msg.sender_name !== 'Utente') {
          content = msg.content_summary;
        }
        
        return `${msg.sender_name}: ${content}`;
      })
      .join('\n');

    // ✅ COMPRESSIONE HISTORY se troppo lunga
    const estimatedTokens = visibleHistory.length / 4;
    if (estimatedTokens > 2000) {
      console.log(`⚠️ History troppo lunga (~${estimatedTokens} token). Compressione...`);
      
      const recentMessages = (messages || []).slice(-20);
      visibleHistory = recentMessages
        .filter((msg: any) => msg.is_visible_to_ai !== false)
        .map((msg: any) => {
          const content = (useEconomyMode && msg.is_summary_available && msg.content_summary && msg.sender_name !== 'Utente')
            ? msg.content_summary
            : msg.content;
          return `${msg.sender_name}: ${content}`;
        })
        .join('\n');
      
      console.log(`✅ History compressa da ${estimatedTokens * 4} a ${visibleHistory.length} caratteri`);
    }

    // ═══════════════════════════════════════════════════════════
    // ORCHESTRAZIONE SEQUENZIALE (Gemini → OpenAI → Claude)
    // ═══════════════════════════════════════════════════════════

    console.log(`🚀 Avvio orchestrazione SEQUENZIALE per ${activeAIs.length} agenti`);

    // ⚡ RIORDINA agenti per velocità
    const geminiAgent = activeAIs.find((p: any) => 
      p.type === 'lovable_ai' || p.type === 'gemini' || p.type === 'google'
    );
    const openaiAgent = activeAIs.find((p: any) => 
      p.type === 'openai' || p.type === 'chatgpt'
    );
    const claudeAgent = activeAIs.find((p: any) => 
      p.type === 'anthropic' || p.type === 'claude'
    );
    const otherAgents = activeAIs.filter((p: any) => 
      p.type !== 'lovable_ai' && 
      p.type !== 'gemini' && 
      p.type !== 'google' &&
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

    console.log(`⚡ Ordine chiamate: ${sortedParticipants.map((p: any) => p.name).join(' → ')}`);

    // Recupera API keys PRIMA del loop
    const { data: anthropicConfig } = await supabaseClient
      .from('config_ai')
      .select('api_key')
      .eq('provider', 'anthropic')
      .maybeSingle();

    const { data: openaiConfig } = await supabaseClient
      .from('config_ai')
      .select('api_key, modello')
      .eq('provider', 'openai')
      .maybeSingle();

    const orchestrationStart = Date.now();
    const allResponses: any[] = [];
    const results: any[] = [];

    // ✅ LOOP SEQUENZIALE: Un agente alla volta
    for (let i = 0; i < sortedParticipants.length; i++) {
      const participant = sortedParticipants[i];
      const agentStartTime = Date.now();
      
      console.log(`\n🎯 Agente ${i + 1}/${sortedParticipants.length}: ${participant.name}`);
      
      try {
        // ============ CONTEXT CUMULATIVO ============
        const turnContext = allResponses.map(r => ({
          role: 'assistant',
          content: `[${r.participant.name}]: ${r.content}`
        }));
        
        console.log(`📝 Context include: ${allResponses.length} risposte precedenti di questo turno`);
        
        // Componi history arricchita
        const enrichedHistory = visibleHistory + '\n\n' + 
          turnContext.map(tc => `${tc.content}`).join('\n\n');
        
        // Determina API key e modello
        let apiKey: string;
        let model: string;
        
        if (participant.type === 'claude' || participant.type === 'anthropic') {
          if (!anthropicConfig?.api_key) throw new Error('Anthropic API key non configurata');
          apiKey = anthropicConfig.api_key;
          model = 'claude-sonnet-4-5';
        } else if (participant.type === 'chatgpt' || participant.type === 'openai') {
          if (!openaiConfig?.api_key) throw new Error('OpenAI API key non configurata');
          apiKey = openaiConfig.api_key;
          model = openaiConfig.modello || 'gpt-5-2025-08-07';
        } else if (participant.type === 'gemini' || participant.type === 'google') {
          apiKey = LOVABLE_API_KEY;
          model = 'google/gemini-2.5-flash';
        } else {
          throw new Error(`Provider sconosciuto: ${participant.type}`);
        }
        
        // Chiama l'agente con history ARRICCHITA
        const result = await callAIProvider(participant, {
          apiKey,
          model,
          basePrompt,
          visibleHistory: enrichedHistory, // ✅ Include risposte precedenti
          userMessage,
          timeoutMs: 43000
        });
        
        const agentDuration = Date.now() - agentStartTime;
        console.log(`✅ ${participant.name} completato in ${agentDuration}ms`);
        
        // Aggiungi a allResponses per il prossimo agente
        allResponses.push({
          success: true,
          participant,
          ...result
        });
        
        results.push({
          status: 'fulfilled',
          value: {
            success: true,
            participant,
            ...result
          }
        });
        
        // ⏱️ PAUSA tra agenti (tranne l'ultimo)
        if (i < sortedParticipants.length - 1) {
          console.log(`⏸️ Pausa di ${pauseMs}ms prima del prossimo agente...`);
          await delay(pauseMs);
        }
        
      } catch (error: any) {
        console.error(`❌ ${participant.name} fallito:`, error.message);
        results.push({
          status: 'fulfilled',
          value: {
            success: false,
            participant,
            error: error.message
          }
        });
      }
    }

    const orchestrationDuration = Date.now() - orchestrationStart;
    console.log(`🎯 Orchestrazione sequenziale completata in ${orchestrationDuration}ms`);

    // 🎯 Calcola nextSequence UNA SOLA VOLTA
    const { data: maxSeq } = await supabaseClient
      .from('chat_laboratory_messages')
      .select('message_sequence')
      .eq('conversation_id', conversationId)
      .order('message_sequence', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    let nextSequence = (maxSeq?.message_sequence || 0) + 1;

    // Elabora risultati e salva
    const successfulResponses: any[] = [];
    const failedResponses: any[] = [];
    let totalTokensOut = 0;

    for (const result of results) {
      const value = result.status === 'fulfilled' ? result.value : { success: false, error: 'Promise rejected' };
      
      if (value.success) {
        successfulResponses.push(value);
        totalTokensOut += value.tokensOut;
        
        const { data: savedMessage, error: insertError } = await supabaseClient
          .from('chat_laboratory_messages')
          .insert({
            conversation_id: conversationId,
            message_sequence: nextSequence++,
            sender_type: value.participant.type,
            sender_name: value.participant.name,
            content: value.content,
            content_user_friendly: null,
            content_summary: null,
            is_summary_available: false,
            is_visible_to_ai: true,
            intent_tags: [],
            token_input: value.tokensIn,
            token_output: value.tokensOut,
            tempo_risposta_ms: value.duration,
            attachments: {
              structured_prompt: {
                message_id: null,
                timestamp: new Date().toISOString(),
                global_system_prompt: basePrompt,
                base_sections: [],
                topic_sections: [],
                kb_context_sections: [],
                kb_documents: [],
                cumulative_summary: null,
                message_history: (messages || [])
                  .filter((msg: any) => msg.is_visible_to_ai !== false)
                  .map((msg: any) => ({
                    sender_name: msg.sender_name,
                    content: useEconomyMode && msg.is_summary_available && msg.content_summary && msg.sender_name !== 'Utente'
                      ? msg.content_summary
                      : msg.content,
                    is_summary: useEconomyMode && !!msg.content_summary,
                    created_at: msg.created_at
                  })),
                current_user_message: userMessage,
                metadata: {
                  participant_type: value.participant.type,
                  participant_name: value.participant.name,
                  history_count: messages?.length || 0,
                  economy_mode: useEconomyMode
                }
              },
              debug_info: {
                orchestration_duration: orchestrationDuration,
                agent_duration: value.duration,
                timestamp: new Date().toISOString()
              }
            }
          })
          .select()
          .single();
        
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

          // 💰 CALCOLA E SALVA COSTI
          const modelName = value.participant.type === 'claude' || value.participant.type === 'anthropic'
            ? 'claude-sonnet-4-5'
            : value.participant.type === 'chatgpt' || value.participant.type === 'openai'
            ? 'gpt-5-2025-08-07'
            : 'gemini-2.5-flash';

          // Query pricing dal DB
          const { data: pricingData } = await supabaseClient
            .from('ai_pricing_config')
            .select('cost_input_eur, cost_output_eur, is_free')
            .eq('provider', value.participant.type === 'lovable_ai' ? 'lovable' : value.participant.type)
            .eq('model', modelName)
            .maybeSingle();

          let costInput = 0;
          let costOutput = 0;
          let costTotal = 0;

          if (pricingData && !pricingData.is_free) {
            costInput = (value.tokensIn / 1_000_000) * pricingData.cost_input_eur;
            costOutput = (value.tokensOut / 1_000_000) * pricingData.cost_output_eur;
            costTotal = costInput + costOutput;
            
            console.log(`💰 Costo ${value.participant.name}: €${costTotal.toFixed(6)} (${value.tokensIn} in + ${value.tokensOut} out)`);
          }

          // Salva in ai_cost_tracking
          await supabaseClient
            .from('ai_cost_tracking')
            .insert({
              lab_conversation_id: conversationId,
              provider: value.participant.type === 'lovable_ai' ? 'lovable' : value.participant.type,
              model: modelName,
              input_tokens: value.tokensIn,
              output_tokens: value.tokensOut,
              cost_input_eur: costInput,
              cost_output_eur: costOutput,
              cost_total_eur: costTotal,
              operation_type: 'chat_laboratory'
            });
        }

        // Trigger summary generation
        supabaseClient.functions.invoke('generate-message-summaries', {
          body: { 
            messageId: savedMessage.id, 
            content: value.content,
            conversationId,
            table: 'chat_laboratory_messages'
          }
        }).catch((err) => {
          console.error('⚠️ Summary generation failed:', err);
        });
        
      } else {
        failedResponses.push(value);
      }
    }

    console.log(`✅ Successi: ${successfulResponses.length}, ❌ Falliti: ${failedResponses.length}`);
    console.log(`📊 Token totali generati: ${totalTokensOut}`);

    // Aggiorna last_speaker_index
    if (successfulResponses.length > 0) {
      const firstSuccessIndex = activeAIs.findIndex(
        (p: any) => p.name === successfulResponses[0].participant.name
      );
      
      await supabaseClient
        .from('chat_laboratory_conversations')
        .update({ last_speaker_index: firstSuccessIndex })
        .eq('id', conversationId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        orchestrationTimeMs: orchestrationDuration,
        totalTokensOut,
        responses: successfulResponses.map(r => ({
          participant: r.participant.name,
          content: r.content,
          tokens: { input: r.tokensIn, output: r.tokensOut },
          duration: r.duration
        })),
        errors: failedResponses.map(f => ({
          participant: f.participant?.name || 'unknown',
          error: f.error
        }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Orchestrator error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Errore sconosciuto',
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});