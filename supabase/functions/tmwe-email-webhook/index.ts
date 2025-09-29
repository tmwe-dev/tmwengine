import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface TMWEWebhookPayload {
  type: 'email_received' | 'email_sent' | 'email_failed';
  email: {
    message_id: string;
    subject: string;
    from: string;
    to: string;
    cc?: string;
    bcc?: string;
    body_text?: string;
    body_html?: string;
    date: string;
    folder: string;
    attachments?: Array<{
      filename: string;
      size: number;
      content_type: string;
    }>;
    flags?: string[];
  };
  timestamp: string;
}

serve(async (req) => {
  console.log('TMWE Webhook received:', req.method);

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const payload: TMWEWebhookPayload = await req.json();
    console.log('Webhook payload:', JSON.stringify(payload, null, 2));

    // Verifica che il webhook provenga da TMWE (opzionale: validazione signature)
    const userAgent = req.headers.get('user-agent');
    console.log('User-Agent:', userAgent);

    // Recupera provider TMWE attivo
    const { data: provider, error: providerError } = await supabase
      .from('email_provider')
      .select('id')
      .eq('provider', 'TMWE')
      .eq('attivo', true)
      .single();

    if (providerError || !provider) {
      console.error('Provider TMWE non trovato:', providerError);
      return new Response('Provider not configured', { status: 400 });
    }

    // Verifica se l'email esiste già
    const { data: existingEmail } = await supabase
      .from('email_messages')
      .select('id')
      .eq('message_id', payload.email.message_id)
      .single();

    if (existingEmail) {
      console.log('Email already exists, skipping...');
      return new Response(JSON.stringify({ success: true, message: 'Email already processed' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Determina direzione e stato in base al tipo webhook
    let direzione: 'inbound' | 'outbound' = 'inbound';
    let stato = 'nuovo';
    let cartella = payload.email.folder || 'INBOX';

    if (payload.type === 'email_sent') {
      direzione = 'outbound';
      stato = 'inviato';
      cartella = 'Sent';
    } else if (payload.type === 'email_failed') {
      direzione = 'outbound';
      stato = 'errore';
      cartella = 'Sent';
    }

    // Inserisci email nel database
    const { data: savedEmail, error: insertError } = await supabase
      .from('email_messages')
      .insert({
        provider_id: provider.id,
        message_id: payload.email.message_id,
        subject: payload.email.subject,
        from_email: payload.email.from,
        to_email: payload.email.to,
        cc_email: payload.email.cc,
        bcc_email: payload.email.bcc,
        body_text: payload.email.body_text,
        body_html: payload.email.body_html,
        data_ricezione: direzione === 'inbound' ? payload.email.date : null,
        data_invio: direzione === 'outbound' ? payload.email.date : null,
        cartella,
        direzione,
        stato,
        sync_status: 'webhook',
        flags: payload.email.flags || [],
        attachments: payload.email.attachments || [],
        raw_headers: {
          webhook_type: payload.type,
          webhook_timestamp: payload.timestamp
        }
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting email:', insertError);
      throw insertError;
    }

    console.log('Email salvata con successo:', savedEmail.id);

    // Se ci sono allegati, elaborali (opzionale)
    if (payload.email.attachments && payload.email.attachments.length > 0) {
      console.log(`Processing ${payload.email.attachments.length} attachments...`);
      
      for (const attachment of payload.email.attachments) {
        await supabase
          .from('email_attachments')
          .insert({
            nome: attachment.filename,
            file_size: attachment.size,
            mime_type: attachment.content_type,
            file_path: `webhook/${savedEmail.id}/${attachment.filename}`
          });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      email_id: savedEmail.id,
      message: 'Email processed successfully' 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error processing webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});