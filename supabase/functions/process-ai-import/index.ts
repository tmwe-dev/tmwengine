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

    const { importLogId, aiPrompt, mode = 'column_mapping', batchSize = 50, offset = 0, origin } = await req.json();
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
      const systemPrompt = `You are an intelligent data normalization assistant. Analyze each contact record, extract/normalize fields, and COMPLETE missing data when you are CERTAIN.

OUTPUT STRICT JSON ARRAY with these fields for EACH record:
{
  "name": "string | null",
  "company_name": "string | null", 
  "email": "valid email | null",
  "phone": "phone number with international format | null",
  "cell": "mobile number with international format | null",
  "country": "country name in English | null",
  "city": "city name | null",
  "state": "state/province/region | null",
  "address": "address | null",
  "zip_code": "postal code | null",
  "note": "notes | null"
}

CRITICAL RULES - DATA COMPLETION:

1. **PHONE INTELLIGENCE (ALL COUNTRIES)**:
   - Recognize phone numbers from ANY country and add correct international prefix
   - Examples by country:
     * USA/Canada (+1): "3049050980" → "+13049050980"
     * Italy (+39): "3351234567" → "+393351234567"
     * France (+33): "612345678" → "+33612345678"
     * Germany (+49): "1701234567" → "+491701234567"
     * UK (+44): "7700900000" → "+447700900000"
     * Spain (+34): "612345678" → "+34612345678"
     * Japan (+81): "9012345678" → "+819012345678"
     * China (+86): "13812345678" → "+8613812345678"
   - Remove all spaces, dashes, parentheses: format as +[code][number]
   - If prefix already exists, validate and fix format

2. **GEOGRAPHIC INTELLIGENCE (ALL COUNTRIES)**:
   - Infer state/province/region from well-known cities:
     * USA: Miami→FL, New York→NY, Los Angeles→CA, Chicago→IL, Houston→TX, Boston→MA
     * Italy: Roma→Lazio, Milano→Lombardia, Napoli→Campania, Torino→Piemonte, Firenze→Toscana
     * Germany: Berlin→BE, München→BY, Hamburg→HH, Frankfurt→HE, Köln→NW
     * France: Paris→Île-de-France, Lyon→Auvergne-Rhône-Alpes, Marseille→Provence-Alpes-Côte d'Azur
     * Spain: Madrid→Comunidad de Madrid, Barcelona→Cataluña, Valencia→Comunidad Valenciana
     * UK: London→England, Manchester→England, Edinburgh→Scotland, Cardiff→Wales
   - ONLY add if you are 100% CERTAIN

3. **Country & ZIP Code Inference**:
   - If city is well-known (Milano, Paris, Miami, etc.), ADD country
   - If city + country known, ADD most common ZIP code for that area
   - Examples:
     * Milano → Italy, zip: 20100-20162
     * Paris → France, zip: 75001-75020
     * Miami → USA, state: FL, zip: 33101-33199
     * Berlin → Germany, state: BE, zip: 10115-14199

4. **Data Standardization**:
   - Country names in ENGLISH (Italy, France, USA, Germany, not Italia, Francia, etc.)
   - Email: lowercase
   - Names: proper capitalization
   - Remove extra spaces

5. **ONLY add data you are 100% CERTAIN about**
6. **Return null for missing/uncertain data**

OUTPUT: ONLY the JSON array, no other text`;

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

      // Insert to temp_ai_reviewed with origin
      const reviewedRecords = tempRecords.map((record, idx) => {
        const normalizedData = normalized[idx];
        if (normalizedData && origin) {
          normalizedData.origin = origin;
        }
        return {
          import_log_id: importLogId,
          row_number: record.row_number,
          raw_data: record.raw_data,
          normalized_data: normalizedData || null,
          validation_status: normalizedData ? 'normalized' : 'failed'
        };
      });

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
        zip_code: record.raw_data.zip_code || record.raw_data.CAP || null,
        note: record.raw_data.note || record.raw_data.Note || null,
        origin: origin || null,
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
