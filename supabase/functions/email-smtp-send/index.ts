import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SMTPConfig {
  smtp_server: string;
  smtp_porta: number;
  smtp_sicurezza: string;
  email_username: string;
  email_password: string;
}

interface EmailRequest {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body_html?: string;
  body_text?: string;
  provider_id: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Starting SMTP email send function');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { to, cc, bcc, subject, body_html, body_text, provider_id }: EmailRequest = await req.json();

    // Input validation
    if (!to || !subject || !provider_id) {
      return new Response(
        JSON.stringify({ error: 'Parametri obbligatori mancanti: to, subject, provider_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📧 Sending email to:', to);

    // Get SMTP configuration
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

    const config: SMTPConfig = {
      smtp_server: providerData.smtp_server,
      smtp_porta: providerData.smtp_porta,
      smtp_sicurezza: providerData.smtp_sicurezza,
      email_username: providerData.email_username,
      email_password: credentials.email_password,
    };

    console.log('⚙️ SMTP Config:', {
      server: config.smtp_server,
      port: config.smtp_porta,
      security: config.smtp_sicurezza,
      username: config.email_username
    });

    // Create SMTP client
    const client = new SMTPClient({
      connection: {
        hostname: config.smtp_server,
        port: config.smtp_porta,
        tls: config.smtp_sicurezza === 'tls',
        auth: {
          username: config.email_username,
          password: config.email_password,
        },
      },
    });

    console.log('🔐 Connecting to SMTP server...');

    // Send email
    const emailContent = {
      from: config.email_username,
      to: to.split(',').map(email => email.trim()),
      cc: cc ? cc.split(',').map(email => email.trim()) : undefined,
      bcc: bcc ? bcc.split(',').map(email => email.trim()) : undefined,
      subject,
      content: body_text || 'Versione testuale del messaggio',
      html: body_html,
    };

    console.log('📤 Sending email via SMTP...');
    await client.send(emailContent);
    await client.close();

    console.log('✅ Email sent successfully');

    // Generate message ID
    const messageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@${config.smtp_server}`;

    // Save message to database
    const { error: insertError } = await supabase
      .from('email_messages')
      .insert({
        provider_id,
        message_id: messageId,
        subject,
        from_email: config.email_username,
        to_email: to,
        cc_email: cc,
        bcc_email: bcc,
        body_text: body_text || 'Versione testuale del messaggio',
        body_html,
        data_ricezione: new Date().toISOString(),
        data_invio: new Date().toISOString(),
        direzione: 'outbound',
        stato: 'nuovo',
        cartella: 'Sent',
        sync_status: 'sincronizzato'
      });

    if (insertError) {
      console.error('❌ Error saving email to database:', insertError);
      // Don't fail the request if database save fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        message_id: messageId,
        status: 'sent',
        note: 'Email inviata con successo via SMTP'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('❌ Error in SMTP send function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error',
        stack: error.stack,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});