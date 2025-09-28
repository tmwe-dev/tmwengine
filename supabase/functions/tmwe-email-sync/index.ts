import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface TMWEEmailSyncRequest {
  action: 'full_sync' | 'incremental_sync' | 'sync_folder' | 'get_sync_status' | 'cancel_sync';
  folder_name?: string;
  folders?: string;
  date_from?: string;
  date_to?: string;
  last_sync_date?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, folder_name, folders, date_from, date_to, last_sync_date }: TMWEEmailSyncRequest = await req.json();
    console.log('TMWE Email Sync request:', { action, folder_name, folders });

    // Usa l'API key direttamente dall'environment
    const apiKey = Deno.env.get('TMWE_API_KEY');
    if (!apiKey) {
      throw new Error('TMWE_API_KEY non configurata negli environment secrets');
    }

    console.log('Using TMWE API key from environment');

    console.log('Starting sync with TMWE API...');

    // Usa un UUID default per TMWE
    const defaultProviderId = '00000000-0000-0000-0000-000000000000';

    // Avvia log di sincronizzazione
    const { data: syncLog, error: logError } = await supabase
      .from('email_sync_logs')
      .insert({
        provider_id: defaultProviderId,
        tipo_sync: action,
        stato: 'in_corso'
      })
      .select()
      .single();

    if (logError) {
      console.error('Error creating sync log:', logError);
      // Continue without logging if there's an error
    }

    let syncResult;
    try {
      // Construir URL API TMWE según la documentación OpenAPI
      const baseUrl = 'https://findair.it/erp/tmwe_json';
      const params = new URLSearchParams({
        action: 'email_sync'
      });

      const requestBody: any = {
        action: action
      };
      
      if (folder_name) requestBody.folder_name = folder_name;
      if (folders) requestBody.folders = folders;
      if (date_from) requestBody.date_from = date_from;
      if (date_to) requestBody.date_to = date_to;
      if (last_sync_date) requestBody.last_sync_date = last_sync_date;

      const fullUrl = `${baseUrl}/app.php?${params}`;
      console.log('Calling TMWE API:', fullUrl);
      console.log('Request body:', requestBody);

      // Chiamata API TMWE seguendo la documentazione OpenAPI
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log('Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('TMWE API Error response:', errorText);
        throw new Error(`TMWE API Error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      syncResult = await response.json();
      console.log('TMWE API Response:', syncResult);

      // Gestisci la risposta in base al formato dell'API TMWE
      if (syncResult.success) {
        let messaggiSincronizzati = syncResult.messages_synced || 0;
        let cartelleSync = syncResult.folders_synced || 0;
        let progresso = syncResult.progress || 0;

        // Aggiorna log di sincronizzazione - successo
        if (syncLog) {
          await supabase
            .from('email_sync_logs')
            .update({
              stato: syncResult.status === 'completed' ? 'completato' : 'in_corso',
              sync_end: syncResult.status === 'completed' ? new Date().toISOString() : null,
              messaggi_sincronizzati: messaggiSincronizzati,
              messaggi_nuovi: messaggiSincronizzati
            })
            .eq('id', syncLog.id);
        }

        return new Response(JSON.stringify({
          success: true,
          status: syncResult.status,
          messages_synced: messaggiSincronizzati,
          folders_synced: cartelleSync,
          progress: progresso,
          sync_log_id: syncLog?.id,
          tmwe_response: syncResult
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } else {
        throw new Error(syncResult.error || 'Sync failed');
      }

    } catch (syncError) {
      console.error('Sync error:', syncError);
      const errorMessage = syncError instanceof Error ? syncError.message : 'Unknown sync error';
      
      // Aggiorna log di sincronizzazione - errore
      if (syncLog) {
        await supabase
          .from('email_sync_logs')
          .update({
            stato: 'errore',
            sync_end: new Date().toISOString(),
            errori: [{ error: errorMessage, timestamp: new Date().toISOString() }]
          })
          .eq('id', syncLog.id);
      }

      throw syncError;
    }

    return new Response(JSON.stringify(syncResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in tmwe-email-sync function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});