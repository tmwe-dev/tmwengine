import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailDownloadRequest {
  limit?: number;
  folder?: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log("Starting email download...");

    // Parse request body
    const { limit = 100, folder = 'INBOX' }: EmailDownloadRequest = 
      req.method === 'POST' ? await req.json() : {};

    console.log(`Downloading ${limit} emails from folder: ${folder}`);

    // Get TMWE credentials - same logic as tmwe-email-sync
    const { data: providers, error: providerError } = await supabase
      .from('email_provider')
      .select(`
        *,
        email_provider_credenziali (*)
      `)
      .eq('attivo', true)
      .single();

    if (providerError || !providers) {
      throw new Error('Provider email non trovato o non attivo');
    }

    // Get the most recent credentials with API key or OAuth token
    const credentials = providers.email_provider_credenziali
      ?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      ?.find((cred: any) => cred.api_key?.trim() || cred.oauth_token?.trim());

    if (!credentials || (!credentials.api_key?.trim() && !credentials.oauth_token?.trim())) {
      throw new Error('Credenziali TMWE non trovate o vuote');
    }

    console.log("Using TMWE credentials for download");

    // Use OAuth token if available, otherwise API key
    const apiKey = credentials.oauth_token?.trim() || credentials.api_key?.trim();

    // TMWE API URL - esatto come tmwe-email-sync
    const baseUrl = 'https://findair.it/erp/tmwe_json/app.php';
    
    const requestParams = new URLSearchParams({
      action: 'get_messages',
      api_key: apiKey,
      folder: folder,
      limit: limit.toString(),
      format: 'json'
    });

    console.log(`Fetching emails from: ${baseUrl}?${requestParams.toString()}`);

    let response;
    try {
      console.log("Tentativo connessione HTTPS a TMWE...");
      response = await fetch(`${baseUrl}?${requestParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

    } catch (httpsError) {
      console.log("HTTPS fallito, tentativo HTTP...");
      const httpUrl = baseUrl.replace('https://', 'http://');
      response = await fetch(`${httpUrl}?${requestParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
    }

    console.log(`Response status: ${response.status}`);

    if (!response.ok) {
      throw new Error(`TMWE API error: ${response.status} ${response.statusText}`);
    }

    const responseText = await response.text();
    console.log(`Response length: ${responseText.length} characters`);
    console.log(`Response preview: ${responseText.substring(0, 200)}`);

    let emailData;
    try {
      emailData = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse JSON response:", parseError);
      console.log("Raw response:", responseText);
      throw new Error('Risposta API non valida');
    }

    if (!emailData.success) {
      throw new Error(`TMWE API error: ${emailData.error || 'Unknown error'}`);
    }

    const messages = emailData.data?.messages || [];
    console.log(`Found ${messages.length} messages to process`);

    let insertedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    const errors = [];

    // Process each message
    for (const message of messages) {
      try {
        // Check if message already exists
        const { data: existingMessage } = await supabase
          .from('email_messages')
          .select('id')
          .eq('message_id', message.message_id)
          .maybeSingle();

        const emailRecord = {
          message_id: message.message_id,
          provider_id: providers.id,
          subject: message.subject || '',
          from_email: message.from || '',
          to_email: message.to || '',
          cc_email: message.cc || null,
          bcc_email: message.bcc || null,
          body_text: message.body_text || null,
          body_html: message.body_html || null,
          data_ricezione: message.date ? new Date(message.date) : new Date(),
          data_invio: message.sent_date ? new Date(message.sent_date) : null,
          direzione: message.direction || 'inbound',
          stato: message.status || 'nuovo',
          cartella: folder,
          flags: message.flags || [],
          thread_id: message.thread_id || null,
          in_reply_to: message.in_reply_to || null,
          email_references: message.references || null,
          attachments: message.attachments || [],
          raw_headers: message.headers || null,
          sync_status: 'sincronizzato'
        };

        if (existingMessage) {
          // Update existing message
          const { error: updateError } = await supabase
            .from('email_messages')
            .update(emailRecord)
            .eq('id', existingMessage.id);

          if (updateError) {
            console.error("Error updating message:", updateError);
            errors.push(`Update error for ${message.message_id}: ${updateError.message}`);
            errorCount++;
          } else {
            updatedCount++;
          }
        } else {
          // Insert new message
          const { error: insertError } = await supabase
            .from('email_messages')
            .insert(emailRecord);

          if (insertError) {
            console.error("Error inserting message:", insertError);
            errors.push(`Insert error for ${message.message_id}: ${insertError.message}`);
            errorCount++;
          } else {
            insertedCount++;
          }
        }
      } catch (messageError) {
        console.error("Error processing message:", messageError);
        const errorMsg = messageError instanceof Error ? messageError.message : String(messageError);
        errors.push(`Processing error for ${message.message_id}: ${errorMsg}`);
        errorCount++;
      }
    }

    console.log(`Download completed: ${insertedCount} inserted, ${updatedCount} updated, ${errorCount} errors`);

    const result = {
      success: true,
      messages_found: messages.length,
      messages_inserted: insertedCount,
      messages_updated: updatedCount,
      messages_errors: errorCount,
      errors: errors,
      folder: folder,
      limit: limit
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error) {
    console.error('Error in email download:', error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMsg,
        details: errorStack 
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});