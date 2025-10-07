import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Costo per 1M token (prezzi Gemini Flash)
const COST_PER_MILLION_INPUT_TOKENS = 0.075;  // $0.075 per 1M input tokens
const COST_PER_MILLION_OUTPUT_TOKENS = 0.30;  // $0.30 per 1M output tokens

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      import_log_id, 
      batch_size = 25,
      continue_from_batch = 0 
    } = await req.json();

    console.log(`Starting AI BATCH error processing for import_log_id: ${import_log_id}, batch_size: ${batch_size}, continue_from_batch: ${continue_from_batch}`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // STEP 1: Verifica se ci sono già errori nella tabella
    const { data: existingErrors, error: checkError } = await supabaseClient
      .from('import_errors')
      .select('id')
      .eq('import_log_id', import_log_id)
      .limit(1);

    if (checkError) throw checkError;

    // STEP 2: Se non ci sono errori, estraili dal log di import
    if (!existingErrors || existingErrors.length === 0) {
      console.log('No errors found in import_errors, extracting from import_logs...');
      
      const { data: importLog, error: logError } = await supabaseClient
        .from('import_logs')
        .select('errori, file_path')
        .eq('id', import_log_id)
        .single();

      if (logError || !importLog) {
        throw new Error('Import log not found');
      }

      const { data: fileImport, error: fileError } = await supabaseClient
        .from('file_imports')
        .select('file_content, headers_detected, separator_detected')
        .eq('import_log_id', import_log_id)
        .single();

      if (fileError || !fileImport) {
        throw new Error('File import not found');
      }

      const errorsList = Array.isArray(importLog.errori) ? importLog.errori : [];
      
      if (errorsList.length === 0) {
        return new Response(JSON.stringify({
          success: true,
          message: 'Nessun errore da elaborare',
          processed: 0,
          corrected: 0,
          failed: 0,
          total_tokens: 0,
          estimated_cost: 0
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Prepara i dati grezzi delle righe con errore
      const fileLines = fileImport.file_content.split('\n');
      const separator = fileImport.separator_detected || ';';
      
      const errorsToInsert = errorsList.map((err: any) => {
        const rowNumber = err.row;
        const rawLine = fileLines[rowNumber - 1] || '';
        
        return {
          import_log_id,
          row_number: rowNumber,
          error_message: err.error || 'Unknown error',
          error_type: 'validation_error',
          status: 'pending',
          raw_data: { 
            raw_line: rawLine,
            separator: separator,
            headers: fileImport.headers_detected || []
          },
          attempted_corrections: 0
        };
      });

      const { error: insertError } = await supabaseClient
        .from('import_errors')
        .insert(errorsToInsert);

      if (insertError) {
        console.error('Error inserting errors:', insertError);
        throw insertError;
      }

      console.log(`Inserted ${errorsToInsert.length} error records`);
    }

    // STEP 3: Prendi gli errori da processare per questo batch
    const { data: pendingErrors, error: fetchError } = await supabaseClient
      .from('import_errors')
      .select('*')
      .eq('import_log_id', import_log_id)
      .eq('status', 'pending')
      .order('row_number')
      .range(continue_from_batch, continue_from_batch + batch_size - 1);

    if (fetchError) throw fetchError;

    if (!pendingErrors || pendingErrors.length === 0) {
      const { data: stats } = await supabaseClient
        .from('import_errors')
        .select('status')
        .eq('import_log_id', import_log_id);

      const corrected = stats?.filter(s => s.status === 'corrected').length || 0;
      const failed = stats?.filter(s => s.status === 'failed').length || 0;

      return new Response(JSON.stringify({
        success: true,
        message: 'Nessun errore pendente da elaborare',
        processed: 0,
        corrected: corrected,
        failed: failed,
        total_tokens: 0,
        estimated_cost: 0,
        batch_complete: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`📦 BATCH MODE: Processing ${pendingErrors.length} errors in SINGLE AI call`);

    // STEP 4: Carica il prompt dal database
    const { data: promptData } = await supabaseClient
      .from('page_system_prompts')
      .select('system_prompt')
      .eq('page_route', '/import-errors-monitor')
      .eq('attivo', true)
      .single();

    const systemPrompt = promptData?.system_prompt || `Estrai dati da record CRM incompleti in formato JSON.

REGOLA FONDAMENTALE: Restituisci SEMPRE un oggetto JSON con i campi trovati.
Se un campo non c'è, metti null. NON restituire mai {}.

Esempio input:
{"name":"ACME Corp","city":"Roma","country":"IT","email":null}

Esempio output:
{"company_name":"ACME Corp","city":"Roma","country":"IT","email":null}

Conversioni speciali:
- Date Excel (es: 18592) → formato YYYY-MM-DD
- Email → lowercase
- Telefono → formato internazionale

Campi disponibili: name, company_name, email, phone, cell, address, city, country, zip_code, last_contact, scheduled_contact, next_contact_date`;

    console.log('📄 Using system prompt from database (length:', systemPrompt.length, 'chars)');

    // STEP 5: BATCH PROCESSING - Processa multipli record in UNA sola chiamata AI
    let processed = 0;
    let corrected = 0;
    let failed = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    // Prepara batch di record con i loro ID per il tracking
    const batchRecords = pendingErrors.map(error => ({
      id: error.id,
      row_number: error.row_number,
      raw_data: error.raw_data,
      attempted_corrections: error.attempted_corrections
    }));

    // Marca tutti come in elaborazione
    await supabaseClient
      .from('import_errors')
      .update({ status: 'processing' })
      .in('id', batchRecords.map(r => r.id));

    try {
      // Costruisci il prompt per batch processing
      const userPrompt = `Normalizza i seguenti ${batchRecords.length} record CRM.

IMPORTANTE: Restituisci un array JSON con ESATTAMENTE ${batchRecords.length} oggetti, nello stesso ordine dei record input.

RECORD DA NORMALIZZARE:
${batchRecords.map((r, idx) => `
--- RECORD ${idx + 1} (row ${r.row_number}) ---
${JSON.stringify(r.raw_data, null, 2)}
`).join('\n')}

RISPOSTA RICHIESTA:
Restituisci un array JSON con ${batchRecords.length} oggetti normalizzati, mantenendo l'ordine.
Esempio formato: [
  {"company_name":"...", "email":"...", ...},
  {"company_name":"...", "email":"...", ...}
]`;

      const estimatedTokens = Math.round((systemPrompt.length + userPrompt.length) / 4);
      console.log(`📤 Sending batch request to AI...`);
      console.log(`📊 Estimated tokens: ~${estimatedTokens} (prompt shared once for ${batchRecords.length} records!)`);

      // CHIAMATA AI BATCH - 1 sola chiamata per tutti i record
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
          max_tokens: 6000, // Aumentato per gestire array di risposte
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error('❌ AI API error:', aiResponse.status, errorText);
        throw new Error(`AI API error: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      const aiContent = aiData.choices[0].message.content;
      
      // Traccia token (ora condivisi per tutto il batch!)
      const inputTokens = aiData.usage?.prompt_tokens || 0;
      const outputTokens = aiData.usage?.completion_tokens || 0;
      totalInputTokens = inputTokens;
      totalOutputTokens = outputTokens;

      console.log(`📥 AI Response received`);
      console.log(`📊 Tokens: ${inputTokens} input + ${outputTokens} output = ${inputTokens + outputTokens} total`);
      console.log(`💰 Batch efficiency: Prompt sent 1 time instead of ${batchRecords.length} times!`);

      // Parse della risposta batch
      let normalizedRecords: any[];
      try {
        console.log(`🔍 Parsing batch AI response...`);
        
        // Cerca array JSON nella risposta
        const jsonMatch = aiContent.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          console.error(`❌ No JSON array found in AI response`);
          console.log('AI response sample:', aiContent.substring(0, 500));
          throw new Error('No JSON array found in AI response');
        }
        
        normalizedRecords = JSON.parse(jsonMatch[0]);
        
        if (!Array.isArray(normalizedRecords)) {
          throw new Error('AI response is not an array');
        }
        
        if (normalizedRecords.length !== batchRecords.length) {
          console.warn(`⚠️ AI returned ${normalizedRecords.length} records, expected ${batchRecords.length}`);
        }

        console.log(`✅ Successfully parsed ${normalizedRecords.length} normalized records from batch`);
        
      } catch (parseError) {
        console.error(`❌ Failed to parse batch AI response:`, parseError);
        console.log('AI response sample:', aiContent.substring(0, 1000));
        throw new Error('Invalid JSON array from AI');
      }

      // STEP 6: Salva risultati nel database (uno per uno con tracking)
      const tokenPerRecord = Math.round((inputTokens + outputTokens) / batchRecords.length);
      
      for (let i = 0; i < batchRecords.length; i++) {
        const record = batchRecords[i];
        const normalizedData = normalizedRecords[i];

        try {
          if (!normalizedData || Object.keys(normalizedData).length === 0) {
            console.warn(`⚠️ Empty data for record ${i + 1} (row ${record.row_number})`);
            
            await supabaseClient
              .from('import_errors')
              .update({
                status: 'failed',
                attempted_corrections: record.attempted_corrections + 1
              })
              .eq('id', record.id);
            
            failed++;
            processed++;
            continue;
          }

          // Salva record corretto
          const { error: updateError } = await supabaseClient
            .from('import_errors')
            .update({
              status: 'corrected',
              corrected_data: normalizedData,
              attempted_corrections: record.attempted_corrections + 1,
              ai_suggestions: {
                tokens_used: tokenPerRecord,
                model: 'google/gemini-2.5-flash',
                batch_processed: true,
                batch_size: batchRecords.length
              }
            })
            .eq('id', record.id);

          if (updateError) {
            console.error(`❌ DB update error for record ${i + 1}:`, updateError);
            failed++;
          } else {
            console.log(`✅ Saved corrected data for row ${record.row_number}`);
            corrected++;
          }
          processed++;

        } catch (recordError) {
          console.error(`❌ Error processing record ${i + 1}:`, recordError);
          
          await supabaseClient
            .from('import_errors')
            .update({
              status: 'failed',
              attempted_corrections: record.attempted_corrections + 1
            })
            .eq('id', record.id);
          
          failed++;
          processed++;
        }
      }

    } catch (batchError) {
      // Se l'intero batch fallisce, marca tutti come falliti
      console.error('❌ Batch processing failed:', batchError);
      
      for (const record of batchRecords) {
        await supabaseClient
          .from('import_errors')
          .update({
            status: 'failed',
            attempted_corrections: record.attempted_corrections + 1
          })
          .eq('id', record.id);
        
        failed++;
        processed++;
      }
    }

    // Calcola costo
    const totalTokens = totalInputTokens + totalOutputTokens;
    const inputCost = (totalInputTokens / 1000000) * COST_PER_MILLION_INPUT_TOKENS;
    const outputCost = (totalOutputTokens / 1000000) * COST_PER_MILLION_OUTPUT_TOKENS;
    const estimatedCost = inputCost + outputCost;

    console.log(`📊 Batch Results: ${corrected} corrected, ${failed} failed out of ${processed} processed`);
    console.log(`💰 Total cost: $${estimatedCost.toFixed(6)}`);

    // Verifica se ci sono ancora errori pending
    const { data: remainingErrors } = await supabaseClient
      .from('import_errors')
      .select('id')
      .eq('import_log_id', import_log_id)
      .eq('status', 'pending')
      .limit(1);

    const hasMorePending = remainingErrors && remainingErrors.length > 0;

    return new Response(JSON.stringify({
      success: true,
      processed,
      corrected,
      failed,
      total_tokens: totalTokens,
      input_tokens: totalInputTokens,
      output_tokens: totalOutputTokens,
      estimated_cost: estimatedCost,
      batch_complete: !hasMorePending,
      next_batch: continue_from_batch + batch_size
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in process-import-errors-ai:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});