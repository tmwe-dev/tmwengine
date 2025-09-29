import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface TMWEEmailMessageRequest {
  handler: 'get_messages' | 'get_message' | 'search_messages' | 'get_attachment' | 
          'send_message' | 'reply_message' | 'forward_message' | 'delete_messages' | 
          'move_messages' | 'mark_messages';
  uid?: string;
  uids?: string;
  attachment_id?: string;
  folder?: string;
  limit?: number;
  offset?: number;
  include_attachments?: boolean;
  format?: 'text' | 'html';
  target_folder?: string;
  expunge?: boolean;
  read?: boolean;
  // Search parameters
  search_from?: string;
  search_to?: string;
  search_subject?: string;
  search_body?: string;
  search_date_from?: string;
  search_date_to?: string;
  search_unread?: boolean;
  // Message data for sending
  to?: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  body?: string;
  body_html?: string;
  attachments?: Array<{
    filename: string;
    content: string; // base64
  }>;
  reply_all?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: TMWEEmailMessageRequest = await req.json();
    console.log('TMWE Email Messages request:', { handler: requestData.handler });

    // Usa l'OAuth token dall'environment o dal database
    let oauthToken = Deno.env.get('TMWE_OAUTH_TOKEN');
    
    if (!oauthToken) {
      // Fallback al database se non presente nell'environment
      const { data: provider } = await supabase
        .from('email_provider')
        .select('email_provider_credenziali(*)')
        .eq('provider', 'TMWE')
        .eq('attivo', true)
        .maybeSingle();
      
      if (provider?.email_provider_credenziali?.[0]) {
        // Cerca prima in oauth_token poi in api_key come fallback
        oauthToken = provider.email_provider_credenziali[0].oauth_token || 
                     provider.email_provider_credenziali[0].api_key;
      }
    }
    
    if (!oauthToken) {
      throw new Error('TMWE OAuth token non configurato nel database o environment');
    }

    const baseUrl = 'https://findair.it/erp/tmwe_json';
    const apiUrl = `${baseUrl}/app.php?action=email_message`;

    console.log('API v2.0.0 - POST request to:', apiUrl);
    console.log('Request body:', JSON.stringify(requestData));

    // API v2.0.0 - All operations use POST with JSON body (headers mínimos como tmwe-email-send exitoso)
    let response;
    try {
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${oauthToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });
    } catch (error) {
      console.log('HTTPS falló, intentando HTTP:', error);
      // Fallback a HTTP como tmwe-email-send exitoso
      const httpUrl = apiUrl.replace('https://', 'http://');
      response = await fetch(httpUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${oauthToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });
    }

    console.log('Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('TMWE API Error response:', errorText);
      throw new Error(`TMWE API Error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    console.log('TMWE API Response received');

    // If it's a send operation, log it to the database
    const writeOperations = ['send_message', 'reply_message', 'forward_message', 'delete_messages', 'move_messages', 'mark_messages'];
    const isWriteOperation = writeOperations.includes(requestData.handler);
    
    if (isWriteOperation && result.success) {
      try {
        if (requestData.handler === 'send_message') {
          await supabase.from('email_messages').insert({
            provider_id: '00000000-0000-0000-0000-000000000000',
            message_id: result.message_id || `sent_${Date.now()}`,
            subject: requestData.subject,
            from_email: '', // Will be filled by TMWE
            to_email: requestData.to,
            cc_email: requestData.cc,
            bcc_email: requestData.bcc,
            body_text: requestData.body,
            body_html: requestData.body_html,
            data_invio: new Date().toISOString(),
            cartella: 'Sent',
            direzione: 'outbound',
            stato: 'inviato',
            sync_status: 'api_sent'
          });
        }
      } catch (dbError) {
        console.error('Error logging message to database:', dbError);
        // Continue even if database logging fails
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in tmwe-email-messages function:', error);
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