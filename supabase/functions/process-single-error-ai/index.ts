import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { error_id, free_prompt } = await req.json();

    if (!error_id) {
      throw new Error('error_id è obbligatorio');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Recupera il record di errore
    const { data: errorRecord, error: fetchError } = await supabaseClient
      .from('import_errors')
      .select('*')
      .eq('id', error_id)
      .single();

    if (fetchError || !errorRecord) {
      throw new Error('Record non trovato');
    }

    console.log('📄 Processamento singolo record:', errorRecord.row_number);

    // 2. Prepara il prompt per l'AI
    const systemPrompt = free_prompt || `Sei un assistente AI specializzato nella normalizzazione dei dati di importazione.

OBIETTIVO: Analizzare il testo grezzo fornito ed estrarre tutte le informazioni possibili per creare un record strutturato.

STRUTTURA DI DESTINAZIONE (campi della tabella imported_contacts):
- company_name: Nome dell'azienda
- name: Nome del contatto/persona
- email: Indirizzo email
- phone: Telefono fisso
- cell: Cellulare
- address: Indirizzo completo
- city: Città
- country: Paese/Nazione
- zip_code: CAP/Codice postale
- position: Posizione/Ruolo
- note: Note aggiuntive

ISTRUZIONI:
1. Leggi attentamente il testo grezzo fornito
2. Identifica e estrai tutte le informazioni presenti
3. Normalizza i dati secondo la struttura di destinazione
4. Se un campo non è presente nel testo, restituisci null
5. Restituisci SOLO un oggetto JSON valido con i campi estratti

IMPORTANTE: Restituisci SOLO JSON, senza markdown o testo aggiuntivo.`;

    const userPrompt = `Dati grezzi da normalizzare:
${JSON.stringify(errorRecord.raw_data, null, 2)}

Estrai tutte le informazioni possibili e restituisci un oggetto JSON con i campi normalizzati.`;

    // 3. Chiama l'AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY non configurata');
    }

    console.log('🤖 Chiamata AI per record:', errorRecord.row_number);

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Error:', errorText);
      throw new Error(`Errore AI: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0].message.content;
    const tokensUsed = aiData.usage?.total_tokens || 0;

    console.log('✅ Risposta AI ricevuta. Token:', tokensUsed);
    console.log('📝 Contenuto AI:', aiContent);

    // 4. Parse della risposta AI
    let normalizedData: any;
    try {
      // Rimuovi eventuali markdown code blocks
      const cleanContent = aiContent
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      normalizedData = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('❌ Errore parsing JSON:', parseError);
      console.error('Contenuto ricevuto:', aiContent);
      
      // Aggiorna con status failed
      await supabaseClient
        .from('import_errors')
        .update({
          status: 'failed',
          attempted_corrections: errorRecord.attempted_corrections + 1,
          ai_suggestions: {
            reason: 'Errore parsing risposta AI',
            raw_response: aiContent,
            tokens_used: tokensUsed
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', error_id);

      throw new Error('Impossibile parsare la risposta AI');
    }

    // 5. Aggiorna il record con i dati corretti
    const { error: updateError } = await supabaseClient
      .from('import_errors')
      .update({
        status: 'corrected',
        corrected_data: normalizedData,
        attempted_corrections: errorRecord.attempted_corrections + 1,
        ai_suggestions: {
          tokens_used: tokensUsed,
          model: 'google/gemini-2.5-flash',
          processed_at: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', error_id);

    if (updateError) {
      throw updateError;
    }

    console.log('✅ Record aggiornato con successo!');

    return new Response(
      JSON.stringify({
        success: true,
        normalized_data: normalizedData,
        tokens_used: tokensUsed,
        estimated_cost: (tokensUsed / 1000000) * 0.15
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Errore:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Errore sconosciuto' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
