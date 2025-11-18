// ============================================
// EMAIL BACKGROUND SYNC - Consolidado
// Función única que reemplaza: background-email-sync, email-sync-v2, background-email-sync-test
// ============================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';
import {
  createSyncJob,
  updateSyncProgress,
  markJobComplete,
  getFolderInfo,
  downloadEmailBatch,
  fetchWithTimeout
} from '../_shared/email-sync-helpers.ts';
import { getTMWEOAuthToken } from '../_shared/oauth-manager.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const API_TIMEOUT_MS = 70000;
const TMWE_API_BASE = 'https://app.tmwengine.com/api';

interface SyncRequest {
  folders: string[];
  user_email: string;
  mode?: 'standard' | 'streaming' | 'precheck';
  batch_size?: number;
  timeout_ms?: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { 
      folders, 
      user_email, 
      mode = 'standard',
      batch_size = 10,
      timeout_ms = API_TIMEOUT_MS 
    }: SyncRequest = await req.json();

    console.log('🚀 Email Background Sync started');
    console.log('📂 Folders:', folders);
    console.log('👤 User:', user_email);
    console.log('⚙️ Mode:', mode);

    if (!folders || !user_email) {
      throw new Error('Missing required fields: folders, user_email');
    }

    // Get TMWE OAuth token
    const oauthToken = await getTMWEOAuthToken(supabase, user_email);
    if (!oauthToken) {
      throw new Error('TMWE OAuth token not found. Please login first.');
    }

    // MODE: STREAMING (retorna stream de progreso)
    if (mode === 'streaming') {
      return handleStreamingSync(supabase, folders, user_email, oauthToken, timeout_ms);
    }

    // MODE: STANDARD o PRECHECK (retorna job_id inmediatamente)
    const job = await createSyncJob(supabase, user_email, folders);

    // Start background processing
    EdgeRuntime.waitUntil(
      processEmailsInBackground(
        supabase, 
        job.job_id, 
        folders, 
        user_email, 
        oauthToken,
        mode,
        batch_size,
        timeout_ms
      )
    );

