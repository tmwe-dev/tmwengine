import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, systemPrompt, conversationId } = await req.json();
    const startTime = Date.now();

    if (!prompt) {
      throw new Error('Prompt è richiesto');
    }

    // Get AI configuration
    const { data: aiConfig, error: configError } = await supabase
      .from('config_ai')
      .select('*')
      .eq('provider', 'chatgpt')
      .single();

    if (configError || !aiConfig) {
      throw new Error('Configurazione AI non trovata');
    }

    // Get memory configuration
    const { data: memoryConfig, error: memoryError } = await supabase
      .from('config_generale')
      .select('memoria_messaggi, memoria_ore, usa_riassunto, max_token_conversazione')
      .single();

    if (memoryError) {
      console.error('Errore configurazione memoria:', memoryError);
    }

    const config = {
      memoria_messaggi: memoryConfig?.memoria_messaggi || 10,
      memoria_ore: memoryConfig?.memoria_ore || 2,
      usa_riassunto: memoryConfig?.usa_riassunto || false,
      max_token_conversazione: memoryConfig?.max_token_conversazione || 4000
    };

    // Check if conversation has full memory enabled
    let useFullMemory = false;
    if (conversationId) {
      const { data: convData } = await supabase
        .from('chat_conversations')
        .select('memoria_completa')
        .eq('id', conversationId)
        .single();
      
      useFullMemory = convData?.memoria_completa || false;
    }

    // Build message history
    let messages = [
      { role: 'system', content: systemPrompt || 'Sei un assistente AI utile e amichevole che risponde in italiano.' }
    ];

    if (conversationId) {
      if (useFullMemory) {
        // Full memory: get all messages
        const { data: allMessages } = await supabase
          .from('chat_messages')
          .select('role, content')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (allMessages) {
          messages.push(...allMessages.map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content
          })));
        }
      } else {
        // Limited memory: get recent messages within time window
        const timeLimit = new Date(Date.now() - config.memoria_ore * 60 * 60 * 1000);
        
        const { data: recentMessages } = await supabase
          .from('chat_messages')
          .select('role, content, created_at')
          .eq('conversation_id', conversationId)
          .gte('created_at', timeLimit.toISOString())
          .order('created_at', { ascending: false })
          .limit(config.memoria_messaggi);

        if (recentMessages && recentMessages.length > 0) {
          // Reverse to get chronological order
          const chronologicalMessages = recentMessages.reverse();
          
          if (config.usa_riassunto && recentMessages.length === config.memoria_messaggi) {
            // Add summary context if we hit the limit
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

          messages.push(...chronologicalMessages.map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content
          })));
        }
      }
    }

    // Add current user message
    messages.push({ role: 'user', content: prompt });

    console.log(`[MEMORY] Using ${useFullMemory ? 'FULL' : 'LIMITED'} memory for conversation ${conversationId}`);
    console.log(`[MEMORY] Total messages in context: ${messages.length}`);
    console.log(`[MEMORY] Memory config: ${JSON.stringify(config)}`);
    if (!useFullMemory) {
      console.log(`[MEMORY] Time window: last ${config.memoria_ore} hours, max ${config.memoria_messaggi} messages`);
    }

    // Determina se la domanda richiede strumenti CRM
    const requiresCRMTools = isCRMRelatedQuery(prompt, systemPrompt);
    console.log(`CRM tools required: ${requiresCRMTools}`);

    // Definisci gli strumenti CRM disponibili per ChatGPT
    const tools = [
      {
        type: "function",
        function: {
          name: "count_records",
          description: "Conta i record in una tabella del CRM con filtri opzionali. Utile per rispondere a domande come 'quanti contatti abbiamo?' o 'quante campagne attive ci sono?'",
          parameters: {
            type: "object",
            properties: {
              table: {
                type: "string",
                enum: ["rubrica", "campagne", "attivita", "email", "allegati", "interazioni"],
                description: "Nome della tabella da interrogare (rubrica=contatti, campagne=campagne marketing, attivita=task e appuntamenti, email=messaggi email, allegati=file, interazioni=log interazioni)"
              },
              filters: {
                type: "object",
                description: "Filtri opzionali da applicare. Esempi: {stato: 'attiva'} per campagne attive, {priorita: 'alta'} per attività prioritarie"
              }
            },
            required: ["table"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_statistics",
          description: "Ottieni statistiche generali complete del CRM: totale contatti, campagne, attività, email, campagne attive, attività in scadenza nei prossimi 7 giorni",
          parameters: { type: "object", properties: {} }
        }
      },
      {
        type: "function",
        function: {
          name: "search_contacts",
          description: "Cerca contatti specifici per nome, azienda o email. Utile per trovare informazioni su clienti specifici",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string", description: "Termine di ricerca (nome, azienda, email)" },
              limit: { type: "number", description: "Numero massimo di risultati (default: 10)" }
            },
            required: ["query"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_campaign_status",
          description: "Ottieni informazioni sulle campagne: tutte le campagne o dettagli di una campagna specifica",
          parameters: {
            type: "object",
            properties: {
              campaign_id: { type: "string", description: "ID campagna specifica (opzionale - se omesso restituisce tutte le campagne)" }
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
              status: { type: "string", description: "Filtra per stato (es: 'in_corso', 'completata', 'programmata')" },
              priority: { type: "string", description: "Filtra per priorità (es: 'alta', 'media', 'bassa')" },
              assignee: { type: "string", description: "Filtra per assegnatario" },
              limit: { type: "number", description: "Numero massimo di risultati (default: 10)" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "insert_activity",
          description: "Crea una nuova attività (task, appuntamento, telefonata)",
          parameters: {
            type: "object",
            properties: {
              titolo: { type: "string", description: "Titolo/descrizione dell'attività" },
              tipo: { type: "string", description: "Tipo di attività (task, appuntamento, telefonata)" },
              priorita: { type: "string", description: "Priorità (bassa, media, alta, urgente)" },
              stato: { type: "string", description: "Stato iniziale (da_fare, in_corso, completata)" },
              scadenza: { type: "string", description: "Data e ora di scadenza (ISO format)" },
              rubrica_id: { type: "string", description: "ID del contatto collegato" },
              note: { type: "string", description: "Note aggiuntive" }
            },
            required: ["titolo"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "update_record",
          description: "Aggiorna un record esistente in qualsiasi tabella",
          parameters: {
            type: "object",
            properties: {
              table: { type: "string", description: "Nome della tabella" },
              id: { type: "string", description: "ID del record da aggiornare" },
              updates: { type: "object", description: "Campi da aggiornare" }
            },
            required: ["table", "id", "updates"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "insert_contact",
          description: "Aggiunge un nuovo contatto al CRM",
          parameters: {
            type: "object",
            properties: {
              responsabile: { type: "string", description: "Nome del responsabile/contatto" },
              azienda: { type: "string", description: "Nome dell'azienda" },
              email: { type: "string", description: "Indirizzo email" },
              telefono: { type: "string", description: "Numero di telefono" },
              tag: { type: "string", description: "Tag/categoria del contatto" },
              note: { type: "string", description: "Note aggiuntive" },
              stato: { type: "string", description: "Stato del contatto (attivo, inattivo)" }
            },
            required: []
          }
        }
      }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${aiConfig.api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: aiConfig.modello,
        messages: messages,
        max_completion_tokens: 1000,
        ...(requiresCRMTools && {
          tools: tools,
          tool_choice: "auto"
        })
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API Error:', errorData);
      throw new Error(`Errore OpenAI: ${errorData.error?.message || 'Errore sconosciuto'}`);
    }

    const data = await response.json();
    const choice = data.choices[0];
    let aiResponse = choice.message.content;
    
    // Gestisci le chiamate agli strumenti
    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      const toolResults = [];
      
      for (const toolCall of choice.message.tool_calls) {
        try {
          console.log(`Chiamando strumento: ${toolCall.function.name}`, toolCall.function.arguments);
          
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
          console.error(`Errore chiamata strumento ${toolCall.function.name}:`, error);
          toolResults.push({
            tool_call_id: toolCall.id,
            role: "tool", 
            name: toolCall.function.name,
            content: JSON.stringify({ error: "Errore nell'esecuzione dello strumento" })
          });
        }
      }
      
      // Fai una seconda chiamata con i risultati degli strumenti
      const followUpMessages = [
        ...messages,
        choice.message,
        ...toolResults
      ];
      
      const followUpResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${aiConfig.api_key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: aiConfig.modello,
          messages: followUpMessages,
          max_completion_tokens: 1000,
        }),
      });
      
      if (followUpResponse.ok) {
        const followUpData = await followUpResponse.json();
        aiResponse = followUpData.choices[0].message.content;
      }
    }
    
    const tokensUsed = data.usage?.total_tokens || 0;
    const tokensInput = data.usage?.prompt_tokens || 0;
    const tokensOutput = data.usage?.completion_tokens || 0;
    const responseTime = Date.now() - startTime;

    // Save messages to database
    if (conversationId) {
      try {
        // Save user message first
        await supabase
          .from('chat_messages')
          .insert({
            conversation_id: conversationId,
            role: 'user',
            content: prompt
          });

        // Save AI response
        await supabase
          .from('chat_messages')
          .insert({
            conversation_id: conversationId,
            role: 'assistant',
            content: aiResponse,
            model: aiConfig.modello,
            tokens_used: tokensUsed,
            token_input: tokensInput,
            token_output: tokensOutput,
            tempo_risposta_ms: responseTime
          });

        // Update usage statistics in background
        updateUsageStats(
          conversationId, 
          tokensInput, 
          tokensOutput, 
          responseTime
        ).catch(error => console.error('Background stats update failed:', error));

      } catch (dbError) {
        console.error('Error saving messages to database:', dbError);
        // Don't fail the response if database save fails
      }
    }

    return new Response(JSON.stringify({ 
      response: aiResponse,
      model: aiConfig.modello,
      tokens_used: tokensUsed,
      tokens_input: tokensInput,
      tokens_output: tokensOutput,
      response_time_ms: responseTime,
      conversation_id: conversationId,
      memory_mode: useFullMemory ? 'full' : 'limited',
      messages_in_context: messages.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in chat-with-openai function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Errore sconosciuto' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Funzione per determinare se una query richiede strumenti CRM
function isCRMRelatedQuery(prompt: string, systemPrompt: string = ''): boolean {
  const lowerPrompt = prompt.toLowerCase();
  const lowerSystemPrompt = systemPrompt.toLowerCase();
  
  // Se il system prompt indica che è un CRM assistant, usa sempre i tool
  if (lowerSystemPrompt.includes('crm') || lowerSystemPrompt.includes('tmwe') || lowerSystemPrompt.includes('direttore commerciale')) {
    return true;
  }
  
  // Keywords che indicano domande CRM-related
  const crmKeywords = [
    // Contatti e clienti
    'contatti', 'clienti', 'cliente', 'azienda', 'aziende', 'responsabile',
    'email', 'telefono', 'rubrica',
    
    // Attività e task
    'attività', 'attivita', 'task', 'appuntamento', 'appuntamenti', 'telefonata',
    'chiamata', 'meeting', 'riunione', 'scadenza', 'deadline',
    
    // Campagne
    'campagna', 'campagne', 'marketing', 'newsletter',
    
    // Azioni CRM
    'crea', 'aggiungi', 'inserisci', 'aggiorna', 'modifica', 'cerca', 'trova',
    'programma', 'pianifica', 'segna', 'registra',
    
    // Stati e statistiche
    'quanti', 'quante', 'totale', 'statistiche', 'performance', 'stato',
    'attivi', 'attive', 'completate', 'in corso', 'programmata',
    
    // Termini specifici CRM
    'lead', 'prospect', 'vendite', 'commerciale', 'follow-up', 'pipeline'
  ];
  
  // Keywords che indicano domande NON CRM-related
  const nonCrmKeywords = [
    'provincie', 'regioni', 'geografia', 'matematica', 'storia', 'scienza',
    'meteo', 'tempo', 'ricetta', 'cucina', 'sport', 'calcio', 'musica',
    'film', 'libro', 'notizie', 'cos\'è', 'come si', 'perché', 'quando',
    'dove si trova', 'capitale', 'popolazione', 'animali', 'piante'
  ];
  
  // Se contiene keyword non-CRM, probabilmente non serve CRM
  for (const keyword of nonCrmKeywords) {
    if (lowerPrompt.includes(keyword)) {
      return false;
    }
  }
  
  // Se contiene keyword CRM, usa i tool
  for (const keyword of crmKeywords) {
    if (lowerPrompt.includes(keyword)) {
      return true;
    }
  }
  
  // Default: se non siamo sicuri e il prompt è breve (domanda generica), non usare tool
  if (prompt.length < 50) {
    return false;
  }
  
  // Per prompt più lunghi, default a true per sicurezza
  return true;
}

// Background function to update usage statistics
async function updateUsageStats(
  conversationId: string, 
  tokensInput: number, 
  tokensOutput: number, 
  responseTime: number
) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Try to update existing record or insert new one
    const { error } = await supabase
      .from('chat_usage_stats')
      .upsert({
        conversation_id: conversationId,
        data_utilizzo: today,
        token_totali_input: tokensInput,
        token_totali_output: tokensOutput,
        numero_messaggi: 1,
        tempo_totale_ms: responseTime
      }, {
        onConflict: 'conversation_id,data_utilizzo',
        ignoreDuplicates: false
      });

    if (error) {
      // If upsert fails, try to update existing record
      const { data: existing } = await supabase
        .from('chat_usage_stats')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('data_utilizzo', today)
        .single();

      if (existing) {
        await supabase
          .from('chat_usage_stats')
          .update({
            token_totali_input: existing.token_totali_input + tokensInput,
            token_totali_output: existing.token_totali_output + tokensOutput,
            numero_messaggi: existing.numero_messaggi + 1,
            tempo_totale_ms: existing.tempo_totale_ms + responseTime
          })
          .eq('id', existing.id);
      }
    }
  } catch (error) {
    console.error('Error updating usage stats:', error);
  }
}