import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClassificationRecord {
  id: string;
  sender_email: string;
  user_email: string;
  email_uid: string | null;
  folder_name: string | null;
  created_at: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { user_email, batch_size = 50, dry_run = false } = await req.json();

    if (!user_email) {
      throw new Error('user_email is required');
    }

    console.log(`[Migration] Starting - batch_size: ${batch_size}, dry_run: ${dry_run}`);

    // Obtener clasificaciones sin tmwe_email_id
    const { data: classifications, error: fetchError } = await supabaseClient
      .from('email_ai_classifications')
      .select('id, sender_email, user_email, email_uid, folder_name, created_at')
      .is('tmwe_email_id', null)
      .eq('user_email', user_email)
      .limit(batch_size)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('[Migration] Error fetching classifications:', fetchError);
      throw fetchError;
    }

    if (!classifications || classifications.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No classifications to migrate',
          processed: 0,
          updated: 0,
          failed: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Migration] Found ${classifications.length} classifications to process`);

    let updated = 0;
    let failed = 0;
    const errors: Array<{ id: string; error: string }> = [];

    // Procesar cada clasificación
    for (const classification of classifications) {
      try {
        console.log(`[Migration] Processing classification ${classification.id}`);

        // Buscar email en TMWE API usando tmwe-api-proxy
        // Usar headers de autenticación con SERVICE_ROLE_KEY
        const searchResponse = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/tmwe-api-proxy`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({
              operation: 'searchEmail',
              query: {
                from: classification.sender_email,
                folder: classification.folder_name || 'INBOX',
                limit: 5,
              },
            }),
          }
        );

        if (!searchResponse.ok) {
          const errorText = await searchResponse.text();
          console.error(`[Migration] Search error for ${classification.id}:`, errorText);
          failed++;
          errors.push({ id: classification.id, error: `HTTP ${searchResponse.status}: ${errorText}` });
          continue;
        }

        const searchData = await searchResponse.json();

        const emails = searchData.emails || [];
        
        if (emails.length === 0) {
          console.log(`[Migration] No emails found for ${classification.id}`);
          failed++;
          errors.push({ id: classification.id, error: 'No matching email found in TMWE API' });
          continue;
        }

        // Buscar el email más cercano por fecha (si tenemos uid, usarlo)
        let bestMatch = emails[0];
        
        if (classification.email_uid) {
          // Intentar match por UID
          const uidMatch = emails.find((e: any) => e.uid?.toString() === classification.email_uid);
          if (uidMatch) {
            bestMatch = uidMatch;
          }
        }

        const tmwe_email_id = bestMatch.email_id;

        if (!tmwe_email_id) {
          console.error(`[Migration] No email_id in response for ${classification.id}`);
          failed++;
          errors.push({ id: classification.id, error: 'No email_id in TMWE API response' });
          continue;
        }

        // Actualizar registro (solo si no es dry_run)
        if (!dry_run) {
          const { error: updateError } = await supabaseClient
            .from('email_ai_classifications')
            .update({ tmwe_email_id })
            .eq('id', classification.id);

          if (updateError) {
            console.error(`[Migration] Update error for ${classification.id}:`, updateError);
            failed++;
            errors.push({ id: classification.id, error: updateError.message });
            continue;
          }
        }

        updated++;
        console.log(`[Migration] ${dry_run ? '[DRY RUN] Would update' : 'Updated'} ${classification.id} with tmwe_email_id: ${tmwe_email_id}`);
      } catch (error) {
        console.error(`[Migration] Error processing ${classification.id}:`, error);
        failed++;
        errors.push({ id: classification.id, error: String(error) });
      }
    }

    const result = {
      success: true,
      processed: classifications.length,
      updated,
      failed,
      dry_run,
      errors: errors.slice(0, 10), // Solo primeros 10 errores
    };

    console.log('[Migration] Complete:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Migration] Fatal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
