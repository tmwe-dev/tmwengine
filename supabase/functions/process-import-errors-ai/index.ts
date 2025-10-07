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

    console.log(`Starting AI error processing for import_log_id: ${import_log_id}, batch_size: ${batch_size}, continue_from_batch: ${continue_from_batch}`);

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

    console.log(`Processing ${pendingErrors.length} errors in this batch`);

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

    console.log('Using system prompt from database:', systemPrompt.substring(0, 100) + '...');

    // STEP 5: Processa ogni errore con AI
    let processed = 0;
    let corrected = 0;
    let failed = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    for (const error of pendingErrors) {
      try {
        // Marca come in elaborazione
        await supabaseClient
          .from('import_errors')
          .update({ status: 'processing' })
          .eq('id', error.id);

        const rawData = error.raw_data as any;
        
        const userPrompt = `Estrai e normalizza questi dati per il CRM:
${JSON.stringify(rawData)}

Restituisci JSON con TUTTI i campi che riesci a trovare.`;

        // Chiamata AI con response_format per forzare JSON strutturato
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
            max_tokens: 1000,
            response_format: { 
              type: "json_object"
            }
          }),
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          console.error('AI API error:', aiResponse.status, errorText);
          throw new Error(`AI API error: ${aiResponse.status}`);
        }

        const aiData = await aiResponse.json();
        const aiContent = aiData.choices[0].message.content;
        
        // Traccia token
        const inputTokens = aiData.usage?.prompt_tokens || 0;
        const outputTokens = aiData.usage?.completion_tokens || 0;
        totalInputTokens += inputTokens;
        totalOutputTokens += outputTokens;

        // Estrai JSON dalla risposta
        let correctedData;
        try {
          console.log(`🤖 AI Response for row ${error.row_number}:`, aiContent);
          
          const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            console.error(`❌ No JSON found in AI response for row ${error.row_number}`);
            throw new Error('No JSON found in AI response');
          }
          
          correctedData = JSON.parse(jsonMatch[0]);
          console.log(`✅ Parsed correctedData for row ${error.row_number}:`, JSON.stringify(correctedData));
          
          // Verifica che non sia vuoto
          if (!correctedData || Object.keys(correctedData).length === 0) {
            console.error(`⚠️ Empty correctedData for row ${error.row_number}`);
            throw new Error('AI returned empty data');
          }
          
        } catch (parseError) {
          console.error(`❌ Failed to parse AI response for row ${error.row_number}:`, aiContent);
          throw new Error('Invalid JSON from AI');
        }

        // Salva dati corretti
        const { error: updateError } = await supabaseClient
          .from('import_errors')
          .update({
            status: 'corrected',
            corrected_data: correctedData,
            attempted_corrections: error.attempted_corrections + 1,
            ai_suggestions: {
              tokens_used: inputTokens + outputTokens,
              model: 'google/gemini-2.5-flash'
            }
          })
          .eq('id', error.id);
          
        if (updateError) {
          console.error(`❌ Failed to update row ${error.row_number}:`, updateError);
          throw updateError;
        }
        
        console.log(`✅ Successfully saved corrected data for row ${error.row_number}`);

        corrected++;
        processed++;

      } catch (processingError: any) {
        console.error(`Error processing error ${error.id}:`, processingError);
        
        await supabaseClient
          .from('import_errors')
          .update({
            status: 'failed',
            error_message: `${error.error_message} | AI: ${processingError.message}`,
            attempted_corrections: error.attempted_corrections + 1
          })
          .eq('id', error.id);

        failed++;
        processed++;
      }
    }

    // Calcola costo
    const totalTokens = totalInputTokens + totalOutputTokens;
    const inputCost = (totalInputTokens / 1000000) * COST_PER_MILLION_INPUT_TOKENS;
    const outputCost = (totalOutputTokens / 1000000) * COST_PER_MILLION_OUTPUT_TOKENS;
    const estimatedCost = inputCost + outputCost;

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