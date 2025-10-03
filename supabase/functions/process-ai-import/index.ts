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

    const { importLogId, aiPrompt, mode = 'column_mapping', batchSize = 50, offset = 0 } = await req.json();
    console.log('[AI Process] Starting AI processing:', { importLogId, mode, batchSize, offset });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Get import log info
    const { data: importLog } = await supabaseClient
      .from('import_logs')
      .select('righe_totali, normalization_method')
      .eq('id', importLogId)
      .single();

    // Get batch of temp records
    const { data: tempRecords, error: fetchError } = await supabaseClient
      .from('temp_ai_import')
      .select('*')
      .eq('import_log_id', importLogId)
      .order('row_number')
      .range(offset, offset + batchSize - 1);

    if (fetchError) {
      throw new Error(`Error fetching temp records: ${fetchError.message}`);
    }

    if (!tempRecords || tempRecords.length === 0) {
      // No more records, finalize import
      await supabaseClient
        .from('import_logs')
        .update({
          stato: 'completato',
          completed_at: new Date().toISOString()
        })
        .eq('id', importLogId);

      return new Response(JSON.stringify({
        success: true,
        completed: true,
        message: 'Import completed'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[AI Process] Processing batch: ${tempRecords.length} records (offset: ${offset})`);

    if (mode === 'row_normalization') {
      // AI Row-by-Row Normalization
      const systemPrompt = `You are a data normalization assistant. Analyze each contact record and extract/normalize fields into the standard schema.
      
OUTPUT STRICT JSON ARRAY with these fields for EACH record:
{
  "name": "string | null",
  "company_name": "string | null", 
  "email": "valid email | null",
  "phone": "phone number | null",
  "cell": "mobile number | null",
  "country": "country name | null",
  "city": "city name | null",
  "address": "address | null",
  "note": "notes | null"
}

RULES:
- Detect field type from content (email contains @, phone has numbers)
- Clean and format values properly
- Return null for missing/invalid data
- Output ONLY the JSON array, no other text`;

      const recordsJson = tempRecords.map(r => ({
        row: r.row_number,
        data: r.raw_data
      }));

      // Call Lovable AI with Gemini Flash (FREE until Oct 6!)
      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Normalize these ${tempRecords.length} records:\n${JSON.stringify(recordsJson)}` }
          ],
          temperature: 0.3
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        throw new Error(`AI API error: ${aiResponse.status} - ${errorText}`);
      }

      const aiData = await aiResponse.json();
      const normalizedText = aiData.choices?.[0]?.message?.content || '[]';
      
      // Parse AI response
      let normalized = [];
      try {
        const jsonMatch = normalizedText.match(/\[[\s\S]*\]/);
        normalized = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      } catch (e) {
        console.error('Failed to parse AI response:', e);
        normalized = [];
      }

      // Insert to temp_ai_reviewed
      const reviewedRecords = tempRecords.map((record, idx) => ({
        import_log_id: importLogId,
        row_number: record.row_number,
        raw_data: record.raw_data,
        normalized_data: normalized[idx] || null,
        validation_status: normalized[idx] ? 'normalized' : 'failed'
      }));

      await supabaseClient
        .from('temp_ai_reviewed')
        .insert(reviewedRecords);

      console.log(`[AI Process] Normalized ${normalized.length}/${tempRecords.length} records`);
    } else {
      // Column Mapping Mode (existing logic)
      const contactsToInsert = tempRecords.map(record => ({
        import_log_id: importLogId,
        row_number: record.row_number,
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

      await supabaseClient
        .from('imported_contacts')
        .insert(contactsToInsert);
    }

    // Update progress
    const currentBatch = Math.floor(offset / batchSize) + 1;
    const totalBatches = Math.ceil((importLog?.righe_totali || 0) / batchSize);

    await supabaseClient
      .from('import_logs')
      .update({
        processing_batch: currentBatch,
        total_batches: totalBatches,
        last_batch_at: new Date().toISOString(),
        righe_importate: offset + tempRecords.length
      })
      .eq('id', importLogId);

    return new Response(JSON.stringify({
      success: true,
      completed: false,
      data: {
        processedRecords: tempRecords.length,
        nextOffset: offset + batchSize,
        currentBatch,
        totalBatches,
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
