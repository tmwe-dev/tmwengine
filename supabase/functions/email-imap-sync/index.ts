import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IMAPConfig {
  imap_server: string;
  imap_porta: number;
  imap_sicurezza: string;
  email_username: string;
  email_password: string;
  cartella_inbox: string;
  max_email_sync: number;
}

interface SyncRequest {
  provider_id: string;
  tipo_sync?: 'manuale' | 'automatico' | 'iniziale';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Starting IMAP sync function');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Leggi il body della richiesta
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error('❌ Error parsing request body:', parseError);
      return new Response(
        JSON.stringify({ error: 'Formato richiesta non valido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { provider_id, tipo_sync = 'manuale' }: SyncRequest = requestBody;

    console.log('📬 Sync request:', { provider_id, tipo_sync });

    if (!provider_id) {
      console.error('❌ Missing provider_id');
      return new Response(
        JSON.stringify({ error: 'provider_id è obbligatorio' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📬 Starting sync for provider:', provider_id);

    // Ottieni configurazione IMAP
    const { data: providerData, error: providerError } = await supabase
      .from('email_provider')
      .select(`
        *,
        email_provider_credenziali (*)
      `)
      .eq('id', provider_id)
      .eq('tipo_provider', 'smtp_imap')
      .eq('attivo', true)
      .single();

    if (providerError || !providerData) {
      console.error('❌ Provider configuration not found:', providerError);
      return new Response(
        JSON.stringify({ error: 'Provider email non trovato o inattivo' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const credentials = providerData.email_provider_credenziali[0];
    if (!credentials?.email_password) {
      return new Response(
        JSON.stringify({ error: 'Credenziali email non configurate' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const config: IMAPConfig = {
      imap_server: providerData.imap_server,
      imap_porta: providerData.imap_porta,
      imap_sicurezza: providerData.imap_sicurezza,
      email_username: providerData.email_username,
      email_password: credentials.email_password,
      cartella_inbox: providerData.cartella_inbox || 'INBOX',
      max_email_sync: providerData.max_email_sync || 50,
    };

    console.log('⚙️ IMAP Config:', {
      server: config.imap_server,
      port: config.imap_porta,
      security: config.imap_sicurezza,
      username: config.email_username,
      folder: config.cartella_inbox
    });

    // Inizia log di sincronizzazione
    const { data: syncLog, error: syncLogError } = await supabase
      .from('email_sync_logs')
      .insert({
        provider_id,
        tipo_sync,
        stato: 'in_corso'
      })
      .select()
      .single();

    if (syncLogError) {
      console.error('❌ Error creating sync log:', syncLogError);
    }

    const syncLogId = syncLog?.id;

    try {
      // Simula connessione IMAP e lettura email
      // In una implementazione reale useresti imap-simple o simili
      console.log('📂 Connecting to IMAP server...');

      // Simula il recupero di email
      const mockEmails = [
        {
          uid: 1,
          messageId: `test-1-${Date.now()}@${config.imap_server}`,
          subject: 'Test Email 1',
          from: 'sender1@example.com',
          to: config.email_username,
          date: new Date(),
          body: 'This is a test email body',
          flags: ['\\Recent']
        },
        {
          uid: 2,
          messageId: `test-2-${Date.now()}@${config.imap_server}`,
          subject: 'Test Email 2',
          from: 'sender2@example.com',
          to: config.email_username,
          date: new Date(),
          body: 'This is another test email body',
          flags: ['\\Seen']
        }
      ];

      console.log(`📧 Found ${mockEmails.length} emails to sync`);

      let messaggiNuovi = 0;
      let messaggiAggiornati = 0;
      const errori: any[] = [];

      for (const email of mockEmails) {
        try {
          // Controlla se l'email esiste già
          const { data: existingEmail } = await supabase
            .from('email_messages')
            .select('id, stato')
            .eq('provider_id', provider_id)
            .eq('message_id', email.messageId)
            .single();

          if (existingEmail) {
            // Aggiorna email esistente se necessario
            const newFlags = email.flags.includes('\\Seen') ? 'letto' : 'nuovo';
            if (existingEmail.stato !== newFlags) {
              await supabase
                .from('email_messages')
                .update({ stato: newFlags })
                .eq('id', existingEmail.id);
              messaggiAggiornati++;
            }
          } else {
            // Inserisci nuova email
            const { error: insertError } = await supabase
              .from('email_messages')
              .insert({
                provider_id,
                message_id: email.messageId,
                subject: email.subject,
                from_email: email.from,
                to_email: email.to,
                body_text: email.body,
                data_ricezione: email.date.toISOString(),
                direzione: 'inbound',
                stato: email.flags.includes('\\Seen') ? 'letto' : 'nuovo',
                cartella: config.cartella_inbox,
                flags: email.flags,
                sync_status: 'sincronizzato'
              });

            if (insertError) {
              console.error('❌ Error inserting email:', insertError);
              errori.push({
                message_id: email.messageId,
                error: insertError.message
              });
            } else {
              messaggiNuovi++;
            }
          }
        } catch (emailError: any) {
          console.error('❌ Error processing email:', emailError);
          errori.push({
            message_id: email.messageId,
            error: emailError.message
          });
        }
      }

      // Aggiorna log di sincronizzazione
      if (syncLogId) {
        await supabase
          .from('email_sync_logs')
          .update({
            sync_end: new Date().toISOString(),
            messaggi_sincronizzati: mockEmails.length,
            messaggi_nuovi: messaggiNuovi,
            messaggi_aggiornati: messaggiAggiornati,
            errori: errori.length > 0 ? errori : null,
            stato: errori.length > 0 ? 'errore' : 'completato'
          })
          .eq('id', syncLogId);
      }

      console.log('✅ IMAP sync completed:', {
        total: mockEmails.length,
        nuovi: messaggiNuovi,
        aggiornati: messaggiAggiornati,
        errori: errori.length
      });

      return new Response(
        JSON.stringify({
          success: true,
          sync_id: syncLogId,
          messaggi_totali: mockEmails.length,
          messaggi_nuovi: messaggiNuovi,
          messaggi_aggiornati: messaggiAggiornati,
          errori: errori.length,
          note: 'Sincronizzazione IMAP simulata - implementazione completa necessaria'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );

    } catch (syncError: any) {
      console.error('❌ Sync error:', syncError);
      
      // Aggiorna log con errore
      if (syncLogId) {
        await supabase
          .from('email_sync_logs')
          .update({
            sync_end: new Date().toISOString(),
            stato: 'errore',
            errori: [{ error: syncError.message }]
          })
          .eq('id', syncLogId);
      }

      throw syncError;
    }

  } catch (error: any) {
    console.error('❌ Error in IMAP sync function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});