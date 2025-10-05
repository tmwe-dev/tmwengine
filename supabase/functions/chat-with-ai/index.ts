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
        const timeLimit = new Date(Date.now() - config.memoria_ore * 60 * 60 * 1000);
        
        const { data: recentMessages } = await supabase
          .from('chat_messages')
          .select('role, content, created_at')
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

          messages.push(...chronologicalMessages.map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content
          })));
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
                enum: ["rubrica", "campagne", "attivita", "email", "allegati", "interazioni"],
                description: "Nome della tabella"
              },
              filters: { type: "object", description: "Filtri opzionali" }
            },
            required: ["table"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_statistics",
          description: "Ottieni statistiche generali complete del CRM",
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
              limit: { type: "number", description: "Numero massimo risultati" }
            },
            required: ["query"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_campaign_status",
          description: "Ottieni informazioni sulle campagne",
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
          description: "Ottieni lista delle attività filtrate",
          parameters: {
            type: "object",
            properties: {
              status: { type: "string", description: "Filtra per stato" },
              priority: { type: "string", description: "Filtra per priorità" },
              assignee: { type: "string", description: "Filtra per assegnatario" },
              limit: { type: "number", description: "Numero massimo risultati" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "insert_activity",
          description: "Crea una nuova attività",
          parameters: {
            type: "object",
            properties: {
              titolo: { type: "string", description: "Titolo attività" },
              tipo: { type: "string", description: "Tipo (task, appuntamento, telefonata)" },
              priorita: { type: "string", description: "Priorità (bassa, media, alta, urgente)" },
              stato: { type: "string", description: "Stato iniziale" },
              scadenza: { type: "string", description: "Data scadenza ISO format" },
              rubrica_id: { type: "string", description: "ID contatto collegato" },
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
          description: "Aggiorna un record esistente",
          parameters: {
            type: "object",
            properties: {
              table: { type: "string", description: "Nome tabella" },
              id: { type: "string", description: "ID record" },
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
          description: "Aggiunge un nuovo contatto",
          parameters: {
            type: "object",
            properties: {
              responsabile: { type: "string", description: "Nome responsabile" },
              azienda: { type: "string", description: "Nome azienda" },
              email: { type: "string", description: "Email" },
              telefono: { type: "string", description: "Telefono" },
              tag: { type: "string", description: "Tag/categoria" },
              note: { type: "string", description: "Note" },
              stato: { type: "string", description: "Stato" }
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
      requestBody = {
        model: aiConfig.modello,
        messages: messages,
        max_completion_tokens: 1000,
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
    
    // Handle response based on provider
    let aiResponse: string;
    let choice: any;
    
    if (aiConfig.provider === 'anthropic' || aiConfig.provider === 'claude') {
      aiResponse = data.content?.[0]?.text || '';
      choice = { message: { tool_calls: data.content?.filter((c: any) => c.type === 'tool_use') } };
    } else {
      choice = data.choices[0];
      aiResponse = choice.message.content;
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
      
      const followUpResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify({
          model: aiConfig.modello,
          messages: followUpMessages,
          max_completion_tokens: 1000,
        }),
      });
      
      if (followUpResponse.ok) {
        const followUpData = await followUpResponse.json();
        if (aiConfig.provider === 'anthropic' || aiConfig.provider === 'claude') {
          aiResponse = followUpData.content?.[0]?.text || '';
        } else {
          aiResponse = followUpData.choices[0].message.content;
        }
      }
    }
    
    const tokensUsed = data.usage?.total_tokens || 0;
    const tokensInput = data.usage?.prompt_tokens || 0;
    const tokensOutput = data.usage?.completion_tokens || 0;
    const responseTime = Date.now() - startTime;

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
            content: aiResponse
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
