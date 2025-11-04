// ============================================
// BACKGROUND EMAIL SYNC - Edge Function
// Scarica email in background e aggiorna progresso in DB
// ============================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface SyncRequest {
  folders: string[];
  user_email: string;
}

interface FolderInfo {
  folder: string;
  total: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { folders, user_email }: SyncRequest = await req.json();

    if (!folders || !user_email) {
      throw new Error('Missing required fields: folders, user_email');
    }

    // 1. Crea job iniziale in DB
    const { data: job, error: jobError } = await supabase
      .from('email_sync_progress')
      .insert({
        user_email,
        folder_name: folders[0] || 'INBOX',
        folders_to_sync: folders,
        completed_folders: [],
        status: 'pending',
        total_messages: 0,
        processed_messages: 0,
        current_folder: folders[0] || 'INBOX',
        downloaded_in_folder: 0,
        total_in_folder: 0,
        speed: 0,
        eta: 0
      })
      .select()
      .single();

    if (jobError) {
      console.error('Error creating job:', jobError);
      throw jobError;
    }

    const jobId = job.job_id;

    // 2. Avvia processing in background (non bloccare response)
    EdgeRuntime.waitUntil(
      processEmailsInBackground(supabase, jobId, folders, user_email)
    );

    // 3. Ritorna immediatamente job_id
    return new Response(
      JSON.stringify({ 
        success: true, 
        job_id: jobId,
        message: 'Download started in background'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Error in background-email-sync:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

// ============================================
// BACKGROUND PROCESSING FUNCTION
// ============================================
async function processEmailsInBackground(
  supabase: any,
  jobId: string,
  folders: string[],
  userEmail: string
) {
  const startTime = Date.now();
  let totalDownloaded = 0;
  const completedFolders: string[] = [];

  try {
    // Aggiorna status a 'running'
    await supabase
      .from('email_sync_progress')
      .update({ status: 'running' })
      .eq('job_id', jobId);

    // Recupera TMWE token dal database
    const { data: credentials, error: credError } = await supabase
      .from('user_tmwe_credentials')
      .select('access_token')
      .eq('email', userEmail)
      .single();

    if (credError || !credentials?.access_token) {
      console.error(`[Job ${jobId}] TMWE token not found for ${userEmail}`);
      await supabase.from('email_sync_progress')
        .update({ 
          status: 'error', 
          errors: [{ message: 'TMWE token not found', timestamp: new Date().toISOString() }] 
        })
        .eq('job_id', jobId);
      return;
    }

    const tmweAccessToken = credentials.access_token;
    console.log(`[Job ${jobId}] TMWE token retrieved successfully`);

    // Processa ogni folder
    for (let i = 0; i < folders.length; i++) {
      const folder = folders[i];
      
      console.log(`[Job ${jobId}] Processing folder ${i + 1}/${folders.length}: ${folder}`);

      // Aggiorna folder corrente
      await supabase
        .from('email_sync_progress')
        .update({ 
          current_folder: folder,
          downloaded_in_folder: 0,
          total_in_folder: 0
        })
        .eq('job_id', jobId);

      // 1. Ottieni info folder via tmwe-api-proxy
      const folderInfo = await getFolderInfo(userEmail, folder, tmweAccessToken);
      
      await supabase
        .from('email_sync_progress')
        .update({ 
          total_in_folder: folderInfo.total,
          total_messages: folderInfo.total
        })
        .eq('job_id', jobId);

      // 2. Ottieni UIDs via tmwe-api-proxy
      const uids = await getFolderUIDs(userEmail, folder, tmweAccessToken);
      
      // 3. Download email in batch di 10
      const batchSize = 10;
      let downloadedInFolder = 0;

      for (let j = 0; j < uids.length; j += batchSize) {
        const batch = uids.slice(j, j + batchSize);
        
        // Download batch parallelo
        const emailPromises = batch.map(uid => 
          downloadEmail(userEmail, folder, uid, tmweAccessToken)
        );
        
        const emails = await Promise.allSettled(emailPromises);
        
        // Salva email riuscite in DB
        const validEmails = emails
          .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
          .map(result => result.value)
          .filter(email => email !== null);

        if (validEmails.length > 0) {
          await supabase.from('email_messages').upsert(validEmails, {
            onConflict: 'message_id',
            ignoreDuplicates: true
          });
        }

        downloadedInFolder += validEmails.length;
        totalDownloaded += validEmails.length;

        // Calcola velocità e ETA
        const elapsedSeconds = (Date.now() - startTime) / 1000;
        const speed = totalDownloaded / elapsedSeconds;
        const remaining = folders.slice(i + 1).reduce((sum, f) => sum + folderInfo.total, 0) + (folderInfo.total - downloadedInFolder);
        const eta = remaining / speed;

        // Aggiorna progresso
        await supabase
          .from('email_sync_progress')
          .update({
            downloaded_in_folder: downloadedInFolder,
            processed_messages: totalDownloaded,
            speed: Math.round(speed * 10) / 10,
            eta: Math.round(eta),
            updated_at: new Date().toISOString()
          })
          .eq('job_id', jobId);

        console.log(`[Job ${jobId}] Folder ${folder}: ${downloadedInFolder}/${folderInfo.total} (${Math.round(speed)}/s)`);
      }

      // Folder completata
      completedFolders.push(folder);
      await supabase
        .from('email_sync_progress')
        .update({ completed_folders: completedFolders })
        .eq('job_id', jobId);
    }

    // Job completato
    await supabase
      .from('email_sync_progress')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('job_id', jobId);

    console.log(`[Job ${jobId}] Completed: ${totalDownloaded} emails in ${Math.round((Date.now() - startTime) / 1000)}s`);

  } catch (error: any) {
    console.error(`[Job ${jobId}] Error:`, error);
    
    // Salva errore in DB
    await supabase
      .from('email_sync_progress')
      .update({ 
        status: 'error',
        errors: [{ message: error.message, timestamp: new Date().toISOString() }]
      })
      .eq('job_id', jobId);
  }
}

// ============================================
// HELPER FUNCTIONS - TMWE API CALLS
// ============================================

async function getFolderInfo(userEmail: string, folder: string, tmweAccessToken: string): Promise<FolderInfo> {
  console.log(`[getFolderInfo] Fetching info for folder: ${folder}`);
  
  const response = await fetch(`${SUPABASE_URL}/functions/v1/tmwe-api-proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'X-Service-Role-Call': 'true'
    },
    body: JSON.stringify({
      endpoint: '/email_message',
      data: {
        handler: 'get_messages',
        folder: folder,
        limit: 1,
        offset: 0,
        user_email: userEmail,
        bearerToken: tmweAccessToken
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[getFolderInfo] Failed: ${response.statusText} - ${errorText}`);
    throw new Error(`Failed to get folder info: ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  console.log(`[getFolderInfo] Response:`, { success: data.success, total: data.total });
  
  return {
    folder,
    total: data.total || 0
  };
}

async function getFolderUIDs(userEmail: string, folder: string, tmweAccessToken: string): Promise<number[]> {
  console.log(`[getFolderUIDs] Fetching UIDs for folder: ${folder}`);
  
  const response = await fetch(`${SUPABASE_URL}/functions/v1/tmwe-api-proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'X-Service-Role-Call': 'true'
    },
    body: JSON.stringify({
      endpoint: '/email_message',
      data: {
        handler: 'get_messages',
        folder: folder,
        limit: 999999,
        offset: 0,
        user_email: userEmail,
        bearerToken: tmweAccessToken
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[getFolderUIDs] Failed: ${response.statusText} - ${errorText}`);
    throw new Error(`Failed to get UIDs: ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  console.log(`[getFolderUIDs] Response:`, { success: data.success, count: data.data?.length });
  
  const uids = data.data?.map((msg: any) => parseInt(msg.uid, 10)) || [];
  return uids.filter((uid: number) => !isNaN(uid));
}

async function downloadEmail(userEmail: string, folder: string, uid: number, tmweAccessToken: string): Promise<any> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/tmwe-api-proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'X-Service-Role-Call': 'true'
    },
    body: JSON.stringify({
      endpoint: '/email_message',
      data: {
        handler: 'get_message',
        uid: uid.toString(),
        folder: folder,
        user_email: userEmail,
        bearerToken: tmweAccessToken
      }
    })
  });

  if (!response.ok) {
    console.error(`[downloadEmail] Failed to download UID ${uid}: ${response.statusText}`);
    return null;
  }

  const result = await response.json();
  
  if (!result.success || !result.data) {
    console.error(`[downloadEmail] API returned failure for UID ${uid}:`, result.errors);
    return null;
  }

  const data = result.data;
  console.log(`[downloadEmail] Downloaded UID ${uid}:`, { subject: data.subject?.substring(0, 50) });
  
  // Mappa al formato DB (identico al Debugger)
  return {
    message_id: `${userEmail}/${folder}/${uid}`,
    user_email: userEmail,
    folder_name: folder,
    uid,
    subject: data.subject || '',
    from_email: data.from?.email || data.from || '',
    to_email: data.to?.[0]?.email || (Array.isArray(data.to) && data.to.length > 0 ? data.to[0] : data.to) || '',
    cc: data.cc ? (Array.isArray(data.cc) ? data.cc.map((c: any) => c.email || c).join(', ') : data.cc) : null,
    bcc: data.bcc ? (Array.isArray(data.bcc) ? data.bcc.map((b: any) => b.email || b).join(', ') : data.bcc) : null,
    date: data.date || new Date().toISOString(),
    body_text: data.body_type === 'plain' ? data.body : data.preview || '',
    body_html: data.body_type === 'html' ? data.body : null,
    attachments: data.attachments || [],
    headers: data.headers || {},
    flags: data.flags || [],
    is_read: data.flags?.includes('\\Seen') || false,
    is_flagged: data.flags?.includes('\\Flagged') || false
  };
}
