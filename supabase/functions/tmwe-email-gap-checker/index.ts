import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GapCheckRequest {
  folders?: string[];
  check_all_db_folders?: boolean;
}

interface GapCheckResult {
  folder: string;
  max_uid_local: number;
  max_uid_server: number;
  missing_count: number;
  status: 'synced' | 'gap' | 'error';
  error_message?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Get user profile to retrieve tmwe_email
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('tmwe_email')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile?.tmwe_email) {
      throw new Error('User profile or tmwe_email not found');
    }

    const body: GapCheckRequest = await req.json();
    const { folders, check_all_db_folders } = body;

    console.log('[Gap Checker] Starting gap check for user:', profile.tmwe_email);

    let foldersToCheck: string[] = [];

    if (check_all_db_folders) {
      // Get all folders from DB
      const { data: dbFolders, error: foldersError } = await supabase
        .from('email_messages')
        .select('cartella')
        .eq('user_email', profile.tmwe_email)
        .eq('sync_status', 'fun_email_backup');

      if (foldersError) {
        console.error('[Gap Checker] Error fetching folders from DB:', foldersError);
        throw foldersError;
      }

      // Extract unique folder names
      const uniqueFolders = new Set(dbFolders?.map(f => f.cartella) || []);
      foldersToCheck = Array.from(uniqueFolders);
      console.log('[Gap Checker] Found DB folders:', foldersToCheck);
    } else if (folders && folders.length > 0) {
      foldersToCheck = folders;
      console.log('[Gap Checker] Checking selected folders:', foldersToCheck);
    } else {
      throw new Error('No folders specified');
    }

    const results: GapCheckResult[] = [];

    for (const folder of foldersToCheck) {
      try {
        console.log(`[Gap Checker] Checking folder: ${folder}`);

        // 1. Get MAX UID from local DB
        const { data: localMaxData, error: localError } = await supabase
          .from('email_messages')
          .select('message_id')
          .eq('user_email', profile.tmwe_email)
          .eq('cartella', folder)
          .eq('sync_status', 'fun_email_backup')
          .order('message_id', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (localError) {
          console.error(`[Gap Checker] Error querying local DB for ${folder}:`, localError);
          results.push({
            folder,
            max_uid_local: 0,
            max_uid_server: 0,
            missing_count: 0,
            status: 'error',
            error_message: localError.message,
          });
          continue;
        }

        // Extract UID from message_id (format: "folder/uid")
        let maxUidLocal = 0;
        if (localMaxData?.message_id) {
          const uidStr = localMaxData.message_id.split('/')[1];
          maxUidLocal = parseInt(uidStr, 10) || 0;
        }

        console.log(`[Gap Checker] ${folder} - Local MAX UID: ${maxUidLocal}`);

        // 2. Get folder info from server via tmwe-email-search-api
        const { data: serverFolderData, error: serverError } = await supabase.functions.invoke(
          'tmwe-email-search-api',
          {
            body: {
              handler: 'get_folders',
            },
          }
        );

        if (serverError) {
          console.error(`[Gap Checker] Error calling tmwe-email-search-api:`, serverError);
          results.push({
            folder,
            max_uid_local: maxUidLocal,
            max_uid_server: 0,
            missing_count: 0,
            status: 'error',
            error_message: serverError.message,
          });
          continue;
        }

        // Find the specific folder in server response
        const serverFolders = serverFolderData?.folders || [];
        const serverFolder = serverFolders.find((f: any) => 
          (f.folder_name === folder || f.name === folder)
        );

        const maxUidServer = serverFolder?.message_count || serverFolder?.messages || 0;
        console.log(`[Gap Checker] ${folder} - Server total messages: ${maxUidServer}`);

        // 3. Calculate gap
        const missingCount = Math.max(0, maxUidServer - maxUidLocal);
        const status: 'synced' | 'gap' = missingCount > 0 ? 'gap' : 'synced';

        console.log(`[Gap Checker] ${folder} - Missing: ${missingCount} (Status: ${status})`);

        results.push({
          folder,
          max_uid_local: maxUidLocal,
          max_uid_server: maxUidServer,
          missing_count: missingCount,
          status,
        });

      } catch (folderError: any) {
        console.error(`[Gap Checker] Unexpected error for folder ${folder}:`, folderError);
        results.push({
          folder,
          max_uid_local: 0,
          max_uid_server: 0,
          missing_count: 0,
          status: 'error',
          error_message: folderError.message || 'Unknown error',
        });
      }
    }

    const totalGaps = results.reduce((sum, r) => sum + r.missing_count, 0);
    const foldersWithGaps = results.filter(r => r.status === 'gap').length;

    console.log(`[Gap Checker] Completed. Total gaps: ${totalGaps} across ${foldersWithGaps} folders`);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        total_gaps: totalGaps,
        folders_with_gaps: foldersWithGaps,
        total_folders_checked: results.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('[Gap Checker] Fatal error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
