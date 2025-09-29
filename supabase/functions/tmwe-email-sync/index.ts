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
        
        // Step 3: Recupera le email sincronizzate dal server TMWE
        console.log('Step 3: Recuperando email dal server TMWE...');
        const emailListUrl = 'https://findair.it/erp/tmwe_json/app.php?action=get_email_list';
        const emailListBody = {
          folder: folder_name || 'INBOX',
          limit: syncResult.data?.result?.messages_processed || 50,
          sort: 'date_desc'
        };

        let emailListResponse;
        try {
          emailListResponse = await fetch(emailListUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${oauthToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(emailListBody)
          });
        } catch (httpsError) {
          console.log('HTTPS fallito per email list, tentando HTTP...');
          const httpEmailListUrl = emailListUrl.replace('https://', 'http://');
          emailListResponse = await fetch(httpEmailListUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${oauthToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(emailListBody)
          });
        }

        const emailListText = await emailListResponse.text();
        console.log('Email list response (primi 500 caratteri):', emailListText.substring(0, 500));

        if (emailListResponse.ok) {
          let emailListResult;
          try {
            emailListResult = JSON.parse(emailListText);
            console.log('Parsed email list result:', emailListResult);

            if (emailListResult.success && emailListResult.data?.emails) {
              const emails = emailListResult.data.emails;
              console.log(`Trovate ${emails.length} email da importare`);

              // Step 4: Inserisci le email nel database
              for (const email of emails) {
                try {
                  const { error: insertError } = await supabase
                    .from('email_messages')
                    .upsert({
                      message_id: email.message_id || email.id,
                      provider_id: providerId,
                      subject: email.subject || '',
                      from_email: email.from || '',
                      to_email: email.to || '',
                      cc_email: email.cc || null,
                      bcc_email: email.bcc || null,
                      body_text: email.body_text || null,
                      body_html: email.body_html || null,
                      data_ricezione: email.date ? new Date(email.date) : new Date(),
                      data_invio: email.sent_date ? new Date(email.sent_date) : null,
                      cartella: folder_name || 'INBOX',
                      direzione: 'in',
                      stato: 'nuovo',
                      flags: email.flags || [],
                      attachments: email.attachments || []
                    }, {
                      onConflict: 'message_id,provider_id'
                    });

                  if (insertError) {
                    console.error('Errore inserimento email:', insertError);
                  } else {
                    emailsSaved++;
                  }
                } catch (emailError) {
                  console.error('Errore processamento email:', emailError);
                }
              }
              console.log(`Step 4: Importate ${emailsSaved} email nel database`);
            } else {
              console.log('Nessuna email trovata nella risposta:', emailListResult);
            }
          } catch (parseError) {
            console.error('Errore parsing email list:', parseError);
          }
        } else {
          console.error('Errore recupero email list:', emailListText.substring(0, 200));
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