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

      // Auto-detect separator
      let separator = '\t';
      const testSeparators = [';', '\t', ','];
      let maxColumns = 0;
      
      for (const testSep of testSeparators) {
        const testHeaders = firstLine.split(testSep);
        console.log(`Testing separator "${testSep}": ${testHeaders.length} columns`);
        if (testHeaders.length > maxColumns) {
          maxColumns = testHeaders.length;
          separator = testSep;
        }
      }
      
      const headers = firstLine.split(separator).map(h => h.replace(/["\r\n]/g, '').trim());
      
      console.log(`Selected separator: "${separator}"`);
      console.log('Headers count after split:', headers.length);
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
      
      // Processa e salva ogni riga nella tabella permanent imported_contacts in batch
      const contactsToInsert = [];
      const batchSize = 1000; // Processa 1000 record alla volta
      let processedRows = 0;
      
      // Mappa i campi basandoci sulle specifiche dettagliate
      const getFieldIndex = (headerName: string, isSecondOccurrence = false): number => {
        const indexes: number[] = [];
        headers.forEach((header, index) => {
          if (header.toLowerCase().trim() === headerName.toLowerCase()) {
            indexes.push(index);
          }
        });
        const result = isSecondOccurrence && indexes.length > 1 ? indexes[1] : indexes[0];
        return result !== undefined ? result : -1; // Return -1 if not found
      };

      const getFieldValue = (fieldName: string, values: string[], isSecondOccurrence = false): string | null => {
        const index = getFieldIndex(fieldName, isSecondOccurrence);
        if (index >= 0 && index < values.length) {
          const value = values[index];
          if (!value || value === 'NULL') return null;
          // Rimuove virgolette e spazi
          return value.replace(/^["']|["']$/g, '').trim() || null;
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
          // Formato DD/MM/YY
          if (dateValue.includes('/')) {
            const parts = dateValue.split(' ')[0].split('/');
            if (parts.length === 3) {
              const [day, month, year] = parts;
              const fullYear = year.length === 2 ? `20${year}` : year;
              return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
          }
          // Altri formati già supportati
          return dateValue;
        } catch {
          return null;
        }
      };
      
      // Aggiorna il log con progresso iniziale
      await supabaseClient
        .from('import_logs')
        .update({
          righe_totali: totalRows,
          stato: 'elaborazione'
        })
        .eq('id', importLog.id);
      
      // Processa tutte le righe in batch
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        try {
          const values = row.split(separator);
          
          console.log(`Row ${i + 1} - fields count: ${values.length}`);
          
          // Sezione CONTATTI (prime colonne)
          const contactData: any = {
            import_log_id: importLog.id,
            row_number: i + 1,
            
            // Identificatori
            original_id: getFieldValue('id', values),
            commercial_anagrafiche_id: getFieldValue('commercial_anagrafiche_id', values),
            
            // Dati contatto
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
            
            // Stati e metadati
            stato: getFieldValue('stato', values) || 'A',
            created_by: getFieldValue('created_by', values),
            agent_id: getFieldValue('agent_id', values),
            completed: getBooleanValue(getFieldValue('completed', values)),
            origin: getFieldValue('origin', values),
            client_code: getFieldValue('client_code', values),
            
            // Meta flags booleani
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
            
            // Sezione AZIENDA (seconda occorrenza dei campi)
            company_name: getFieldValue('name', values, true), // Nome completo azienda dalla seconda occorrenza
            address: getFieldValue('address', values),
            city: getFieldValue('city', values),
            zip_code: getFieldValue('zip_code', values)
          };

          // Parse date fields
          contactData.last_contact = parseDate(getFieldValue('last', values));
          contactData.scheduled_contact = parseDate(getFieldValue('scheduled_contact', values));
          contactData.next_contact_date = parseDate(getFieldValue('next_contact_date', values));

          contactsToInsert.push(contactData);
          processedRows++;
          
          // Salva batch quando raggiunge la dimensione o è l'ultimo record
          if (contactsToInsert.length >= batchSize || i === dataRows.length - 1) {
            console.log(`Inserimento batch di ${contactsToInsert.length} contatti`);
            
            const { error: insertError } = await supabaseClient
              .from('imported_contacts')
              .insert(contactsToInsert);

            if (insertError) {
              console.error('Insert error:', insertError);
              throw new Error(`Errore nell'inserimento batch: ${insertError.message}`);
            }
            
            // Aggiorna il progresso nel log
            await supabaseClient
              .from('import_logs')
              .update({
                righe_importate: processedRows,
                stato: 'elaborazione'
              })
              .eq('id', importLog.id);
            
            console.log(`Batch salvato. Progresso: ${processedRows}/${totalRows}`);
            
            // Svuota il batch per il prossimo giro
            contactsToInsert.length = 0;
          }
          
        } catch (rowError: any) {
          console.error(`Error processing row ${i + 1}:`, rowError);
          errors.push({ row: i + 1, error: rowError.message });
          errorRows++;
        }
      }

      console.log(`Importazione completata. Record elaborati: ${processedRows}`);

      // Aggiorna il log di importazione finale
      await supabaseClient
        .from('import_logs')
        .update({
          righe_totali: totalRows,
          righe_importate: processedRows, // Usa processedRows invece di importedRows
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
          importedRows: processedRows, // Usa processedRows invece di importedRows
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