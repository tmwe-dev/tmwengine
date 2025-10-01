import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔍 TEST: Recupero info cartella INBOX dall\'API TMWE');

    // Get token
    let oauthToken = Deno.env.get('TMWE_OAUTH_TOKEN');
    
    if (!oauthToken) {
      const { data: provider } = await supabase
        .from('email_provider')
        .select('email_provider_credenziali(*)')
        .eq('provider', 'TMWE')
        .eq('attivo', true)
        .maybeSingle();
      
      const creds = provider?.email_provider_credenziali;
      if (creds && (creds.oauth_token || creds.api_key)) {
        oauthToken = creds.oauth_token || creds.api_key;
      }
    }
    
    if (!oauthToken) {
      throw new Error('Token non trovato');
    }

    console.log('✅ Token trovato');

    // TEST 1: get_folder_info
    const baseUrl = 'https://findair.it/erp/tmwe_json';
    const folderUrl = `${baseUrl}/app.php?action=email_folder`;
    
    const folderBody = {
      handler: 'get_folder_info',
      folder_name: 'INBOX',
      include_counts: true
    };

    console.log('📞 Chiamata API folder:', folderUrl);
    console.log('📋 Payload:', JSON.stringify(folderBody));

    let folderResponse;
    try {
      folderResponse = await fetch(folderUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${oauthToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(folderBody)
      });
    } catch (error) {
      const httpUrl = folderUrl.replace('https://', 'http://');
      folderResponse = await fetch(httpUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${oauthToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(folderBody)
      });
    }

    const folderData = await folderResponse.json();
    console.log('📊 RISPOSTA FOLDER API:', JSON.stringify(folderData, null, 2));

    // TEST 2: get_folders con counts
    const foldersBody = {
      handler: 'get_folders',
      include_counts: true,
      hierarchy: true
    };

    console.log('\n📞 Chiamata API get_folders');
    
    let foldersResponse;
    try {
      foldersResponse = await fetch(folderUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${oauthToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(foldersBody)
      });
    } catch (error) {
      const httpUrl = folderUrl.replace('https://', 'http://');
      foldersResponse = await fetch(httpUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${oauthToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(foldersBody)
      });
    }

    const foldersData = await foldersResponse.json();
    console.log('📊 RISPOSTA FOLDERS API:', JSON.stringify(foldersData, null, 2));

    return new Response(JSON.stringify({
      success: true,
      folder_info: folderData,
      folders_list: foldersData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('❌ ERRORE:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Errore sconosciuto'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
