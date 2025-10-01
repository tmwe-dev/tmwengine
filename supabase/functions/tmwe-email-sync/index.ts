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

    // Recupera le credenziali dal database
    const { data: provider } = await supabase
      .from('email_provider')
      .select('email_provider_credenziali(*)')
      .eq('provider', 'TMWE')
      .eq('attivo', true)
      .maybeSingle();

    // email_provider_credenziali è un oggetto singolo (relazione 1:1), NON un array
    const creds = provider?.email_provider_credenziali;
    
    if (!creds || (!creds.oauth_token?.trim() && !creds.api_key?.trim())) {
      throw new Error('Nessuna configurazione TMWE trovata nel database');
    }

    const authToken = (creds.oauth_token || creds.api_key).trim();
    console.log('Using TMWE token, length:', authToken.length);

    if (!authToken) {
      throw new Error('TMWE OAuth token non configurato nelle credenziali del database');
    }

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
            'Authorization': `Bearer ${authToken}`,
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
              'Authorization': `Bearer ${authToken}`,
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
        
        // SOLUZIONE: usa l'endpoint email_message con handler get_messages (API v2.0.0)
        console.log('Step 3: Ottieni lista messaggi con email_message API v2.0.0...');
        console.log('URL chiamata:', 'https://findair.it/erp/tmwe_json/app.php?action=email_message');
        const listUrl = 'https://findair.it/erp/tmwe_json/app.php?action=email_message';
        const listBody = {
          handler: 'get_messages',
          folder: folder_name || 'INBOX',
          limit: 50,
          offset: 0,
          include_attachments: true,
          format: 'html'
        };

        let listResponse;
        try {
          listResponse = await fetch(listUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json',
              'X-API-Key': authToken // Aggiungi anche X-API-Key header per compatibilità
            },
            body: JSON.stringify(listBody)
          });
          console.log('HTTPS riuscito per lista, status:', listResponse.status);
        } catch (httpsError) {
          console.log('HTTPS fallito per lista, tentando HTTP...');
          const httpListUrl = listUrl.replace('https://', 'http://');
          listResponse = await fetch(httpListUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json',
              'X-API-Key': authToken // Aggiungi anche X-API-Key header per compatibilità
            },
            body: JSON.stringify(listBody)
          });
          console.log('HTTP riuscito per lista, status:', listResponse.status);
        }

        const listText = await listResponse.text();
        console.log('Lista response status:', listResponse.status);
        console.log('Lista response (primi 500 caratteri):', listText.substring(0, 500));

        if (listResponse.ok) {
          try {
            const listResult = JSON.parse(listText);
            console.log('Parsed list result:', listResult);
            
            // Gestisci il formato di risposta - TMWE restituisce direttamente i messaggi
            if (listResult.messages && Array.isArray(listResult.messages)) {
              const emailsList = listResult.messages;
              console.log(`Trovati ${emailsList.length} messaggi nella lista`);

              // Step 4: Salva ogni messaggio nel database
              for (const email of emailsList) {
              try {
                // Usa l'UID TMWE come message_id univoco
                const messageId = `tmwe_${email.uid}`;
                
                // Controlla se esiste già
                const { data: existing } = await supabase
                  .from('email_messages')
                  .select('id')
                  .eq('message_id', messageId)
                  .maybeSingle();

                if (!existing) {
                  const { error: insertError } = await supabase
                    .from('email_messages')
                    .insert({
                      message_id: messageId,
                      provider_id: providerId,
                      subject: email.subject || '',
                      from_email: email.from || '',
                      to_email: email.to || '',
                      cc_email: null, // Non disponibile in lista messaggi
                      bcc_email: null, // Non disponibile in lista messaggi  
                      body_text: 'Contenuto da recuperare', // Bisogna fare chiamata separata per il body
                      body_html: null, // Non disponibile in lista messaggi
                      data_ricezione: email.date ? new Date(email.date) : new Date(),
                      data_invio: email.date ? new Date(email.date) : new Date(),
                      cartella: folder_name || 'INBOX',
                      direzione: 'inbound',
                      stato: email.seen == 1 ? 'letto' : 'nuovo',
                      flags: JSON.stringify({
                        seen: email.seen == 1,
                        flagged: email.flagged == 1,
                        answered: email.answered == 1,
                        recent: email.recent == 1
                      }),
                      attachments: JSON.stringify([]) // Vuoto per ora
                    });

                  if (!insertError) {
                    emailsSaved++;
                    console.log(`Email salvata: ${email.subject || 'Senza oggetto'}`);
                  } else {
                    console.error('Errore inserimento email:', insertError);
                  }
                } else {
                  console.log(`Email già esistente: ${email.subject || 'Senza oggetto'}`);
                }
              } catch (emailError) {
                console.error('Errore processamento email:', emailError);
              }
            }
            console.log(`Step 4: Salvati ${emailsSaved} nuovi messaggi nel database`);
            } else {
              console.log('Nessun messaggio trovato nella lista:', listResult);
            }
          } catch (parseError) {
            console.error('Errore parsing lista response:', parseError);
          }
        } else {
          console.error('Errore lista messaggi:', listText.substring(0, 200));
        }

        // Se non sono state salvate nuove email, usa il conteggio dalla sincronizzazione
        if (emailsSaved === 0) {
          emailsSaved = syncResult.data?.result?.messages_processed || 0;
        }
        
        console.log(`Email totali processate: ${emailsSaved}`);
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