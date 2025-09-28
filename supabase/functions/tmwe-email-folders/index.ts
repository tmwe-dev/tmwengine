import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    const apiKey = Deno.env.get('TMWE_API_KEY');
    if (!apiKey) {
      throw new Error('TMWE_API_KEY non configurata negli environment secrets');
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
          'X-API-Key': apiKey,
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