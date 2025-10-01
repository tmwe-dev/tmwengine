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

    // API v2.0.0: POST con body JSON
    let totalImported = 0;

    console.log(`🎯 STEP 1: Recupero lista completa UID da ${folder_name}`);

    try {
      const baseUrl = 'https://findair.it/erp/tmwe_json';

      // STEP 1: Scarica TUTTI gli UID disponibili con paginazione
      const allUIDs: Array<{uid: string, subject: string, from: string, date: string}> = [];
      const listBatchSize = 100;
      let listOffset = 0;
      let hasMore = true;
      
      while (hasMore) {
        // POST con body JSON (API v2.0.0)
        const listUrl = `${baseUrl}/app.php?action=get_email_list`;

        console.log(`📋 Batch lista: offset=${listOffset}, limit=${listBatchSize}`);

        let listResponse;
        try {
          listResponse = await fetch(listUrl, {
            method: 'POST',
            headers: {
              'X-API-Key': oauthToken,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              folder: folder_name,
              criteria: 'ALL',
              offset: listOffset,
              limit: listBatchSize
            })
          });
        } catch (error) {
          const httpUrl = listUrl.replace('https://', 'http://');
          listResponse = await fetch(httpUrl, {
            method: 'POST',
            headers: {
              'X-API-Key': oauthToken,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              folder: folder_name,
              criteria: 'ALL',
              offset: listOffset,
              limit: listBatchSize
            })
          });
        }

        if (!listResponse.ok) {
          const errorText = await listResponse.text();
          console.error(`❌ Errore HTTP ${listResponse.status}: ${errorText}`);
          break;
        }

        const listData = await listResponse.json();
        
        if (!listData.success) {
          console.error(`❌ API returned success=false:`, listData);
          break;
        }

        const emails = listData.results || [];
        
        if (emails.length === 0) {
          console.log(`✅ Fine lista UID a offset ${listOffset}`);
          hasMore = false;
          break;
        }

        // Estrai gli UID con metadata
        for (const email of emails) {
          if (email.uid) {
            allUIDs.push({
              uid: email.uid,
              subject: email.subject || 'No subject',
              from: email.from || '',
              date: email.date || ''
            });
          }
        }

        console.log(`✅ Recuperati ${emails.length} UID (totale: ${allUIDs.length})`);
        
        // Se abbiamo ricevuto meno email del batch size, abbiamo finito
        if (emails.length < listBatchSize) {
          hasMore = false;
          console.log(`✅ Ultima pagina ricevuta`);
        }

        listOffset += listBatchSize;
        
        // Delay tra batch
        await new Promise(resolve => setTimeout(resolve, 300));

        // Safety limit
        if (listOffset >= 10000) {
          console.log(`⚠️ Limite safety 10000 raggiunto`);
          hasMore = false;
        }
      }

      console.log(`\n📊 TOTALE UID RECUPERATI: ${allUIDs.length}`);

      // STEP 2: Per ogni UID, controlla se esiste nel DB, altrimenti scaricalo
      console.log(`\n🎯 STEP 2: Download email mancanti`);

      for (let i = 0; i < allUIDs.length; i++) {
        const emailInfo = allUIDs[i];
        const uid = emailInfo.uid;
        
        // Controlla se esiste già
        const { count: existingCount } = await supabase
          .from('email_messages')
          .select('*', { count: 'exact', head: true })
          .eq('message_id', uid);

        if (existingCount && existingCount > 0) {
          if (i % 100 === 0) {
            console.log(`⏭️ Email ${i + 1}/${allUIDs.length}: ${uid} già presente`);
          }
          continue;
        }

        // Email NON presente, scaricala con POST + JSON body
        console.log(`📥 Email ${i + 1}/${allUIDs.length}: Download ${uid} - "${emailInfo.subject}"`);

        const messageUrl = `${baseUrl}/app.php?action=email_message`;

        let messageResponse;
        try {
          messageResponse = await fetch(messageUrl, {
            method: 'POST',
            headers: {
              'X-API-Key': oauthToken,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              handler: 'get_message',
              uid: uid,
              include_attachments: true,
              format: 'text'
            })
          });
        } catch (error) {
          const httpUrl = messageUrl.replace('https://', 'http://');
          messageResponse = await fetch(httpUrl, {
            method: 'POST',
            headers: {
              'X-API-Key': oauthToken,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              handler: 'get_message',
              uid: uid,
              include_attachments: true,
              format: 'text'
            })
          });
        }

        if (!messageResponse.ok) {
          console.error(`❌ Errore download ${uid}: ${messageResponse.status}`);
          continue;
        }

        const messageData = await messageResponse.json();
        
        if (!messageData.success) {
          console.error(`❌ API returned success=false for ${uid}`);
          continue;
        }

        const msgData = messageData.result || messageData;

        // Inserisci nel database
        const { error: insertError } = await supabase
          .from('email_messages')
          .insert({
            message_id: uid,
            subject: msgData.subject || emailInfo.subject || 'Senza oggetto',
            from_email: msgData.from || emailInfo.from || '',
            to_email: msgData.to || '',
            cc_email: msgData.cc,
            bcc_email: msgData.bcc,
            data_ricezione: new Date(msgData.date || emailInfo.date || Date.now()).toISOString(),
            cartella: folder_name,
            provider_id: providerData.id,
            flags: { seen: msgData.seen, flagged: msgData.flagged },
            direzione: 'inbound',
            stato: msgData.seen ? 'letto' : 'nuovo',
            body_text: msgData.body || msgData.body_text || 'Contenuto da recuperare',
            body_html: msgData.body_html,
            attachments: msgData.attachments || [],
            data_invio: new Date(msgData.date || emailInfo.date || Date.now()).toISOString()
          });

        if (!insertError) {
          totalImported++;
          console.log(`✅ Email ${totalImported} salvata: "${msgData.subject || emailInfo.subject}"`);
        } else {
          console.error(`❌ Errore inserimento ${uid}:`, insertError);
        }

        // Aggiorna progresso ogni 10 email
        if (totalImported % 10 === 0) {
          await supabase
            .from('email_sync_logs')
            .update({
              messaggi_nuovi: totalImported,
              messaggi_sincronizzati: i + 1
            })
            .eq('id', syncLog.id);
        }

        // Delay tra email
        await new Promise(resolve => setTimeout(resolve, 200));

        // Safety limit
        if (i >= targetEmails) {
          console.log(`⚠️ Raggiunto limite ${targetEmails} email elaborate`);
          break;
        }
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