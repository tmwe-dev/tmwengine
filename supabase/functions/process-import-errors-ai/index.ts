import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { import_log_id, max_attempts = 3, pause_requested = false } = await req.json();

    if (!import_log_id) {
      throw new Error('import_log_id è richiesto');
    }

    // Inizializza Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Recupera Lovable AI key
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY non configurata');
    }

    console.log(`🤖 Avvio elaborazione AI per import_log_id: ${import_log_id}`);

    // Recupera errori pending
    const { data: errors, error: fetchError } = await supabase
      .from('import_errors')
      .select('*')
      .eq('import_log_id', import_log_id)
      .eq('status', 'pending')
      .order('row_number');

    if (fetchError) throw fetchError;

    if (!errors || errors.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Nessun errore da elaborare',
          processed: 0,
          corrected: 0,
          failed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 Trovati ${errors.length} errori da elaborare`);

    let processed = 0;
    let corrected = 0;
    let failed = 0;

    // Schema atteso per rubrica
    const expectedSchema = {
      name: 'string (nome contatto)',
      company_name: 'string (nome azienda)',
      email: 'string (email valida)',
      phone: 'string (telefono)',
      cell: 'string (cellulare)',
      address: 'string (indirizzo)',
      city: 'string (città)',
      country: 'string (paese)',
      zip_code: 'string (CAP)',
      position: 'string (posizione)',
      title: 'string (titolo)',
      note: 'string (note)',
      origin: 'string (origine)',
      client_code: 'string (codice cliente)'
    };

    // Elabora ogni errore
    for (const error of errors) {
      // Controlla se è stata richiesta la pausa
      if (pause_requested) {
        console.log('⏸️ Pausa richiesta, interrompo elaborazione');
        break;
      }

      processed++;

      // Marca come processing
      await supabase
        .from('import_errors')
        .update({ status: 'processing' })
        .eq('id', error.id);

      console.log(`🔄 Elaborazione riga ${error.row_number} (${processed}/${errors.length})`);

      try {
        // Prepara prompt per AI
        const prompt = `Hai ricevuto un record errato durante l'importazione di dati in un CRM.

ERRORE RILEVATO: ${error.error_message}
TIPO ERRORE: ${error.error_type || 'non specificato'}

DATI GREZZI RICEVUTI:
${JSON.stringify(error.raw_data, null, 2)}

SCHEMA ATTESO:
${JSON.stringify(expectedSchema, null, 2)}

COMPITO:
1. Analizza i dati grezzi e l'errore
2. Correggi i dati seguendo lo schema atteso
3. Se un campo è irrecuperabile, omettilo o usa null
4. Restituisci SOLO un oggetto JSON valido con i dati corretti

IMPORTANTE:
- Email deve essere valida (formato email)
- Campi di testo non devono contenere caratteri speciali problematici
- Se mancano dati critici (nome o azienda), segnalalo nel campo "note"

Rispondi SOLO con JSON, nessun testo aggiuntivo.`;

        // Chiama Lovable AI
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: 'Sei un esperto di normalizzazione dati per CRM. Correggi i dati seguendo rigorosamente lo schema fornito. Rispondi sempre e solo con JSON valido, senza markdown o testo aggiuntivo.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.3,
          }),
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          console.error('❌ Errore AI API:', aiResponse.status, errorText);
          
          // Incrementa tentativi e marca come failed se supera il massimo
          const newAttempts = error.attempted_corrections + 1;
          await supabase
            .from('import_errors')
            .update({ 
              attempted_corrections: newAttempts,
              status: newAttempts >= max_attempts ? 'failed' : 'pending',
              ai_suggestions: { error: 'Errore chiamata AI', details: errorText }
            })
            .eq('id', error.id);
          
          if (newAttempts >= max_attempts) {
            failed++;
          }
          continue;
        }

        const aiData = await aiResponse.json();
        const aiContent = aiData.choices?.[0]?.message?.content;

        if (!aiContent) {
          throw new Error('Risposta AI vuota');
        }

        console.log('🤖 Risposta AI ricevuta:', aiContent);

        // Estrai JSON dalla risposta (rimuovi markdown se presente)
        let correctedDataJson = aiContent.trim();
        if (correctedDataJson.startsWith('```json')) {
          correctedDataJson = correctedDataJson.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        } else if (correctedDataJson.startsWith('```')) {
          correctedDataJson = correctedDataJson.replace(/```\n?/g, '');
        }

        const correctedData = JSON.parse(correctedDataJson);

        // Valida email se presente
        if (correctedData.email && !correctedData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
          throw new Error('Email corretta non valida');
        }

        console.log('✅ Dati corretti validati:', correctedData);

        // Salva i dati corretti e inserisci in imported_contacts
        await supabase
          .from('import_errors')
          .update({ 
            corrected_data: correctedData,
            status: 'corrected',
            attempted_corrections: error.attempted_corrections + 1
          })
          .eq('id', error.id);

        // Inserisci in imported_contacts
        const { error: insertError } = await supabase
          .from('imported_contacts')
          .insert({
            import_log_id: import_log_id,
            row_number: error.row_number,
            ...correctedData
          });

        if (insertError) {
          console.error('❌ Errore inserimento in imported_contacts:', insertError);
          // Torna a pending
          await supabase
            .from('import_errors')
            .update({ status: 'pending' })
            .eq('id', error.id);
        } else {
          corrected++;
          console.log(`✅ Riga ${error.row_number} corretta e importata`);
        }

      } catch (aiError) {
        console.error(`❌ Errore elaborazione riga ${error.row_number}:`, aiError);
        
        // Incrementa tentativi
        const newAttempts = error.attempted_corrections + 1;
        await supabase
          .from('import_errors')
          .update({ 
            attempted_corrections: newAttempts,
            status: newAttempts >= max_attempts ? 'failed' : 'pending',
            ai_suggestions: { 
              error: aiError instanceof Error ? aiError.message : 'Errore sconosciuto',
              last_attempt: new Date().toISOString()
            }
          })
          .eq('id', error.id);
        
        if (newAttempts >= max_attempts) {
          failed++;
        }
      }

      // Piccolo delay per non sovraccaricare
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Aggiorna statistiche import_log
    const { data: importLog } = await supabase
      .from('import_logs')
      .select('righe_importate, righe_errori')
      .eq('id', import_log_id)
      .single();

    if (importLog) {
      await supabase
        .from('import_logs')
        .update({
          righe_importate: (importLog.righe_importate || 0) + corrected,
          righe_errori: (importLog.righe_errori || 0) - corrected
        })
        .eq('id', import_log_id);
    }

    console.log(`🎉 Elaborazione completata: ${corrected} corretti, ${failed} falliti su ${processed} processati`);

    return new Response(
      JSON.stringify({ 
        success: true,
        processed,
        corrected,
        failed,
        remaining: errors.length - processed
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Errore generale:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Errore sconosciuto' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});