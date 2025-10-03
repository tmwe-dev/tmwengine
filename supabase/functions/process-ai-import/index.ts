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

    const { importLogId, aiPrompt } = await req.json();
    console.log('[AI Process] Starting AI processing for import log:', importLogId);
    console.log('[AI Process] AI Prompt:', aiPrompt);

    // Get all temp records for this import
    const { data: tempRecords, error: fetchError } = await supabaseClient
      .from('temp_ai_import')
      .select('*')
      .eq('import_log_id', importLogId)
      .order('row_number');

    if (fetchError) {
      throw new Error(`Error fetching temp records: ${fetchError.message}`);
    }

    if (!tempRecords || tempRecords.length === 0) {
      throw new Error('No temp records found for this import');
    }

    console.log(`[AI Process] Found ${tempRecords.length} temp records to process`);

    // TODO: Here we will call the AI to process the data
    // For now, just copy the raw data to imported_contacts
    const contactsToInsert = tempRecords.map(record => ({
      import_log_id: importLogId,
      row_number: record.row_number,
      // Map raw_data fields to imported_contacts fields
      name: record.raw_data.name || record.raw_data.Nome || null,
      company_name: record.raw_data.company_name || record.raw_data['Ragione Sociale'] || null,
      email: record.raw_data.email || record.raw_data.Email || null,
      phone: record.raw_data.phone || record.raw_data.Telefono || null,
      cell: record.raw_data.cell || record.raw_data.Cellulare || null,
      country: record.raw_data.country || record.raw_data.Paese || null,
      city: record.raw_data.city || record.raw_data.Città || null,
      address: record.raw_data.address || record.raw_data.Indirizzo || null,
      note: record.raw_data.note || record.raw_data.Note || null,
    }));

    // Insert processed records into imported_contacts
    const { error: insertError } = await supabaseClient
      .from('imported_contacts')
      .insert(contactsToInsert);

    if (insertError) {
      throw new Error(`Error inserting contacts: ${insertError.message}`);
    }

    // Update import log status
    await supabaseClient
      .from('import_logs')
      .update({
        stato: 'completato',
        righe_importate: contactsToInsert.length,
        completed_at: new Date().toISOString()
      })
      .eq('id', importLogId);

    // Clean up temp table
    await supabaseClient
      .from('temp_ai_import')
      .delete()
      .eq('import_log_id', importLogId);

    console.log(`[AI Process] Processing completed. ${contactsToInsert.length} contacts inserted`);

    return new Response(JSON.stringify({
      success: true,
      data: {
        processedRecords: contactsToInsert.length,
        importLogId
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[AI Process] Error:', error);
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
