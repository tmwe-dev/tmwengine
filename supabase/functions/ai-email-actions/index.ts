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

    console.log('🔧 AI Email Actions:', { action, message_count: message_ids?.length, folder });

    if (!action || !message_ids || !Array.isArray(message_ids)) {
      throw new Error('Missing required parameters: action, message_ids');
    }

    // Get TMWE credentials
    const { data: session } = await supabaseClient.auth.getSession();
    const userEmail = session?.session?.user?.email;

    if (!userEmail) {
      throw new Error('User not authenticated');
    }

    const { data: credentials } = await supabaseClient
      .from('user_tmwe_credentials')
      .select('*')
      .eq('email', userEmail)
      .single();

    if (!credentials) {
      throw new Error('TMWE credentials not found');
    }

    // Prepare TMWE API request based on action
    let tmweAction = '';
    let actionParams: any = {
      message_ids: message_ids
    };

    switch (action) {
      case 'mark_read':
        tmweAction = 'mark_as_read';
        break;
      case 'mark_unread':
        tmweAction = 'mark_as_unread';
        break;
      case 'delete':
        tmweAction = 'delete_messages';
        break;
      case 'move_folder':
        if (!folder) {
          throw new Error('Folder parameter required for move_folder action');
        }
        tmweAction = 'move_to_folder';
        actionParams.folder = folder;
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Call TMWE API via proxy
    const { data: tmweResult, error: tmweError } = await supabaseClient.functions.invoke(
      'tmwe-api-proxy',
      {
        body: {
          endpoint: 'email_message',
          data: {
            action: tmweAction,
            ...actionParams
          }
        }
      }
    );

    if (tmweError) {
      throw tmweError;
    }

    console.log('✅ TMWE Action completed:', tmweResult);

    return new Response(
      JSON.stringify({
        success: true,
        action: action,
        message_count: message_ids.length,
        tmwe_response: tmweResult
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Error in ai-email-actions:', error);
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
