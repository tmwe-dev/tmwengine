import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Temporary debug function - no auth required

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get TMWE token from config_ai
    const { data: configData, error: configError } = await supabaseClient
      .from('config_ai')
      .select('access_token')
      .eq('user_email', 'luca@tmwe.it')
      .single();

    if (configError || !configData?.access_token) {
      throw new Error('No valid token found');
    }

    const token = configData.access_token;

    // Call TMWE API to get folders
    const tmweResponse = await fetch('https://tmwe.it/api/email_folder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        handler: 'get_folders',
        include_counts: true,
        include_hierarchy: false
      })
    });

    const folders = await tmweResponse.json();

    // Filter Archives folders
    const archivesFolders = folders.filter((f: any) => 
      f.name?.includes('Archives') || f.folder_name?.includes('Archives')
    );

    return new Response(
      JSON.stringify({ 
        success: true, 
        archives_folders: archivesFolders,
        all_folders_count: folders.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
