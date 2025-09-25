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

      const firstLine = lines[0];
      console.log('First line raw:', JSON.stringify(firstLine));
      console.log('First line length:', firstLine.length);

      // Force TAB separator detection
      const separator = '\t';
      const headers = firstLine.split(separator);
      
      console.log('Headers count after TAB split:', headers.length);
      console.log('First 10 headers:', headers.slice(0, 10));
      
      if (headers.length < 10) {
        throw new Error(`Header parsing failed: only ${headers.length} columns found`);
      }

      const dataRows = lines.slice(1);
      totalRows = dataRows.length;

      console.log('Data rows count:', dataRows.length);
      if (dataRows.length > 0) {
        const firstDataRow = dataRows[0].split(separator);
        console.log('First data row fields count:', firstDataRow.length);
        console.log('First 5 fields of first row:', firstDataRow.slice(0, 5));
      }

      // Processa e salva ogni riga nella tabella permanent imported_contacts
      const contactsToInsert = [];
      
      for (let i = 0; i < Math.min(dataRows.length, 10); i++) { // Process only first 10 for debugging
        const row = dataRows[i];
        try {
          const values = row.split(separator);
          
          console.log(`Row ${i + 1} - fields count: ${values.length}`);
          console.log(`Row ${i + 1} - first 10 values:`, values.slice(0, 10));
          
          // Basic mapping based on the known structure
          const contactData: any = {
            import_log_id: importLog.id,
            row_number: i + 1,
            
            // Map based on header positions from your example
            original_id: values[0] || null,
            commercial_anagrafiche_id: values[1] || null,
            name: values[2] || null,
            alias: values[3] || null,
            company_alias: values[4] || null,
            position: values[5] || null,
            title: values[6] || null,
            phone: values[7] || null,
            cell: values[8] || null,
            email: values[9] || null,
            country: values[10] || null,
            note: values[11] || null,
            stato: values[12] || 'A',
            created_by: values[13] || null,
            agent_id: values[16] || null,
            completed: values[17] === '1' || values[17] === 'true',
            origin: values[21] || null,
            client_code: values[22] || null,
            
            // Meta flags (positions 23-37)
            meta_client: values[23] === '1',
            meta_express: values[24] === '1',
            meta_sea_freight: values[25] === '1',
            meta_air_freight: values[26] === '1',
            meta_interested: values[27] === '1',
            meta_reception_required_email: values[28] === '1',
            meta_contact_required_email: values[29] === '1',
            meta_presentation: values[30] === '1',
            meta_exworks: values[31] === '1',
            meta_hight_value_customer: values[32] === '1',
            meta_tutorial: values[33] === '1',
            meta_rejected: values[34] === '1',
            meta_wca: values[35] === '1',
            meta_exclient: values[36] === '1',
            archiviata: values[37] === '1',
            has_actions: values[38] === '1',
            
            // Company data from the second part (around position 39+)
            company_name: values[40] || null,
            address: values[42] || null,
            city: values[45] || null,
            zip_code: values[44] || null
          };

          // Handle date fields if they exist
          if (values[18] && values[18] !== 'NULL') {
            try {
              const dateParts = values[18].split('/');
              if (dateParts.length === 3) {
                const [day, month, year] = dateParts;
                const fullYear = year.length === 2 ? `20${year}` : year;
                contactData.last_contact = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
              }
            } catch (dateError) {
              console.log('Date parsing error for last:', values[18], dateError);
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

      // Insert contacts
      if (contactsToInsert.length > 0) {
        const { error: insertError } = await supabaseClient
          .from('imported_contacts')
          .insert(contactsToInsert);

        if (insertError) {
          console.error('Insert error:', insertError);
          throw new Error(`Errore nell'inserimento: ${insertError.message}`);
        }
      }

      console.log('Records inserted successfully');

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
          headers: headers.slice(0, 10),
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