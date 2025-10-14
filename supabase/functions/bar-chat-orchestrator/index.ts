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
  timeoutMs: number = 8000
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

    // Fetch Bar Mode settings
    const { data: barModeSettings } = await supabaseClient
      .from('chat_laboratory_bar_mode')
      .select('*')
      .eq('conversation_id', conversationId)
      .single();

    if (barModeSettings?.mode !== 'bar') {
      throw new Error('Questa funzione è dedicata alla modalità Bar Chat');
    }

    const selectedTopic = barModeSettings.selected_topic;
    const activeKbId = barModeSettings.active_kb_id;
    const voiceEnabled = barModeSettings.voice_enabled ?? true;
    console.log('📌 Topic selezionato:', selectedTopic || 'Nessuno');
    console.log('📚 Knowledge Base attiva:', activeKbId || 'Nessuna');
    console.log('🎤 Voice enabled dal DB:', voiceEnabled);
    
    // ============ RAG KNOWLEDGE BASE INTEGRATION ============
    let kbContext = '';
    if (activeKbId) {
      try {
        console.log('📚 Generazione embedding per KB search...');
        // Generate embedding for user message
        const embeddingResponse = await fetchWithTimeout('https://ai.gateway.lovable.dev/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: userMessage
          })
        }, 5000);
        
        if (embeddingResponse.ok) {
          const embData = await embeddingResponse.json();
          const embedding = embData.data[0].embedding;
          
          // Search KB documents
          const { data: kbDocs } = await supabaseClient.rpc('search_kb_documents', {
            p_kb_id: activeKbId,
            p_query_embedding: `[${embedding.join(',')}]`,
            p_match_threshold: 0.7,
            p_match_count: 3
          });
          
          if (kbDocs && kbDocs.length > 0) {
            kbContext = '\n=== 📚 KNOWLEDGE BASE (Documenti Rilevanti) ===\n';
            kbContext += kbDocs.map((doc: any, idx: number) => 
              `${idx + 1}. **${doc.title}** (similarità: ${(doc.similarity * 100).toFixed(1)}%)\n${doc.content.substring(0, 500)}...`
            ).join('\n\n') + '\n\n';
            console.log(`📚 KB: ${kbDocs.length} documenti trovati (top similarity: ${(kbDocs[0].similarity * 100).toFixed(1)}%)`);
          } else {
            console.log('📚 KB: nessun documento rilevante trovato');
          }
        }
      } catch (kbError: any) {
        console.error('⚠️ KB search failed:', kbError.message);
      }
    }

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

    const useEconomyMode = conversation?.economy_mode ?? true;
    const cumulativeSummary = conversation?.riassunto_contesto || null;
    console.log('💰 Economy Mode:', useEconomyMode ? 'ATTIVO (usa content_summary)' : 'DISATTIVO (usa content completo)');
    console.log('📚 Riassunto cumulativo:', cumulativeSummary ? `${cumulativeSummary.substring(0, 100)}...` : 'Nessuno');

    // Fetch global system prompt
    const { data: systemPrompts } = await supabaseClient
      .from('chat_laboratory_system_prompts')
      .select('contenuto')
      .eq('attivo', true)
      .order('created_at', { ascending: false })
      .limit(1);

    const globalSystemPrompt = systemPrompts?.[0]?.contenuto || 
      "Sei un assistente AI intelligente che partecipa a discussioni costruttive in un bar virtuale.";

    // Fetch BASE sections (sempre attive)
    const { data: baseSections } = await supabaseClient
      .from('chat_laboratory_prompt_sections')
      .select('content')
      .eq('section_type', 'BASE')
      .eq('is_active', true)
      .order('order_priority', { ascending: true });

    console.log(`📦 Sezioni BASE: ${baseSections?.length || 0}`);

    // Fetch TOPIC sections (solo se topic selezionato)
    let topicSections: any[] = [];
    if (selectedTopic) {
      const { data } = await supabaseClient
        .from('chat_laboratory_prompt_sections')
        .select('content')
        .eq('section_type', 'TOPIC')
        .eq('is_active', true)
        .contains('topic_tags', [selectedTopic])
        .order('order_priority', { ascending: true });
      
      topicSections = data || [];
      console.log(`📦 Sezioni TOPIC (${selectedTopic}): ${topicSections.length}`);
    }
    
    // Fetch KB_CONTEXT sections (solo se KB attiva)
    let kbContextSections: any[] = [];
    if (activeKbId) {
      const { data } = await supabaseClient
        .from('chat_laboratory_prompt_sections')
        .select('content')
        .eq('section_type', 'KB_CONTEXT')
        .eq('is_active', true)
        .order('order_priority', { ascending: true });
      
      kbContextSections = data || [];
      console.log(`📚 Sezioni KB_CONTEXT: ${kbContextSections.length}`);
    }

    // Fetch conversation messages
    const { data: messages } = await supabaseClient
      .from('chat_laboratory_messages')
      .select('sender_type, sender_name, content, content_summary, is_summary_available')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    // 🎯 Apply economy mode: usa content_summary per messaggi AI quando disponibile
    // CRITICO: i messaggi utente NON vengono MAI riassunti per preservare menzioni dirette
    const historyMessages = (messages || []).map((msg: any) => {
      let messageContent = msg.content;
      
      // ✅ Economy Mode: usa sempre summary per AI se disponibile (preserva brevità ultimi 20 msg)
      if (useEconomyMode && msg.sender_type !== 'user' && msg.is_summary_available && msg.content_summary) {
        messageContent = msg.content_summary;
        console.log(`📝 [Economy] ${msg.sender_name} summary: ${messageContent.substring(0, 50)}...`);
      } else if (msg.sender_type === 'user') {
        // Log esplicito: messaggi utente sempre completi (preserva "@gpt", "claude?", etc.)
        console.log(`💬 [User] Preservato contenuto completo (${messageContent.length} chars) - menzioni intatte`);
      }
      
      return {
        role: msg.sender_type === 'user' ? 'user' : 'assistant',
        content: `[${msg.sender_name}]: ${messageContent}`
      };
    });

    // ============ CONTEXT MATCHING: Rilevamento Menzioni Dirette ============
    const userMessageLower = userMessage.toLowerCase().trim();
    let selectedParticipant: any = null;
    let currentTurnIndex = conversation.current_turn_index || 0;
    const lastSpeakerIndex = conversation.last_speaker_index || 0;
    let mentionDetected = false;
    
    // 1. Cerca menzioni dirette robuste (alias vocali comuni: "renny?", "vittorio", "tonino", "@gpt", etc.)
    for (const p of participants) {
      const namePattern = p.name.toLowerCase().replace(/[^a-z]/g, '');
      const typePattern = p.type.toLowerCase();
      
      // 🔥 Alias vocali estesi per robustezza
      const aliases = [
        namePattern, // es: "rennygpt"
        p.name.split('-')[0].trim().toLowerCase(), // es: "renny"
        p.name.split(' ')[0].trim().toLowerCase(), // es: "vittorio"
        typePattern, // es: "openai"
        // Alias specifici per provider comuni
        (typePattern === 'openai' || typePattern === 'chatgpt') ? 'gpt' : null,
        typePattern === 'anthropic' ? 'claude' : null,
        typePattern === 'gemini' ? 'gemini' : null
      ].filter(Boolean);
      
      const patterns = aliases.map(alias => new RegExp(`\\b${alias}\\??\\b`, 'i'));
      patterns.push(new RegExp(`@(${aliases.join('|')})`, 'i')); // @mention
      
      const matched = patterns.some(regex => regex.test(userMessageLower));
      
      if (matched) {
        selectedParticipant = p;
        currentTurnIndex = participants.findIndex(x => x.id === p.id);
        mentionDetected = true;
        const detectedAlias = aliases.find(a => new RegExp(`\\b${a}\\??\\b`, 'i').test(userMessageLower));
        console.log(`🎯 Menzione diretta rilevata → forza risposta: ${p.name} (alias: ${detectedAlias})`);
        break;
      }
    }
    
    // 2. Se nessuna menzione, usa turn_strategy dal DB
    if (!selectedParticipant) {
      const turnStrategy = barModeSettings?.turn_strategy || 'RANDOM_30';
      console.log(`🎯 Strategia turno: ${turnStrategy}`);
      
      if (turnStrategy === 'SMART_PRIORITY') {
        // 🧠 Smart Priority: analizza keyword + expertise + bilanciamento
        console.log('🧠 SMART_PRIORITY: analizzando expertise...');
        
        // Estrai keyword dal messaggio (semplice split per ora)
        const userKeywords = userMessage.toLowerCase()
          .split(/\s+/)
          .filter(w => w.length > 4); // solo parole > 4 char
        
        // Calcola score per ogni partecipante
        const participantScores = participants.map((p: any) => {
          let score = 0;
          const expertiseKeywords = p.expertise_keywords || [];
          
          // 1. Match expertise (peso 50)
          const matchCount = userKeywords.filter(uk => 
            expertiseKeywords.some((ek: string) => ek.toLowerCase().includes(uk) || uk.includes(ek.toLowerCase()))
          ).length;
          score += matchCount * 50;
          
          // 2. Bilanciamento response_count (peso 30)
          const avgResponses = participants.reduce((sum: number, pp: any) => sum + (pp.response_count || 0), 0) / participants.length;
          const responseGap = avgResponses - (p.response_count || 0);
          score += responseGap * 30;
          
          // 3. Non ha ancora risposto questo turno (peso 20)
          if (!p.has_responded_current_turn) {
            score += 20;
          }
          
          console.log(`  ${p.name}: score=${score.toFixed(1)} (expertise=${matchCount}, gap=${responseGap.toFixed(1)})`);
          return { participant: p, score };
        });
        
        // Seleziona il più adatto
        participantScores.sort((a, b) => b.score - a.score);
        selectedParticipant = participantScores[0].participant;
        currentTurnIndex = participants.findIndex((x: any) => x.id === selectedParticipant.id);
        console.log(`🧠 Selected: ${selectedParticipant.name} (score: ${participantScores[0].score.toFixed(1)})`);
        
      } else {
        // 🎲 RANDOM_30: 30% random, 70% sequenziale
        const isRandom = Math.random() < 0.3;
        
        if (isRandom) {
          currentTurnIndex = Math.floor(Math.random() * participants.length);
          console.log('🎲 Turno randomizzato:', currentTurnIndex);
        } else {
          currentTurnIndex = (lastSpeakerIndex + 1) % participants.length;
          console.log('➡️ Turno sequenziale:', currentTurnIndex);
        }
        selectedParticipant = participants[currentTurnIndex];
      }
    }
    
    console.log('🎯 Agente Bar Chat selezionato:', selectedParticipant.name);

    // Thinking delay rimosso - risposta immediata

    // Fetch AGENT_PERSONALITY sections (filtrate per nome agente)
    const { data: agentPersonalitySections } = await supabaseClient
      .from('chat_laboratory_prompt_sections')
      .select('content')
      .eq('section_type', 'AGENT_PERSONALITY')
      .eq('is_active', true)
      .ilike('section_name', `%${selectedParticipant.name}%`)
      .order('order_priority', { ascending: true });

    console.log(`👤 Sezioni AGENT_PERSONALITY per ${selectedParticipant.name}: ${agentPersonalitySections?.length || 0}`);

    // Compose final system prompt
    let composedPrompt = globalSystemPrompt + '\n\n';
    
    // Add BASE sections
    if (baseSections && baseSections.length > 0) {
      composedPrompt += '=== CONTESTO BASE ===\n';
      composedPrompt += baseSections.map(s => s.content).join('\n\n') + '\n\n';
    }

    // Add AGENT_PERSONALITY sections
    if (agentPersonalitySections && agentPersonalitySections.length > 0) {
      composedPrompt += '=== TUA PERSONALITÀ ===\n';
      composedPrompt += agentPersonalitySections.map(s => s.content).join('\n\n') + '\n\n';
    }

    // Add TOPIC sections
    if (topicSections.length > 0) {
      composedPrompt += `=== FOCUS TOPIC: ${selectedTopic} ===\n`;
      composedPrompt += topicSections.map(s => s.content).join('\n\n') + '\n\n';
    }
    
    // Add KB_CONTEXT sections
    if (kbContextSections.length > 0) {
      composedPrompt += '=== 📚 ISTRUZIONI KNOWLEDGE BASE ===\n';
      composedPrompt += kbContextSections.map(s => s.content).join('\n\n') + '\n\n';
    }
    
    // Add KB context (RAG documents)
    if (kbContext) {
      composedPrompt += kbContext;
    }

    console.log('📝 Prompt finale composto:', composedPrompt.substring(0, 200) + '...');

    // Prepare conversation history
    const conversationHistory = [
      { role: 'system', content: composedPrompt },
      // ✅ INSERIMENTO SUMMARY CUMULATIVO (se esiste)
      ...(cumulativeSummary ? [{ 
        role: 'system', 
        content: `📚 CONTESTO PRECEDENTE (Riassunto cumulativo):\n${cumulativeSummary}\n\n---\n\n` 
      }] : []),
      ...historyMessages,
      { role: 'user', content: userMessage }
    ];

    let aiResponse = '';
    let tokenInput = 0;
    let tokenOutput = 0;
    const startTime = Date.now();

    // Route to appropriate AI provider
    if ((selectedParticipant.type === 'anthropic' || selectedParticipant.type === 'claude') && anthropicConfig?.api_key) {
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
    else if ((selectedParticipant.type === 'openai' || selectedParticipant.type === 'chatgpt') && openaiConfig?.api_key) {
      console.log('🤖 Calling OpenAI (GPT)...');
      
      const modelName = openaiConfig.modello || 'gpt-5-2025-08-07';
      const isNewerModel = modelName.startsWith('gpt-5') || 
                          modelName.startsWith('o3') || 
                          modelName.startsWith('o4');
      
      console.log(`🎯 Modello: ${modelName} (${isNewerModel ? 'newer' : 'legacy'} parameters)`);
      
      const result = await withRetry(async () => {
        // ✅ USA conversationHistory che include il summary!
        const rawMessages = conversationHistory.map(msg => {
          if (msg.role === 'system') {
            return msg; // ✅ Mantieni system messages
          }
          // Converti human -> user per OpenAI
          return {
            role: msg.role === 'human' ? 'user' : msg.role,
            content: msg.content
          };
        });
        
        // 🔧 Separa system da user/assistant e collassa consecutivi
        const systemMsgs = rawMessages.filter(m => m.role === 'system');
        const nonSystemMsgs = rawMessages.filter(m => m.role !== 'system');
        const collapsedMsgs = collapseConsecutiveMessages(nonSystemMsgs);
        const messages = [...systemMsgs, ...collapsedMsgs];
        
        console.log(`🔧 GPT: ${nonSystemMsgs.length} messaggi → ${collapsedMsgs.length} collassati`);
        
        const body: any = {
          model: modelName,
          messages: messages  // ✅ Usa la conversationHistory completa!
        };
        
        // Parametri specifici per versione modello
        if (isNewerModel) {
          body.max_completion_tokens = 2500; // ✅ GPT-5+, O3, O4 - limite conversazionale esteso
        } else {
          body.max_tokens = 2500; // ✅ gpt-4o, gpt-4o-mini legacy - limite conversazionale esteso
          body.temperature = 0.7; // Solo legacy models
        }
        
        const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiConfig.api_key}`
          },
          body: JSON.stringify(body)
        }, 43000);
        
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
    else if (selectedParticipant.type === 'gemini' && LOVABLE_API_KEY) {
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
    console.log(`✅ Bar Chat risposta ricevuta in ${responseTime}ms`);
    
    // ============ TELEMETRIA STRUTTURATA ============
    const telemetry = {
      conversation_id: conversationId,
      provider: selectedParticipant.type,
      agent_name: selectedParticipant.name,
      latency_ms: responseTime,
      tokens_in: tokenInput,
      tokens_out: tokenOutput,
      mention_detected: mentionDetected,
      economy_mode: useEconomyMode,
      timestamp: new Date().toISOString()
    };
    console.log('📊 TELEMETRY:', JSON.stringify(telemetry));

    // Save AI response to database
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
        sender_type: selectedParticipant.type,
        sender_name: selectedParticipant.name,
        content: aiResponse,
        token_input: tokenInput,
        token_output: tokenOutput,
        tempo_risposta_ms: responseTime
      })
      .select()
      .single();

    if (saveError || !savedMessage) {
      console.error('❌ Errore salvataggio messaggio:', saveError);
      throw new Error('Errore salvataggio messaggio');
    }

    // Update conversation turn index
    await supabaseClient
      .from('chat_laboratory_conversations')
      .update({ 
        last_speaker_index: currentTurnIndex,
        current_turn_index: (currentTurnIndex + 1) % participants.length
      })
      .eq('id', conversationId);

    console.log(`✅ Messaggio salvato (ID: ${savedMessage.id}) e turno aggiornato`);

    // ✅ AUTO-REGENERAZIONE SUMMARY ogni 20 messaggi
    const totalMessages = (messages?.length || 0) + 2; // +2 per user+AI appena salvati
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

    return new Response(
      JSON.stringify({ 
        success: true, 
        content: aiResponse,
        speaker: selectedParticipant.name,
        tokens: { input: tokenInput, output: tokenOutput },
        responseTime,
        messageId: savedMessage.id,
        audioGenerating: voiceEnabled
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
