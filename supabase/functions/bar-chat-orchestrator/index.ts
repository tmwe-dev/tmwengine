import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============ HELPER FUNCTIONS PER RESILIENZA API ============

/**
 * Fetch con timeout usando AbortController
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 60000
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
      throw new Error(`⏱️ Request timeout dopo ${timeoutMs}ms`);
    }
    throw error;
  }
}

/**
 * Retry con exponential backoff e jitter
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
 * Utility per delay
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Collassa messaggi consecutivi dello stesso role per Claude API
 * Claude richiede alternanza user/assistant, ma Bar Chat ha assistant consecutivi
 */
function collapseConsecutiveMessages(messages: any[]): any[] {
  const collapsed = [];
  let lastRole = null;
  let buffer = '';

  for (const msg of messages) {
    if (msg.role === lastRole) {
      // Accumula messaggi dello stesso tipo
      buffer += '\n\n' + msg.content;
    } else {
      // Salva il buffer precedente
      if (buffer && lastRole) {
        collapsed.push({ role: lastRole, content: buffer });
      }
      // Inizia nuovo buffer
      lastRole = msg.role;
      buffer = msg.content;
    }
  }
  
  // Aggiungi l'ultimo buffer
  if (buffer && lastRole) {
    collapsed.push({ role: lastRole, content: buffer });
  }

  return collapsed;
}

// ============ PROMPT CACHE GLOBALE ============
// Cache in-memory per ridurre query ripetute (TTL: 5 minuti)
interface PromptCache {
  globalPrompt: string;
  baseSections: string;
  agentPersonalities: Map<string, string>;
  timestamp: number;
}

let promptCache: PromptCache | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minuti

async function getCachedPrompts(supabase: any): Promise<PromptCache> {
  const now = Date.now();
  
  if (!promptCache || (now - promptCache.timestamp > CACHE_TTL)) {
    console.log('📦 Ricaricando prompt cache...');
    
    // Una query batch per tutti i prompts
    const [globalData, baseData, personalityData] = await Promise.all([
      supabase.from('chat_laboratory_system_prompts')
        .select('contenuto')
        .eq('attivo', true)
        .limit(1)
        .maybeSingle(),
      
      supabase.from('chat_laboratory_prompt_sections')
        .select('content')
        .eq('section_type', 'BASE')
        .eq('is_active', true)
        .order('order_priority', { ascending: true }),
      
      supabase.from('chat_laboratory_prompt_sections')
        .select('section_name, content')
        .eq('section_type', 'AGENT_PERSONALITY')
        .eq('is_active', true)
    ]);
    
    promptCache = {
      globalPrompt: globalData.data?.contenuto || 'Sei un assistente AI intelligente che partecipa a discussioni costruttive in un bar virtuale.',
      baseSections: baseData.data?.map((s: any) => s.content).join('\n\n') || '',
      agentPersonalities: new Map(
        personalityData.data?.map((p: any) => [
          p.section_name.toLowerCase(),
          p.content
        ]) || []
      ),
      timestamp: now
    };
    
    console.log(`✅ Cache aggiornata: ${promptCache.agentPersonalities.size} personalità caricate`);
  }
  
  return promptCache;
}

