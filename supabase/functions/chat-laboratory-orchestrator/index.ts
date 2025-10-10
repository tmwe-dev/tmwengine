import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Carica TUTTE le configurazioni AI attive
    const { data: aiConfigs } = await supabaseClient
      .from('config_ai')
      .select('*')
      .eq('attivo', true);

    // Mappa provider -> config
    const configMap = {
      openai: aiConfigs?.find(c => c.provider === 'openai'),
      google: aiConfigs?.find(c => c.provider === 'google' || c.provider === 'lovable'),
      anthropic: aiConfigs?.find(c => c.provider === 'anthropic')
    };

    // Carica il prompt globale
    const { data: globalPrompt } = await supabaseClient
      .from('chat_laboratory_system_prompts')
      .select('contenuto')
      .eq('attivo', true)
      .maybeSingle();

    const basePrompt = globalPrompt?.contenuto || `Sei un esperto. Rispondi in modo naturale e umano.

REGOLE CRITICHE:
- NON menzionare mai di essere un'AI
- Parla in prima persona come un professionista  
- Mantieni tono diplomatico e costruttivo
- Massimo 150 parole per risposta
- Se in disaccordo, esprimi con eleganza
- Obiettivo: convergere su soluzione condivisa`;

    // Carica messaggi visibili per costruire history
    const { data: messages } = await supabaseClient
      .from('chat_laboratory_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    const responses = [];

    // Processa ogni partecipante AI in sequenza
    for (const participant of participants) {
      const startTime = Date.now();

      // Determina provider e modello da usare
      let config, provider, model, apiKey;

      // Mappa participant.type -> configurazione
      if (participant.type === 'chatgpt' || participant.type === 'openai') {
        config = configMap.openai;
        if (!config) {
          console.warn('OpenAI config non trovata, skippo ChatGPT');
          continue; // Salta questo partecipante
        }
        provider = 'openai';
        model = config.modello;
        apiKey = config.api_key;
      }
      else if (participant.type === 'gemini' || participant.type === 'google') {
        config = configMap.google;
        if (!config) {
          console.warn('Google config non trovata, skippo Gemini');
          continue;
        }
        provider = 'lovable'; // Usa sempre Lovable AI Gateway per Gemini
        model = config.modello;
        apiKey = Deno.env.get('LOVABLE_API_KEY'); // Gemini usa sempre LOVABLE_API_KEY
      }
      else if (participant.type === 'claude' || participant.type === 'anthropic') {
        config = configMap.anthropic;
        if (!config) {
          console.warn('Anthropic config non trovata, skippo Claude');
          continue;
        }
        provider = 'anthropic';
        model = config.modello;
        apiKey = config.api_key;
      } else {
        console.warn(`Tipo partecipante non riconosciuto: ${participant.type}`);
        continue;
      }

      // Costruisci history completa: tutte le AI vedono tutti i messaggi
      const visibleHistory = (messages || [])
        .map((msg: any) => `${msg.sender_name}: ${msg.content}`)
        .join('\n');
      
      console.log(`📜 Storia completa mostrata a ${participant.name}:`, visibleHistory.substring(0, 300) + '...');
      console.log(`🧠 ${participant.name} elabora con modello:`, model);

      const fullPrompt = `${basePrompt}

Conversazione finora:
${visibleHistory}

Nuovo messaggio dell'utente:
${userMessage}

Rispondi con un messaggio breve e naturale (max 150 parole):`;

      let response: any;
      let tokensUsed = { input: 0, output: 0 };

      // Chiama l'AI appropriata
      if (provider === 'openai') {
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: fullPrompt }],
            max_completion_tokens: 500,
          }),
        });

        response = await openaiResponse.json();
        tokensUsed = {
          input: response.usage?.prompt_tokens || 0,
          output: response.usage?.completion_tokens || 0
        };

      } else if (provider === 'lovable' || provider === 'google') {
        const geminiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: fullPrompt }],
          }),
        });

        response = await geminiResponse.json();
        tokensUsed = {
          input: response.usage?.prompt_tokens || 0,
          output: response.usage?.completion_tokens || 0
        };

      } else if (provider === 'anthropic') {
        const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: model,
            max_tokens: 500,
            messages: [{ role: 'user', content: fullPrompt }],
          }),
        });

        response = await claudeResponse.json();
        tokensUsed = {
          input: response.usage?.input_tokens || 0,
          output: response.usage?.output_tokens || 0
        };
      }

      const responseTime = Date.now() - startTime;
      const content = response.choices?.[0]?.message?.content || 
                     response.content?.[0]?.text || 
                     'Errore nella risposta';

      // Salva messaggio AI come VISIBILE a tutte le altre AI
      await supabaseClient
        .from('chat_laboratory_messages')
        .insert({
          conversation_id: conversationId,
          sender_type: participant.type,
          sender_name: participant.name,
          content: content,
          is_visible_to_ai: true, // ✅ Ora visibile a tutti
          token_input: tokensUsed.input,
          token_output: tokensUsed.output,
          tempo_risposta_ms: responseTime
        });

      responses.push({
        participant: participant.name,
        content: content,
        tokens: tokensUsed,
        responseTime
      });
    }

    return new Response(
      JSON.stringify({ success: true, responses }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Orchestrator error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