    return new Response(
      JSON.stringify({ 
        success: true, 
        job_id: job.job_id,
        message: 'Download started in background',
        mode
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Error in email-background-sync:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// ============================================
// STREAMING MODE
// ============================================

async function handleStreamingSync(
  supabase: any,
  folders: string[],
  userEmail: string,
  oauthToken: string,
  timeoutMs: number
): Promise<Response> {
  const stream = new ReadableStream({
    async start(controller) {
      const sendUpdate = (update: any) => {
        controller.enqueue(new TextEncoder().encode(JSON.stringify(update) + '\n'));
      };

      try {
        sendUpdate({
          type: 'log',
          data: { phase: 'preparing', message: `🚀 Starting sync for ${folders.length} folders` }
        });

        let totalDownloaded = 0;
        let totalErrors = 0;

        for (const folder of folders) {
          sendUpdate({
            type: 'log',
            data: { phase: 'processing', folder, message: `📁 Processing folder: ${folder}` }
          });

          // Get folder info
          const folderInfo = await getFolderInfo(TMWE_API_BASE, oauthToken, folder);
          sendUpdate({
            type: 'progress',
            data: { folder, total: folderInfo.total, phase: 'downloading' }
          });

          // Download emails
          const uids = await getEmailUIDs(folder, oauthToken);
          const result = await downloadEmailBatch(
            supabase, 
            folder, 
            uids, 
            userEmail, 
            TMWE_API_BASE, 
            oauthToken, 
            timeoutMs
          );

          totalDownloaded += result.downloaded;
          totalErrors += result.failed;

          sendUpdate({
            type: 'progress',
            data: { 
              folder, 
              downloaded: result.downloaded, 
              failed: result.failed,
              phase: 'complete' 
            }
          });
        }

        sendUpdate({
          type: 'complete',
          data: { 
            totalDownloaded, 
            totalErrors, 
            message: '✅ Sync complete' 
          }
        });

        controller.close();
      } catch (error: any) {
        sendUpdate({
          type: 'error',
          data: { message: error.message }
        });
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}

// ============================================
// BACKGROUND PROCESSING
// ============================================

async function processEmailsInBackground(
  supabase: any,
  jobId: string,
  folders: string[],
  userEmail: string,
  oauthToken: string,
  mode: string,
  batchSize: number,
  timeoutMs: number
): Promise<void> {
  console.log(`[Background] 🚀 Starting processing - Job ${jobId} - Mode: ${mode}`);
  
  const startTime = Date.now();
  let totalProcessed = 0;
  let totalMessages = 0;
  const completedFolders: string[] = [];

  try {
    // MODE: PRECHECK - Verificar antes de descargar
    if (mode === 'precheck') {
      console.log('[Background] 🔍 Pre-check mode: Verifying folders before download');
      
      for (const folder of folders) {
        try {
          const folderInfo = await getFolderInfo(TMWE_API_BASE, oauthToken, folder);
          totalMessages += folderInfo.total;
          console.log(`[Background] ✅ ${folder}: ${folderInfo.total} messages`);
        } catch (error) {
          console.error(`[Background] ⚠️ Error checking ${folder}:`, error);
        }
      }

      await updateSyncProgress(supabase, jobId, {
        total_messages: totalMessages,
        status: 'running'
      });
    }

    // Process each folder
    for (const folder of folders) {
      console.log(`[Background] 📁 Processing folder: ${folder}`);

      try {
        // Get folder info
        const folderInfo = await getFolderInfo(TMWE_API_BASE, oauthToken, folder);
        const folderTotal = folderInfo.total;

        await updateSyncProgress(supabase, jobId, {
          current_folder: folder,
          total_in_folder: folderTotal,
          downloaded_in_folder: 0
        });

        // Get email UIDs
        const uids = await getEmailUIDs(folder, oauthToken);
        console.log(`[Background] 📬 Found ${uids.length} UIDs in ${folder}`);

        if (uids.length === 0) {
          completedFolders.push(folder);
          continue;
        }

        // Download emails
        const result = await downloadEmailBatch(
          supabase, 
          folder, 
          uids, 
          userEmail, 
          TMWE_API_BASE, 
          oauthToken, 
          timeoutMs
        );

        totalProcessed += result.downloaded;
        completedFolders.push(folder);

        // Calculate speed and ETA
        const elapsed = (Date.now() - startTime) / 1000;
        const speed = totalProcessed / elapsed;
        const remaining = totalMessages - totalProcessed;
        const eta = remaining > 0 ? Math.ceil(remaining / speed) : 0;

        await updateSyncProgress(supabase, jobId, {
          processed_messages: totalProcessed,
          total_messages: totalMessages,
          downloaded_in_folder: result.downloaded,
          completed_folders: completedFolders,
          speed: Math.round(speed),
          eta
        });

        console.log(`[Background] ✅ ${folder} complete: ${result.downloaded} downloaded, ${result.failed} failed`);

      } catch (error: any) {
        console.error(`[Background] ❌ Error processing ${folder}:`, error);
        // Continue with next folder
      }
    }

    // Mark job complete
    await markJobComplete(supabase, jobId, 'completed');
    console.log(`[Background] 🏁 Job ${jobId} completed: ${totalProcessed} total messages`);

  } catch (error: any) {
    console.error(`[Background] ❌ Fatal error in job ${jobId}:`, error);
    await markJobComplete(supabase, jobId, 'error', error.message);
  }
}

// ============================================
// HELPER: GET EMAIL UIDs
// ============================================

async function getEmailUIDs(folder: string, oauthToken: string): Promise<string[]> {
  const response = await fetch(`${TMWE_API_BASE}/email_search`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${oauthToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      handler: 'get_emails_metadata',
      folder_name: folder,
      offset: 0,
      limit: 1000
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to get email UIDs: ${response.statusText}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data.map((email: any) => email.uid || email.message_id) : [];
}
