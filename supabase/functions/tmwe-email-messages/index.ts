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

interface TMWEEmailMessageRequest {
  action: 'get_messages' | 'get_message' | 'search_messages' | 'get_attachment' | 
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
    console.log('TMWE Email Messages request:', { action: requestData.action });

    const apiKey = Deno.env.get('TMWE_API_KEY');
    if (!apiKey) {
      throw new Error('TMWE_API_KEY non configurata negli environment secrets');
    }

    const baseUrl = 'https://findair.it/erp/tmwe_json';
    const isWriteOperation = ['send_message', 'reply_message', 'forward_message', 'delete_messages', 'move_messages', 'mark_messages'].includes(requestData.action);
    
    let response;
    
    if (isWriteOperation) {
      // POST operations
      const params = new URLSearchParams({ action: requestData.action });
      if (requestData.uid) params.append('uid', requestData.uid);
      if (requestData.uids) params.append('uids', requestData.uids);
      if (requestData.target_folder) params.append('target_folder', requestData.target_folder);
      if (requestData.expunge !== undefined) params.append('expunge', requestData.expunge.toString());
      if (requestData.read !== undefined) params.append('read', requestData.read.toString());

      const requestBody: any = {};
      if (requestData.to) requestBody.to = requestData.to;
      if (requestData.cc) requestBody.cc = requestData.cc;
      if (requestData.bcc) requestBody.bcc = requestData.bcc;
      if (requestData.subject) requestBody.subject = requestData.subject;
      if (requestData.body) requestBody.body = requestData.body;
      if (requestData.body_html) requestBody.body_html = requestData.body_html;
      if (requestData.attachments) requestBody.attachments = requestData.attachments;
      if (requestData.reply_all !== undefined) requestBody.reply_all = requestData.reply_all;

      response = await fetch(`${baseUrl}/app.php?action=email_message&${params}`, {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
    } else {
      // GET operations
      const params = new URLSearchParams({ action: requestData.action });
      if (requestData.uid) params.append('uid', requestData.uid);
      if (requestData.attachment_id) params.append('attachment_id', requestData.attachment_id);
      if (requestData.folder) params.append('folder', requestData.folder);
      if (requestData.limit) params.append('limit', requestData.limit.toString());
      if (requestData.offset) params.append('offset', requestData.offset.toString());
      if (requestData.include_attachments !== undefined) params.append('include_attachments', requestData.include_attachments.toString());
      if (requestData.format) params.append('format', requestData.format);
      if (requestData.search_from) params.append('search_from', requestData.search_from);
      if (requestData.search_to) params.append('search_to', requestData.search_to);
      if (requestData.search_subject) params.append('search_subject', requestData.search_subject);
      if (requestData.search_body) params.append('search_body', requestData.search_body);
      if (requestData.search_date_from) params.append('search_date_from', requestData.search_date_from);
      if (requestData.search_date_to) params.append('search_date_to', requestData.search_date_to);
      if (requestData.search_unread !== undefined) params.append('search_unread', requestData.search_unread.toString());

      response = await fetch(`${baseUrl}/app.php?action=email_message&${params}`, {
        method: 'GET',
        headers: {
          'X-API-Key': apiKey,
          'Accept': 'application/json'
        }
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

    // If it's a write operation, log it to the database
    if (isWriteOperation && result.success) {
      try {
        if (requestData.action === 'send_message') {
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