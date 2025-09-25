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

    console.log(`Using ${useFullMemory ? 'full' : 'limited'} memory. Messages in context: ${messages.length}`);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${aiConfig.api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: aiConfig.modello,
        messages: messages,
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API Error:', errorData);
      throw new Error(`Errore OpenAI: ${errorData.error?.message || 'Errore sconosciuto'}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    const tokensUsed = data.usage?.total_tokens || 0;
    const tokensInput = data.usage?.prompt_tokens || 0;
    const tokensOutput = data.usage?.completion_tokens || 0;
    const responseTime = Date.now() - startTime;

    // Update usage statistics in background
    if (conversationId) {
      updateUsageStats(
        conversationId, 
        tokensInput, 
        tokensOutput, 
        responseTime
      ).catch(error => console.error('Background stats update failed:', error));
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