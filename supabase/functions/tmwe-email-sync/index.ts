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

      let syncResponse;
      try {
        syncResponse = await fetch(syncUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${oauthToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(syncBody)
        });
      } catch (error) {
        console.log('HTTPS falló para sync, intentando HTTP:', error);
        const httpSyncUrl = syncUrl.replace('https://', 'http://');
        syncResponse = await fetch(httpSyncUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${oauthToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(syncBody)
        });
      }

      if (!syncResponse.ok) {
        const errorText = await syncResponse.text();
        throw new Error(`TMWE Sync Error: ${syncResponse.status} - ${errorText}`);
      }

      syncResult = await syncResponse.json();
      console.log('Sync response:', syncResult);

      // Step 2: Recupera lista email dalla cartella
      console.log('Step 2: Recuperando lista email...');
      const listUrl = 'https://findair.it/erp/tmwe_json/app.php?action=get_email_list';
      const listBody = {
        folder: folder_name || 'INBOX',
        criteria: 'ALL',
        limit: 100 // Limita per evitare timeout
      };

      let listResponse;
      try {
        listResponse = await fetch(listUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${oauthToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(listBody)
        });
      } catch (error) {
        console.log('HTTPS falló para list, intentando HTTP:', error);
        const httpListUrl = listUrl.replace('https://', 'http://');
        listResponse = await fetch(httpListUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${oauthToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(listBody)
        });
      }

      if (!listResponse.ok) {
        console.log('Lista email non disponibile, continuando con sync result');
      } else {
        const listResult = await listResponse.json();
        console.log('Email list result:', listResult);

        // Step 3: Salva email nel database Supabase
        if (listResult.success && listResult.results && Array.isArray(listResult.results)) {
          console.log(`Step 3: Salvando ${listResult.results.length} email nel database...`);
          
          for (const emailItem of listResult.results.slice(0, 10)) { // Limita a 10 per test
            try {
              // Recupera dettagli completi email
              const detailUrl = 'https://findair.it/erp/tmwe_json/app.php?action=get_email';
              const detailBody = { uid: emailItem.uid };

              let detailResponse;
              try {
                detailResponse = await fetch(detailUrl, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${oauthToken}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify(detailBody)
                });
              } catch (error) {
                const httpDetailUrl = detailUrl.replace('https://', 'http://');
                detailResponse = await fetch(httpDetailUrl, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${oauthToken}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify(detailBody)
                });
              }

              if (detailResponse.ok) {
                const detailResult = await detailResponse.json();
                if (detailResult.success && detailResult.result) {
                  const email = detailResult.result;
                  
                  // Controlla se l'email esiste già
                  const { data: existingEmail } = await supabase
                    .from('email_messages')
                    .select('id')
                    .eq('message_id', email.uid)
                    .single();

                  if (!existingEmail) {
                    // Salva email nel database
                    const { error: insertError } = await supabase
                      .from('email_messages')
                      .insert({
                        message_id: email.uid,
                        provider_id: defaultProviderId,
                        subject: email.subject || '',
                        from_email: email.from || '',
                        to_email: email.to || '',
                        cc_email: email.cc || null,
                        bcc_email: email.bcc || null,
                        body_text: email.body || '',
                        body_html: email.body_html || null,
                        data_ricezione: email.date ? new Date(email.date) : new Date(),
                        data_invio: email.date ? new Date(email.date) : null,
                        direzione: 'inbound',
                        stato: email.seen ? 'letto' : 'nuovo',
                        cartella: folder_name || 'INBOX',
                        flags: JSON.stringify({
                          seen: email.seen || false,
                          flagged: email.flagged || false,
                          answered: email.answered || false
                        }),
                        attachments: email.attachments ? JSON.stringify(email.attachments) : '[]',
                        raw_headers: email.headers ? JSON.stringify(email.headers) : null
                      });

                    if (!insertError) {
                      emailsSaved++;
                      console.log(`Email salvata: ${email.subject}`);
                    } else {
                      console.error('Errore salvataggio email:', insertError);
                    }
                  }
                }
              }
            } catch (emailError) {
              console.error(`Errore processando email ${emailItem.uid}:`, emailError);
            }
          }
        }
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