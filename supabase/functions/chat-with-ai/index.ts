import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

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

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to check if query is CRM-related
function isCRMRelatedQuery(prompt: string, systemPrompt?: string): boolean {
  if (!prompt) return false;
  const crmKeywords = ['crm', 'contatt', 'campagn', 'attivit', 'email', 'cliente', 'lead', 'rubrica', 'quanti', 'lista', 'statistiche'];
  const lowerPrompt = (prompt + ' ' + (systemPrompt || '')).toLowerCase();
  return crmKeywords.some(keyword => lowerPrompt.includes(keyword));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, systemPrompt, conversationId, images, configId } = await req.json();
    const startTime = Date.now();

    if (!prompt && (!images || images.length === 0)) {
      throw new Error('Prompt o immagini richiesti');
    }

    // Get AI configuration - either specific config or active one
    let aiConfig;
    if (configId) {
      const { data, error } = await supabase
        .from('config_ai')
        .select('*')
        .eq('id', configId)
        .single();
      
      if (error) throw new Error('Configurazione AI non trovata');
      aiConfig = data;
    } else {
      const { data, error } = await supabase
        .from('config_ai')
        .select('*')
        .eq('attivo', true)
        .single();
      
      if (error) throw new Error('Nessuna configurazione AI attiva');
      aiConfig = data;
    }

    console.log(`[AI CONFIG] Using ${aiConfig.provider} - ${aiConfig.modello}`);

    // Get memory configuration
    const { data: memoryConfig } = await supabase
      .from('config_generale')
      .select('memoria_messaggi, memoria_ore, usa_riassunto, max_token_conversazione')
      .single();

    const config = {
      memoria_messaggi: memoryConfig?.memoria_messaggi || 10,
      memoria_ore: memoryConfig?.memoria_ore || 2,
      usa_riassunto: memoryConfig?.usa_riassunto || false,
      max_token_conversazione: memoryConfig?.max_token_conversazione || 4000
    };

    // Check if conversation has full memory enabled
    let useFullMemory = false;
    let useEconomyMode = true; // Default economy mode
    
    if (conversationId) {
      const { data: convData } = await supabase
        .from('chat_conversations')
        .select('memoria_completa, economy_mode')
        .eq('id', conversationId)
        .single();
      
      useFullMemory = convData?.memoria_completa || false;
      useEconomyMode = convData?.economy_mode ?? true;
    }

    // Build message history
    let messages = [
      { 
        role: 'system', 
        content: systemPrompt || 'Sei un assistente AI professionale che risponde SEMPRE in italiano in modo chiaro, preciso e utile. Non lasciare mai risposte vuote. Se non hai informazioni sufficienti, chiedi chiarimenti all\'utente.' 
      }
    ];

    if (conversationId) {
      if (useFullMemory) {
        const { data: allMessages } = await supabase
          .from('chat_messages')
          .select('role, content, content_summary, is_summary_available')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (allMessages) {
          messages.push(...allMessages.map(msg => {
            let msgContent = msg.content;
            
            // Use ultra-compressed summary for AI messages in economy mode
            if (msg.role === 'assistant' && useEconomyMode && msg.is_summary_available && msg.content_summary) {
              msgContent = msg.content_summary;
            }
            
            return {
              role: msg.role as 'user' | 'assistant',
              content: msgContent
            };
          }));
        }
      } else {
        const timeLimit = new Date(Date.now() - config.memoria_ore * 60 * 60 * 1000);
        
        const { data: recentMessages } = await supabase
          .from('chat_messages')
          .select('role, content, content_summary, is_summary_available, created_at')
          .eq('conversation_id', conversationId)
          .gte('created_at', timeLimit.toISOString())
          .order('created_at', { ascending: false })
          .limit(config.memoria_messaggi);

        if (recentMessages && recentMessages.length > 0) {
          const chronologicalMessages = recentMessages.reverse();
          
          if (config.usa_riassunto && recentMessages.length === config.memoria_messaggi) {
            const { data: olderMessages } = await supabase
              .from('chat_messages')
              .select('content')
              .eq('conversation_id', conversationId)
              .lt('created_at', chronologicalMessages[0].created_at)
              .order('created_at', { ascending: true });

            if (olderMessages && olderMessages.length > 0) {
              const summaryContent = `[Riassunto messaggi precedenti: ${olderMessages.length} messaggi scambiati precedentemente in questa conversazione]`;
              messages.push({ role: 'system', content: summaryContent });
            }
          }

          messages.push(...chronologicalMessages.map(msg => {
            let msgContent = msg.content;
            
            // Use ultra-compressed summary for AI messages in economy mode
            if (msg.role === 'assistant' && useEconomyMode && msg.is_summary_available && msg.content_summary) {
              msgContent = msg.content_summary;
            }
            
            return {
              role: msg.role as 'user' | 'assistant',
              content: msgContent
            };
          }));
        }
      }
    }

    // Build user message with optional images
    const userMessage: any = { role: 'user' };
    
    if (images && images.length > 0) {
      userMessage.content = [
        { type: 'text', text: prompt || 'Analizza queste immagini' },
        ...images.map((img: string) => ({
          type: 'image_url',
          image_url: { url: img }
        }))
      ];
    } else {
      userMessage.content = prompt;
    }

    messages.push(userMessage);

    console.log(`[MEMORY] Using ${useFullMemory ? 'FULL' : 'LIMITED'} memory. Total messages: ${messages.length}`);

    // CRM Tools definition
    const requiresCRMTools = isCRMRelatedQuery(prompt, systemPrompt);
    const tools = [
      {
        type: "function",
        function: {
          name: "count_records",
          description: "Conta i record in una tabella del CRM con filtri opzionali",
          parameters: {
            type: "object",
            properties: {
              table: {
                type: "string",
                enum: ["rubrica", "campagne", "attivita", "email_messages", "imported_contacts"],
                description: "Nome della tabella"
              },
              filters: { type: "object", description: "Filtri opzionali (es: {stato: 'aperta'})" }
            },
            required: ["table"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_table_data",
          description: "Ottieni dati da una tabella del CRM con filtri, ordinamento e limite",
          parameters: {
            type: "object",
            properties: {
              table: {
                type: "string",
                enum: ["rubrica", "campagne", "attivita", "email_messages", "imported_contacts"],
                description: "Nome della tabella"
              },
              columns: { type: "string", description: "Colonne da selezionare (default: '*')" },
              filters: { type: "object", description: "Filtri opzionali (es: {stato: 'aperta'})" },
              order_by: { 
                type: "object", 
                description: "Ordinamento (es: {column: 'created_at', ascending: false})",
                properties: {
                  column: { type: "string" },
                  ascending: { type: "boolean" }
                }
              },
              limit: { type: "number", description: "Numero massimo risultati (default: 10)" }
            },
            required: ["table"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_statistics",
          description: "Ottieni statistiche generali complete del CRM (contatti, campagne, attività, email)",
          parameters: { type: "object", properties: {} }
        }
      },
      {
        type: "function",
        function: {
          name: "search_contacts",
          description: "Cerca contatti specifici per nome, azienda o email",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string", description: "Termine di ricerca" },
              limit: { type: "number", description: "Numero massimo risultati (default: 10)" }
            },
            required: ["query"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_campaign_status",
          description: "Ottieni informazioni sulle campagne (tutte o una specifica)",
          parameters: {
            type: "object",
            properties: {
              campaign_id: { type: "string", description: "ID campagna specifica (opzionale)" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_activities",
          description: "Ottieni lista delle attività filtrate per stato, priorità o assegnatario",
          parameters: {
            type: "object",
            properties: {
              status: { type: "string", description: "Filtra per stato (aperta, in_corso, completata)" },
              priority: { type: "string", description: "Filtra per priorità (bassa, media, alta)" },
              assignee: { type: "string", description: "Filtra per assegnatario (UUID utente)" },
              limit: { type: "number", description: "Numero massimo risultati (default: 10)" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "insert_activity",
          description: "Crea una nuova attività nel CRM",
          parameters: {
            type: "object",
            properties: {
              titolo: { type: "string", description: "Titolo dell'attività" },
              tipo: { type: "string", description: "Tipo attività: chiamata, email, meeting, task, follow_up" },
              descrizione: { type: "string", description: "Descrizione dettagliata" },
              priorita: { type: "string", description: "Priorità: bassa, media, alta, urgente (default: media)" },
              stato: { type: "string", description: "Stato: aperta, in_corso, completata (default: aperta)" },
              scadenza: { type: "string", description: "Data scadenza in formato ISO (es: 2025-10-15T10:00:00Z)" },
              rubrica_id: { type: "string", description: "UUID del contatto collegato (opzionale)" },
              note: { type: "string", description: "Note aggiuntive (opzionale)" }
            },
            required: ["titolo"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "update_record",
          description: "Aggiorna un record esistente in qualsiasi tabella del CRM",
          parameters: {
            type: "object",
            properties: {
              table: { 
                type: "string", 
                enum: ["rubrica", "campagne", "attivita", "email_messages"],
                description: "Nome della tabella da aggiornare" 
              },
              id: { type: "string", description: "UUID del record da aggiornare" },
              updates: { 
                type: "object", 
                description: "Oggetto con i campi da aggiornare (es: {stato: 'completata', note: 'Fatto'})" 
              }
            },
            required: ["table", "id", "updates"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "insert_contact",
          description: "Aggiunge un nuovo contatto nella rubrica CRM",
          parameters: {
            type: "object",
            properties: {
              nome: { type: "string", description: "Nome del contatto" },
              responsabile: { type: "string", description: "Nome del responsabile" },
              azienda: { type: "string", description: "Nome azienda" },
              email: { type: "string", description: "Indirizzo email" },
              telefono: { type: "string", description: "Numero di telefono" },
              cellulare: { type: "string", description: "Numero cellulare" },
              indirizzo: { type: "string", description: "Indirizzo completo" },
              citta: { type: "string", description: "Città" },
              paese: { type: "string", description: "Paese" },
              zip_code: { type: "string", description: "CAP" },
              note: { type: "string", description: "Note sul contatto" },
              stato: { type: "string", description: "Stato (A=Attivo, default: A)" }
            },
            required: []
          }
        }
      }
    ];

    // Configure API endpoint based on provider
    let apiUrl: string;
    let requestHeaders: any;
    let requestBody: any;

    if (aiConfig.provider === 'openai' || aiConfig.provider === 'chatgpt') {
      apiUrl = 'https://api.openai.com/v1/chat/completions';
      requestHeaders = {
        'Authorization': `Bearer ${aiConfig.api_key}`,
        'Content-Type': 'application/json',
      };
      
      // GPT-5 e modelli più recenti richiedono max_completion_tokens invece di max_tokens
      const isGPT5OrNewer = aiConfig.modello.includes('gpt-5') || 
                            aiConfig.modello.includes('o3') || 
                            aiConfig.modello.includes('o4') ||
                            aiConfig.modello.includes('gpt-4.1');
      
      requestBody = {
        model: aiConfig.modello,
        messages: messages,
        ...(isGPT5OrNewer ? { max_completion_tokens: 4096 } : { max_tokens: 4096 }),
        ...(requiresCRMTools && { tools, tool_choice: "auto" })
      };
    } else if (aiConfig.provider === 'anthropic' || aiConfig.provider === 'claude') {
      apiUrl = 'https://api.anthropic.com/v1/messages';
      requestHeaders = {
        'x-api-key': aiConfig.api_key,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      };
      requestBody = {
        model: aiConfig.modello,
        max_tokens: 1000,
        messages: messages.filter(m => m.role !== 'system'),
        system: systemPrompt || 'Sei un assistente AI utile e amichevole che risponde in italiano.',
        ...(requiresCRMTools && {
          tools: tools.map(t => ({
            name: t.function.name,
            description: t.function.description,
            input_schema: t.function.parameters
          }))
        })
      };
    } else if (aiConfig.provider === 'google' || aiConfig.provider === 'gemini') {
      apiUrl = 'https://ai.gateway.lovable.dev/v1/chat/completions';
      requestHeaders = {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      };
      requestBody = {
        model: `google/${aiConfig.modello}`,
        messages: messages,
        max_tokens: 1000,
        ...(requiresCRMTools && { tools, tool_choice: "auto" })
      };
    } else {
      throw new Error(`Provider ${aiConfig.provider} non supportato`);
    }

    console.log(`[API CALL] ${apiUrl} - Model: ${aiConfig.modello}`);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('API Error:', errorData);
      throw new Error(`Errore API: ${errorData.error?.message || 'Errore sconosciuto'}`);
    }

    const data = await response.json();
    console.log('[DEBUG] Full API Response:', JSON.stringify(data, null, 2));
    
    // Handle response based on provider
    let aiResponse: string;
    let choice: any;
    
    if (aiConfig.provider === 'anthropic' || aiConfig.provider === 'claude') {
      aiResponse = data.content?.[0]?.text || '';
      choice = { message: { tool_calls: data.content?.filter((c: any) => c.type === 'tool_use') } };
    } else {
      choice = data.choices?.[0];
      if (!choice) {
        console.error('[ERROR] No choices in API response');
        throw new Error('Risposta API vuota o malformata');
      }
      
      aiResponse = choice.message?.content || '';
      console.log('[DEBUG] AI Response extracted:', aiResponse);
      console.log('[DEBUG] Finish reason:', choice.finish_reason);
      
      // Se la risposta è vuota, logga il motivo
      if (!aiResponse && choice.finish_reason) {
        console.log('[WARNING] Empty response, finish_reason:', choice.finish_reason);
      }
      
      // Gestione refusal per GPT-5 e modelli più recenti
      if (!aiResponse && choice.message?.refusal) {
        console.log('[WARNING] Request refused:', choice.message.refusal);
        aiResponse = `Mi dispiace, non posso rispondere a questa richiesta: ${choice.message.refusal}`;
      }
    }
    
    // Validazione finale
    if (!aiResponse || aiResponse.trim() === '') {
      console.error('[ERROR] Empty AI response after extraction');
      aiResponse = 'Mi dispiace, si è verificato un errore nel generare la risposta. Per favore riprova o riformula la domanda.';
    }
    
    // Handle tool calls
    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      const toolResults = [];
      
      for (const toolCall of choice.message.tool_calls) {
        try {
          console.log(`Calling tool: ${toolCall.function.name}`);
          
          const toolResponse = await fetch(`${supabaseUrl}/functions/v1/crm-tools`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              tool_name: toolCall.function.name,
              parameters: JSON.parse(toolCall.function.arguments)
            })
          });
          
          const toolData = await toolResponse.json();
          toolResults.push({
            tool_call_id: toolCall.id,
            role: "tool",
            name: toolCall.function.name,
            content: JSON.stringify(toolData.data)
          });
        } catch (error) {
          console.error(`Tool error ${toolCall.function.name}:`, error);
          toolResults.push({
            tool_call_id: toolCall.id,
            role: "tool", 
            name: toolCall.function.name,
            content: JSON.stringify({ error: "Errore esecuzione strumento" })
          });
        }
      }
      
      // Second call with tool results
      const followUpMessages = [...messages, choice.message, ...toolResults];
      
      // Usa gli stessi parametri del primo call per compatibilità
      const isGPT5OrNewer = aiConfig.modello.includes('gpt-5') || 
                            aiConfig.modello.includes('o3') || 
                            aiConfig.modello.includes('o4') ||
                            aiConfig.modello.includes('gpt-4.1');
      
      const followUpResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify({
          model: aiConfig.modello,
          messages: followUpMessages,
          ...(isGPT5OrNewer ? { max_completion_tokens: 2000 } : { max_tokens: 2000 }),
        }),
      });
      
      if (followUpResponse.ok) {
        const followUpData = await followUpResponse.json();
        console.log('[DEBUG] Follow-up response:', JSON.stringify(followUpData, null, 2));
        
        if (aiConfig.provider === 'anthropic' || aiConfig.provider === 'claude') {
          aiResponse = followUpData.content?.[0]?.text || '';
        } else {
          aiResponse = followUpData.choices?.[0]?.message?.content || '';
        }
        
        // Validazione risposta follow-up
        if (!aiResponse || aiResponse.trim() === '') {
          console.error('[ERROR] Empty follow-up response');
          aiResponse = 'Errore durante l\'elaborazione della risposta con gli strumenti CRM. Riprova.';
        }
      }
    }
    
    const tokensUsed = data.usage?.total_tokens || 0;
    const tokensInput = data.usage?.prompt_tokens || 0;
    const tokensOutput = data.usage?.completion_tokens || 0;
    const responseTime = Date.now() - startTime;

    // Generate summaries for AI response
    console.log('Generating message summaries...');
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    
    const [userFriendlySummary, ultraCompressedSummary] = await Promise.all([
      generateMessageSummary(aiResponse, 'user_friendly', lovableKey!),
      generateMessageSummary(aiResponse, 'ultra_compressed', lovableKey!)
    ]);

    // Save messages to database
    if (conversationId) {
      try {
        await supabase
          .from('chat_messages')
          .insert({
            conversation_id: conversationId,
            role: 'user',
            content: prompt
          });

        await supabase
          .from('chat_messages')
          .insert({
            conversation_id: conversationId,
            role: 'assistant',
            content: aiResponse || '[Errore: risposta vuota dal modello AI]',
            content_user_friendly: userFriendlySummary,
            content_summary: ultraCompressedSummary,
            is_summary_available: true
          });

        // Update conversation updated_at
        await supabase
          .from('chat_conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', conversationId);
      } catch (error) {
        console.error('Error saving messages:', error);
      }
    }

    // Track usage statistics
    try {
      await supabase
        .from('chat_usage_stats')
        .insert({
          conversation_id: conversationId,
          model_used: aiConfig.modello,
          provider_used: aiConfig.provider,
          tokens_input: tokensInput,
          tokens_output: tokensOutput,
          tokens_total: tokensUsed,
          response_time_ms: responseTime,
        });
    } catch (error) {
      console.error('Error saving usage stats:', error);
    }

    return new Response(
      JSON.stringify({
        response: aiResponse,
        usage: {
          total_tokens: tokensUsed,
          prompt_tokens: tokensInput,
          completion_tokens: tokensOutput
        },
        responseTime
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Error in chat-with-ai function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
