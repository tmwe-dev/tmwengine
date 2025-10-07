import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { import_log_id } = await req.json();

    if (!import_log_id) {
      throw new Error('import_log_id è richiesto');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`📥 Conferma importazione record corretti per: ${import_log_id}`);

    // Recupera tutti i record corretti
    const { data: correctedErrors, error: fetchError } = await supabase
      .from('import_errors')
      .select('*')
      .eq('import_log_id', import_log_id)
      .eq('status', 'corrected')
      .order('row_number');

    if (fetchError) {
      throw new Error(`Errore recupero record corretti: ${fetchError.message}`);
    }

    if (!correctedErrors || correctedErrors.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Nessun record corretto da importare',
          imported: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Trovati ${correctedErrors.length} record da importare`);

    // Prepara i record per imported_contacts con mapping corretto dei campi
    const contactsToInsert = correctedErrors.map(error => {
      const data = error.corrected_data as any;
      return {
        import_log_id: import_log_id,
        row_number: error.row_number,
        name: data.contact_name || data.name,
        company_name: data.company_name,
        email: data.email,
        phone: data.phone,
        cell: data.mobile || data.cell,
        address: data.address,
        city: data.city,
        country: data.country,
        zip_code: data.zip_code,
        note: data.notes || data.note,
        state: data.state,
        next_contact_date: data.next_contact_date,
        last_contact: data.last_contact_date,
        // Altri campi opzionali
        position: data.position,
        title: data.title,
        origin: data.origin,
        meta_client: data.meta_client,
        meta_exclient: data.meta_exclient
      };
    });

    // Inserisci in imported_contacts
    const { error: insertError } = await supabase
      .from('imported_contacts')
      .insert(contactsToInsert);

    if (insertError) {
      throw new Error(`Errore inserimento contatti: ${insertError.message}`);
    }

    // Aggiorna status in import_errors a 'imported'
    await supabase
      .from('import_errors')
      .update({ status: 'imported' })
      .eq('import_log_id', import_log_id)
      .eq('status', 'corrected');

    // Aggiorna statistiche import_log
    const { data: importLog } = await supabase
      .from('import_logs')
      .select('righe_importate, righe_errori')
      .eq('id', import_log_id)
      .single();

    if (importLog) {
      const newImported = (importLog.righe_importate || 0) + correctedErrors.length;
      const newErrors = Math.max(0, (importLog.righe_errori || 0) - correctedErrors.length);

      await supabase
        .from('import_logs')
        .update({
          righe_importate: newImported,
          righe_errori: newErrors
        })
        .eq('id', import_log_id);
    }

    console.log(`✅ Importati ${correctedErrors.length} record corretti`);

    return new Response(
      JSON.stringify({ 
        success: true,
        imported: correctedErrors.length,
        message: `${correctedErrors.length} record importati con successo`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Errore conferma importazione:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Errore sconosciuto' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
