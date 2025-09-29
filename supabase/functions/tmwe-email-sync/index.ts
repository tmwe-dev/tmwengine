import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

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
    const requestData = await req.json();
    console.log('TMWE Email Sync full request:', requestData);
    
    // Mappa i parametri dal client alla struttura richiesta dall'API TMWE
    const { action, folder_name, folders, date_from, date_to, last_sync_date } = requestData;
    const handler = action || requestData.handler; // Supporta entrambi i formati
    
    console.log('TMWE Email Sync mapped:', { handler, folder_name, folders });

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

    // Usa l'ID provider reale dal database TMWE
    const { data: tmweProvider } = await supabase
      .from('email_provider')
      .select('id')
      .eq('provider', 'TMWE')
      .single();
    
    const providerId = tmweProvider?.id || null;
    
    if (!providerId) {
      throw new Error('Provider TMWE non trovato nel database');
    }

    // Avvia log di sincronizzazione
      const { data: syncLog, error: logError } = await supabase
        .from('email_sync_logs')
        .insert({
          provider_id: providerId,
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
    let emailsSaved = 0;
    
    try {
      // Step 1: Avvia sincronizzazione con TMWE
      console.log('Step 1: Avviando sincronizzazione TMWE...');
      const syncUrl = 'https://findair.it/erp/tmwe_json/app.php?action=email_sync';
      const syncBody: any = { handler: handler };
      if (folder_name) syncBody.folder_name = folder_name;
      if (folders) syncBody.folders = folders;
      if (date_from) syncBody.date_from = date_from;
      if (date_to) syncBody.date_to = date_to;
      if (last_sync_date) syncBody.last_sync_date = last_sync_date;

      console.log('Sync request body:', JSON.stringify(syncBody, null, 2));
      if (last_sync_date) syncBody.last_sync_date = last_sync_date;

      let syncResponse;
      console.log('Tentativo connessione HTTPS a TMWE...');
      
      try {
        syncResponse = await fetch(syncUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${oauthToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(syncBody)
        });
        console.log('HTTPS riuscito, status:', syncResponse.status);
      } catch (httpsError) {
        const errorMsg = httpsError instanceof Error ? httpsError.message : String(httpsError);
        console.log('HTTPS fallito:', errorMsg, 'Tentando HTTP...');
        const httpSyncUrl = syncUrl.replace('https://', 'http://');
        try {
          syncResponse = await fetch(httpSyncUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${oauthToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(syncBody)
          });
          console.log('HTTP riuscito, status:', syncResponse.status);
        } catch (httpError) {
          const httpErrorMsg = httpError instanceof Error ? httpError.message : String(httpError);
          console.error('Sia HTTPS che HTTP falliti:', httpErrorMsg);
          throw new Error(`Connessione TMWE fallita: ${httpErrorMsg}`);
        }
      }

      // Leggi la risposta come testo prima
      const responseText = await syncResponse.text();
      console.log('Response status:', syncResponse.status);
      console.log('Response headers:', Object.fromEntries(syncResponse.headers.entries()));
      console.log('Response text (primi 500 caratteri):', responseText.substring(0, 500));

      if (!syncResponse.ok) {
        console.error('TMWE API Error - Status:', syncResponse.status);
        console.error('TMWE API Error - Text:', responseText);
        throw new Error(`TMWE API Error: ${syncResponse.status} - ${responseText.substring(0, 200)}`);
      }

      // Prova a parsare come JSON
      let syncResult;
      try {
        syncResult = JSON.parse(responseText);
        console.log('Sync response parsed successfully:', syncResult);
      } catch (parseError) {
        console.error('Failed to parse as JSON:', parseError);
        console.error('Response that failed to parse:', responseText.substring(0, 1000));
        throw new Error(`TMWE API returned invalid JSON. Response: ${responseText.substring(0, 200)}`);
      }

      // Step 2: La sincronizzazione è completata con successo!
      if (syncResult && syncResult.success) {
        console.log('Step 2: Sincronizzazione TMWE completata con successo!');
        console.log(`Processati ${syncResult.data?.result?.messages_processed || 0} messaggi`);
        
        // Step 3: Verifica se le email sono già nel database locale
        console.log('Step 3: Verificando email nel database locale...');
        const { data: recentEmails, error: queryError } = await supabase
          .from('email_messages')
          .select('id, subject, created_at')
          .eq('provider_id', providerId)
          .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString()) // ultimi 10 minuti
          .order('created_at', { ascending: false });

        if (queryError) {
          console.error('Errore query email recenti:', queryError);
        } else {
          console.log(`Trovate ${recentEmails?.length || 0} email recenti nel database`);
          if (recentEmails && recentEmails.length > 0) {
            emailsSaved = recentEmails.length;
            console.log('Email recenti trovate:', recentEmails);
          }
        }

        // Step 4: Se non ci sono email recenti, conta tutte le email del provider
        if (emailsSaved === 0) {
          const { data: allEmails, error: countError } = await supabase
            .from('email_messages')
            .select('id', { count: 'exact' })
            .eq('provider_id', providerId);

          if (!countError) {
            emailsSaved = allEmails?.length || 0;
            console.log(`Totale email nel database per questo provider: ${emailsSaved}`);
          }
        }
      } else {
        console.log('Sincronizzazione TMWE non riuscita:', syncResult);
      }

      // Gestisci la risposta e aggiorna log
      const messaggiSincronizzati = emailsSaved;
      const messaggiNuovi = emailsSaved;

      // Aggiorna log di sincronizzazione - successo
      if (syncLog) {
        await supabase
          .from('email_sync_logs')
          .update({
            stato: 'completato',
            sync_end: new Date().toISOString(),
            messaggi_sincronizzati: messaggiSincronizzati,
            messaggi_nuovi: messaggiNuovi
          })
          .eq('id', syncLog.id);
      }

      return new Response(JSON.stringify({
        success: true,
        status: 'completed',
        emails_downloaded: emailsSaved,
        messages_synced: messaggiSincronizzati,
        messages_new: messaggiNuovi,
        sync_log_id: syncLog?.id,
        tmwe_response: syncResult
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

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