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

    // NUOVO APPROCCIO: SCARICA LISTA COMPLETA UID, POI SCARICA SOLO MANCANTI
    let totalImported = 0;

    console.log(`🎯 STEP 1: Recupero informazioni cartella ${folder_name}`);

    try {
      const baseUrl = 'https://findair.it/erp/tmwe_json';

      // STEP 1: Ottieni info cartella per sapere quante email ci sono
      const folderInfoUrl = `${baseUrl}/app.php?action=email_folder`;
      const folderInfoBody = {
        handler: 'get_folder_info',
        folder_name: folder_name
      };

      console.log(`📊 Richiesta info cartella: ${JSON.stringify(folderInfoBody)}`);

      let folderResponse;
      try {
        folderResponse = await fetch(folderInfoUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${oauthToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(folderInfoBody)
        });
      } catch (error) {
        const httpUrl = folderInfoUrl.replace('https://', 'http://');
        folderResponse = await fetch(httpUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${oauthToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(folderInfoBody)
        });
      }

      if (!folderResponse.ok) {
        throw new Error(`Errore info cartella: ${folderResponse.status}`);
      }

      const folderData = await folderResponse.json();
      const totalMessages = folderData.total_messages || folderData.messages || 0;
      console.log(`📬 Cartella ${folder_name}: ${totalMessages} email totali disponibili`);

      // STEP 2: Scarica TUTTI gli UID disponibili con paginazione
      console.log(`\n🎯 STEP 2: Recupero lista completa UID`);
      
      const allUIDs: string[] = [];
      const listBatchSize = 100; // Prendi 100 UID per volta
      let listOffset = 0;
      
      while (listOffset < totalMessages) {
        const listUrl = `${baseUrl}/app.php?action=get_email_list`;
        const listBody = {
          folder: folder_name,
          criteria: 'ALL',
          offset: listOffset,
          limit: listBatchSize
        };

        console.log(`📋 Batch lista: offset=${listOffset}, limit=${listBatchSize}`);

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
          const httpUrl = listUrl.replace('https://', 'http://');
          listResponse = await fetch(httpUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${oauthToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(listBody)
          });
        }

        if (!listResponse.ok) {
          console.error(`❌ Errore recupero lista a offset ${listOffset}`);
          break;
        }

        const listData = await listResponse.json();
        const emails = listData.results || listData.emails || [];
        
        if (emails.length === 0) {
          console.log(`✅ Fine lista UID a offset ${listOffset}`);
          break;
        }

        // Estrai gli UID
        for (const email of emails) {
          if (email.uid) {
            allUIDs.push(email.uid);
          }
        }

        console.log(`✅ Recuperati ${emails.length} UID (totale: ${allUIDs.length})`);
        
        listOffset += listBatchSize;
        
        // Delay tra batch
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      console.log(`\n📊 TOTALE UID RECUPERATI: ${allUIDs.length}`);

      // STEP 3: Per ogni UID, controlla se esiste nel DB, altrimenti scaricalo
      console.log(`\n🎯 STEP 3: Download email mancanti`);

      for (let i = 0; i < allUIDs.length; i++) {
        const uid = allUIDs[i];
        
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

        // Email NON presente, scaricala
        console.log(`📥 Email ${i + 1}/${allUIDs.length}: Download ${uid}`);

        const messageUrl = `${baseUrl}/app.php?action=email_message`;
        const messageBody = {
          handler: 'get_message',
          uid: uid,
          folder: folder_name,
          format: 'text'
        };

        let messageResponse;
        try {
          messageResponse = await fetch(messageUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${oauthToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(messageBody)
          });
        } catch (error) {
          const httpUrl = messageUrl.replace('https://', 'http://');
          messageResponse = await fetch(httpUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${oauthToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(messageBody)
          });
        }

        if (!messageResponse.ok) {
          console.error(`❌ Errore download ${uid}`);
          continue;
        }

        const message = await messageResponse.json();
        const msgData = message.result || message;

        // Inserisci nel database
        const { error: insertError } = await supabase
          .from('email_messages')
          .insert({
            message_id: uid,
            subject: msgData.subject || 'Senza oggetto',
            from_email: msgData.from || '',
            to_email: msgData.to || '',
            cc_email: msgData.cc,
            bcc_email: msgData.bcc,
            data_ricezione: new Date(msgData.date || Date.now()).toISOString(),
            cartella: folder_name,
            provider_id: providerData.id,
            flags: { seen: msgData.seen, flagged: msgData.flagged },
            direzione: 'inbound',
            stato: msgData.seen ? 'letto' : 'nuovo',
            body_text: msgData.body || 'Contenuto da recuperare',
            body_html: msgData.body_html,
            data_invio: new Date(msgData.date || Date.now()).toISOString()
          });

        if (!insertError) {
          totalImported++;
          console.log(`✅ Salvata email ${totalImported}: ${msgData.subject}`);
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