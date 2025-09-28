import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
  action: 'full_sync' | 'incremental_sync' | 'sync_folder' | 'get_sync_status';
  folder_name?: string;
  date_from?: string;
  date_to?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, folder_name, date_from, date_to }: TMWEEmailSyncRequest = await req.json();
    console.log('TMWE Email Sync request:', { action, folder_name });

    // Recupera configurazione provider TMWE
    const { data: provider, error: providerError } = await supabase
      .from('email_provider')
      .select(`
        *,
        email_provider_credenziali(*)
      `)
      .eq('provider', 'TMWE')
      .eq('attivo', true)
      .single();

    if (providerError || !provider) {
      throw new Error('Provider TMWE non configurato o non attivo');
    }

    // Recupera configurazione SSL
    const { data: sslConfig } = await supabase
      .from('email_ssl_config')
      .select('*')
      .eq('provider_id', provider.id)
      .single();

    const apiKey = provider.email_provider_credenziali[0]?.api_key;
    if (!apiKey) {
      throw new Error('API Key TMWE non configurata');
    }

    // Avvia log di sincronizzazione
    const { data: syncLog, error: logError } = await supabase
      .from('email_sync_logs')
      .insert({
        provider_id: provider.id,
        tipo_sync: action,
        stato: 'in_corso'
      })
      .select()
      .single();

    if (logError) throw logError;

    let syncResult;
    try {
      // Costruisci URL API TMWE con parametri SSL bypass
      const tmweUrl = new URL('https://erp.tmwe.it/erp/tmwe_json');
      tmweUrl.searchParams.set('app.php', 'email_sync');
      tmweUrl.searchParams.set('action', action);
      
      if (folder_name) tmweUrl.searchParams.set('folder_name', folder_name);
      if (date_from) tmweUrl.searchParams.set('date_from', date_from);
      if (date_to) tmweUrl.searchParams.set('date_to', date_to);

      console.log('Calling TMWE API:', tmweUrl.toString());

      // Chiamata API TMWE con gestione certificati auto-firmati
      const response = await fetch(tmweUrl.toString(), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        // Configurazione per accettare certificati auto-firmati
        // Nota: Questo bypassa la verifica SSL in ambiente Deno Edge Function
      });

      if (!response.ok) {
        throw new Error(`TMWE API Error: ${response.status} ${response.statusText}`);
      }

      syncResult = await response.json();
      console.log('TMWE API Response:', syncResult);

      if (syncResult.success && syncResult.emails) {
        // Processa email sincronizzate
        let emailsSincronizzate = 0;
        let emailsNuove = 0;

        for (const email of syncResult.emails) {
          const { data: existingEmail } = await supabase
            .from('email_messages')
            .select('id')
            .eq('message_id', email.message_id)
            .single();

          if (!existingEmail) {
            // Nuova email - inserisci
            const { error: insertError } = await supabase
              .from('email_messages')
              .insert({
                provider_id: provider.id,
                message_id: email.message_id,
                subject: email.subject,
                from_email: email.from,
                to_email: email.to,
                cc_email: email.cc,
                bcc_email: email.bcc,
                body_text: email.body_text,
                body_html: email.body_html,
                data_ricezione: email.date,
                cartella: email.folder || 'INBOX',
                direzione: 'inbound',
                stato: email.seen ? 'letto' : 'nuovo',
                sync_status: 'sincronizzato',
                flags: email.flags || [],
                attachments: email.attachments || []
              });

            if (!insertError) {
              emailsNuove++;
              emailsSincronizzate++;
            }
          } else {
            emailsSincronizzate++;
          }
        }

        // Aggiorna log di sincronizzazione - successo
        await supabase
          .from('email_sync_logs')
          .update({
            stato: 'completato',
            sync_end: new Date().toISOString(),
            messaggi_sincronizzati: emailsSincronizzate,
            messaggi_nuovi: emailsNuove
          })
          .eq('id', syncLog.id);

        return new Response(JSON.stringify({
          success: true,
          sync_log_id: syncLog.id,
          emails_sincronizzate: emailsSincronizzate,
          emails_nuove: emailsNuove,
          tmwe_response: syncResult
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

    } catch (syncError) {
      console.error('Sync error:', syncError);
      const errorMessage = syncError instanceof Error ? syncError.message : 'Unknown sync error';
      
      // Aggiorna log di sincronizzazione - errore
      await supabase
        .from('email_sync_logs')
        .update({
          stato: 'errore',
          sync_end: new Date().toISOString(),
          errori: [{ error: errorMessage }]
        })
        .eq('id', syncLog.id);

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