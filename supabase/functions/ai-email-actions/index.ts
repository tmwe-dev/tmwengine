import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { action, message_ids, folder } = await req.json();

    console.log('🤖 AI Email Actions:', { action, message_ids, folder });

    if (!action || !message_ids || !Array.isArray(message_ids)) {
      throw new Error('Invalid parameters: action and message_ids required');
    }

    // Get TMWE credentials
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user?.email) {
      throw new Error('User not authenticated');
    }

    const { data: credentials } = await supabaseClient
      .from('user_tmwe_credentials')
      .select('*')
      .eq('email', user.email)
      .single();

    if (!credentials) {
      throw new Error('TMWE credentials not found');
    }

    // Prepare API calls based on action type
    const results = [];
    
    for (const messageId of message_ids) {
      let apiResult;
      
      switch (action) {
        case 'mark_read':
          apiResult = await callTMWEApi('email_message', {
            action: 'mark_read',
            message_id: messageId
          }, credentials);
          break;
          
        case 'mark_unread':
          apiResult = await callTMWEApi('email_message', {
            action: 'mark_unread',
            message_id: messageId
          }, credentials);
          break;
          
        case 'delete':
          apiResult = await callTMWEApi('email_message', {
            action: 'delete',
            message_id: messageId
          }, credentials);
          break;
          
        case 'move_folder':
          if (!folder) {
            throw new Error('Folder required for move_folder action');
          }
          apiResult = await callTMWEApi('email_message', {
            action: 'move',
            message_id: messageId,
            destination_folder: folder
          }, credentials);
          break;
          
        default:
          throw new Error(`Unknown action: ${action}`);
      }
      
      results.push({
        message_id: messageId,
        action,
        success: apiResult.success,
        response: apiResult
      });
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;

    console.log(`✅ AI Actions completed: ${successCount} success, ${failCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        action,
        total: message_ids.length,
        successful: successCount,
        failed: failCount,
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ AI Email Actions error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

async function callTMWEApi(endpoint: string, data: any, credentials: any) {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { data: result, error } = await supabaseClient.functions.invoke('tmwe-api-proxy', {
    body: {
      endpoint,
      data,
      credentials: {
        access_token: credentials.access_token,
        client_id: credentials.client_id,
        client_secret: credentials.client_secret
      }
    }
  });

  if (error) {
    throw error;
  }

  return result;
}
