import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ═══════════════════════════════════════════════════════════
// HELPER: Controlla se l'AI dovrebbe saltare il turno
// ═══════════════════════════════════════════════════════════
function checkIfShouldSkip(
  visibleHistory: string,
  userMessage: string,
  messagesCount: number
): boolean {
  // Se la conversazione è appena iniziata (< 3 messaggi), tutti parlano
  if (messagesCount < 3) return false;

  // Se l'ultimo messaggio è una domanda diretta, risponde
  if (userMessage.includes('?')) return false;

  // Conta quanti messaggi recenti contengono parole di consenso
  const lastMessages = visibleHistory.split('\n').slice(-3);
  const consensusWords = ['concordo', 'sono d\'accordo', 'esatto', 'perfetto', 'giusto', 'condivido'];
  
  const consensusCount = lastMessages.filter(msg => 
    consensusWords.some(word => msg.toLowerCase().includes(word))
  ).length;
  
  // Se almeno 2 dei 3 ultimi messaggi esprimono consenso, skip
  return consensusCount >= 2;
}

// ═══════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════
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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY non configurata');
    }

    // Carica conversation
    const { data: conversation } = await supabaseClient
      .from('chat_laboratory_conversations')
      .select('last_speaker_index')
      .eq('id', conversationId)
      .single();

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

    // LOGICA TURNAZIONE
    const lastSpeakerIndex = conversation?.last_speaker_index ?? 0;
    const activeAIs = participants.filter((p: any) => p.type !== 'human');
    
    const shouldRandomize = Math.random() < 0.3;
    let nextIndex;
    
    if (shouldRandomize) {
      const availableIndices = activeAIs.map((_: any, i: number) => i).filter((i: number) => i !== lastSpeakerIndex);
      nextIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)] ?? 0;
    } else {
      nextIndex = (lastSpeakerIndex + 1) % activeAIs.length;
    }

    const selectedParticipant = activeAIs[nextIndex];
    console.log(`🎯 Turno di: ${selectedParticipant?.name} (index ${nextIndex})`);

    if (!selectedParticipant) {
      throw new Error('Nessun partecipante selezionato');
    }

    const startTime = Date.now();

    // Costruisci history completa
    const visibleHistory = (messages || [])
      .map((msg: any) => `${msg.sender_name}: ${msg.content}`)
      .join('\n');

    // ──────── PRE-CHECK: Questo AI ha qualcosa da dire? ────────
    const shouldSkip = checkIfShouldSkip(visibleHistory, userMessage, messages?.length || 0);
    
    if (shouldSkip) {
      console.log(`🤐 ${selectedParticipant.name} non ha nulla da aggiungere (consenso rilevato)`);
      
      // Salva un messaggio "skip" nella conversation (nascosto agli altri AI)
      await supabaseClient.from('chat_laboratory_messages').insert({
        conversation_id: conversationId,
        sender_type: selectedParticipant.type,
        sender_name: selectedParticipant.name,
        content: "[Non ho nulla da aggiungere]",
        is_visible_to_ai: false,
      });

      return new Response(
        JSON.stringify({ 
          skipped: true, 
          participantName: selectedParticipant.name,
          reason: 'consensus_detected'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let aiResponseText = '';
    let tokensIn = 0;
    let tokensOut = 0;

    // ═══════════════════════════════════════════════════════════
    // GESTIONE PROVIDER DIVERSI
    // ═══════════════════════════════════════════════════════════

    if (selectedParticipant.type === 'claude' || selectedParticipant.type === 'anthropic') {
      // ──────── ANTHROPIC DIRETTO ────────
      console.log(`🧠 ${selectedParticipant.name} elabora con Anthropic Claude`);
      
      const { data: anthropicConfig } = await supabaseClient
        .from('config_ai')
        .select('api_key')
        .eq('provider', 'anthropic')
        .eq('attivo', true)
        .single();

      if (!anthropicConfig?.api_key) {
        throw new Error('Anthropic API key non configurata in config_ai');
      }

      const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicConfig.api_key,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 500,
          messages: [
            {
              role: 'user',
              content: `${basePrompt}\n\nConversazione finora:\n${visibleHistory}\n\nNuovo messaggio:\n${userMessage}\n\nRispondi brevemente (max 150 parole):`
            }
          ],
        }),
      });

      if (!anthropicResponse.ok) {
        const errorText = await anthropicResponse.text();
        console.error(`❌ Anthropic Error:`, anthropicResponse.status, errorText);
        throw new Error(`Anthropic API error: ${anthropicResponse.status}`);
      }

      const anthropicData = await anthropicResponse.json();
      aiResponseText = anthropicData.content[0].text;
      tokensIn = anthropicData.usage?.input_tokens || 0;
      tokensOut = anthropicData.usage?.output_tokens || 0;

    } else if (selectedParticipant.type === 'chatgpt' || selectedParticipant.type === 'openai') {
      // ──────── OPENAI DIRETTO ────────
      console.log(`🧠 ${selectedParticipant.name} elabora con OpenAI GPT`);
      
      const { data: openaiConfig } = await supabaseClient
        .from('config_ai')
        .select('api_key, modello')
        .eq('provider', 'openai')
        .eq('attivo', true)
        .single();

      if (!openaiConfig?.api_key) {
        throw new Error('OpenAI API key non configurata in config_ai');
      }

      const fullPrompt = `${basePrompt}

Conversazione finora:
${visibleHistory}

Nuovo messaggio dell'utente:
${userMessage}

Rispondi con un messaggio breve e naturale (max 150 parole):`;

      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiConfig.api_key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: openaiConfig.modello || 'gpt-5-2025-08-07',
          messages: [{ role: 'user', content: fullPrompt }],
          max_completion_tokens: 500,
        }),
      });

      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text();
        console.error(`❌ OpenAI Error:`, openaiResponse.status, errorText);
        throw new Error(`OpenAI API error: ${openaiResponse.status}`);
      }

      const openaiData = await openaiResponse.json();
      aiResponseText = openaiData.choices[0].message.content;
      tokensIn = openaiData.usage?.prompt_tokens || 0;
      tokensOut = openaiData.usage?.completion_tokens || 0;

    } else if (selectedParticipant.type === 'gemini' || selectedParticipant.type === 'google') {
      // ──────── LOVABLE AI GATEWAY (solo Gemini) ────────
      const model = 'google/gemini-2.5-flash';
      console.log(`🧠 ${selectedParticipant.name} elabora con modello: ${model}`);

      const fullPrompt = `${basePrompt}

Conversazione finora:
${visibleHistory}

Nuovo messaggio dell'utente:
${userMessage}

Rispondi con un messaggio breve e naturale (max 150 parole):`;

      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: fullPrompt }],
          max_tokens: 500,
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error(`❌ AI Gateway Error (${model}):`, aiResponse.status, errorText);
        
        if (aiResponse.status === 429) {
          throw new Error('Rate limit superato. Riprova tra qualche istante.');
        }
        if (aiResponse.status === 402) {
          throw new Error('Crediti AI esauriti. Aggiungi crediti al tuo workspace.');
        }
        throw new Error(`AI Gateway error ${aiResponse.status}: ${errorText}`);
      }

      const aiData = await aiResponse.json();
      aiResponseText = aiData.choices[0].message.content;
      tokensIn = aiData.usage?.prompt_tokens || 0;
      tokensOut = aiData.usage?.completion_tokens || 0;
      
    } else {
      throw new Error(`Tipo partecipante non supportato: ${selectedParticipant.type}`);
    }

    // ═══════════════════════════════════════════════════════════
    // SALVATAGGIO RISULTATO
    // ═══════════════════════════════════════════════════════════

    const duration = Date.now() - startTime;
    console.log(`📊 ${selectedParticipant.name} - Token in:${tokensIn} out:${tokensOut} - ${duration}ms`);
    console.log(`✅ ${selectedParticipant.name} risposta: ${aiResponseText.substring(0, 100)}`);

    // Salva messaggio AI
    await supabaseClient
      .from('chat_laboratory_messages')
      .insert({
        conversation_id: conversationId,
        sender_type: selectedParticipant.type,
        sender_name: selectedParticipant.name,
        content: aiResponseText,
        is_visible_to_ai: true,
        token_input: tokensIn,
        token_output: tokensOut,
        tempo_risposta_ms: duration
      });

    // Aggiorna last_speaker_index
    await supabaseClient
      .from('chat_laboratory_conversations')
      .update({ last_speaker_index: nextIndex })
      .eq('id', conversationId);

    return new Response(
      JSON.stringify({ 
        success: true,
        participant: selectedParticipant.name,
        content: aiResponseText,
        tokens: { input: tokensIn, output: tokensOut },
        responseTime: duration
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Orchestrator error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Errore sconosciuto',
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
