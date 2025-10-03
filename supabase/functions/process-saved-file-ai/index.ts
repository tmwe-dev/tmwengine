import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Data validation functions
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^[\+]?[\d\s\-\(\)]{7,20}$/;
  return phoneRegex.test(phone.trim());
};

const isValidCountry = (country: string): boolean => {
  // Check if it looks like a country name (no @ symbol, reasonable length)
  return !country.includes('@') && country.length >= 2 && country.length <= 50 && !/^\d+$/.test(country);
};

const isValidName = (name: string): boolean => {
  // Name shouldn't contain @ or be just numbers
  return !name.includes('@') && !/^\d+$/.test(name) && name.length >= 1 && name.length <= 100;
};

const isValidCompanyName = (company: string): boolean => {
  // Company name basic validation
  return company.length >= 1 && company.length <= 200 && !company.includes('@');
};

const validateAndCleanData = (data: any, fieldName: string, rawValue: string | null): any => {
  if (!rawValue || rawValue === 'NULL' || rawValue.trim() === '') {
    return null;
  }

  const cleanValue = rawValue.replace(/^["']|["']$/g, '').trim();

  switch (fieldName) {
    case 'email':
      return isValidEmail(cleanValue) ? cleanValue.toLowerCase() : null;
    
    case 'phone':
    case 'cell':
      return isValidPhone(cleanValue) ? cleanValue : null;
    
    case 'country':
      return isValidCountry(cleanValue) ? cleanValue : null;
    
    case 'name':
    case 'alias':
      return isValidName(cleanValue) ? cleanValue : null;
    
    case 'company_name':
    case 'company_alias':
      return isValidCompanyName(cleanValue) ? cleanValue : null;
    
    case 'city':
      return (cleanValue.length >= 1 && cleanValue.length <= 100 && !cleanValue.includes('@')) ? cleanValue : null;
    
    default:
      return cleanValue.length <= 500 ? cleanValue : cleanValue.substring(0, 500);
  }
};

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
        return validateAndCleanData(null, fieldName, value);
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
    
    // Process in smaller batches
    for (let batchStart = startFromRow; batchStart < dataRows.length; batchStart += batchSize) {
      // Check timeout
      if (Date.now() - startTime > maxProcessingTime) {
        console.log('[AI Import] Processing timeout reached, will resume later');
        break;
      }

      const batchEnd = Math.min(batchStart + batchSize, dataRows.length);
      const batchRows = dataRows.slice(batchStart, batchEnd);
      const contactsToInsert = [];

      console.log(`[AI Import] Processing batch ${Math.floor(batchStart / batchSize) + 1}: rows ${batchStart + 1}-${batchEnd}`);

      for (let i = 0; i < batchRows.length; i++) {
        const globalRowIndex = batchStart + i;
        const row = batchRows[i];
        
        try {
          const values = row.split(separator);
          
          const contactData: any = {
            import_log_id: importLogId,
            row_number: globalRowIndex + 1,
            original_id: getFieldValue('id', values),
            commercial_anagrafiche_id: getFieldValue('commercial_anagrafiche_id', values),
            name: getFieldValue('name', values),
            alias: getFieldValue('alias', values),
            company_alias: getFieldValue('company_alias', values),
            position: getFieldValue('position', values),
            title: getFieldValue('title', values),
            phone: getFieldValue('phone', values),
            cell: getFieldValue('cell', values),
            email: getFieldValue('email', values),
            country: getFieldValue('country', values),
            note: getFieldValue('note', values),
            stato: getFieldValue('stato', values) || 'A',
            created_by: getFieldValue('created_by', values),
            agent_id: getFieldValue('agent_id', values),
            completed: getBooleanValue(getFieldValue('completed', values)),
            origin: getFieldValue('origin', values),
            client_code: getFieldValue('client_code', values),
            meta_client: getBooleanValue(getFieldValue('meta_client', values)),
            meta_express: getBooleanValue(getFieldValue('meta_express', values)),
            meta_sea_freight: getBooleanValue(getFieldValue('meta_sea_freight', values)),
            meta_air_freight: getBooleanValue(getFieldValue('meta_air_freight', values)),
            meta_interested: getBooleanValue(getFieldValue('meta_interested', values)),
            meta_reception_required_email: getBooleanValue(getFieldValue('meta_reception_required_email', values)),
            meta_contact_required_email: getBooleanValue(getFieldValue('meta_contact_required_email', values)),
            meta_presentation: getBooleanValue(getFieldValue('meta_presentation', values)),
            meta_exworks: getBooleanValue(getFieldValue('meta_exworks', values)),
            meta_hight_value_customer: getBooleanValue(getFieldValue('meta_hight_value_customer', values)),
            meta_tutorial: getBooleanValue(getFieldValue('meta_tutorial', values)),
            meta_rejected: getBooleanValue(getFieldValue('meta_rejected', values)),
            meta_wca: getBooleanValue(getFieldValue('meta_wca', values)),
            meta_exclient: getBooleanValue(getFieldValue('meta_exclient', values)),
            archiviata: getBooleanValue(getFieldValue('archiviata', values)),
            has_actions: getBooleanValue(getFieldValue('has_actions', values)),
            company_name: getFieldValue('name', values, true),
            address: getFieldValue('address', values),
            city: getFieldValue('city', values),
            zip_code: getFieldValue('zip_code', values)
          };

          // Parse date fields
          contactData.last_contact = parseDate(getFieldValue('last', values));
          contactData.scheduled_contact = parseDate(getFieldValue('scheduled_contact', values));
          contactData.next_contact_date = parseDate(getFieldValue('next_contact_date', values));

          // Validate essential fields - skip record if critical data is invalid
          const hasValidName = contactData.name || contactData.company_name || contactData.company_alias;
          const hasValidContact = contactData.email || contactData.phone || contactData.cell;

          if (hasValidName && hasValidContact) {
            contactsToInsert.push(contactData);
            totalValidRecords++;
          } else {
            console.log(`[AI Import] Skipping invalid record at row ${globalRowIndex + 1}: missing essential fields`);
            errors.push({ 
              row: globalRowIndex + 1, 
              error: 'Missing essential fields (name/company and contact info)' 
            });
            errorRows++;
          }
          
          processedRows++;
          
        } catch (rowError: any) {
          console.error(`[AI Import] Error processing row ${globalRowIndex + 1}:`, rowError);
          errors.push({ row: globalRowIndex + 1, error: rowError.message });
          errorRows++;
          processedRows++;
        }
      }

      // Insert batch
      if (contactsToInsert.length > 0) {
        const { error: insertError } = await supabaseClient
          .from('imported_contacts')
          .insert(contactsToInsert);

        if (insertError) {
          console.error('[AI Import] Insert error:', insertError);
          errorRows += contactsToInsert.length;
          totalValidRecords -= contactsToInsert.length;
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
