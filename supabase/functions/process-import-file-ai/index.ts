import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

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
    console.log('[AI Import] Saving file for processing:', { filePath, fileName });

    // Scarica il file dal storage
    const { data: fileData, error: downloadError } = await supabaseClient.storage
      .from('import-files')
      .download(filePath);

    if (downloadError || !fileData) {
      throw new Error('Errore nel download del file');
    }

    // Converti il file in testo
    const fileContent = await fileData.text();
    const fileSize = new Blob([fileContent]).size;

    console.log(`[AI Import] File size: ${fileSize} bytes`);

    // Inizia il log di importazione
    const { data: importLog, error: logError } = await supabaseClient
      .from('import_logs')
      .insert({
        file_path: filePath,
        file_name: fileName,
        stato: 'file_salvato'
      })
      .select()
      .single();

    if (logError) {
      throw new Error('Errore nella creazione del log');
    }

    // Analizza la struttura del file
    const lines = fileContent.split('\n').filter((line: string) => line.trim());
    
    if (lines.length === 0) {
      throw new Error('File vuoto');
    }

    const firstLine = lines[0];
    
    // Auto-detect separator
    let separator = '\t';
    const testSeparators = [';', '\t', ','];
    let maxColumns = 0;
    
    for (const testSep of testSeparators) {
      const testHeaders = firstLine.split(testSep);
      if (testHeaders.length > maxColumns) {
        maxColumns = testHeaders.length;
        separator = testSep;
      }
    }
    
    const headers = firstLine.split(separator).map(h => h.replace(/["\r\n]/g, '').trim());
    console.log(`[AI Import] Detected separator: "${separator}", headers: ${headers.length}`);
    
    if (headers.length < 10) {
      throw new Error(`Header parsing failed: only ${headers.length} columns found`);
    }

    const dataRows = lines.slice(1);
    const totalRows = dataRows.length;

    // Salva il file completo nel database
    const { data: fileImport, error: fileImportError } = await supabaseClient
      .from('file_imports')
      .insert({
        file_name: fileName,
        file_path: filePath,
        file_content: fileContent,
        file_size: fileSize,
        separator_detected: separator,
        headers_detected: headers,
        total_rows: totalRows,
        stato: 'salvato',
        import_log_id: importLog.id
      })
      .select()
      .single();

    if (fileImportError) {
      throw new Error(`Errore nel salvataggio file: ${fileImportError.message}`);
    }

    // Aggiorna il log di importazione
    await supabaseClient
      .from('import_logs')
      .update({
        righe_totali: totalRows,
        stato: 'pronto_per_elaborazione'
      })
      .eq('id', importLog.id);

    console.log(`[AI Import] File saved successfully. Rows: ${totalRows}, Headers: ${headers.length}`);

    // Ritorna informazioni immediate
    return new Response(JSON.stringify({
      success: true,
      data: {
        importLogId: importLog.id,
        fileImportId: fileImport.id,
        totalRows,
        headers: headers.slice(0, 10),
        separator,
        message: 'File salvato e pronto per elaborazione AI'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[AI Import] Errore nel salvataggio file:', error);
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
