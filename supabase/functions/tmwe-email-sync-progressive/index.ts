import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { folder_name = 'INBOX', target_emails = 3769, batch_delay = 2000 } = await req.json();

    console.log('🚀 AVVIO SINCRONIZZAZIONE PROGRESSIVA');
    console.log(`📁 Cartella: ${folder_name}`);
    console.log(`🎯 Target: ${target_emails} email totali`);
    console.log(`⏱️ Delay tra batch: ${batch_delay}ms`);

    // Recupera credenziali TMWE
    const { data: providerData, error: providerError } = await supabase
      .from('email_provider')
      .select('*, email_provider_credenziali(*)')
      .eq('provider', 'TMWE')
      .eq('attivo', true)
      .single();

    if (providerError || !providerData) {
      throw new Error('Provider TMWE non trovato o non attivo');
    }

    const oauthToken = providerData.email_provider_credenziali?.[0]?.api_key;
    if (!oauthToken) {
      throw new Error('Token OAuth TMWE non trovato');
    }

    // Crea log di sincronizzazione
    const { data: syncLog, error: syncLogError } = await supabase
      .from('email_sync_logs')
      .insert({
        provider_id: providerData.id,
        tipo_sync: 'progressive_batch',
        stato: 'in_corso'
      })
      .select()
      .single();

    if (syncLogError) throw syncLogError;

    let totalImported = 0;
    let currentOffset = 0;
    const batchSize = 10; // TMWE limite fisso
    let consecutiveEmpty = 0;
    let lastImportedDate = null;

    console.log('📊 INIZIO CICLO PROGRESSIVO');

    // Ciclo principale - continua fino a target o fino a 5 batch vuoti consecutivi
    while (totalImported < target_emails && consecutiveEmpty < 5) {
      console.log(`\n🔄 BATCH ${Math.floor(currentOffset / batchSize) + 1}`);
      console.log(`📍 Offset: ${currentOffset}, Importate: ${totalImported}/${target_emails}`);

      try {
        // Chiamata diretta alla funzione tmwe-email-sync-batch
        const response = await fetch('https://dlldkrzoxvjxpgkkttxu.supabase.co/functions/v1/tmwe-email-sync-batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
          },
          body: JSON.stringify({
            handler: 'batch_sync',
            folder_name: folder_name,
            max_emails: batchSize,
            batch_size: batchSize,
            offset: currentOffset
          })
        });

        const result = await response.json();
        console.log(`📊 Risultato batch:`, result);

        if (result.emails_downloaded > 0) {
          totalImported += result.emails_downloaded;
          consecutiveEmpty = 0; // Reset contatore vuoti
          
          console.log(`✅ Importate ${result.emails_downloaded} email in questo batch`);
          console.log(`📈 Totale importate: ${totalImported}`);
          
          // Aggiorna last imported date se disponibile
          if (result.last_email_date) {
            lastImportedDate = result.last_email_date;
          }
        } else {
          consecutiveEmpty++;
          console.log(`⚠️ Batch vuoto (${consecutiveEmpty}/5)`);
        }

        // Avanza offset
        currentOffset += batchSize;

        // Aggiorna log di progresso
        await supabase
          .from('email_sync_logs')
          .update({
            messaggi_nuovi: totalImported,
            messaggi_sincronizzati: Math.floor(currentOffset / batchSize),
            last_processed_offset: currentOffset
          })
          .eq('id', syncLog.id);

        // Delay tra batch per non sovraccaricare l'API
        if (batch_delay > 0) {
          console.log(`⏸️ Pausa ${batch_delay}ms prima del prossimo batch...`);
          await new Promise(resolve => setTimeout(resolve, batch_delay));
        }

      } catch (batchError) {
        console.error(`❌ Errore batch ${currentOffset}:`, batchError);
        consecutiveEmpty++;
        currentOffset += batchSize; // Avanza comunque per evitare loop infiniti
      }
    }

    // Finalizza sincronizzazione
    const finalStatus = totalImported >= target_emails ? 'completato' : 
                       consecutiveEmpty >= 5 ? 'completato_parziale' : 'completato';

    await supabase
      .from('email_sync_logs')
      .update({
        stato: finalStatus,
        sync_end: new Date().toISOString(),
        messaggi_nuovi: totalImported,
        messaggi_sincronizzati: Math.floor(currentOffset / batchSize)
      })
      .eq('id', syncLog.id);

    console.log('🎉 SINCRONIZZAZIONE PROGRESSIVA COMPLETATA');
    console.log(`📊 Email importate: ${totalImported}/${target_emails}`);
    console.log(`🔄 Batch processati: ${Math.floor(currentOffset / batchSize)}`);
    console.log(`📅 Ultima data importata: ${lastImportedDate || 'N/A'}`);

    return new Response(JSON.stringify({
      success: true,
      sync_log_id: syncLog.id,
      total_imported: totalImported,
      target_emails: target_emails,
      batches_processed: Math.floor(currentOffset / batchSize),
      final_offset: currentOffset,
      status: finalStatus,
      last_imported_date: lastImportedDate,
      message: `Sincronizzazione progressiva completata: ${totalImported} email importate su ${target_emails} target`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('❌ ERRORE SINCRONIZZAZIONE PROGRESSIVA:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Errore sconosciuto'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});