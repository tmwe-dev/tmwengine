import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALBERT_USER_ID = '00000000-0000-0000-0000-000000000001';

interface ProcessMessageRequest {
  roomId: string;
  userId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { roomId, userId }: ProcessMessageRequest = await req.json();
    console.log('AI Chat Assistant invoked for room:', roomId, 'by user:', userId);

    // Inizializza Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Carica le impostazioni AI della stanza
    const { data: roomSettings, error: settingsError } = await supabase
      .from('intranet_room_ai_prompts')
      .select('*')
      .eq('room_id', roomId)
      .single();

    if (settingsError || !roomSettings) {
      console.error('Error loading room settings:', settingsError);
      return new Response(
        JSON.stringify({ error: 'Impostazioni AI non trovate per questa stanza' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verifica che i suggerimenti AI siano abilitati
    if (!roomSettings.enable_suggestions) {
      return new Response(
        JSON.stringify({ error: 'I suggerimenti AI non sono abilitati per questa stanza' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verifica limite invocazioni
    if (roomSettings.ai_invocations_count >= roomSettings.ai_max_invocations) {
      return new Response(
        JSON.stringify({ 
          error: `Limite invocazioni AI raggiunto (${roomSettings.ai_max_invocations}/${roomSettings.ai_max_invocations})` 
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Carica prompt globale o custom
    let systemPrompt = '';
    if (roomSettings.is_using_standard) {
      const { data: globalPrompt } = await supabase
        .from('intranet_global_ai_prompt')
        .select('prompt_contenuto')
        .eq('attivo', true)
        .single();
      systemPrompt = globalPrompt?.prompt_contenuto || '';
    } else {
      systemPrompt = roomSettings.custom_prompt || '';
    }

    // Aggiungi istruzioni specifiche per Albert come assistente chat
    const albertInstructions = `
${systemPrompt}

--- ISTRUZIONI AGGIUNTIVE PER ALBERT AI CHAT ASSISTANT ---

Sei Albert, un assistente AI che partecipa attivamente alla conversazione del team.

COMPORTAMENTO:
- Sei stato invocato da un membro del team per aiutare nella conversazione
- Leggi attentamente i messaggi recenti per capire il contesto
- Fornisci risposte utili, pratiche e concise
- Puoi suggerire soluzioni, fornire informazioni o aiutare a risolvere problemi
- Usa un tono professionale ma amichevole
- Se non hai abbastanza informazioni, chiedi chiarimenti
- Quando possibile, struttura le tue risposte con punti elenco o numerati

COSA PUOI FARE:
- Analizzare conversazioni e fornire sintesi
- Suggerire soluzioni a problemi tecnici o organizzativi
- Aiutare a prendere decisioni fornendo pro/contro
- Rispondere a domande su argomenti generali
- Tradurre o riformulare concetti per maggiore chiarezza

COSA NON DEVI FARE:
- Non inventare informazioni se non sei sicuro
- Non dare consigli medici, legali o finanziari specifici
- Non rivelare informazioni confidenziali degli utenti

Rispondi sempre in italiano, a meno che non ti venga chiesto esplicitamente di usare un'altra lingua.
`;

    // 3. Carica gli ultimi N messaggi per il contesto
    const contextSize = roomSettings.ai_context_messages || 20;
    const { data: messages, error: messagesError } = await supabase
      .from('intranet_messages')
      .select(`
        id,
        content,
        created_at,
        user_id,
        user_profiles!inner(display_name)
      `)
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(contextSize);

    if (messagesError) {
      console.error('Error loading messages:', messagesError);
      return new Response(
        JSON.stringify({ error: 'Errore nel caricamento dei messaggi' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Formatta i messaggi per il contesto (ordine cronologico)
    const conversationContext = (messages || [])
      .reverse()
      .map((msg: any) => {
        const displayName = msg.user_profiles?.display_name || 'Utente';
        return `${displayName}: ${msg.content}`;
      })
      .join('\n');

    // 4. Chiama Lovable AI
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API Key non configurata' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Calling Lovable AI with context size:', contextSize);
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: albertInstructions },
          { 
            role: 'user', 
            content: `Ecco la conversazione recente nella chat di team:\n\n${conversationContext}\n\nFornisci un suggerimento utile o rispondi a eventuali domande implicite nella conversazione.`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite rate API raggiunto. Riprova tra qualche minuto.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Crediti AI esauriti. Contatta l\'amministratore.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Errore nella chiamata AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const albertMessage = aiData.choices?.[0]?.message?.content || 'Mi dispiace, non sono riuscito a generare una risposta.';

    console.log('Albert response generated:', albertMessage.substring(0, 100) + '...');

    // 5. Inserisci il messaggio di Albert nella chat
    const { error: insertError } = await supabase
      .from('intranet_messages')
      .insert({
        room_id: roomId,
        user_id: ALBERT_USER_ID,
        content: albertMessage,
        message_type: 'text'
      });

    if (insertError) {
      console.error('Error inserting Albert message:', insertError);
      return new Response(
        JSON.stringify({ error: 'Errore nell\'inserimento del messaggio' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Incrementa il contatore invocazioni
    const { error: updateError } = await supabase
      .from('intranet_room_ai_prompts')
      .update({ 
        ai_invocations_count: roomSettings.ai_invocations_count + 1 
      })
      .eq('room_id', roomId);

    if (updateError) {
      console.error('Error updating invocation counter:', updateError);
    }

    // 7. Ritorna successo
    return new Response(
      JSON.stringify({ 
        success: true,
        message: albertMessage,
        invocationsRemaining: roomSettings.ai_max_invocations - (roomSettings.ai_invocations_count + 1)
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in intranet-ai-chat-assistant:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Errore sconosciuto' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
