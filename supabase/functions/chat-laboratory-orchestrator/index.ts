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

      // Costruisci history SOLO con messaggi dell'utente e del partecipante stesso
      const visibleHistory = (messages || [])
        .filter((msg: any) => 
          msg.sender_type === 'human' || 
          msg.sender_type === participant.type
        )
        .map((msg: any) => `${msg.sender_name}: ${msg.content}`)
        .join('\n');

      const fullPrompt = `${basePrompt}

Conversazione finora:
${visibleHistory}

Nuovo messaggio dell'utente:
${userMessage}

Rispondi con un messaggio breve e naturale (max 150 parole):`;

      let response: any;
      let tokensUsed = { input: 0, output: 0 };

      // Chiama l'AI appropriata
      if (participant.type === 'chatgpt') {
        const openaiKey = Deno.env.get('OPENAI_API_KEY');
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: fullPrompt }],
            max_tokens: 500,
          }),
        });

        response = await openaiResponse.json();
        tokensUsed = {
          input: response.usage?.prompt_tokens || 0,
          output: response.usage?.completion_tokens || 0
        };

      } else if (participant.type === 'gemini') {
        const lovableKey = Deno.env.get('LOVABLE_API_KEY');
        const geminiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [{ role: 'user', content: fullPrompt }],
          }),
        });

        response = await geminiResponse.json();
        tokensUsed = {
          input: response.usage?.prompt_tokens || 0,
          output: response.usage?.completion_tokens || 0
        };

      } else if (participant.type === 'claude') {
        const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
        const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-3-5-haiku-20241022',
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

      // Salva messaggio AI come NON visibile alle altre AI
      await supabaseClient
        .from('chat_laboratory_messages')
        .insert({
          conversation_id: conversationId,
          sender_type: participant.type,
          sender_name: participant.name,
          content: content,
          is_visible_to_ai: false,
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
