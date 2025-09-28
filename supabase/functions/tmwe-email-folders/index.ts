import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TMWEEmailFolderRequest {
  action: 'get_folders' | 'get_folder_info' | 'get_folder_tree' | 
          'create_folder' | 'delete_folder' | 'rename_folder' | 
          'subscribe_folder' | 'unsubscribe_folder' | 'empty_folder';
  folder_name?: string;
  parent_folder?: string;
  old_name?: string;
  new_name?: string;
  hierarchy?: boolean;
  include_counts?: boolean;
  force?: boolean;
  expunge?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: TMWEEmailFolderRequest = await req.json();
    console.log('TMWE Email Folders request:', { action: requestData.action });

    // Usa l'OAuth token dall'environment o dal database
    let oauthToken = Deno.env.get('TMWE_OAUTH_TOKEN');
    
    if (!oauthToken) {
      // Fallback al database se non presente nell'environment
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
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
    const isWriteOperation = ['create_folder', 'delete_folder', 'rename_folder', 'subscribe_folder', 'unsubscribe_folder', 'empty_folder'].includes(requestData.action);
    
    let response;
    
    if (isWriteOperation) {
      // POST operations
      const params = new URLSearchParams({ action: requestData.action });
      if (requestData.folder_name) params.append('folder_name', requestData.folder_name);
      if (requestData.parent_folder) params.append('parent_folder', requestData.parent_folder);
      if (requestData.old_name) params.append('old_name', requestData.old_name);
      if (requestData.new_name) params.append('new_name', requestData.new_name);
      if (requestData.force !== undefined) params.append('force', requestData.force.toString());
      if (requestData.expunge !== undefined) params.append('expunge', requestData.expunge.toString());

      response = await fetch(`${baseUrl}/app.php?action=email_folder&${params}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${oauthToken}`,
          'Accept': 'application/json'
        }
      });
    } else {
      // GET operations
      const params = new URLSearchParams({ action: requestData.action });
      if (requestData.folder_name) params.append('folder_name', requestData.folder_name);
      if (requestData.hierarchy !== undefined) params.append('hierarchy', requestData.hierarchy.toString());
      if (requestData.include_counts !== undefined) params.append('include_counts', requestData.include_counts.toString());

      response = await fetch(`${baseUrl}/app.php?action=email_folder&${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${oauthToken}`,
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

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in tmwe-email-folders function:', error);
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