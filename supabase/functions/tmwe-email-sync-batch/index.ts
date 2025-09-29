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
  handler: 'full_sync' | 'incremental_sync' | 'sync_folder' | 'get_sync_status' | 'cancel_sync' | 'batch_sync';
  folder_name?: string;
  folders?: string;
  date_from?: string;
  date_to?: string;
  last_sync_date?: string;
  batch_size?: number;
  start_offset?: number;
  max_total_emails?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData = await req.json();
    console.log('TMWE Email Sync Batch request:', requestData);
    
    const { 
      action, 
      folder_name = 'INBOX', 
      handler = action || 'sync_folder',
      batch_size = 10,  // Limite fisso API TMWE
      start_offset = 0,
      max_total_emails = 10000  // Limite molto alto per importare tutto
    } = requestData;
    
    console.log('Batch Sync Parameters:', { 
      handler, 
      folder_name, 
      batch_size, 
      start_offset, 
      max_total_emails 
    });

    // Recupera le credenziali TMWE
    const { data: provider } = await supabase
      .from('email_provider')
      .select('email_provider_credenziali(*)')
      .eq('provider', 'TMWE')
      .eq('attivo', true)
      .maybeSingle();

    if (!provider?.email_provider_credenziali?.length) {
      throw new Error('Nessuna configurazione TMWE trovata nel database');
    }

    let oauthToken = null;
    for (const credential of provider.email_provider_credenziali) {
      if (credential.oauth_token && credential.oauth_token.trim()) {
        oauthToken = credential.oauth_token.trim();
        break;
      }
    }

    if (!oauthToken) {
      throw new Error('TMWE OAuth token non configurato nelle credenziali del database');
    }

    // Recupera provider ID
    const { data: tmweProvider } = await supabase
      .from('email_provider')
      .select('id')
      .eq('provider', 'TMWE')
      .single();
    
    const providerId = tmweProvider?.id;
    if (!providerId) {
      throw new Error('Provider TMWE non trovato nel database');
    }

    // Crea log di sincronizzazione
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
    }

    // Crea record di progress tracking
    const { data: progressRecord, error: progressError } = await supabase
      .from('email_sync_progress')
      .insert({
        sync_log_id: syncLog?.id,
        folder_name: folder_name,
        batch_size: batch_size,
        last_offset: start_offset,
        status: 'in_progress'
      })
      .select()
      .single();

    if (progressError) {
      console.error('Error creating progress record:', progressError);
    }

    let emailsSaved = 0;
    let currentOffset = start_offset;
    let totalProcessed = 0;
    let batchNumber = 1;
    const maxBatches = Math.ceil(max_total_emails / batch_size);

    try {
      // STEP 1: Prima sincronizzazione TMWE per aggiornare il server
      console.log('🔄 Step 1: Avviando sincronizzazione iniziale TMWE...');
      const syncUrl = 'https://findair.it/erp/tmwe_json/app.php?action=email_sync';
      const syncBody = { 
        handler: 'sync_folder',
        folder_name: folder_name 
      };

      const syncResponse = await fetch(syncUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${oauthToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(syncBody)
      });

      const syncText = await syncResponse.text();
      console.log('✅ Sincronizzazione iniziale completata');

      // STEP 2: Processo di importazione batch con limite fisso API
      console.log(`🔢 Step 2: Avviando importazione completa (10 email per batch - limite API TMWE)`);
      
      let consecutiveEmptyBatches = 0;
      const maxEmptyBatches = 2;  // Se ricevi 2 batch vuoti consecutivi, fermati
      
      while (consecutiveEmptyBatches < maxEmptyBatches) {
        console.log(`📦 Batch ${batchNumber} - Offset: ${currentOffset}, Size: ${batch_size}, Empty: ${consecutiveEmptyBatches}/${maxEmptyBatches}`);
        
        // Aggiorna progress
        await supabase
          .from('email_sync_progress')
          .update({
            current_batch: batchNumber,
            last_offset: currentOffset,
            processed_messages: totalProcessed
          })
          .eq('id', progressRecord?.id);

        // Chiama API per lista messaggi - TMWE ha limite fisso di 10 email per chiamata
        const listUrl = 'https://findair.it/erp/tmwe_json/app.php?action=email_message';
        const listBody = {
          handler: 'get_messages',
          folder: folder_name,
          limit: 10,  // LIMITE FISSO API TMWE - non può essere più alto
          offset: currentOffset,
          include_attachments: false,
          format: 'text',
          // Aggiungi parametri per email storiche - prova range temporale più ampio
          date_from: '2020-01-01',  // Data molto indietro
          date_to: new Date().toISOString().split('T')[0], // Oggi
          sort: 'date_desc'  // Ordina per data decrescente
        };

        console.log(`🌐 Chiamata API batch ${batchNumber}:`, listBody);

        let listResponse;
        try {
          listResponse = await fetch(listUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${oauthToken}`,
              'Content-Type': 'application/json',
              'X-API-Key': oauthToken
            },
            body: JSON.stringify(listBody)
          });

          if (!listResponse.ok) {
            console.error(`❌ Errore API batch ${batchNumber}:`, listResponse.status);
            break;
          }

          const listText = await listResponse.text();
          const listResult = JSON.parse(listText);
          
          // Debug: mostra la risposta completa
          console.log(`📊 Batch ${batchNumber} API Response:`, { 
            success: listResult.success,
            total: listResult.total,
            count: listResult.count,
            messages_length: listResult.messages?.length,
            offset_richiesto: currentOffset
          });
          
          if (!listResult.messages || !Array.isArray(listResult.messages)) {
            console.log(`⚠️ Batch ${batchNumber}: Nessun messaggio ricevuto o formato errato`);
            break;
          }
          
          // Se non ci sono messaggi, incrementa contatore vuoti
          if (listResult.messages.length === 0) {
            consecutiveEmptyBatches++;
            console.log(`🔄 Batch ${batchNumber}: Vuoto (${consecutiveEmptyBatches}/${maxEmptyBatches})`);
            // Se abbiamo 2 batch vuoti consecutivi, probabilmente abbiamo finito
            if (consecutiveEmptyBatches >= maxEmptyBatches) {
              console.log(`🏁 Fine importazione: ${consecutiveEmptyBatches} batch vuoti consecutivi`);
              break;
            }
            // Avanza offset per batch vuoti - con limite fisso di 10
            currentOffset += 10;
            batchNumber++;
            continue;
          } else {
            // Reset contatore se troviamo messaggi
            consecutiveEmptyBatches = 0;
          }

          console.log(`📧 Batch ${batchNumber}: Ricevuti ${listResult.messages.length} messaggi`);

          // STEP 3: Salva ogni messaggio del batch
          let batchSaved = 0;
          for (const email of listResult.messages) {
            try {
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
                    cc_email: null,
                    bcc_email: null,
                    body_text: email.body_text || 'Contenuto da recuperare',
                    body_html: email.body_html || null,
                    data_ricezione: email.date ? new Date(email.date) : new Date(),
                    data_invio: email.date ? new Date(email.date) : new Date(),
                    cartella: folder_name,
                    direzione: 'inbound',
                    stato: email.seen == 1 ? 'letto' : 'nuovo',
                    flags: JSON.stringify({
                      seen: email.seen == 1,
                      flagged: email.flagged == 1,
                      answered: email.answered == 1,
                      recent: email.recent == 1
                    }),
                    attachments: JSON.stringify([])
                  });

                if (!insertError) {
                  batchSaved++;
                  emailsSaved++;
                  console.log(`✅ Email salvata: ${email.subject?.substring(0, 50) || 'Senza oggetto'}`);
                } else {
                  console.error('❌ Errore inserimento email:', insertError);
                }
              } else {
                console.log(`⏭️ Email già esistente: ${email.subject?.substring(0, 50) || 'Senza oggetto'}`);
              }
            } catch (emailError) {
              console.error('❌ Errore processamento email:', emailError);
            }
          }

          totalProcessed += listResult.messages.length;
          console.log(`✅ Batch ${batchNumber} completato: ${batchSaved} nuove, ${totalProcessed} totali processate`);

          // Aggiorna offset per prossimo batch - TMWE usa sempre incrementi di 10
          currentOffset += 10;  // Incremento fisso perché API restituisce sempre max 10 email
          batchNumber++;

          // Log di progresso continuo
          console.log(`📊 Progresso: Batch ${batchNumber-1} completato, ${totalProcessed} email totali processate, ${emailsSaved} nuove`);
          
          // Non fermarsi mai per batch incompleti - continua sempre
          // L'unico modo per fermarsi è avere batch completamente vuoti

          // Piccola pausa tra batch per non sovraccaricare l'API
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (batchError) {
          console.error(`❌ Errore batch ${batchNumber}:`, batchError);
          // Continua con il prossimo batch invece di fermarsi
          currentOffset += batch_size;  // Avanza anche in caso di errore
          batchNumber++;
          
          // Se abbiamo troppi errori consecutivi, fermati per sicurezza
          consecutiveEmptyBatches++;
          if (consecutiveEmptyBatches >= maxEmptyBatches) {
            console.log('❌ Troppi errori consecutivi, interruzione importazione');
            break;
          }
        }
      }

      // STEP 4: Aggiorna records finali
      console.log(`🎉 Importazione completata: ${emailsSaved} nuove email, ${totalProcessed} totali processate`);

      // Aggiorna progress finale
      if (progressRecord) {
        await supabase
          .from('email_sync_progress')
          .update({
            total_messages: totalProcessed,
            processed_messages: totalProcessed,
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', progressRecord.id);
      }

      // Aggiorna sync log
      if (syncLog) {
        await supabase
          .from('email_sync_logs')
          .update({
            stato: 'completato',
            sync_end: new Date().toISOString(),
            messaggi_sincronizzati: totalProcessed,
            messaggi_nuovi: emailsSaved,
            total_batches: batchNumber - 1,
            completed_batches: batchNumber - 1,
            last_processed_offset: currentOffset
          })
          .eq('id', syncLog.id);
      }

      return new Response(JSON.stringify({
        success: true,
        status: 'completed',
        emails_downloaded: emailsSaved,
        messages_synced: totalProcessed,
        messages_new: emailsSaved,
        total_batches: batchNumber - 1,
        final_offset: currentOffset,
        sync_log_id: syncLog?.id,
        progress_id: progressRecord?.id
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (syncError) {
      console.error('❌ Sync error:', syncError);
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

      // Aggiorna progress - errore
      if (progressRecord) {
        await supabase
          .from('email_sync_progress')
          .update({
            status: 'error',
            errors: [{ error: errorMessage, timestamp: new Date().toISOString() }]
          })
          .eq('id', progressRecord.id);
      }

      throw syncError;
    }

  } catch (error) {
    console.error('❌ Error in tmwe-email-sync-batch function:', error);
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