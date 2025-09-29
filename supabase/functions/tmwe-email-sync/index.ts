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
  handler: 'full_sync' | 'incremental_sync' | 'sync_folder' | 'get_sync_status' | 'cancel_sync';
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
    const { handler, folder_name, folders, date_from, date_to, last_sync_date }: TMWEEmailSyncRequest = await req.json();
    console.log('TMWE Email Sync request:', { handler, folder_name, folders });

    // Recupera le credenziali dal database usando la stessa logica di tmwe-email-send
    const { data: provider } = await supabase
      .from('email_provider')
      .select('email_provider_credenziali(*)')
      .eq('provider', 'TMWE')
      .eq('attivo', true)
      .maybeSingle();

    if (!provider?.email_provider_credenziali?.length) {
      throw new Error('Nessuna configurazione TMWE trovata nel database');
    }

    // Trova la prima credenziale valida con OAuth token
    let oauthToken = null;
    for (const credential of provider.email_provider_credenziali) {
      if (credential.oauth_token && credential.oauth_token.trim()) {
        oauthToken = credential.oauth_token.trim();
        break;
      }
      // Fallback ad api_key se disponibile
      if (credential.api_key && credential.api_key.trim()) {
        oauthToken = credential.api_key.trim();
        break;
      }
    }

    if (!oauthToken) {
      throw new Error('TMWE OAuth token non configurato nelle credenziali del database');
    }

    console.log('Using TMWE OAuth token');

    console.log('Starting sync with TMWE API...');

    // Usa un UUID default per TMWE
    const defaultProviderId = '00000000-0000-0000-0000-000000000000';

    // Avvia log di sincronizzazione
    const { data: syncLog, error: logError } = await supabase
      .from('email_sync_logs')
      .insert({
        provider_id: defaultProviderId,
        tipo_sync: handler,
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
        handler: handler
      };
      
      if (folder_name) requestBody.folder_name = folder_name;
      if (folders) requestBody.folders = folders;
      if (date_from) requestBody.date_from = date_from;
      if (date_to) requestBody.date_to = date_to;
      if (last_sync_date) requestBody.last_sync_date = last_sync_date;

      const fullUrl = `${baseUrl}/app.php?${params}`;
      console.log('Calling TMWE API:', fullUrl);
      console.log('Request body:', requestBody);

      // Llamada API TMWE con headers mínimos como tmwe-email-send exitoso
      let response;
      try {
        response = await fetch(fullUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${oauthToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });
      } catch (error) {
        console.log('HTTPS falló, intentando HTTP:', error);
        // Fallback a HTTP como tmwe-email-send exitoso
        const httpUrl = fullUrl.replace('https://', 'http://');
        response = await fetch(httpUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${oauthToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });
      }

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