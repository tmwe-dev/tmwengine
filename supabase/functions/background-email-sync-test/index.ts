// ============================================
// BACKGROUND EMAIL SYNC TEST - Edge Function
// TEST: Pre-check duplicati per ottimizzare download
// ============================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const API_TIMEOUT_MS = 70000; // 70s timeout (margine sicurezza prima timeout tmwe-api-proxy)

interface SyncRequest {
  folders: string[];
  user_email: string;
}

// ============================================
// FETCH WITH TIMEOUT HELPER
// ============================================
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const startTime = Date.now();
  console.log(`[fetchWithTimeout] 🚀 Starting request - timeout: ${timeoutMs}ms`);
  console.log(`[fetchWithTimeout] URL: ${url}`);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    const elapsed = Date.now() - startTime;
    console.warn(`[fetchWithTimeout] ⏱️ TIMEOUT TRIGGERED after ${elapsed}ms (limit: ${timeoutMs}ms)`);
    controller.abort();
  }, timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const elapsed = Date.now() - startTime;
    console.log(`[fetchWithTimeout] ✅ Request completed in ${elapsed}ms - status: ${response.status}`);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    const elapsed = Date.now() - startTime;
    
    if (error.name === 'AbortError') {
      console.error(`[fetchWithTimeout] ❌ Request ABORTED after ${elapsed}ms`);
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    
    console.error(`[fetchWithTimeout] ❌ Request FAILED after ${elapsed}ms:`, error.message);
    throw error;
  }
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
        message: 'Download started in background (TEST version with duplicate pre-check)'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Error in background-email-sync-test:', error);
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
    console.log(`[Job ${jobId}] 🔧 TEST MODE - Using pre-check duplicate optimization`);

    let totalMessagesGlobal = 0;

    // Processa ogni folder
    for (let i = 0; i < folders.length; i++) {
      const folder = folders[i];
      
      console.log(`[Job ${jobId}] ========================================`);
      console.log(`[Job ${jobId}] Processing folder ${i + 1}/${folders.length}: ${folder}`);

      try {
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
        console.log(`[Job ${jobId}] BEFORE getFolderInfo(${folder})`);
        const folderInfo = await getFolderInfo(userEmail, folder, tmweAccessToken);
        console.log(`[Job ${jobId}] AFTER getFolderInfo - total: ${folderInfo.total}`);
        
        // Skip cartelle vuote
        if (folderInfo.total === 0) {
          console.log(`[Job ${jobId}] Skipping empty folder: ${folder}`);
          completedFolders.push(folder);
          await supabase
            .from('email_sync_progress')
            .update({ completed_folders: completedFolders })
            .eq('job_id', jobId);
          continue;
        }
        
        totalMessagesGlobal += folderInfo.total;
        
        await supabase
          .from('email_sync_progress')
          .update({ 
            total_in_folder: folderInfo.total,
            total_messages: totalMessagesGlobal
          })
          .eq('job_id', jobId);

        // 2. Ottieni UIDs via tmwe-api-proxy
        console.log(`[Job ${jobId}] BEFORE getFolderUIDs(${folder})`);
        const uids = await getFolderUIDs(userEmail, folder, tmweAccessToken);
        console.log(`[Job ${jobId}] AFTER getFolderUIDs - received ${uids.length} UIDs`);
        
        if (uids.length === 0) {
          console.warn(`[Job ${jobId}] No UIDs returned for folder ${folder} (expected ${folderInfo.total})`);
          completedFolders.push(folder);
          await supabase
            .from('email_sync_progress')
            .update({ completed_folders: completedFolders })
            .eq('job_id', jobId);
          continue;
        }

        // ✅ NUOVO: Pre-check UIDs già presenti nel database
        console.log(`[Job ${jobId}] 🔍 Checking for existing UIDs in database...`);
        const checkStartTime = Date.now();
        
        const { data: existingEmails, error: checkError } = await supabase
          .from('email_messages')
          .select('message_id')
          .eq('user_email', userEmail)
          .eq('cartella', folder);

        const checkElapsed = Date.now() - checkStartTime;
        console.log(`[Job ${jobId}] DB check completed in ${checkElapsed}ms`);

        if (checkError) {
          console.error(`[Job ${jobId}] ⚠️ Error checking existing UIDs (will proceed with all):`, checkError);
        }

        // Estrai numeri UID dalle message_id esistenti
        // Formato: "user@example.com/INBOX/12345" → 12345
        const existingUIDs = new Set(
          existingEmails?.map(e => {
            const parts = e.message_id.split('/');
            const uidStr = parts[parts.length - 1];
            return parseInt(uidStr, 10);
          }).filter(uid => !isNaN(uid)) || []
        );

        // ✅ Filtra solo UIDs nuovi
        const newUIDs = uids.filter(uid => !existingUIDs.has(uid));

        const duplicatePercentage = Math.round(existingUIDs.size / uids.length * 100);
        const timeSavedEstimate = Math.round(existingUIDs.size * 0.5); // ~500ms per email skippata

        console.log(`[Job ${jobId}] 📊 UID Analysis for ${folder}:`);
        console.log(`  - Total UIDs on server: ${uids.length}`);
        console.log(`  - Already in database: ${existingUIDs.size}`);
        console.log(`  - New UIDs to download: ${newUIDs.length}`);
        console.log(`  - Optimization savings: ${existingUIDs.size} downloads skipped (${duplicatePercentage}%)`);
        console.log(`  - Estimated time saved: ~${timeSavedEstimate}s`);

        // ✅ Se nessun nuovo UID, salta la cartella
        if (newUIDs.length === 0) {
          console.log(`[Job ${jobId}] ✅ Folder ${folder} fully synced (${uids.length} emails already in DB)`);
          completedFolders.push(folder);
          
          await supabase
            .from('email_sync_progress')
            .update({ 
              completed_folders: completedFolders,
              downloaded_in_folder: uids.length,
              total_in_folder: uids.length,
              processed_messages: totalDownloaded + uids.length
            })
            .eq('job_id', jobId);
          
          continue;
        }
        
        // 3. Download SOLO i nuovi UIDs in batch di 10
        const batchSize = 5;  // 🔧 Ridotto da 10 per evitare timeout CPU
        let downloadedInFolder = 0;

        for (let j = 0; j < newUIDs.length; j += batchSize) {
          const batch = newUIDs.slice(j, j + batchSize);  // ✅ USA newUIDs invece di uids
          
          console.log(`[Job ${jobId}] Downloading batch ${Math.floor(j/batchSize)+1}/${Math.ceil(newUIDs.length/batchSize)} for ${folder}`);
          
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
          const remaining = folders.slice(i + 1).reduce((sum, f) => sum + folderInfo.total, 0) + (newUIDs.length - downloadedInFolder);
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

          console.log(`[Job ${jobId}] Folder ${folder}: ${downloadedInFolder}/${newUIDs.length} new (${Math.round(speed)}/s)`);
        }

        // Folder completata
        completedFolders.push(folder);
        await supabase
          .from('email_sync_progress')
          .update({ completed_folders: completedFolders })
          .eq('job_id', jobId);

        // ✅ NUOVO: Logging statistiche ottimizzazione finale
        console.log(`[Job ${jobId}] ✅ Folder ${folder} COMPLETED:`);
        console.log(`  - Total emails on server: ${uids.length}`);
        console.log(`  - Already synced: ${existingUIDs.size}`);
        console.log(`  - Downloaded new: ${downloadedInFolder}`);
        console.log(`  - Time saved by pre-check: ~${timeSavedEstimate}s`);
        console.log(`  - Optimization efficiency: ${duplicatePercentage}%`);
          
      } catch (folderError: any) {
        // Gestione errore per singola cartella (non termina tutto il job)
        console.error(`[Job ${jobId}] ERROR processing folder ${folder}:`, folderError.message);
        
        // Recupera errori esistenti e aggiungi nuovo (max 50)
        const { data: currentJob } = await supabase
          .from('email_sync_progress')
          .select('errors')
          .eq('job_id', jobId)
          .single();
        
        const errors = currentJob?.errors || [];
        if (errors.length < 50) {
          errors.push({
            folder,
            message: folderError.message,
            timestamp: new Date().toISOString()
          });
        }
        
        await supabase
          .from('email_sync_progress')
          .update({ errors })
          .eq('job_id', jobId);
        
        // Segna cartella come completata (con errore) e continua
        completedFolders.push(folder);
        await supabase
          .from('email_sync_progress')
          .update({ completed_folders: completedFolders })
          .eq('job_id', jobId);
        
        console.log(`[Job ${jobId}] Continuing with next folder...`);
        continue;
      }
    }

    // Job completato
    await supabase
      .from('email_sync_progress')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('job_id', jobId);

    console.log(`[Job ${jobId}] ✅ TEST COMPLETED: ${totalDownloaded} new emails in ${Math.round((Date.now() - startTime) / 1000)}s`);

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
  
  try {
    const response = await fetchWithTimeout(
      `${SUPABASE_URL}/functions/v1/tmwe-api-proxy`,
      {
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
      },
      API_TIMEOUT_MS
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[getFolderInfo] HTTP Error ${response.status}: ${errorText}`);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log(`[getFolderInfo] Raw response:`, JSON.stringify(data).substring(0, 200));
    
    // ✅ OPZIONE A: Gestisci entrambi i formati (con/senza wrapper success)
    const hasSuccess = 'success' in data;
    const isSuccess = hasSuccess ? data.success !== false : true;
    
    console.log(`[getFolderInfo] Success check - hasSuccess: ${hasSuccess}, isSuccess: ${isSuccess}`);
    
    if (!isSuccess) {
      console.error(`[getFolderInfo] API returned success=false:`, data.errors || data.message);
      throw new Error(`TMWE API error: ${data.errors?.[0] || data.message || 'Unknown error'}`);
    }

    if (typeof data.total !== 'number') {
      console.warn(`[getFolderInfo] Invalid total (${typeof data.total}), defaulting to 0`);
    }
    
    console.log(`[getFolderInfo] Response: { success: ${hasSuccess ? data.success : 'N/A'}, total: ${data.total || 0} }`);
    
    return {
      folder,
      total: data.total || 0
    };
    
  } catch (error: any) {
    console.error(`[getFolderInfo] Exception for folder ${folder}:`, error.message);
    throw error;
  }
}

async function getFolderUIDs(userEmail: string, folder: string, tmweAccessToken: string): Promise<number[]> {
  console.log(`[getFolderUIDs] ========================================`);
  console.log(`[getFolderUIDs] Fetching UIDs for folder: ${folder}`);
  console.log(`[getFolderUIDs] User: ${userEmail}`);
  
  try {
    console.log(`[getFolderUIDs] BEFORE fetch - calling tmwe-api-proxy`);
    console.log(`[getFolderUIDs] Request body:`, JSON.stringify({
      endpoint: '/email_message',
      data: {
        handler: 'get_messages',
        folder: folder,
        limit: 999999,
        offset: 0,
        user_email: userEmail,
        bearerToken: '***' // Non loggare token
      }
    }));
    
    const response = await fetchWithTimeout(
      `${SUPABASE_URL}/functions/v1/tmwe-api-proxy`,
      {
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
      },
      API_TIMEOUT_MS
    );
    
    console.log(`[getFolderUIDs] AFTER fetch - status: ${response.status}, ok: ${response.ok}`);
    console.log(`[getFolderUIDs] Response headers:`, Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[getFolderUIDs] HTTP Error ${response.status}: ${errorText}`);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    console.log(`[getFolderUIDs] BEFORE json parse`);
    const data = await response.json();
    console.log(`[getFolderUIDs] AFTER json parse - success!`);
    console.log(`[getFolderUIDs] Response keys:`, Object.keys(data).join(', '));
    console.log(`[getFolderUIDs] Response structure:`, {
      hasSuccess: 'success' in data,
      successValue: data.success,
      hasData: 'data' in data,
      dataType: typeof data.data,
      isDataArray: Array.isArray(data.data),
      dataLength: Array.isArray(data.data) ? data.data.length : 'N/A'
    });
    console.log(`[getFolderUIDs] Raw response (first 500 chars):`, JSON.stringify(data).substring(0, 500));
    
    // ✅ OPZIONE A: Gestisci entrambi i formati (con/senza wrapper success)
    const hasSuccess = 'success' in data;
    const isSuccess = hasSuccess ? data.success !== false : true;
    
    console.log(`[getFolderUIDs] Success check - hasSuccess: ${hasSuccess}, isSuccess: ${isSuccess}`);
    
    if (!isSuccess) {
      console.error(`[getFolderUIDs] API returned success=false:`, data.errors || data.message);
      throw new Error(`TMWE API error: ${data.errors?.[0] || data.message || 'Unknown error'}`);
    }

    // Estrai array messaggi - tmwe-api-proxy ritorna { messages: [...], total: X }
    const messages = data.messages || [];
    console.log(`[getFolderUIDs] Extracted messages - type: ${typeof messages}, isArray: ${Array.isArray(messages)}, length: ${Array.isArray(messages) ? messages.length : 'N/A'}`);
    
    if (!Array.isArray(messages)) {
      console.error(`[getFolderUIDs] Expected array, got:`, typeof messages);
      console.error(`[getFolderUIDs] Full data object:`, JSON.stringify(data));
      throw new Error(`Invalid response format: expected array, got ${typeof messages}`);
    }
    
    console.log(`[getFolderUIDs] First message sample:`, messages[0] ? JSON.stringify(messages[0]) : 'No messages');
    
    const uids = messages
      .map((msg: any) => {
        const uid = parseInt(msg.uid, 10);
        if (isNaN(uid)) {
          console.warn(`[getFolderUIDs] Invalid UID in message:`, msg);
        }
        return uid;
      })
      .filter((uid: number) => !isNaN(uid));
    
    console.log(`[getFolderUIDs] ✅ SUCCESS - Parsed ${uids.length} valid UIDs from ${messages.length} messages`);
    console.log(`[getFolderUIDs] Sample UIDs (first 10):`, uids.slice(0, 10));
    console.log(`[getFolderUIDs] ========================================`);
    
    return uids;
    
  } catch (error: any) {
    console.error(`[getFolderUIDs] ❌ EXCEPTION for folder ${folder}:`, error.message);
    console.error(`[getFolderUIDs] Stack trace:`, error.stack);
    console.error(`[getFolderUIDs] ========================================`);
    throw error;
  }
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
  
  // Mappa al formato DB con schema corretto
  return {
    message_id: `${userEmail}/${folder}/${uid}`,
    user_email: userEmail,
    cartella: folder,
    sync_status: 'fun_email_backup',
    subject: data.subject || '',
    from_email: data.from?.email || data.from || '',
    to_email: data.to?.[0]?.email || (Array.isArray(data.to) && data.to.length > 0 ? data.to[0] : data.to) || '',
    cc_email: data.cc ? (Array.isArray(data.cc) ? data.cc.map((c: any) => c.email || c).join(', ') : data.cc) : null,
    bcc_email: data.bcc ? (Array.isArray(data.bcc) ? data.bcc.map((b: any) => b.email || b).join(', ') : data.bcc) : null,
    data_ricezione: data.date || new Date().toISOString(),
    body_text: data.body_type === 'plain' ? data.body : data.preview || '',
    body_html: data.body_type === 'html' ? data.body : null,
    attachments: data.attachments || [],
    raw_headers: data.headers || {},
    flags: data.flags || []
  };
}
