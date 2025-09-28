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

interface TMWEEmailSendRequest {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body_text?: string;
  body_html?: string;
  attachments?: Array<{
    filename: string;
    content: string; // base64
  }>;
  reply_to?: string;
  priority?: 'low' | 'normal' | 'high';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const emailData: TMWEEmailSendRequest = await req.json();
    console.log('TMWE Email Send request:', { to: emailData.to, subject: emailData.subject });

    // Validazione input
    if (!emailData.to || !emailData.subject) {
      throw new Error('Destinatario e oggetto sono obbligatori');
    }

    // Recupera configurazione provider TMWE
    const { data: provider, error: providerError } = await supabase
      .from('email_provider')
      .select(`
        *,
        email_provider_credenziali(*)
      `)
      .eq('provider', 'TMWE')
      .eq('attivo', true)
      .maybeSingle();

    if (providerError) {
      console.error('Provider error:', providerError);
      throw new Error(`Errore database: ${providerError.message}`);
    }
    
    if (!provider) {
      throw new Error('Provider TMWE non configurato o non attivo');
    }

    console.log('Provider found:', provider.id);

    const credentials = provider.email_provider_credenziali;
    if (!credentials || credentials.length === 0) {
      throw new Error('Credenziali TMWE non configurate');
    }

    const apiKey = credentials[0]?.api_key;
    if (!apiKey) {
      throw new Error('API Key TMWE non configurata');
    }

    console.log('API Key found, length:', apiKey.length);

    // Costruisci payload per TMWE API
    const tmwePayload = {
      action: 'send_message',
      to: emailData.to,
      cc: emailData.cc,
      bcc: emailData.bcc,
      subject: emailData.subject,
      body: emailData.body_text,
      body_html: emailData.body_html,
      reply_to: emailData.reply_to,
      priority: emailData.priority || 'normal',
      attachments: emailData.attachments || []
    };

    console.log('Sending to TMWE API...');

    // Chiamata API TMWE per invio email - endpoint corretto dalla documentazione
    const tmweUrl = 'https://erp.tmwe.it/erp/tmwe_json?app.php=email_message&action=send_message';
    const response = await fetch(tmweUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(tmwePayload)
    });

    if (!response.ok) {
      throw new Error(`TMWE API Error: ${response.status} ${response.statusText}`);
    }

    const tmweResult = await response.json();
    console.log('TMWE API Response:', tmweResult);

    if (tmweResult.success) {
      // Salva email inviata nel database
      const { data: savedEmail, error: saveError } = await supabase
        .from('email_messages')
        .insert({
          provider_id: provider.id,
          message_id: tmweResult.message_id || `tmwe-${Date.now()}`,
          subject: emailData.subject,
          from_email: provider.email_username,
          to_email: emailData.to,
          cc_email: emailData.cc,
          bcc_email: emailData.bcc,
          body_text: emailData.body_text,
          body_html: emailData.body_html,
          data_invio: new Date().toISOString(),
          cartella: 'Sent',
          direzione: 'outbound',
          stato: 'inviato',
          sync_status: 'sincronizzato',
          attachments: emailData.attachments || []
        })
        .select()
        .single();

      if (saveError) {
        console.error('Error saving sent email:', saveError);
      }

      return new Response(JSON.stringify({
        success: true,
        message_id: tmweResult.message_id,
        email_saved_id: savedEmail?.id,
        tmwe_response: tmweResult
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      throw new Error(`TMWE API failed: ${tmweResult.error || 'Unknown error'}`);
    }

  } catch (error) {
    console.error('Error in tmwe-email-send function:', error);
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