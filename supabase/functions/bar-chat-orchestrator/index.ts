// Bar Chat Orchestrator con integrazione ElevenLabs TTS
// Versione: 4.0 - Deliverable Support + Streaming + Semantic Routing
// Data: 2025-01-13

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  detectIntent, 
  extractDeliverable, 
  getAdaptiveWordLimit,
  buildDeliverablePrompt 
} from "../_shared/deliverable-utils.ts";

// Helper: Generate message summaries
async function generateMessageSummary(
  content: string,
  type: 'user_friendly' | 'ultra_compressed',
  lovableApiKey: string
): Promise<string> {
  const prompts = {
    user_friendly: `Riassumi questo messaggio in max 60 parole, usando linguaggio naturale e NON tecnico. Focus su aspetti pratici e comprensibili:

${content}

Riassunto user-friendly:`,
    ultra_compressed: `Estrai SOLO i concetti tecnici chiave essenziali da questo messaggio in max 25 parole. Formato: "Problema + Soluzione" o "Concetto chiave":

${content}

Riassunto ultra-compresso:`
  };

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: prompts[type] }
        ],
        temperature: 0.3,
        max_tokens: type === 'user_friendly' ? 100 : 50
      })
    });

    if (!response.ok) {
      throw new Error(`Summary generation failed: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content?.trim() || content.substring(0, type === 'user_friendly' ? 200 : 100);
  } catch (error) {
    console.error(`Error generating ${type} summary:`, error);
    return content.substring(0, type === 'user_friendly' ? 200 : 100) + '...';
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const { conversationId, userMessage, participants, action } = requestBody;
    
    console.log('🍹 Bar Chat Orchestrator v4.0 riceve:', { conversationId, action, userMessage, participants });

    // ✅ Fase 2: Detect deliverable intent
    const intent = detectIntent(userMessage);
    console.log('🎯 Intent detected:', intent);

    // Handle INTERRUPT action
    if (action === 'interrupt') {
      console.log('⛔ Interrupt richiesto per conversazione:', conversationId);
      return new Response(
        JSON.stringify({ interrupted: true, message: 'Interrupt signal received' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normal flow continua...

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch API keys
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    const lovableAIKey = Deno.env.get('LOVABLE_API_KEY');
    
    // ✅ RECUPERA ELEVENLABS DA voice_agent_config (come fa il frontend)
    const { data: voiceConfig, error: voiceError } = await supabase
      .from('voice_agent_config')
      .select('elevenlabs_api_key, enabled')
      .eq('enabled', true)
      .maybeSingle();
    
    const elevenLabsKey = voiceConfig?.elevenlabs_api_key || null;
    
    console.log('🔑 ElevenLabs config recuperata da voice_agent_config:', {
      trovato: !!voiceConfig,
      hasKey: !!elevenLabsKey,
      enabled: voiceConfig?.enabled,
      error: voiceError?.message
    });

    if (!anthropicKey && !openAIKey && !lovableAIKey) {
      throw new Error('Nessuna chiave API AI configurata');
    }

    // Fetch Bar Mode settings
    const { data: barModeSettings } = await supabase
      .from('chat_laboratory_bar_mode')
      .select('*')
      .eq('conversation_id', conversationId)
      .single();

    if (barModeSettings?.mode !== 'bar') {
      throw new Error('Questa funzione è dedicata alla modalità Bar Chat');
    }

    const selectedTopic = barModeSettings.selected_topic;
    const activeKbId = barModeSettings.active_kb_id;
    const voiceEnabled = barModeSettings.voice_enabled || false;
    const interruptRequested = barModeSettings.interrupt_requested || false;
    
    // Carica agenti vocali attivi dalla configurazione globale
    const { data: activeElevenLabsAgents } = await supabase
      .from('elevenlabs_agents')
      .select('*')
      .eq('user_id', barModeSettings.user_id)
      .eq('is_active', true)
      .order('order_index');
    
    console.log('📌 Topic selezionato:', selectedTopic || 'Nessuno');
    console.log('📚 Knowledge Base attiva:', activeKbId || 'Nessuna');
    console.log('🎤 Agenti vocali attivi:', activeElevenLabsAgents?.length || 0);
    console.log('🔍 Debug agenti:', activeElevenLabsAgents?.map(a => ({ 
      id: a.id, 
      name: a.name, 
      voice_id: a.voice_id 
    })));
    console.log('🎤 Voice enabled:', voiceEnabled);
    console.log('⛔ Interrupt requested:', interruptRequested);

    // Se interrupt è stato richiesto, ferma e pulisci flag
    if (interruptRequested) {
      console.log('🛑 Interrupt attivo, annullo generazione');
      await supabase
        .from('chat_laboratory_bar_mode')
        .update({ interrupt_requested: false })
        .eq('conversation_id', conversationId);
      
      return new Response(
        JSON.stringify({ interrupted: true, message: 'Generation interrupted by user' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch conversation data + economy mode settings
    const { data: conversation, error: convError } = await supabase
      .from('chat_laboratory_conversations')
      .select('economy_mode, show_summaries_only, current_turn_index, last_speaker_index')
      .eq('id', conversationId)
      .single();

    if (convError) throw convError;

    const useEconomyMode = conversation?.economy_mode && conversation?.show_summaries_only;
    console.log(`⚙️ Economy Mode: ${useEconomyMode ? 'ATTIVO' : 'Disattivo'}`);

    // Fetch global system prompt
    const { data: systemPrompts } = await supabase
      .from('chat_laboratory_system_prompts')
      .select('contenuto')
      .eq('attivo', true)
      .order('created_at', { ascending: false })
      .limit(1);

    const globalSystemPrompt = systemPrompts?.[0]?.contenuto || 
      "Sei un assistente AI intelligente che partecipa a discussioni costruttive in un bar virtuale.";

    // Fetch BASE sections
    const { data: baseSections } = await supabase
      .from('chat_laboratory_prompt_sections')
      .select('content')
      .eq('section_type', 'BASE')
      .eq('is_active', true)
      .order('order_priority', { ascending: true });

    console.log(`📦 Sezioni BASE: ${baseSections?.length || 0}`);

    // Fetch TOPIC sections
    let topicSections: any[] = [];
    if (selectedTopic) {
      const { data } = await supabase
        .from('chat_laboratory_prompt_sections')
        .select('content')
        .eq('section_type', 'TOPIC')
        .eq('is_active', true)
        .contains('topic_tags', [selectedTopic])
        .order('order_priority', { ascending: true });
      
      topicSections = data || [];
      console.log(`📦 Sezioni TOPIC (${selectedTopic}): ${topicSections.length}`);
    }

    // Fetch conversation messages WITH summaries
    const { data: messages } = await supabase
      .from('chat_laboratory_messages')
      .select('sender_type, sender_name, content, content_summary, is_summary_available')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    const historyMessages = (messages || []).map((msg: any) => {
      let messageContent = msg.content; // Default: completo
      
      // Economy Mode: usa content_summary per AI (SOLO per messaggi AI, non utente)
      if (useEconomyMode && msg.is_summary_available && msg.content_summary && msg.sender_type !== 'user') {
        messageContent = msg.content_summary;
        console.log(`📉 [${msg.sender_name}] usa summary: "${messageContent.substring(0, 40)}..."`);
      }
      
      return {
        role: msg.sender_type === 'user' ? 'user' : 'assistant',
        content: `[${msg.sender_name}]: ${messageContent}`
      };
    });

    // ✅ Sprint 1 P1: Context-Aware Turn-Taking con semantic routing
    const activeParticipants = participants.filter(p => p.is_active);
    const activeCount = activeParticipants.length;

    if (activeCount === 0) {
      throw new Error('❌ Nessun partecipante attivo disponibile per la conversazione');
    }

    console.log(`👥 Partecipanti attivi: ${activeCount}/${participants.length}`);

    // Extract keywords from user message (simple keyword extraction)
    const extractKeywords = (text: string): string[] => {
      const stopWords = new Set(['il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una', 'di', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra', 'a', 'è', 'e', 'o', 'che', 'mi', 'ti', 'si', 'ci', 'vi']);
      return text.toLowerCase()
        .split(/\W+/)
        .filter(word => word.length > 3 && !stopWords.has(word))
        .slice(0, 10); // Top 10 keywords
    };

    const messageKeywords = extractKeywords(userMessage);
    console.log('🔑 Keywords messaggio utente:', messageKeywords);

    // Fetch agent expertise keywords from elevenlabs_agents
    const { data: agentsWithExpertise } = await supabase
      .from('elevenlabs_agents')
      .select('name, expertise_keywords, voice_id')
      .eq('is_active', true);

    console.log('🎯 Agenti con expertise:', agentsWithExpertise?.map(a => ({ name: a.name, keywords: a.expertise_keywords })));

    // Semantic routing: 50% best match, 30% sequential, 20% random
    const routingMethod = Math.random();
    let currentTurnIndex: number;
    let selectedParticipant;

    if (routingMethod < 0.5 && agentsWithExpertise && agentsWithExpertise.length > 0) {
      // 50%: Semantic match basato su expertise keywords
      const agentScores = activeParticipants.map(participant => {
        const matchingAgent = agentsWithExpertise.find(a => 
          a.name?.toLowerCase().includes(participant.name.toLowerCase())
        );
        
        if (!matchingAgent || !matchingAgent.expertise_keywords || matchingAgent.expertise_keywords.length === 0) {
          return { participant, score: 0 };
        }

        // Count keyword matches
        const expertiseKeywords = matchingAgent.expertise_keywords.map(k => k.toLowerCase());
        const matchCount = messageKeywords.filter(mk => 
          expertiseKeywords.some(ek => ek.includes(mk) || mk.includes(ek))
        ).length;

        return { participant, score: matchCount };
      });

      const bestMatch = agentScores.sort((a, b) => b.score - a.score)[0];
      
      if (bestMatch.score > 0) {
        selectedParticipant = bestMatch.participant;
        currentTurnIndex = activeParticipants.indexOf(selectedParticipant);
        console.log(`🎯 Semantic routing: ${selectedParticipant.name} (score: ${bestMatch.score})`);
      } else {
        // No match, fallback to sequential
        const lastSpeakerIndex = conversation.last_speaker_index || 0;
        currentTurnIndex = (lastSpeakerIndex + 1) % activeCount;
        selectedParticipant = activeParticipants[currentTurnIndex];
        console.log(`➡️ Semantic routing fallback (no match): ${selectedParticipant.name}`);
      }
    } else if (routingMethod < 0.8) {
      // 30%: Sequential
      const lastSpeakerIndex = conversation.last_speaker_index || 0;
      currentTurnIndex = (lastSpeakerIndex + 1) % activeCount;
      selectedParticipant = activeParticipants[currentTurnIndex];
      console.log(`➡️ Sequential routing: ${selectedParticipant.name} (indice ${currentTurnIndex})`);
    } else {
      // 20%: Random
      currentTurnIndex = Math.floor(Math.random() * activeCount);
      selectedParticipant = activeParticipants[currentTurnIndex];
      console.log(`🎲 Random routing: ${selectedParticipant.name} (indice ${currentTurnIndex})`);
    }

    console.log('✅ Agente selezionato:', selectedParticipant.name);

    // Fetch AGENT_PERSONALITY sections
    const { data: agentPersonalitySections } = await supabase
      .from('chat_laboratory_prompt_sections')
      .select('content')
      .eq('section_type', 'AGENT_PERSONALITY')
      .eq('is_active', true)
      .ilike('section_name', `%${selectedParticipant.name}%`)
      .order('order_priority', { ascending: true });

    console.log(`👤 Sezioni AGENT_PERSONALITY: ${agentPersonalitySections?.length || 0}`);

    // Fallback su elevenlabs_agents.text_generation_prompt
    let agentTextPrompt = '';
    let elevenLabsVoiceId = '';
    
    if (activeElevenLabsAgents && activeElevenLabsAgents.length > 0) {
      // activeElevenLabsAgents è già un array di oggetti completi
      for (const agent of activeElevenLabsAgents) {
        if (agent.name?.toLowerCase().includes(selectedParticipant.name.toLowerCase())) {
          agentTextPrompt = agent.text_generation_prompt || '';
          elevenLabsVoiceId = agent.voice_id || '';
          console.log(`🎤 Agent match trovato: "${agent.name}", voice_id: ${elevenLabsVoiceId}`);
          break;
        }
      }
      
      // Fallback: se non trova match, usa primo agente
      if (!elevenLabsVoiceId && activeElevenLabsAgents.length > 0) {
        const firstAgent = activeElevenLabsAgents[0];
        elevenLabsVoiceId = firstAgent.voice_id || '';
        agentTextPrompt = firstAgent.text_generation_prompt || '';
        console.log(`⚠️ Nessun match trovato, uso primo agente: "${firstAgent.name}"`);
      }
    }

    // Log di debug CRITICO
    if (!elevenLabsVoiceId) {
      console.error('❌ CRITICO: elevenLabsVoiceId vuoto! Nessun audio verrà generato');
      console.error('Agenti disponibili:', activeElevenLabsAgents?.map(a => ({ 
        name: a.name, 
        voice_id: a.voice_id 
      })));
    } else {
      console.log('✅ Voice ID configurato:', elevenLabsVoiceId);
    }

    // Compose system prompt
    let composedPrompt = globalSystemPrompt + '\n\n';
    
    if (baseSections && baseSections.length > 0) {
      composedPrompt += '=== CONTESTO BASE ===\n';
      composedPrompt += baseSections.map(s => s.content).join('\n\n') + '\n\n';
    }

    if (agentPersonalitySections && agentPersonalitySections.length > 0) {
      composedPrompt += '=== TUA PERSONALITÀ ===\n';
      composedPrompt += agentPersonalitySections.map(s => s.content).join('\n\n') + '\n\n';
    } else if (agentTextPrompt) {
      composedPrompt += '=== TUA PERSONALITÀ ===\n';
      composedPrompt += agentTextPrompt + '\n\n';
    }

    if (topicSections.length > 0) {
      composedPrompt += `=== FOCUS TOPIC: ${selectedTopic} ===\n`;
      composedPrompt += topicSections.map(s => s.content).join('\n\n') + '\n\n';
    }

    // ✅ Fase 2: Adaptive word limit based on intent and agent
    const adaptiveLimit = getAdaptiveWordLimit(selectedParticipant.name, intent, 120);
    console.log(`📏 Adaptive limit: ${adaptiveLimit} parole (base: 120, agent: ${selectedParticipant.name}, depth: ${intent.depth})`);

    // ✅ Moderazione lunghezza interventi (prompt engineering comportamentale)
    composedPrompt += `
=== STILE CONVERSAZIONE ===
🍺 Sei al bar con colleghi esperti, non in aula universitaria.
- Interventi rapidi e diretti: concetto chiave → esempio concreto → passa la palla
- Se qualcuno monopolizza, gli altri si annoiano e cambiano discorso
- Evita paragrafi lunghi: nessuno legge saggi al bar
- Pensa "caffè veloce" non "conferenza TED"
- MAX ${adaptiveLimit} parole per intervento${intent.depth === 'deep' ? ' (eccetto deliverable strutturati)' : ''}

✅ Buon intervento: "Per la logistica, suggerisco hub regionali. Esempio: Milano-Roma riduce costi 30%. Vittorio, tu come gestiresti i picchi?"
❌ Male: *tre paragrafi su supply chain theory con citazioni accademiche*
\n\n`;

    // ✅ Fase 2: Inject deliverable prompt if requested
    if (intent.deliverableType) {
      composedPrompt += buildDeliverablePrompt(intent);
    }

    console.log('📝 Prompt composto (primi 200 char):', composedPrompt.substring(0, 200) + '...');

    // Prepare conversation history
    const conversationHistory = [
      { role: 'system', content: composedPrompt },
      ...historyMessages,
      { role: 'user', content: userMessage }
    ];

    // ✅ Sprint 1 P0: AI Response Streaming with SSE
    const encoder = new TextEncoder();
    
    // Create message record first with is_streaming=true
    const { data: streamingMessage, error: messageError } = await supabase
      .from('chat_laboratory_messages')
      .insert({
        conversation_id: conversationId,
        sender_type: selectedParticipant.type,
        sender_name: selectedParticipant.name,
        content: '',
        is_streaming: true,
        message_sequence: (conversation.current_turn_index || 0) + 1
      })
      .select()
      .single();

    if (messageError) {
      console.error('❌ Errore creazione messaggio streaming:', messageError);
      throw messageError;
    }

    const messageId = streamingMessage.id;
    console.log('📝 Messaggio streaming creato:', messageId);

    // Stream AI response based on provider
    let aiResponse = '';
    let tokenInput = 0;
    let tokenOutput = 0;
    const startTime = Date.now();

    if (selectedParticipant.type === 'anthropic' && anthropicKey) {
      console.log('🤖 Streaming from Anthropic...');
      const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 8096,
          messages: conversationHistory.filter(m => m.role !== 'system'),
          system: composedPrompt,
          stream: true
        })
      });

      if (!anthropicResponse.ok) {
        const errorText = await anthropicResponse.text();
        console.error('Anthropic error:', errorText);
        throw new Error(`Anthropic API error: ${anthropicResponse.statusText}`);
      }

      const reader = anthropicResponse.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim() !== '');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                
                if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                  aiResponse += parsed.delta.text;
                  
                  // Update DB every 50 characters for real-time display
                  if (aiResponse.length % 50 === 0) {
                    await supabase
                      .from('chat_laboratory_messages')
                      .update({ content: aiResponse })
                      .eq('id', messageId);
                  }
                } else if (parsed.type === 'message_delta' && parsed.usage) {
                  tokenOutput = parsed.usage.output_tokens || 0;
                }
              } catch (e) {
                // Skip malformed JSON
              }
            }
          }
        }
      }
    } 
    else if (selectedParticipant.type === 'openai' && openAIKey) {
      console.log('🤖 Streaming from OpenAI...');
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openAIKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: conversationHistory,
          max_tokens: 4096,
          stream: true
        })
      });

      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text();
        console.error('OpenAI error:', errorText);
        throw new Error(`OpenAI API error: ${openaiResponse.statusText}`);
      }

      const reader = openaiResponse.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim() !== '');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                
                if (content) {
                  aiResponse += content;
                  
                  // Update DB every 50 characters
                  if (aiResponse.length % 50 === 0) {
                    await supabase
                      .from('chat_laboratory_messages')
                      .update({ content: aiResponse })
                      .eq('id', messageId);
                  }
                }
              } catch (e) {
                // Skip malformed JSON
              }
            }
          }
        }
      }
    }
    else if (lovableAIKey) {
      console.log('🤖 Streaming from Lovable AI...');
      const lovableResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${lovableAIKey}`
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: conversationHistory,
          stream: true
        })
      });

      if (!lovableResponse.ok) {
        const errorText = await lovableResponse.text();
        console.error('Lovable AI error:', errorText);
        throw new Error(`Lovable AI error: ${lovableResponse.statusText}`);
      }

      const reader = lovableResponse.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim() !== '');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                
                if (content) {
                  aiResponse += content;
                  
                  // Update DB every 50 characters
                  if (aiResponse.length % 50 === 0) {
                    await supabase
                      .from('chat_laboratory_messages')
                      .update({ content: aiResponse })
                      .eq('id', messageId);
                  }
                }
              } catch (e) {
                // Skip malformed JSON
              }
            }
          }
        }
      }
    }
    else {
      throw new Error(`No API key available for ${selectedParticipant.type}`);
    }

    const responseTime = Date.now() - startTime;
    console.log(`✅ Risposta AI ricevuta in ${responseTime}ms`);

    // ✅ AI Cost Tracking: Calculate and save costs
    const modelUsed = selectedParticipant.type === 'anthropic' ? 'claude-sonnet-4-5' 
                    : selectedParticipant.type === 'openai' ? 'gpt-4o'
                    : 'google/gemini-2.5-flash';
    
    const costRates: Record<string, { input: number; output: number }> = {
      'claude-sonnet-4-5': { input: 3.00 / 1_000_000, output: 15.00 / 1_000_000 },
      'gpt-4o': { input: 2.50 / 1_000_000, output: 10.00 / 1_000_000 },
      'google/gemini-2.5-flash': { input: 0, output: 0 } // Free until Oct 13
    };
    
    const rate = costRates[modelUsed] || { input: 0, output: 0 };
    const costInputEur = tokenInput * rate.input * 1.1; // USD → EUR (~1.1)
    const costOutputEur = tokenOutput * rate.output * 1.1;
    const costTotalEur = costInputEur + costOutputEur;
    
    console.log(`💰 Cost tracking: ${tokenInput} in + ${tokenOutput} out = €${costTotalEur.toFixed(6)}`);
    
    // Save to ai_cost_tracking (cost_total_eur is auto-calculated by DB)
    const { error: costError } = await supabase
      .from('ai_cost_tracking')
      .insert({
        lab_conversation_id: conversationId,
        provider: selectedParticipant.type,
        model: modelUsed,
        operation_type: 'chat_completion',
        input_tokens: tokenInput,
        output_tokens: tokenOutput,
        cost_input_eur: costInputEur,
        cost_output_eur: costOutputEur
      });
    
    if (costError) {
      console.error('⚠️ Cost tracking failed:', costError);
    } else {
      console.log('✅ Cost tracked successfully');
    }

    // ✅ Fase 2: Extract deliverable if present
    const deliverable = extractDeliverable(aiResponse);
    let deliverableId: string | null = null;
    
    if (deliverable) {
      console.log('📦 Deliverable detected:', deliverable.type, deliverable.format);
      
      // Trigger async deliverable generation (fire-and-forget)
      const deliverablePromise = fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-deliverable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({
          messageId,
          type: deliverable.type,
          format: deliverable.format,
          title: deliverable.title,
          content: deliverable.content,
          metadata: deliverable.metadata
        })
      }).catch(e => console.error('Deliverable generation failed:', e));
      
      console.log('🚀 Deliverable generation triggered asynchronously');
    }

    // ✅ Soft truncation fallback: solo per risposte NON-deliverable eccessive (>adaptive limit)
    const wordCount = aiResponse.trim().split(/\s+/).length;
    console.log(`📊 Risposta: ${wordCount} parole (limit: ${adaptiveLimit})`);

    // Skip truncation if deliverable detected (already structured)
    if (!deliverable && wordCount > adaptiveLimit) {
      console.warn(`⚠️ ${selectedParticipant.name}: ${wordCount} parole, troncamento a frase completa`);
      
      const sentences = aiResponse.match(/[^.!?]+[.!?]+/g) || [];
      let truncated = '';
      let currentWords = 0;
      
      for (const sentence of sentences) {
        const sentenceWords = sentence.trim().split(/\s+/).length;
        if (currentWords + sentenceWords <= adaptiveLimit - 10) {
          truncated += sentence;
          currentWords += sentenceWords;
        } else {
          break;
        }
      }
      
      if (truncated.length > 0) {
        aiResponse = truncated.trim();
        console.log(`✂️ Troncato a ${currentWords} parole (preservando coerenza)`);
      }
    } else if (deliverable) {
      // For deliverable responses, use only TL;DR for display (full content in file)
      aiResponse = `${deliverable.tldr}\n\n📄 Ho generato un **${deliverable.type}** completo. Scaricalo dal pulsante qui sotto.`;
      console.log('📝 Response sostituita con TL;DR per deliverable');
    }

    const senderTypeMap: Record<string, string> = {
      'anthropic': 'claude',
      'openai': 'chatgpt', 
      'lovable': 'gemini',
      'human': 'human'
    };
    const dbSenderType = senderTypeMap[selectedParticipant.type] || selectedParticipant.type;

    // ✅ Final update: Mark streaming as complete
    const { error: finalUpdateError } = await supabase
      .from('chat_laboratory_messages')
      .update({
        content: aiResponse,
        is_streaming: false,
        token_input: tokenInput,
        token_output: tokenOutput,
        tempo_risposta_ms: responseTime,
        content_user_friendly: null,  // Will be populated in background
        content_summary: null,         // Will be populated in background
        is_summary_available: false
      })
      .eq('id', messageId);

    if (finalUpdateError) {
      console.error('❌ Errore aggiornamento finale messaggio:', finalUpdateError);
    }

    console.log('✅ Messaggio streaming completato, ID:', messageId);

    // 🚀 NON-BLOCKING: Genera summaries in background
    supabase.functions.invoke('generate-message-summaries', {
      body: { 
        messageId: messageId, 
        content: aiResponse,
        conversationId,
        table: 'chat_laboratory_messages'
      }
    }).then(() => {
      console.log('🔄 Background summary generation triggered');
    }).catch((err) => {
      console.error('⚠️ Background summary generation failed:', err);
    });

    // ✅ Update conversation turn index with optimistic lock (CAS)
    const expectedPreviousTurnIndex = conversation?.current_turn_index ?? 0;
    const nextTurnIndex = (currentTurnIndex + 1) % activeAICount;
    
    let retryCount = 0;
    let updateSuccess = false;
    
    while (retryCount < 3 && !updateSuccess) {
      const { data: updated, error: updateError } = await supabase
        .from('chat_laboratory_conversations')
        .update({ 
          current_turn_index: nextTurnIndex,
          last_speaker_index: currentTurnIndex,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)
        .eq('current_turn_index', expectedPreviousTurnIndex) // Optimistic lock
        .select('current_turn_index')
        .maybeSingle();
      
      if (updated && !updateError) {
        updateSuccess = true;
        console.log(`✅ Turn index updated: ${expectedPreviousTurnIndex} → ${nextTurnIndex}`);
      } else {
        retryCount++;
        console.warn(`⚠️ Concurrent update detected (attempt ${retryCount}/3), retrying...`);
        
        // Exponential backoff: 50ms, 100ms, 200ms
        await new Promise(resolve => setTimeout(resolve, 50 * Math.pow(2, retryCount - 1)));
        
        // Re-fetch current turn index for next attempt
        const { data: freshConv } = await supabase
          .from('chat_laboratory_conversations')
          .select('current_turn_index')
          .eq('id', conversationId)
          .single();
        
        if (freshConv) {
          // Recalculate based on fresh data
          const freshExpected = freshConv.current_turn_index;
          const freshNext = (freshExpected + 1) % activeAICount;
          // Note: For simplicity, we keep currentTurnIndex as the speaker for this message
          // but update the next turn based on fresh data
        }
      }
    }
    
    if (!updateSuccess) {
      console.error('❌ Failed to update turn index after 3 attempts');
      // Continue anyway - the message was saved, just the turn tracking might be slightly off
    }

    // ✅ Determina se generare audio (delegato al frontend)
    const shouldGenerateAudio = voiceEnabled && elevenLabsKey && elevenLabsVoiceId;

    if (!shouldGenerateAudio) {
      if (!voiceEnabled) {
        console.log('🔇 Voice non abilitato per questa conversazione');
      } else if (!elevenLabsKey) {
        console.log('⚠️ ElevenLabs API key mancante - audio non generato');
      } else {
        console.log('⚠️ Voice ID mancante - audio non generato');
      }
    }

    // ✅ Restituisci risposta immediata con messageId per real-time tracking
    return new Response(
      JSON.stringify({ 
        success: true,
        participant: selectedParticipant.name,
        messageId: messageId, // ⚡ Frontend tracks questo per real-time updates
        audioGenerating: shouldGenerateAudio,
        tokens: { input: tokenInput, output: tokenOutput },
        responseTime: responseTime
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Bar Chat Orchestrator error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
