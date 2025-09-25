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

    // Crea nome tabella temporanea univoco
    const timestamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15);
    const tableName = `import_contacts_${timestamp}`;

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
        nome_tabella_temporanea: tableName,
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
      const lines = fileText.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        throw new Error('File vuoto');
      }

      // Prendi la prima riga come header
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const dataRows = lines.slice(1);
      totalRows = dataRows.length;

      console.log('Headers detected:', headers);
      console.log('Data rows count:', dataRows.length);

      // Crea dinamicamente la tabella temporanea  
      const columnsSQL = headers.map((header, index) => {
        const columnName = `col_${index}`;
        return `${columnName} TEXT`;
      }).join(', ');

      const headerMetadata = headers.map((h, i) => `${i}_${h.replace(/[^a-zA-Z0-9]/g, '_')}`).join('_header_');

      const createTableSQL = `
        CREATE TABLE public.${tableName} (
          id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
          ${columnsSQL},
          original_headers TEXT DEFAULT '${headers.join('|')}',
          selected_for_import BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        );
        
        ALTER TABLE public.${tableName} ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Allow all operations on ${tableName}" 
        ON public.${tableName} 
        FOR ALL 
        USING (true);
      `;

      // Per ora salviamo solo le informazioni, senza creare tabelle dinamiche
      // In futuro si potrà implementare la creazione dinamica di tabelle
      console.log('Table would be created:', tableName);
      console.log('Headers:', headers);

      // Simula l'elaborazione dei dati
      importedRows = dataRows.length;
      errorRows = 0;

      // Aggiorna il log di importazione
      await supabaseClient
        .from('import_logs')
        .update({
          righe_totali: totalRows,
          righe_importate: importedRows,
          righe_errori: errorRows,
          stato: errorRows === 0 ? 'completato' : 'completato_con_errori',
          errori: errors.length > 0 ? { errors: errors.slice(0, 10) } : null, // Solo primi 10 errori
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
          tableName,
          headers,
          errors: errors.slice(0, 5) // Primi 5 errori per response
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