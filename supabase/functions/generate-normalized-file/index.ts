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

    const { importLogId, format = 'csv' } = await req.json();
    console.log('[Generate File] Starting file generation:', { importLogId, format });

    // Get normalized data from temp_ai_reviewed
    const { data: normalizedData, error: fetchError } = await supabaseClient
      .from('temp_ai_reviewed')
      .select('*')
      .eq('import_log_id', importLogId)
      .eq('validation_status', 'normalized')
      .order('row_number');

    if (fetchError) {
      throw new Error(`Error fetching normalized data: ${fetchError.message}`);
    }

    if (!normalizedData || normalizedData.length === 0) {
      throw new Error('No normalized data found');
    }

    console.log(`[Generate File] Found ${normalizedData.length} normalized records`);

    // Extract normalized data fields
    const records = normalizedData.map(r => r.normalized_data);

    // Generate CSV content
    const headers = Object.keys(records[0] || {}).filter(k => k !== null);
    const csvRows = [headers.join(',')];
    
    records.forEach(record => {
      const values = headers.map(header => {
        const value = record[header];
        if (value === null || value === undefined) return '';
        // Escape quotes and wrap in quotes if contains comma
        const stringValue = String(value);
        return stringValue.includes(',') || stringValue.includes('"') 
          ? `"${stringValue.replace(/"/g, '""')}"` 
          : stringValue;
      });
      csvRows.push(values.join(','));
    });

    const csvContent = csvRows.join('\n');
    const fileName = `normalized_import_${importLogId}_${Date.now()}.csv`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('import-files')
      .upload(fileName, csvContent, {
        contentType: 'text/csv',
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Error uploading file: ${uploadError.message}`);
    }

    console.log('[Generate File] File uploaded:', uploadData.path);

    // Get public URL
    const { data: { publicUrl } } = supabaseClient.storage
      .from('import-files')
      .getPublicUrl(uploadData.path);

    // Create file_imports record
    const { data: fileImport, error: fileImportError } = await supabaseClient
      .from('file_imports')
      .insert({
        file_name: fileName,
        file_path: uploadData.path,
        file_content: csvContent,
        file_size: new Blob([csvContent]).size,
        stato: 'normalizzato',
        total_rows: normalizedData.length,
        headers_detected: headers,
        separator_detected: ',',
        import_log_id: importLogId
      })
      .select()
      .single();

    if (fileImportError) {
      throw new Error(`Error creating file_imports record: ${fileImportError.message}`);
    }

    // Update import_logs with final file reference
    await supabaseClient
      .from('import_logs')
      .update({
        final_file_path: uploadData.path,
        final_file_id: fileImport.id,
        stato: 'normalizzato'
      })
      .eq('id', importLogId);

    console.log('[Generate File] Process completed successfully');

    return new Response(JSON.stringify({
      success: true,
      file: {
        id: fileImport.id,
        name: fileName,
        path: uploadData.path,
        publicUrl,
        totalRecords: normalizedData.length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[Generate File] Error:', error);
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