// ============================================================

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

    // Fetch API keys
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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!anthropicConfig?.api_key && !openaiConfig?.api_key && !LOVABLE_API_KEY) {
      throw new Error('Nessuna chiave API configurata');
    }

    // Fetch Bar Mode settings con nuove colonne
    const { data: barModeSettings } = await supabaseClient
      .from('chat_laboratory_bar_mode')
      .select('mode, selected_topic, active_kb_id, voice_enabled, conversation_pace, agent_interaction_mode, conversation_style, pause_between_turns_ms')
      .eq('conversation_id', conversationId)
      .single();

    if (barModeSettings?.mode !== 'bar') {
      throw new Error('Questa funzione è dedicata alla modalità Bar Chat');
    }

    const selectedTopic = barModeSettings.selected_topic;
    const activeKbId = barModeSettings.active_kb_id;
    const voiceEnabled = barModeSettings.voice_enabled ?? true;
    const agentMode = barModeSettings.agent_interaction_mode || 'consultation';
    const conversationStyle = barModeSettings.conversation_style || 'colleagues';
    const conversationPace = barModeSettings.conversation_pace || 'normal';

    const paceDelays = {
      slow: 2000,
      normal: 800,
      fast: 300
    };
    const pauseBetweenTurnsMs = barModeSettings.pause_between_turns_ms || paceDelays[conversationPace as keyof typeof paceDelays];

    console.log('⚙️ Configurazione:', {
      agentMode,
      conversationStyle,
      conversationPace,
      pauseBetweenTurnsMs,
      voiceEnabled
    });
    
    // ============ KB TEMPORANEAMENTE DISABILITATO ============
    // Struttura conservata per futuri usi - eliminata chiamata API e RPC
    let kbContext = '';
    // if (activeKbId) { ... } ← RIMOSSO per ottimizzazione

    // Fetch conversation data
    const { data: conversation, error: convError } = await supabaseClient
      .from('chat_laboratory_conversations')
      .select('economy_mode, current_turn_index, last_speaker_index, riassunto_contesto, is_paused')
      .eq('id', conversationId)
      .single();

    if (convError) throw convError;

    // 🆕 CONTROLLO PAUSA - Se in pausa, blocca tutto
    if (conversation?.is_paused) {
      console.log('⏸️ Conversazione in pausa, AI non risponde');
      return new Response(
        JSON.stringify({
          error: 'conversation_paused',
          message: 'La conversazione è in pausa. Ripremi Play per continuare.',
          speaker: null,
          tempResponse: null
        }),
        { 
          status: 423, // 423 Locked
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // ✅ Economy Mode ELIMINATO - usiamo sempre content completo (20 messaggi)
    const cumulativeSummary = conversation?.riassunto_contesto || null;
    console.log('📚 Riassunto cumulativo:', cumulativeSummary ? `${cumulativeSummary.substring(0, 100)}...` : 'Nessuno');

    // ============ CARICAMENTO PROMPTS CACHED ============
    const cachedPrompts = await getCachedPrompts(supabaseClient);
    const globalSystemPrompt = cachedPrompts.globalPrompt;
    const baseContent = cachedPrompts.baseSections;
    console.log(`📦 Prompts cached caricati (BASE: ${baseContent.length} chars)`);

    // ============ TOPIC E KB_CONTEXT TEMPORANEAMENTE DISABILITATI ============
    // Struttura conservata per futuri usi
    let topicSections: any[] = [];
    let kbContextSections: any[] = [];
    // console.log('⚠️ TOPIC e KB_CONTEXT sections disabilitate per ottimizzazione');

  // Fetch conversation messages - 🎯 LIMIT agli ultimi 20 messaggi
  const { data: messages } = await supabaseClient
    .from('chat_laboratory_messages')
    .select('sender_type, sender_name, content, content_summary, is_summary_available, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(20);

  // 🔄 Inverti array per ripristinare cronologia corretta
  const recentMessages = (messages || []).reverse();

    // ✅ SEMPRE 20 MESSAGGI COMPLETI - Economy mode eliminato
    const historyMessages = recentMessages.map((msg: any) => {
      const messageContent = msg.content; // Sempre content completo
      
      console.log(`📝 [${msg.sender_name}] Content completo: ${messageContent.length} chars`);
      
      return {
        role: msg.sender_type === 'user' ? 'user' : 'assistant',
        content: `[${msg.sender_name}]: ${messageContent}`
      };
    });

    // ============ LOGICA SEQUENZIALE: Chiamata tutti gli agenti attivi ============
    const activeParticipants = participants.filter((p: any) => p.is_active);
    
    // ⚡ OTTIMIZZAZIONE: Riordina agenti per velocità (Gemini → OpenAI → Claude)
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
      const currentAgent = sortedParticipants[i];
      console.log(`\n🎯 Agente ${i + 1}/${sortedParticipants.length}: ${currentAgent.name}`);
      
      // ============ CONTEXT CUMULATIVO: Messaggio utente + risposte precedenti di QUESTO turno ============
      const turnContext = [
        { role: 'user', content: userMessage },
        ...allResponses.map(r => ({
          role: 'assistant',
          content: `[${r.agentName}]: ${r.content}`
        }))
      ];
      
      console.log(`📝 Context include: messaggio utente + ${allResponses.length} risposte precedenti`);

      // ============ RECUPERA PERSONALITÀ DA CACHE ============
      const agentPersonality = cachedPrompts.agentPersonalities.get(
        currentAgent.name.toLowerCase()
      ) || '';
      
      console.log(`👤 Personalità ${currentAgent.name}: ${agentPersonality.length} chars (cached)`);

      // ============ COMPONI PROMPT SEMPLIFICATO ============
      let composedPrompt = globalSystemPrompt + '\n\n';
      
      // Add BASE sections (cached)
      composedPrompt += '=== CONTESTO BASE ===\n';
      composedPrompt += baseContent + '\n\n';

      // Add AGENT_PERSONALITY (cached)
      if (agentPersonality) {
        composedPrompt += '=== TUA PERSONALITÀ ===\n';
        composedPrompt += agentPersonality + '\n\n';
      }

      // 🆕 INJECTION STILE CONVERSAZIONALE
      let styleInstructions = '';
      
      if (conversationStyle === 'boss_talk') {
        styleInstructions = `
🎯 STILE: Boss Talk (Pragmatico e Sintetico)
- MAX 50-60 parole (~4 frasi brevi)
- Focus su: decisioni, ROI, trade-off, next steps
- Taglia tutto ciò che non è direttamente azionabile
- Usa dati concreti: "Secondo benchmark X, l'opzione A costa il 30% in meno"
- Tono diretto: "Dobbiamo decidere tra A e B. Pro di A: [lista]. Vai con B?"
`;
      } else if (conversationStyle === 'colleagues') {
        styleInstructions = `
🤝 STILE: Colleghi (Professionale ma Amichevole)
- MAX 60-70 parole (~5 frasi)
- Bilanciato tra tecnico e accessibile
- Coinvolgi gli altri: "Come vedi tu [nome], sarebbe fattibile con i nostri constraint?"
- Puoi usare metafore o esempi pratici
- Tono collaborativo ma non eccessivamente formale
`;
      } else if (conversationStyle === 'bar_chat') {
        styleInstructions = `
🍺 STILE: Bar Chat (Informale e Rilassato)
- MAX 40-50 parole (~3 frasi)
- Attacco conversazionale: "Guarda...", "Senti...", "Allora..."
- Scherzoso quando appropriato, ma non forzato
- Coinvolgi con domande dirette: "Tu [nome], lo faresti diversamente?"
- Tono da bar, non da conferenza: evita "in conclusione", "per riassumere"
`;
      }
      
      composedPrompt += styleInstructions + '\n\n';
      
      // 🆕 INJECTION MODALITÀ AGENTE
      if (agentMode === 'consultation') {
        composedPrompt += `
📚 MODALITÀ: Consultazione Formale
- Puoi essere dettagliato e approfondito (fino a 150 parole se necessario)
- Usa linguaggio tecnico quando appropriato
- Fornisci spiegazioni complete e strutturate
- Cita fonti o riferimenti se rilevanti
- Questo è il tuo UNICO intervento, quindi sii esaustivo

`;
      }

      // TOPIC e KB_CONTEXT temporaneamente disabilitati (struttura conservata)
      // if (topicSections.length > 0) { ... }
      // if (kbContextSections.length > 0) { ... }
      // if (kbContext) { ... }

      console.log('📝 Prompt finale composto:', composedPrompt.substring(0, 200) + '...');

      // Prepare conversation history con context cumulativo
      const conversationHistory = [
        { role: 'system', content: composedPrompt },
        // ✅ INSERIMENTO SUMMARY CUMULATIVO (se esiste)
        ...(cumulativeSummary ? [{ 
          role: 'system', 
          content: `📚 CONTESTO PRECEDENTE (Riassunto cumulativo):\n${cumulativeSummary}\n\n---\n\n` 
        }] : []),
        ...historyMessages,
        ...turnContext // ← Context cumulativo del turno (user message + risposte precedenti)
      ];

      // 📊 LOG DIMENSIONI CONTESTO (per monitoraggio)
      const totalContextChars = conversationHistory
        .map(m => m.content.length)
        .reduce((sum, len) => sum + len, 0);

      const estimatedTokens = Math.ceil(totalContextChars / 4);

      console.log('📊 CONTEXT SIZE:', {
        systemPromptChars: composedPrompt.length,
        cumulativeSummaryChars: cumulativeSummary?.length || 0,
        historyMessagesCount: historyMessages.length,
        turnContextMessages: turnContext.length,
        totalContextChars: totalContextChars,
        estimatedTokens: estimatedTokens
      });

      if (estimatedTokens > 50000) {
        console.warn('⚠️ CONTEXT SIZE ECCESSIVO!', estimatedTokens, 'tokens');
      }

      let aiResponse = '';
      let tokenInput = 0;
      let tokenOutput = 0;
      const startTime = Date.now();

      // ============ CHIAMATA AI PROVIDER ============
      if ((currentAgent.type === 'anthropic' || currentAgent.type === 'claude') && anthropicConfig?.api_key) {
      console.log('🤖 Calling Anthropic (Claude)...');
      
      const result = await withRetry(async () => {
        // ✅ Estrai tutti i system messages (prompt + summary)
        const systemMessages = conversationHistory.filter(m => m.role === 'system');
        const rawMessages = conversationHistory.filter(m => m.role !== 'system');
        
        // 🔧 Collassa messaggi consecutivi per alternanza user/assistant
        const userMessages = collapseConsecutiveMessages(rawMessages);
        console.log(`🔧 Claude: ${rawMessages.length} messaggi → ${userMessages.length} collassati`);
        
        // ✅ Componi UN SOLO system prompt con tutto
        const fullSystemPrompt = systemMessages.map(m => m.content).join('\n\n---\n\n');
        
        const response = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicConfig.api_key,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-5',
            max_tokens: 2500, // ✅ Limite conversazionale esteso
            temperature: 0.7, // ✅ Più creativo e naturale
            messages: userMessages,  // ✅ Solo user/assistant
            system: fullSystemPrompt // ✅ Prompt + Summary insieme
          })
        }, 43000);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Anthropic error ${response.status}:`, errorText);
          
          if (response.status === 429) throw new Error('429');
          if (response.status >= 500) throw new Error('5xx');
          throw new Error(`Anthropic API error ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        return {
          content: data.content[0].text,
          tokensIn: data.usage?.input_tokens || 0,
          tokensOut: data.usage?.output_tokens || 0,
          duration: Date.now() - startTime
        };
      }, { retries: 2, baseDelayMs: 300 });
      
      aiResponse = result.content;
      tokenInput = result.tokensIn;
      tokenOutput = result.tokensOut;
      console.log(`✅ Claude: ${tokenOutput} token out (${tokenInput} in) in ${result.duration}ms`);
    }
    else if ((currentAgent.type === 'openai' || currentAgent.type === 'chatgpt')) {
      // ⚡ PRIORITÀ: Usa GPT-5 via Lovable AI se disponibile (più veloce)
      if (LOVABLE_API_KEY) {
        console.log('🤖 Calling OpenAI GPT-5 via Lovable AI Gateway...');
        
        const result = await withRetry(async () => {
          const response = await fetchWithTimeout('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${LOVABLE_API_KEY}`
            },
            body: JSON.stringify({
              model: 'openai/gpt-5-mini',
              max_completion_tokens: 2500,
              messages: conversationHistory
            })
          }, 60000);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Lovable AI (GPT-5) error ${response.status}:`, errorText);
            
            if (response.status === 429) throw new Error('429');
            if (response.status === 402) throw new Error('Payment Required');
            if (response.status >= 500) throw new Error('5xx');
            throw new Error(`Lovable AI error ${response.status}: ${errorText}`);
          }
          
          const data = await response.json();
          return {
            content: data.choices[0].message.content,
            tokensIn: data.usage?.prompt_tokens || 0,
            tokensOut: data.usage?.completion_tokens || 0,
            duration: Date.now() - startTime
          };
        }, { retries: 2, baseDelayMs: 300 });
        
        aiResponse = result.content;
        tokenInput = result.tokensIn;
        tokenOutput = result.tokensOut;
        console.log(`✅ GPT-5 via Lovable: ${tokenOutput} token out (${tokenInput} in) in ${result.duration}ms`);
      }
      // ⚠️ FALLBACK: Usa OpenAI diretto se Lovable non disponibile
      else if (openaiConfig?.api_key) {
        console.log('⚠️ Fallback: Calling OpenAI direct API...');
        
        const modelName = openaiConfig.modello || 'gpt-5-2025-08-07';
        const isNewerModel = modelName.startsWith('gpt-5') || 
                            modelName.startsWith('o3') || 
                            modelName.startsWith('o4');
        
        console.log(`🎯 Modello: ${modelName} (${isNewerModel ? 'newer' : 'legacy'} parameters)`);
        
        const result = await withRetry(async () => {
          const rawMessages = conversationHistory.map(msg => {
            if (msg.role === 'system') {
              return msg;
            }
            return {
              role: msg.role === 'human' ? 'user' : msg.role,
              content: msg.content
            };
          });
          
          const systemMsgs = rawMessages.filter(m => m.role === 'system');
          const nonSystemMsgs = rawMessages.filter(m => m.role !== 'system');
          const collapsedMsgs = collapseConsecutiveMessages(nonSystemMsgs);
          const messages = [...systemMsgs, ...collapsedMsgs];
          
          console.log(`🔧 GPT: ${nonSystemMsgs.length} messaggi → ${collapsedMsgs.length} collassati`);
          
          const body: any = {
            model: modelName,
            messages: messages
          };
          
          if (isNewerModel) {
            body.max_completion_tokens = 2500;
          } else {
            body.max_tokens = 2500;
            body.temperature = 0.7;
          }
          
          const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${openaiConfig.api_key}`
            },
            body: JSON.stringify(body)
          }, 60000);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ OpenAI error ${response.status}:`, errorText);
            
            if (response.status === 429) throw new Error('429');
            if (response.status >= 500) throw new Error('5xx');
            throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
          }
          
          const data = await response.json();
          return {
            content: data.choices[0].message.content,
            tokensIn: data.usage?.prompt_tokens || 0,
            tokensOut: data.usage?.completion_tokens || 0,
            duration: Date.now() - startTime
          };
        }, { retries: 2, baseDelayMs: 300 });
        
        aiResponse = result.content;
        tokenInput = result.tokensIn;
        tokenOutput = result.tokensOut;
        console.log(`✅ ChatGPT: ${tokenOutput} token out (${tokenInput} in) in ${result.duration}ms`);
      }
      else {
        throw new Error('Nessuna chiave API disponibile per OpenAI');
      }
    }
    else if (currentAgent.type === 'gemini' && LOVABLE_API_KEY) {
      console.log('🤖 Calling Lovable AI (Gemini)...');
      
      const result = await withRetry(async () => {
        const response = await fetchWithTimeout('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${LOVABLE_API_KEY}`
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            max_tokens: 2500, // ✅ Allineato a Claude/GPT
            temperature: 0.7, // ✅ Più creativo
            messages: conversationHistory
          })
        }, 43000);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Lovable AI error ${response.status}:`, errorText);
          
          if (response.status === 429) throw new Error('429');
          if (response.status === 402) throw new Error('Payment Required');
          if (response.status >= 500) throw new Error('5xx');
          throw new Error(`Lovable AI error ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        return {
          content: data.choices[0].message.content,
          tokensIn: data.usage?.prompt_tokens || 0,
          tokensOut: data.usage?.completion_tokens || 0,
          duration: Date.now() - startTime
        };
      }, { retries: 2, baseDelayMs: 300 });
      
      aiResponse = result.content;
      tokenInput = result.tokensIn;
      tokenOutput = result.tokensOut;
      console.log(`✅ Gemini: ${tokenOutput} token out (${tokenInput} in) in ${result.duration}ms`);
    }
    else {
      throw new Error(`No API key available for ${selectedParticipant.type}`);
    }

      // ⚠️ SAFETY: truncate se risposta supera 15k chars (fallback per modelli senza max_tokens)
      if (aiResponse.length > 15000) {
        console.warn(`⚠️ Risposta troppo lunga (${aiResponse.length} chars), troncamento a 15k...`);
        aiResponse = aiResponse.substring(0, 15000) + '\n\n[... risposta troncata per lunghezza]';
      }
      
      const responseTime = Date.now() - startTime;
      console.log(`✅ ${currentAgent.name} risposta ricevuta in ${responseTime}ms`);
    
      // ============ TELEMETRIA STRUTTURATA + DEBUG INFO ============
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

      // ============ SALVA RISPOSTA IMMEDIATAMENTE ============
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
              message_id: null, // Popolato dopo
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
          }
        })
        .select()
        .single();

      if (saveError || !savedMessage) {
        console.error('❌ Errore salvataggio messaggio:', saveError);
        throw new Error('Errore salvataggio messaggio');
      }

      // Aggiorna message_id negli attachments
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
      
      // ============ AGGIUNGI ALLA LISTA RISPOSTE ============
      allResponses.push({
        agentName: currentAgent.name,
        agentType: currentAgent.type,
        content: aiResponse,
        tokenInput,
        tokenOutput,
        responseTime,
        messageId: savedMessage.id
      });
    } // ← Fine del loop for

    // ============ TURNO COMPLETATO ============
    console.log(`\n✅ Turno completato: ${allResponses.length} agenti hanno risposto`);

    // ✅ AUTO-REGENERAZIONE SUMMARY ogni 20 messaggi
    const totalMessages = (messages?.length || 0) + allResponses.length + 1; // +1 user + N agenti
    if (totalMessages % 20 === 0) {
      console.log(`🔄 Trigger auto-summary: ${totalMessages} messaggi raggiunti`);
      
      // Chiamata asincrona in background (non blocca la risposta)
      supabaseClient.functions.invoke('generate-chunked-summary', {
        body: {
          conversationId,
          chunkSize: 50,
          includeAll: false
        }
      }).then(({ error: summaryError }) => {
        if (summaryError) {
          console.error('⚠️ Errore auto-summary:', summaryError);
        } else {
          console.log('✅ Summary cumulativo rigenerato automaticamente');
        }
      });
    }

    // ============ RISPOSTA FINALE ============
    return new Response(
      JSON.stringify({
        success: true,
        total_responses: allResponses.length,
        responses: allResponses.map(r => ({
          speaker: r.agentName,
          type: r.agentType,
          message_id: r.messageId,
          token_input: r.tokenInput,
          token_output: r.tokenOutput,
          response_time_ms: r.responseTime
        })),
        audioWillBeGenerated: voiceEnabled,
        message: `${allResponses.length} agenti hanno risposto in sequenza`,
        
        // Telemetria aggregata
        orchestration: {
          mode: 'sequential',
          total_agents: allResponses.length,
          total_latency_ms: allResponses.reduce((sum, r) => sum + r.responseTime, 0),
          avg_latency_ms: Math.round(allResponses.reduce((sum, r) => sum + r.responseTime, 0) / allResponses.length),
          total_tokens_in: allResponses.reduce((sum, r) => sum + r.tokenInput, 0),
          total_tokens_out: allResponses.reduce((sum, r) => sum + r.tokenOutput, 0)
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
