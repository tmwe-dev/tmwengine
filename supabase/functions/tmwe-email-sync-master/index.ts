import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncRequest {
  mode?: 'auto' | 'initial' | 'incremental' | 'continuous';
  folder_name?: string;
  max_emails?: number;
  force_full?: boolean;
}

interface SyncResult {
  success: boolean;
  mode_used: string;
  emails_downloaded: number;
  total_emails_in_db: number;
  sync_log_id?: string;
  next_sync_recommended?: string;
  message: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // CREA SUPABASE CLIENT DENTRO LA FUNZIONE!
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { mode = 'auto', folder_name = 'INBOX', max_emails = 0, force_full = false }: SyncRequest = await req.json();

    console.log('🚀 TMWE Email Sync Master - Modalità:', mode);

    // USA ESATTAMENTE IL METODO DI tmwe-email-messages CHE FUNZIONA!
    console.log('🔍 Cerco token TMWE_OAUTH_TOKEN in environment...');
    let oauthToken = Deno.env.get('TMWE_OAUTH_TOKEN');
    
    if (!oauthToken) {
      console.log('❌ Token non in environment, cerco nel database...');
      const { data: provider, error: provErr } = await supabase
        .from('email_provider')
        .select('email_provider_credenziali(*)')
        .eq('provider', 'TMWE')
        .eq('attivo', true)
        .maybeSingle();
      
      console.log('📊 Provider data:', provider);
      console.log('📊 Provider error:', provErr);
      
      // email_provider_credenziali è un oggetto singolo (relazione 1:1), NON un array
      const creds = provider?.email_provider_credenziali;
      console.log('📊 Credenziale trovata:', creds);
      
      if (creds && (creds.oauth_token || creds.api_key)) {
        oauthToken = creds.oauth_token || creds.api_key;
        console.log('📊 Token estratto: TROVATO');
      } else {
        console.log('❌ Nessuna credenziale valida trovata');
      }
    }
    
    if (!oauthToken) {
      console.error('❌ NESSUN TOKEN TROVATO!');
      throw new Error('TMWE OAuth token non configurato nel database o environment');
    }

    console.log('✅ Token trovato, lunghezza:', oauthToken.length);

    // Get provider ID
    const { data: providerData } = await supabase
      .from('email_provider')
      .select('id')
      .eq('provider', 'TMWE')
      .eq('attivo', true)
      .maybeSingle();

    if (!providerData) {
      throw new Error('Provider TMWE non trovato');
    }

