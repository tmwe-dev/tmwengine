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
  unread_only?: boolean;
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

    const { mode = 'auto', folder_name = 'INBOX', max_emails = 0, force_full = false, unread_only = false }: SyncRequest = await req.json();

    console.log('🚀 TMWE Email Sync Master - Modalità:', mode);
    console.log('🆔 Request ID:', crypto.randomUUID());
    console.log('⏰ Timestamp:', new Date().toISOString());

    // Variabile per salvare l'email utente (fuori dallo scope del blocco if)
    let userEmail: string | undefined;

    // Recupera token OAuth da environment o user_tmwe_credentials
    console.log('🔍 Cerco token TMWE_OAUTH_TOKEN in environment...');
    let oauthToken = Deno.env.get('TMWE_OAUTH_TOKEN');
    
    if (!oauthToken) {
      console.log('❌ Token non in environment, cerco in user_tmwe_credentials...');
      
      // Estrai l'utente autenticato dalla richiesta
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        throw new Error('❌ Authorization header mancante - utente non autenticato');
      }
      
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user?.email) {
        console.error('❌ Errore autenticazione:', authError);
        throw new Error('❌ Utente non autenticato o email mancante');
      }
      
      console.log('👤 Utente autenticato:', user.email);
      
      // Salva l'email utente per usarla dopo
      userEmail = user.email;
      
      // Cerca il token OAuth in user_tmwe_credentials
      const { data: credentials, error: credErr } = await supabase
        .from('user_tmwe_credentials')
        .select('access_token, expires_at, token_type')
        .eq('email', user.email)
        .eq('token_type', 'oauth')
        .maybeSingle();
      
      console.log('📊 Credenziali trovate:', credentials ? 'SÌ' : 'NO');
      if (credErr) {
        console.log('📊 Errore query:', credErr);
      }
      
      if (!credentials?.access_token) {
        throw new Error(`❌ Token OAuth non trovato per ${user.email}. Fai login TMWE prima di sincronizzare.`);
      }
      
      // Verifica scadenza token
      if (credentials.expires_at) {
        const expiresAt = new Date(credentials.expires_at);
        const now = new Date();
        
        if (expiresAt < now) {
          throw new Error('❌ Token OAuth scaduto. Rifai login TMWE.');
        }
        
        console.log('✅ Token valido fino a:', expiresAt.toISOString());
      }
      
      oauthToken = credentials.access_token;
      console.log('✅ Token OAuth estratto da user_tmwe_credentials');
    }
    
    if (!oauthToken) {
      console.error('❌ NESSUN TOKEN TROVATO!');
      throw new Error('TMWE OAuth token non configurato');
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

      // STEP 1: Recupera lista UID delle email nella cartella
      const allUIDs: Array<{uid: string, subject: string, from: string, date: string}> = [];
      const listBatchSize = 50;
      let listOffset = 0; // ✅ Inizia dall'inizio della cartella
      let hasMore = true;
      
      while (hasMore) {
        const requestId = crypto.randomUUID();
        const timestamp = new Date().toISOString();
        const timestampMs = Date.now();
        
        // Aggiungi parametro state per evitare cache
        const listUrl = `${baseUrl}/app.php?action=email_message&state=${timestampMs}`;
        
        const requestBody: any = {
          handler: 'get_messages',
          folder: folder_name,
          limit: listBatchSize,
          offset: listOffset,
          include_attachments: true,
          format: 'text'
        };
        
        console.log(`\n`);
        console.log(`========== NUOVA CHIAMATA API TMWE ==========`);
        console.log(`🆔 Request ID: ${requestId}`);
        console.log(`⏰ Timestamp: ${timestamp}`);
        console.log(`📤 REQUEST URL: ${listUrl}`);
        console.log(`📤 REQUEST METHOD: POST`);
        console.log(`📤 REQUEST BODY:`);
        console.log(JSON.stringify(requestBody, null, 2));
        console.log(`📤 REQUEST HEADERS:`);
        console.log(`   Authorization: Bearer ${oauthToken.substring(0, 30)}...${oauthToken.substring(oauthToken.length - 10)}`);
        console.log(`   Content-Type: application/json`);
        console.log(`   X-Request-ID: ${requestId}`);
        console.log(`   X-Timestamp: ${timestamp}`);
        console.log(`   X-Source: Lovable-CRM-Sync`);
        console.log(`=============================================\n`);

        console.log(`🚀 STO PER ESEGUIRE FETCH VERSO: ${listUrl}`);
        console.log(`⏰ Pre-fetch timestamp: ${Date.now()}`);
        
        let listResponse;
        try {
          console.log(`📡 Eseguendo fetch HTTPS...`);
          const fetchStartTime = Date.now();
          
          listResponse = await fetch(listUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${oauthToken}`,
              'Content-Type': 'application/json',
              'X-Request-ID': requestId,
              'X-Timestamp': timestamp,
              'X-Source': 'Lovable-CRM-Sync'
            },
            body: JSON.stringify(requestBody)
          });
          
          const fetchEndTime = Date.now();
          console.log(`✅ Fetch completato in ${fetchEndTime - fetchStartTime}ms`);
          console.log(`📊 Response object:`, {
            ok: listResponse.ok,
            status: listResponse.status,
            statusText: listResponse.statusText,
            url: listResponse.url,
            redirected: listResponse.redirected
          });
        } catch (fetchError) {
          console.log(`❌ HTTPS fallito con errore: ${fetchError}`);
          console.log(`⚠️ Tentativo fallback HTTP...`);
          const httpUrl = listUrl.replace('https://', 'http://');
          console.log(`📡 Eseguendo fetch HTTP verso: ${httpUrl}`);
          
          const fetchStartTime = Date.now();
          listResponse = await fetch(httpUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${oauthToken}`,
              'Content-Type': 'application/json',
              'X-Request-ID': requestId,
              'X-Timestamp': timestamp,
              'X-Source': 'Lovable-CRM-Sync'
            },
            body: JSON.stringify(requestBody)
          });
          const fetchEndTime = Date.now();
          console.log(`✅ Fetch HTTP completato in ${fetchEndTime - fetchStartTime}ms`);
        }

        if (!listResponse.ok) {
          const errorText = await listResponse.text();
          console.error(`❌ Errore HTTP ${listResponse.status}: ${errorText}`);
          break;
        }

        // Leggi la risposta completa
        const responseText = await listResponse.text();
        
        console.log(`\n`);
        console.log(`========== RISPOSTA API TMWE ==========`);
        console.log(`🆔 Request ID: ${requestId}`);
        console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
        console.log(`📥 RESPONSE STATUS: ${listResponse.status} ${listResponse.statusText}`);
        console.log(`📥 RESPONSE HEADERS:`);
        for (const [key, value] of listResponse.headers.entries()) {
          console.log(`   ${key}: ${value}`);
        }
        console.log(`📥 RESPONSE BODY (${responseText.length} caratteri):`);
        console.log(responseText);
        console.log(`=======================================\n`);
        
        let listData;
        try {
          listData = JSON.parse(responseText);
          console.log(`✅ JSON parsato: ${listData.messages?.length || 0} messaggi, total=${listData.total}`);
        } catch (parseError) {
          console.error(`❌ ERRORE parsing JSON: ${parseError}`);
          break;
        }
        
        // L'API può ritornare success: false MA includere comunque i messages
        // Errore vero = success: false E nessun message
        if (listData.success === false && (!listData.messages || listData.messages.length === 0)) {
          console.error(`❌ Errore API senza messages:`, listData);
          break;
        }

        // Altrimenti processa i messages (anche se success è false)
        const emails = listData.messages || [];
        
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
        
        // TEST: ferma dopo il primo batch per vedere la risposta
        console.log(`🛑 TEST completato - fermato dopo primo batch`);
        hasMore = false;
        
        // Delay tra batch per non sovraccaricare il server
        await new Promise(resolve => setTimeout(resolve, 200));

        // Safety limit aumentato per supportare migliaia di email
        if (allUIDs.length >= max_emails) {
          console.log(`⚠️ Limite massimo ${max_emails} raggiunto`);
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

        // Se unread_only è true, verifica se l'email è già letta (seen flag)
        // Per ora assumiamo che le nuove email non siano lette, 
        // quindi procediamo con il download

        // Email NON presente, scaricala con POST + JSON body
        console.log(`📥 Email ${i + 1}/${allUIDs.length}: Download ${uid} - "${emailInfo.subject}"`);

        const messageUrl = `${baseUrl}/app.php?action=email_message`;

        let messageResponse;
        try {
          messageResponse = await fetch(messageUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${oauthToken}`,
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
              'Authorization': `Bearer ${oauthToken}`,
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
        
        // Estrai header se presente nella struttura data.header
        const header = msgData.data?.header || msgData;

        // 🔍 LOGGING COMPLETO PER DEBUG
        console.log(`\n📧 ===== EMAIL ${uid} - STRUTTURA COMPLETA =====`);
        console.log(`📦 msgData COMPLETO:`, JSON.stringify(msgData, null, 2));
        console.log(`📦 header estratto:`, JSON.stringify(header, null, 2));
        console.log(`📦 emailInfo COMPLETO:`, JSON.stringify(emailInfo, null, 2));
        console.log(`📦 header.from tipo:`, typeof header.from);
        console.log(`📦 header.from valore:`, header.from);
        console.log(`📦 emailInfo.from tipo:`, typeof emailInfo.from);
        console.log(`📦 emailInfo.from valore:`, emailInfo.from);
        console.log(`========================================\n`);

        // Inserisci nel database
        const { error: insertError } = await supabase
          .from('email_messages')
          .insert({
            message_id: uid,
            user_email: userEmail || '',
            subject: header.subject || emailInfo.subject || 'Senza oggetto',
            from_email: header.from || emailInfo.from || '',
            to_email: Array.isArray(header.to) 
              ? header.to.map(addr => typeof addr === 'string' ? addr : addr.email).join(', ') 
              : '',
            cc_email: Array.isArray(header.cc) 
              ? header.cc.map(addr => typeof addr === 'string' ? addr : addr.email).join(', ') 
              : null,
            bcc_email: Array.isArray(header.bcc) 
              ? header.bcc.map(addr => typeof addr === 'string' ? addr : addr.email).join(', ') 
              : null,
            data_ricezione: new Date(header.date || emailInfo.date || Date.now()).toISOString(),
            cartella: folder_name,
            provider_id: providerData.id,
            flags: { seen: header.seen, flagged: header.flagged },
            direzione: 'inbound',
            stato: header.seen ? 'letto' : 'nuovo',
            body_text: msgData.data?.body_plain || msgData.body || 'Contenuto da recuperare',
            body_html: msgData.data?.body_html || null,
            attachments: msgData.data?.attachments || header.attachments || [],
            data_invio: new Date(header.date || emailInfo.date || Date.now()).toISOString()
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