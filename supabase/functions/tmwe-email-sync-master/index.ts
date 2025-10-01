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
      console.log('📊 Credenziali array:', provider?.email_provider_credenziali);
      
      if (provider?.email_provider_credenziali?.[0]) {
        console.log('📊 Prima credenziale:', provider.email_provider_credenziali[0]);
        // Cerca prima oauth_token poi api_key come fallback
        oauthToken = provider.email_provider_credenziali[0].oauth_token || 
                     provider.email_provider_credenziali[0].api_key;
        console.log('📊 Token estratto:', oauthToken ? 'TROVATO' : 'NULL');
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

    // Parametri dinamici
    let batchSize = 50;
    let targetEmails = max_emails;
    let syncType = 'manuale';

    if (actualMode === 'initial') {
      batchSize = 100;
      targetEmails = targetEmails || 5000;
      syncType = 'full_sync';
    } else if (actualMode === 'incremental') {
      batchSize = 25;
      targetEmails = targetEmails || 200;
      syncType = 'incremental_sync';
    } else if (actualMode === 'continuous') {
      batchSize = 10;
      targetEmails = 50;
      syncType = 'automatica';
    }

    console.log(`📋 Parametri: modalità=${actualMode}, batch=${batchSize}, target=${targetEmails}`);

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

    // SYNC PROCESS
    let totalImported = 0;
    let currentOffset = 0;
    const maxBatches = Math.ceil(targetEmails / batchSize);
    let consecutiveEmpty = 0;

    console.log(`🎯 Inizio sync: max ${maxBatches} batch di ${batchSize} email`);

    for (let batch = 1; batch <= maxBatches && consecutiveEmpty < 3; batch++) {
      console.log(`\n📦 BATCH ${batch}/${maxBatches} (offset: ${currentOffset})`);

      try {
        // USA ESATTAMENTE IL METODO DI tmwe-email-messages!
        const baseUrl = 'https://findair.it/erp/tmwe_json';
        const apiUrl = `${baseUrl}/app.php?action=email_message`;
        
        const requestBody = {
          handler: 'get_messages',
          folder: folder_name,
          limit: batchSize,
          offset: currentOffset,
          include_attachments: false,
          format: 'text'
        };

        console.log('🔌 API Request:', apiUrl);

        let emailResponse;
        try {
          emailResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${oauthToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
          });
        } catch (error) {
          console.log('HTTPS falló, intentando HTTP:', error);
          const httpUrl = apiUrl.replace('https://', 'http://');
          emailResponse = await fetch(httpUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${oauthToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
          });
        }

        console.log('Response status:', emailResponse.status, emailResponse.statusText);

        if (!emailResponse.ok) {
          const errorText = await emailResponse.text();
          console.error('❌ Errore API TMWE:', emailResponse.status, errorText);
          break;
        }

        const emailData = await emailResponse.json();
        const messages = emailData?.messages || [];
        
        console.log(`📊 Ricevuti ${messages.length} messaggi`);

        if (messages.length === 0) {
          consecutiveEmpty++;
          console.log(`⚠️ Batch vuoto (${consecutiveEmpty}/3)`);
          currentOffset += batchSize;
          continue;
        }

        consecutiveEmpty = 0;
        let newEmailsInBatch = 0;

        // Processa ogni email
        for (const message of messages) {
          try {
            const { count: existingCount } = await supabase
              .from('email_messages')
              .select('*', { count: 'exact', head: true })
              .eq('message_id', message.uid || message.msgno);

            if (existingCount === 0) {
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
                  stato: 'nuovo',
                  body_text: 'Contenuto da recuperare',
                  data_invio: new Date(message.date || Date.now()).toISOString()
                });

              if (!insertError) {
                newEmailsInBatch++;
                totalImported++;
              }
            }
          } catch (msgError) {
            console.error('❌ Errore processamento messaggio:', msgError);
          }
        }

        console.log(`✅ Salvate ${newEmailsInBatch} nuove email in questo batch`);
        currentOffset += batchSize;

        // Aggiorna progresso
        await supabase
          .from('email_sync_logs')
          .update({
            messaggi_nuovi: totalImported,
            messaggi_sincronizzati: batch
          })
          .eq('id', syncLog.id);

        // Delay tra batch
        if (batch < maxBatches) {
          await new Promise(resolve => setTimeout(resolve, actualMode === 'continuous' ? 1000 : 500));
        }

      } catch (batchError) {
        console.error(`❌ Errore batch ${batch}:`, batchError);
        consecutiveEmpty++;
      }
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