    // Determina modalità automatica
    let actualMode = mode;
    if (mode === 'auto') {
      const { count: existingEmails } = await supabase
        .from('email_messages')
        .select('*', { count: 'exact', head: true })
        .eq('cartella', folder_name);

      const { data: lastSync } = await supabase
        .from('email_sync_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const hoursSinceLastSync = lastSync 
        ? (Date.now() - new Date(lastSync.created_at).getTime()) / (1000 * 60 * 60)
        : 999;

      if (existingEmails === 0 || force_full) {
        actualMode = 'initial';
        console.log('📥 Modalità rilevata: INITIAL (primo import)');
      } else if (hoursSinceLastSync > 24) {
        actualMode = 'incremental';
        console.log('🔄 Modalità rilevata: INCREMENTAL (sync giornaliera)');
      } else {
        actualMode = 'incremental';
        console.log('⚡ Modalità rilevata: INCREMENTAL (sync frequente)');
      }
    }

    // Parametri dinamici - L'API TMWE ha un LIMITE DI 10 EMAIL PER BATCH!
    let batchSize = 10; // FISSO A 10 - l'API ignora valori più alti
    let targetEmails = max_emails;
    let syncType = 'manuale';

    if (actualMode === 'initial') {
      targetEmails = targetEmails || 5000;
      syncType = 'full_sync';
    } else if (actualMode === 'incremental') {
      targetEmails = targetEmails || 200;
      syncType = 'incremental_sync';
    } else if (actualMode === 'continuous') {
      targetEmails = 50;
      syncType = 'automatica';
    }

    const maxBatches = Math.ceil(targetEmails / batchSize);
    console.log(`📋 Parametri: modalità=${actualMode}, batch=${batchSize}, target=${targetEmails}, maxBatches=${maxBatches}`);

    // Crea log di sincronizzazione
    const { data: syncLog, error: syncLogError } = await supabase
      .from('email_sync_logs')
      .insert({
        provider_id: providerData.id,
        tipo_sync: syncType,
        stato: 'in_corso'
      })
      .select()
      .single();

    if (syncLogError) throw syncLogError;

    // SYNC PROCESS - DOWNLOAD SEQUENZIALE EMAIL SINGOLE
    let totalImported = 0;
    let consecutiveErrors = 0;
    let emailNumber = 1;
    const maxConsecutiveErrors = 5;

    console.log(`🎯 Inizio download sequenziale email da ${folder_name}`);
    console.log(`📧 Scarico UNA email per volta fino a esaurimento`);

    try {
      const baseUrl = 'https://findair.it/erp/tmwe_json';
      const messagesUrl = `${baseUrl}/app.php?action=email_message`;

      // Loop infinito fino a quando non ci sono più email
      while (consecutiveErrors < maxConsecutiveErrors) {
        console.log(`\n📨 TENTATIVO EMAIL #${emailNumber}`);
        
        // Richiesta per scaricare UNA singola email
        const messageBody = {
          handler: 'get_messages',
          folder: folder_name,
          limit: 1,  // UNA email per volta
          offset: emailNumber - 1  // Salta quelle già scaricate
        };

        console.log(`🔍 Richiesta: ${JSON.stringify(messageBody)}`);

        let messagesResponse;
        try {
          messagesResponse = await fetch(messagesUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${oauthToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(messageBody)
          });
        } catch (error) {
          const httpUrl = messagesUrl.replace('https://', 'http://');
          messagesResponse = await fetch(httpUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${oauthToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(messageBody)
          });
        }

        if (!messagesResponse.ok) {
          console.error(`❌ Errore HTTP ${messagesResponse.status}`);
          consecutiveErrors++;
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        const messageData = await messagesResponse.json();
        const messages = messageData?.messages || messageData?.results || [];
        
        console.log(`📊 API ha restituito ${messages.length} email`);

        // Se non ci sono più email, termina
        if (messages.length === 0) {
          console.log('✅ NESSUNA ALTRA EMAIL DISPONIBILE - Fine scaricamento');
          break;
        }

        // Reset errori consecutivi se abbiamo ricevuto dati
        consecutiveErrors = 0;

        // Processa l'email ricevuta
        const message = messages[0];
        
        try {
          // Controlla se esiste già
          const { count: existingCount } = await supabase
            .from('email_messages')
            .select('*', { count: 'exact', head: true })
            .eq('message_id', message.uid || message.msgno);

          if (existingCount === 0) {
            // Inserisci la nuova email
            const { error: insertError } = await supabase
              .from('email_messages')
              .insert({
                message_id: message.uid || message.msgno,
                subject: message.subject || 'Senza oggetto',
                from_email: message.from || '',
                to_email: message.to || '',
                data_ricezione: new Date(message.date || Date.now()).toISOString(),
                cartella: folder_name,
                provider_id: providerData.id,
                flags: { seen: message.seen, flagged: message.flagged },
                direzione: 'inbound',
                stato: message.seen ? 'letto' : 'nuovo',
                body_text: message.body_text || 'Contenuto da recuperare',
                body_html: message.body_html,
                data_invio: new Date(message.date || Date.now()).toISOString()
              });

            if (!insertError) {
              totalImported++;
              console.log(`✅ Email #${emailNumber} salvata (NUOVA) - Totale: ${totalImported}`);
            } else {
              console.error(`❌ Errore inserimento:`, insertError);
            }
          } else {
            console.log(`⏭️ Email #${emailNumber} già esistente - Skip`);
          }

          // Aggiorna progresso ogni 10 email
          if (emailNumber % 10 === 0) {
            await supabase
              .from('email_sync_logs')
              .update({
                messaggi_nuovi: totalImported,
                messaggi_sincronizzati: emailNumber
              })
              .eq('id', syncLog.id);
          }

        } catch (msgError) {
          console.error(`❌ Errore processamento email #${emailNumber}:`, msgError);
        }

        emailNumber++;

        // Piccolo delay tra richieste
        await new Promise(resolve => setTimeout(resolve, 200));

        // Safety: limite massimo per evitare loop infiniti
        if (emailNumber > targetEmails) {
          console.log(`⚠️ Raggiunto limite massimo ${targetEmails} email`);
          break;
        }
      }

      if (consecutiveErrors >= maxConsecutiveErrors) {
        console.log(`⚠️ Troppi errori consecutivi (${consecutiveErrors}), interrompo`);
      }

    } catch (syncError) {
      console.error('❌ Errore durante la sincronizzazione:', syncError);
      throw syncError;
    }

    // Finalizza sync
    await supabase
      .from('email_sync_logs')
      .update({
        stato: 'completato',
        sync_end: new Date().toISOString(),
        messaggi_nuovi: totalImported
      })
      .eq('id', syncLog.id);

    const { count: totalInDb } = await supabase
      .from('email_messages')
      .select('*', { count: 'exact', head: true })
      .eq('cartella', folder_name);

    console.log('🎉 SYNC COMPLETATA');
    console.log(`📊 Email importate: ${totalImported}`);
    console.log(`📚 Totale in database: ${totalInDb}`);

    let nextSyncRecommended = '';
    if (actualMode === 'initial') {
      nextSyncRecommended = 'Imposta sync automatica ogni 4 ore per incrementale';
    } else if (actualMode === 'incremental') {
      nextSyncRecommended = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
    }

    const result: SyncResult = {
      success: true,
      mode_used: actualMode,
      emails_downloaded: totalImported,
      total_emails_in_db: totalInDb || 0,
      sync_log_id: syncLog.id,
      next_sync_recommended: nextSyncRecommended,
      message: `Sync ${actualMode} completata: ${totalImported} email importate. Database totale: ${totalInDb}`
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('❌ ERRORE SYNC MASTER:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Errore sconosciuto'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});