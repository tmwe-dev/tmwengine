const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const MAX_WALL_CLOCK_MS = 50_000; // 50s max per invocation
const BATCH_SIZE = 20;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const startTime = Date.now();

  try {
    // Validate caller JWT
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
      if (token !== anonKey) {
        const userClient = createClient(SUPABASE_URL, anonKey);
        const { error: authError } = await userClient.auth.getUser(token);
        if (authError) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }

    const body = await req.json().catch(() => ({}));
    const jobId = body.job_id;

    // Find the job to process
    let jobQuery = supabase.from('email_sync_jobs').select('*');
    
    if (jobId) {
      jobQuery = jobQuery.eq('id', jobId);
    } else {
      jobQuery = jobQuery.eq('status', 'running');
    }

    const { data: jobs, error: jobError } = await jobQuery.limit(1);
    if (jobError || !jobs?.length) {
      return new Response(JSON.stringify({ message: 'No running jobs found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const job = jobs[0];
    if (job.status !== 'running') {
      return new Response(JSON.stringify({ message: 'Job is not running', status: job.status }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const folders = job.folders || [];
    let totalDownloaded = job.downloaded_count || 0;
    let totalSkipped = job.skipped_count || 0;
    let totalErrors = job.error_count || 0;
    let currentFolderIndex = folders.indexOf(job.current_folder) || 0;
    if (currentFolderIndex < 0) currentFolderIndex = 0;

    // Process folders
    for (let fi = currentFolderIndex; fi < folders.length; fi++) {
      if (Date.now() - startTime > MAX_WALL_CLOCK_MS) break;

      const folder = folders[fi];

      // Check job still running
      const { data: freshJob } = await supabase
        .from('email_sync_jobs')
        .select('status')
        .eq('id', job.id)
        .single();
      
      if (freshJob?.status !== 'running') {
        console.log('Job paused/stopped, exiting');
        break;
      }

      // Update current folder
      await supabase
        .from('email_sync_jobs')
        .update({ current_folder: folder })
        .eq('id', job.id);

      // Call tmwe-api-proxy to sync this folder
      try {
        const { data: syncResult, error: syncError } = await supabase.functions.invoke('tmwe-api-proxy', {
          body: {
            handler: 'tmwe-email-sync-master',
            folder_name: folder,
            batch_size: BATCH_SIZE,
            user_id: job.user_id,
          }
        });

        if (syncError) {
          console.error(`Error syncing folder ${folder}:`, syncError);
          totalErrors++;
          continue;
        }

        const downloaded = syncResult?.downloaded || 0;
        const skipped = syncResult?.skipped || 0;
        const errors = syncResult?.errors || 0;
        const totalInFolder = syncResult?.total || 0;

        totalDownloaded += downloaded;
        totalSkipped += skipped;
        totalErrors += errors;

        // Update job counters
        await supabase
          .from('email_sync_jobs')
          .update({
            downloaded_count: totalDownloaded,
            skipped_count: totalSkipped,
            error_count: totalErrors,
            total_to_download: Math.max(job.total_to_download || 0, totalDownloaded + totalSkipped + totalInFolder),
          })
          .eq('id', job.id);

      } catch (err) {
        console.error(`Exception syncing folder ${folder}:`, err);
        totalErrors++;
      }
    }

    // Check if all folders processed
    const elapsed = Date.now() - startTime;
    const allDone = currentFolderIndex >= folders.length - 1 && elapsed < MAX_WALL_CLOCK_MS;

    if (allDone) {
      await supabase
        .from('email_sync_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          downloaded_count: totalDownloaded,
          skipped_count: totalSkipped,
          error_count: totalErrors,
        })
        .eq('id', job.id);
    }

    return new Response(JSON.stringify({
      job_id: job.id,
      downloaded: totalDownloaded,
      skipped: totalSkipped,
      errors: totalErrors,
      completed: allDone,
      elapsed_ms: elapsed,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Worker error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
