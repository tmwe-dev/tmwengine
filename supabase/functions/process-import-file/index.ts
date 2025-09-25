import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { filePath, fileName } = await req.json();

    console.log('Processing import:', { filePath, fileName });

    // Scarica il file dal storage
    const { data: fileData, error: downloadError } = await supabaseClient.storage
      .from('import-files')
      .download(filePath);

    if (downloadError || !fileData) {
      throw new Error('Errore nel download del file');
    }

    // Inizia il log di importazione
    const { data: importLog, error: logError } = await supabaseClient
      .from('import_logs')
      .insert({
        file_path: filePath,
        file_name: fileName,
        stato: 'in_corso'
      })
      .select()
      .single();

    if (logError) {
      throw new Error('Errore nella creazione del log');
    }

    let importedRows = 0;
    let errorRows = 0;
    let totalRows = 0;
    const errors: any[] = [];

    try {
      // Converte il file in testo per elaborazione
      const fileText = await fileData.text();
      const lines = fileText.split('\n').filter((line: string) => line.trim());
      
      if (lines.length === 0) {
        throw new Error('File vuoto');
      }

      // Detect separator - prioritize TAB detection
      const firstLine = lines[0];
      let separator = '\t'; // Default to TAB
      let headers: string[];
      
      // Try TAB first
      const tabHeaders = firstLine.split('\t').map((h: string) => h.trim().replace(/"/g, ''));
      if (tabHeaders.length > 1) {
        separator = '\t';
        headers = tabHeaders;
        console.log('Detected separator: TAB');
      } else {
        // Fall back to comma
        separator = ',';
        headers = firstLine.split(',').map((h: string) => h.trim().replace(/"/g, ''));
        console.log('Detected separator: COMMA');
      }
      
      const dataRows = lines.slice(1);
      totalRows = dataRows.length;

      console.log('Headers detected:', headers);
      console.log('Headers count:', headers.length);
      console.log('Data rows count:', dataRows.length);

      // Create header mapping for field matching
      const headerMap: { [key: string]: number } = {};
      headers.forEach((header: string, index: number) => {
        headerMap[header.toLowerCase()] = index;
      });

      console.log('Header mapping created with', Object.keys(headerMap).length, 'fields');

      // Helper function to get value by header name
      const getValue = (values: string[], headerName: string): string | null => {
        const index = headerMap[headerName.toLowerCase()];
        if (index !== undefined && values[index]) {
          const val = values[index].trim();
          return val === 'NULL' || val === '' ? null : val;
        }
        return null;
      };

      // Helper function to get boolean value
      const getBoolValue = (values: string[], headerName: string): boolean => {
        const val = getValue(values, headerName);
        return val === '1' || val === 'true' || val === 'TRUE';
      };

      // Processa e salva ogni riga nella tabella permanent imported_contacts
      const contactsToInsert = [];
      
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        try {
          const values = row.split(separator).map((v: string) => v.trim().replace(/"/g, ''));
          
          console.log(`Processing row ${i + 1}, values count: ${values.length}`);
          if (i < 3) {
            console.log(`Row ${i + 1} values:`, values.slice(0, 10)); // Log first 10 values for debugging
          }
          
          // Map CSV fields to our permanent table structure using header names
          const contactData: any = {
            import_log_id: importLog.id,
            row_number: i + 1,
            
            // Map fields using header names - handle both original and company sections
            original_id: getValue(values, 'id'),
            commercial_anagrafiche_id: getValue(values, 'commercial_anagrafiche_id'),
            name: getValue(values, 'name'),
            alias: getValue(values, 'alias'),
            company_alias: getValue(values, 'company_alias'),
            position: getValue(values, 'position'),
            title: getValue(values, 'title'),
            phone: getValue(values, 'phone'),
            cell: getValue(values, 'cell'),
            email: getValue(values, 'email'),
            country: getValue(values, 'country'),
            note: getValue(values, 'note'),
            stato: getValue(values, 'stato') || 'A',
            created_by: getValue(values, 'created_by'),
            agent_id: getValue(values, 'agent_id'),
            completed: getBoolValue(values, 'completed'),
            origin: getValue(values, 'origin'),
            client_code: getValue(values, 'client_code'),
            
            // Meta flags
            meta_client: getBoolValue(values, 'meta_client'),
            meta_express: getBoolValue(values, 'meta_express'),
            meta_sea_freight: getBoolValue(values, 'meta_sea_freight'),
            meta_air_freight: getBoolValue(values, 'meta_air_freight'),
            meta_interested: getBoolValue(values, 'meta_interested'),
            meta_reception_required_email: getBoolValue(values, 'meta_reception_required_email'),
            meta_contact_required_email: getBoolValue(values, 'meta_contact_required_email'),
            meta_presentation: getBoolValue(values, 'meta_presentation'),
            meta_exworks: getBoolValue(values, 'meta_exworks'),
            meta_hight_value_customer: getBoolValue(values, 'meta_hight_value_customer'),
            meta_tutorial: getBoolValue(values, 'meta_tutorial'),
            meta_rejected: getBoolValue(values, 'meta_rejected'),
            meta_wca: getBoolValue(values, 'meta_wca'),
            meta_exclient: getBoolValue(values, 'meta_exclient'),
            archiviata: getBoolValue(values, 'archiviata'),
            has_actions: getBoolValue(values, 'has_actions'),
            
            // Company data - look for company name field
            company_name: getValue(values, 'name') || null, // Use the second 'name' field for company
            address: getValue(values, 'address'),
            city: getValue(values, 'city'),
            zip_code: getValue(values, 'zip_code')
          };

          // Handle date fields with proper parsing
          const lastDate = getValue(values, 'last');
          if (lastDate && lastDate !== 'NULL') {
            try {
              // Try to parse the date (format: DD/MM/YY HH:mm or similar)
              const dateParts = lastDate.split(' ')[0].split('/');
              if (dateParts.length === 3) {
                const [day, month, year] = dateParts;
                const fullYear = year.length === 2 ? `20${year}` : year;
                contactData.last_contact = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
              }
            } catch (dateError) {
              console.log('Date parsing error for last:', lastDate, dateError);
            }
          }

          const scheduledDate = getValue(values, 'scheduled_contact');
          if (scheduledDate && scheduledDate !== 'NULL') {
            try {
              const dateParts = scheduledDate.split(' ')[0].split('/');
              if (dateParts.length === 3) {
                const [day, month, year] = dateParts;
                const fullYear = year.length === 2 ? `20${year}` : year;
                contactData.scheduled_contact = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
              }
            } catch (dateError) {
              console.log('Date parsing error for scheduled_contact:', scheduledDate, dateError);
            }
          }

          const nextContactDate = getValue(values, 'next_contact_date');
          if (nextContactDate && nextContactDate !== 'NULL') {
            try {
              const dateParts = nextContactDate.split(' ')[0].split('/');
              if (dateParts.length === 3) {
                const [day, month, year] = dateParts;
                const fullYear = year.length === 2 ? `20${year}` : year;
                contactData.next_contact_date = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
              }
            } catch (dateError) {
              console.log('Date parsing error for next_contact_date:', nextContactDate, dateError);
            }
          }

          contactsToInsert.push(contactData);
          importedRows++;
        } catch (rowError: any) {
          console.error(`Error processing row ${i + 1}:`, rowError);
          errors.push({ row: i + 1, error: rowError.message });
          errorRows++;
        }
      }

      console.log(`Prepared ${contactsToInsert.length} contacts for insert`);

      // Insert contacts in batches to avoid timeouts
      const batchSize = 1000;
      for (let i = 0; i < contactsToInsert.length; i += batchSize) {
        const batch = contactsToInsert.slice(i, i + batchSize);
        console.log(`Inserting batch ${Math.floor(i/batchSize) + 1}, records ${i + 1} to ${Math.min(i + batchSize, contactsToInsert.length)}`);
        
        const { error: insertError } = await supabaseClient
          .from('imported_contacts')
          .insert(batch);

        if (insertError) {
          console.error('Batch insert error:', insertError);
          throw new Error(`Errore nell'inserimento batch: ${insertError.message}`);
        }
      }

      console.log('All batches inserted successfully');

      // Aggiorna il log di importazione
      await supabaseClient
        .from('import_logs')
        .update({
          righe_totali: totalRows,
          righe_importate: importedRows,
          righe_errori: errorRows,
          stato: errorRows === 0 ? 'completato' : 'completato_con_errori',
          errori: errors.length > 0 ? { errors: errors.slice(0, 10) } : null,
          completed_at: new Date().toISOString()
        })
        .eq('id', importLog.id);

      return new Response(JSON.stringify({
        success: true,
        data: {
          importLogId: importLog.id,
          totalRows,
          importedRows,
          errorRows,
          headers,
          errors: errors.slice(0, 5)
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (processingError: any) {
      // Aggiorna log con errore
      await supabaseClient
        .from('import_logs')
        .update({
          stato: 'errore',
          errori: { error: processingError?.message || 'Errore di elaborazione' },
          completed_at: new Date().toISOString()
        })
        .eq('id', importLog.id);

      throw processingError;
    }

  } catch (error: any) {
    console.error('Errore nell\'elaborazione:', error);
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