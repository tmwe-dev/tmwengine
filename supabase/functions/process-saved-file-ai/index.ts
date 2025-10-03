import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// No validation functions - accept all data as-is

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { importLogId, maxProcessingTime: customTimeout = 100000, batchSize: customBatchSize = 100 } = await req.json();
    console.log('[AI Import] Processing saved file for import log:', importLogId, 'timeout:', customTimeout, 'batch:', customBatchSize);

    // Check if processing is already in progress
    const { data: existingLog } = await supabaseClient
      .from('import_logs')
      .select('stato, righe_importate')
      .eq('id', importLogId)
      .single();

    if (existingLog?.stato === 'completato' || existingLog?.stato === 'completato_con_errori') {
      console.log('[AI Import] Import already completed');
      return new Response(JSON.stringify({
        success: true,
        message: 'Import already completed',
        alreadyCompleted: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find saved file
    const { data: fileImport, error: fileError } = await supabaseClient
      .from('file_imports')
      .select('*')
      .eq('import_log_id', importLogId)
      .eq('stato', 'salvato')
      .single();

    if (fileError || !fileImport) {
      throw new Error('File salvato non trovato');
    }

    // Update status to processing
    await supabaseClient
      .from('file_imports')
      .update({ stato: 'elaborazione' })
      .eq('id', fileImport.id);

    await supabaseClient
      .from('import_logs')
      .update({ stato: 'elaborazione' })
      .eq('id', importLogId);

    // Process saved file
    const fileContent = fileImport.file_content;
    const separator = fileImport.separator_detected;
    const headers = fileImport.headers_detected;
    
    console.log(`[AI Import] Processing file: ${fileImport.file_name}, rows: ${fileImport.total_rows}`);
    console.log('[AI Import] Detected headers:', headers);

    const lines = fileContent.split('\n').filter((line: string) => line.trim());
    const dataRows = lines.slice(1);

    let processedRows = existingLog?.righe_importate || 0;
    let errorRows = 0;
    const errors: any[] = [];
    const batchSize = customBatchSize; // Use custom batch size from request
    const maxProcessingTime = customTimeout; // Use custom timeout from request
    const startTime = Date.now();

    // Helper functions
    const getFieldIndex = (headerName: string, isSecondOccurrence = false): number => {
      const indexes: number[] = [];
      headers.forEach((header: string, index: number) => {
        if (header.toLowerCase().trim() === headerName.toLowerCase()) {
          indexes.push(index);
        }
      });
      const result = isSecondOccurrence && indexes.length > 1 ? indexes[1] : indexes[0];
      return result !== undefined ? result : -1;
    };

    const getFieldValue = (fieldName: string, values: string[], isSecondOccurrence = false): string | null => {
      const index = getFieldIndex(fieldName, isSecondOccurrence);
      if (index >= 0 && index < values.length) {
        const value = values[index];
        // Return raw value without any validation or cleaning
        if (!value || value === 'NULL' || value.trim() === '') return null;
        return value.replace(/^["']|["']$/g, '').trim();
      }
      return null;
    };

    const getBooleanValue = (value: string | null) => {
      if (!value || value === 'NULL' || value === '') return false;
      return value === '1' || value.toLowerCase() === 'true';
    };

    const parseDate = (dateValue: string | null) => {
      if (!dateValue || dateValue === 'NULL' || dateValue === '########') return null;
      try {
        if (dateValue.includes('/')) {
          const parts = dateValue.split(' ')[0].split('/');
          if (parts.length === 3) {
            const [day, month, year] = parts;
            const fullYear = year.length === 2 ? `20${year}` : year;
            return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
        }
        return dateValue;
      } catch {
        return null;
      }
    };

    // Start processing from where we left off
    const startFromRow = processedRows;
    let totalValidRecords = 0;
    
    // Process in smaller batches and store in temp table
    for (let batchStart = startFromRow; batchStart < dataRows.length; batchStart += batchSize) {
      // Check timeout
      if (Date.now() - startTime > maxProcessingTime) {
        console.log('[AI Import] Processing timeout reached, will resume later');
        break;
      }

      const batchEnd = Math.min(batchStart + batchSize, dataRows.length);
      const batchRows = dataRows.slice(batchStart, batchEnd);
      const tempRecords = [];

      console.log(`[AI Import] Processing batch ${Math.floor(batchStart / batchSize) + 1}: rows ${batchStart + 1}-${batchEnd}`);

      for (let i = 0; i < batchRows.length; i++) {
        const globalRowIndex = batchStart + i;
        const row = batchRows[i];
        
        try {
          const values = row.split(separator);
          
          // Store raw data as JSON in temp table
          const rawData: any = {};
          headers.forEach((header: string, index: number) => {
            if (index < values.length) {
              const value = values[index];
              if (value && value !== 'NULL' && value.trim() !== '') {
                rawData[header] = value.replace(/^["']|["']$/g, '').trim();
              }
            }
          });

          tempRecords.push({
            import_log_id: importLogId,
            row_number: globalRowIndex + 1,
            raw_data: rawData
          });
          
          totalValidRecords++;
          processedRows++;
          
        } catch (rowError: any) {
          console.error(`[AI Import] Error processing row ${globalRowIndex + 1}:`, rowError);
          errors.push({ row: globalRowIndex + 1, error: rowError.message });
          errorRows++;
          processedRows++;
        }
      }

      // Insert batch into temp table
      if (tempRecords.length > 0) {
        const { error: insertError } = await supabaseClient
          .from('temp_ai_import')
          .insert(tempRecords);

        if (insertError) {
          console.error('[AI Import] Insert error:', insertError);
          errorRows += tempRecords.length;
          totalValidRecords -= tempRecords.length;
          errors.push({ batch: Math.floor(batchStart / batchSize) + 1, error: insertError.message });
        }
      }

      // Update progress more frequently
      await supabaseClient
        .from('import_logs')
        .update({
          righe_importate: totalValidRecords,
          righe_errori: errorRows,
          stato: 'elaborazione'
        })
        .eq('id', importLogId);

      console.log(`[AI Import] Batch completed. Valid records: ${totalValidRecords}, Errors: ${errorRows}, Progress: ${processedRows}/${dataRows.length}`);
    }

    // Determine final status
    const isComplete = processedRows >= dataRows.length;
    const finalStatus = isComplete 
      ? (errorRows === 0 ? 'completato' : 'completato_con_errori')
      : 'elaborazione';

    // Final updates
    await supabaseClient
      .from('import_logs')
      .update({
        righe_totali: dataRows.length,
        righe_importate: totalValidRecords,
        righe_errori: errorRows,
        stato: finalStatus,
        errori: errors.length > 0 ? { errors: errors.slice(0, 20) } : null,
        completed_at: isComplete ? new Date().toISOString() : null
      })
      .eq('id', importLogId);

    if (isComplete) {
      await supabaseClient
        .from('file_imports')
        .update({ stato: 'elaborato' })
        .eq('id', fileImport.id);
    }

    console.log(`[AI Import] Processing ${isComplete ? 'completed' : 'paused'}. Valid records: ${totalValidRecords}, Errors: ${errorRows}, Total processed: ${processedRows}/${dataRows.length}`);

    return new Response(JSON.stringify({
      success: true,
      data: {
        importLogId,
        totalRows: dataRows.length,
        validRecords: totalValidRecords,
        errorRows,
        processedRows,
        isComplete,
        errors: errors.slice(0, 5)
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[AI Import] Errore nell\'elaborazione file salvato:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error?.message || 'Errore sconosciuto' 
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
