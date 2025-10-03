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

    const { importLogId, mode } = await req.json();
    console.log('[Generate File] Starting for import:', importLogId, 'mode:', mode);

    // Get import log info
    const { data: importLog, error: logError } = await supabaseClient
      .from('import_logs')
      .select('*, file_imports(*)')
      .eq('id', importLogId)
      .single();

    if (logError || !importLog) {
      throw new Error(`Import log not found: ${logError?.message}`);
    }

    let normalizedData: any[] = [];

    if (mode === 'row_normalization') {
      // Get normalized data from temp_ai_reviewed
      const { data: reviewedData, error: reviewError } = await supabaseClient
        .from('temp_ai_reviewed')
        .select('normalized_data, validation_status')
        .eq('import_log_id', importLogId)
        .eq('validation_status', 'normalized')
        .order('row_number');

      if (reviewError) {
        throw new Error(`Error fetching reviewed data: ${reviewError.message}`);
      }

      normalizedData = reviewedData?.map(r => r.normalized_data) || [];
    } else {
      // Column mapping - get from imported_contacts
      const { data: contacts, error: contactsError } = await supabaseClient
        .from('imported_contacts')
        .select('*')
        .eq('import_log_id', importLogId)
        .order('row_number');

      if (contactsError) {
        throw new Error(`Error fetching contacts: ${contactsError.message}`);
      }

      normalizedData = contacts || [];
    }

    if (normalizedData.length === 0) {
      throw new Error('No data to export');
    }

    // Generate CSV content
    const headers = [
      'name', 'company_name', 'position', 'title', 
      'email', 'phone', 'cell',
      'address', 'city', 'state', 'country', 'zip_code',
      'origin', 'note'
    ];

    let csvContent = headers.join(',') + '\n';

    normalizedData.forEach(record => {
      const row = headers.map(header => {
        const value = record[header] || '';
        // Escape quotes and wrap in quotes if contains comma
        const escaped = String(value).replace(/"/g, '""');
        return escaped.includes(',') ? `"${escaped}"` : escaped;
      });
      csvContent += row.join(',') + '\n';
    });

    // Save to storage bucket
    const fileName = `normalized_${importLogId}_${Date.now()}.csv`;
    const filePath = `normalized/${fileName}`;

    const { error: uploadError } = await supabaseClient
      .storage
      .from('import-files')
      .upload(filePath, new Blob([csvContent], { type: 'text/csv' }), {
        contentType: 'text/csv',
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Upload error: ${uploadError.message}`);
    }

    // Create file_imports record for the normalized file
    const { data: newFileImport, error: fileError } = await supabaseClient
      .from('file_imports')
      .insert({
        file_name: fileName,
        file_path: filePath,
        file_size: new TextEncoder().encode(csvContent).length,
        file_content: csvContent,
        stato: 'processato',
        total_rows: normalizedData.length,
        separator_detected: ',',
        headers_detected: headers
      })
      .select()
      .single();

    if (fileError) {
      throw new Error(`Error creating file record: ${fileError.message}`);
    }

    // Update import_logs with final file reference
    await supabaseClient
      .from('import_logs')
      .update({
        final_file_path: filePath,
        final_file_id: newFileImport.id,
        stato: 'completato',
        completed_at: new Date().toISOString()
      })
      .eq('id', importLogId);

    console.log('[Generate File] Success:', fileName);

    return new Response(JSON.stringify({
      success: true,
      file_path: filePath,
      file_name: fileName,
      file_id: newFileImport.id,
      records_count: normalizedData.length
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
