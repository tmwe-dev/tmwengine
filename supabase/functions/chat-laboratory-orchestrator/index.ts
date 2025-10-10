import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

// Chat Laboratory Multi-Agent Orchestrator
// Gestisce conversazioni con più AI in sequenza con turnazione intelligente

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

    // Carica configurazioni AI e conversation
    const [aiConfigsResult, conversationResult] = await Promise.all([
      supabaseClient.from('config_ai').select('*').eq('attivo', true),
      supabaseClient.from('chat_laboratory_conversations').select('last_speaker_index').eq('id', conversationId).single()
    ]);

    const aiConfigs = aiConfigsResult.data;
    const conversation = conversationResult.data;

    // Carica API keys dalle variabili d'ambiente
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

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
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    // LOGICA TURNAZIONE: scegli CHI parla in questo turno
    const lastSpeakerIndex = conversation?.last_speaker_index ?? 0;
    const activeAIs = participants.filter((p: any) => p.type !== 'human');
    
    // 70% rotazione, 30% casuale
    const shouldRandomize = Math.random() < 0.3;
    let nextIndex;
    
    if (shouldRandomize) {
      // Scegli casuale ma non lo stesso dell'ultima volta
      const availableIndices = activeAIs.map((_: any, i: number) => i).filter((i: number) => i !== lastSpeakerIndex);
      nextIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)] ?? 0;
    } else {
      // Rotazione circolare
      nextIndex = (lastSpeakerIndex + 1) % activeAIs.length;
    }

    const selectedParticipant = activeAIs[nextIndex];
    console.log(`🎯 Turno di: ${selectedParticipant?.name} (index ${nextIndex})`);

    const responses = [];

    // Processa SOLO il partecipante selezionato
    if (selectedParticipant) {
      const participant = selectedParticipant;
      const startTime = Date.now();

      // Determina provider e modello da usare
      let config, provider, model, apiKey;

      // Mappa participant.type -> configurazione
      if (participant.type === 'chatgpt' || participant.type === 'openai') {
        config = configMap.openai;
        if (!config) throw new Error('OpenAI config non trovata');
        provider = 'openai';
        model = config.modello;
        apiKey = OPENAI_API_KEY;
        if (!apiKey) throw new Error('OPENAI_API_KEY non configurata');
      }
      else if (participant.type === 'gemini' || participant.type === 'google') {
        config = configMap.google;
        if (!config) throw new Error('Google config non trovata');
        provider = 'lovable';
        model = config.modello;
        apiKey = LOVABLE_API_KEY;
        if (!apiKey) throw new Error('LOVABLE_API_KEY non configurata');
      }
      else if (participant.type === 'claude' || participant.type === 'anthropic') {
        config = configMap.anthropic;
        if (!config) throw new Error('Anthropic config non trovata');
        provider = 'anthropic';
        model = config.modello;
        apiKey = ANTHROPIC_API_KEY;
        if (!apiKey) throw new Error('ANTHROPIC_API_KEY non configurata');
      } else {
        throw new Error(`Tipo partecipante non riconosciuto: ${participant.type}`);
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

        if (!openaiResponse.ok) {
          const errorText = await openaiResponse.text();
          console.error('❌ OpenAI Error:', openaiResponse.status, errorText);
          throw new Error(`OpenAI API error ${openaiResponse.status}: ${errorText}`);
        }

        response = await openaiResponse.json();
        console.log('✅ OpenAI risposta:', response.choices?.[0]?.message?.content?.substring(0, 100));
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
            model: 'google/' + model,
            messages: [{ role: 'user', content: fullPrompt }],
          }),
        });

        if (!geminiResponse.ok) {
          const errorText = await geminiResponse.text();
          console.error('❌ Gemini Error:', geminiResponse.status, errorText);
          throw new Error(`Gemini API error ${geminiResponse.status}: ${errorText}`);
        }

        response = await geminiResponse.json();
        console.log('✅ Gemini risposta:', response.choices?.[0]?.message?.content?.substring(0, 100));
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

        if (!claudeResponse.ok) {
          const errorText = await claudeResponse.text();
          console.error('❌ Claude Error:', claudeResponse.status, errorText);
          throw new Error(`Claude API error ${claudeResponse.status}: ${errorText}`);
        }

        response = await claudeResponse.json();
        console.log('✅ Claude risposta:', response.content?.[0]?.text?.substring(0, 100));
        tokensUsed = {
          input: response.usage?.input_tokens || 0,
          output: response.usage?.output_tokens || 0
        };
      }

      const responseTime = Date.now() - startTime;
      const content = response.choices?.[0]?.message?.content || 
                     response.content?.[0]?.text || 
                     'Errore nella risposta';

      console.log(`📊 ${participant.name} - Token in:${tokensUsed.input} out:${tokensUsed.output} - ${responseTime}ms`);

      // Salva messaggio AI
      await supabaseClient
        .from('chat_laboratory_messages')
        .insert({
          conversation_id: conversationId,
          sender_type: participant.type,
          sender_name: participant.name,
          content: content,
          is_visible_to_ai: true,
          token_input: tokensUsed.input,
          token_output: tokensUsed.output,
          tempo_risposta_ms: responseTime
        });

      // Aggiorna last_speaker_index
      await supabaseClient
        .from('chat_laboratory_conversations')
        .update({ last_speaker_index: nextIndex })
        .eq('id', conversationId);

      responses.push({
        participant: participant.name,
        content: content,
        tokens: tokensUsed,
        responseTime
      });
    }

    // Verifica se ci sono altri AI che devono ancora parlare
    const hasMoreSpeakers = activeAIs.length > 1;

    return new Response(
      JSON.stringify({ 
        success: true, 
        responses,
        hasMoreTurns: hasMoreSpeakers,
        nextSpeakerIndex: nextIndex
      }),
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
