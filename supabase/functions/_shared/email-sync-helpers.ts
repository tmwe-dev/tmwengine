/**
 * Email Sync Helpers - Módulo Compartido
 * Funciones reutilizables para sincronización de emails
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// ============================================
// INTERFACES
// ============================================

export interface SyncJob {
  job_id: string;
  user_email: string;
  folder_name: string;
  folders_to_sync: string[];
  status: string;
  total_messages: number;
  processed_messages: number;
}

export interface SyncProgress {
  processed_messages: number;
  total_messages: number;
  current_folder: string;
  downloaded_in_folder: number;
  total_in_folder: number;
  speed: number;
  eta: number;
  completed_folders?: string[];
}

// ============================================
// FETCH WITH TIMEOUT HELPER
// ============================================

export async function fetchWithTimeout(
  url: string, 
  options: RequestInit, 
  timeoutMs: number
): Promise<Response> {
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

// ============================================
// CREATE SYNC JOB
// ============================================

export async function createSyncJob(
  supabase: SupabaseClient,
  userEmail: string,
  folders: string[]
): Promise<SyncJob> {
  console.log('[createSyncJob] 📝 Creating sync job for:', { userEmail, folders });
  
  const { data: job, error: jobError } = await supabase
    .from('email_sync_progress')
    .insert({
      user_email: userEmail,
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
    console.error('[createSyncJob] ❌ Error creating job:', jobError);
    throw jobError;
  }

  console.log('[createSyncJob] ✅ Job created:', job.job_id);
  return job as SyncJob;
}

// ============================================
// UPDATE SYNC PROGRESS
// ============================================

export async function updateSyncProgress(
  supabase: SupabaseClient,
  jobId: string,
  progress: Partial<SyncProgress>
): Promise<void> {
  const { error: updateError } = await supabase
    .from('email_sync_progress')
    .update({
      ...progress,
      updated_at: new Date().toISOString()
    })
    .eq('job_id', jobId);

  if (updateError) {
    console.error('[updateSyncProgress] ⚠️ Error updating progress:', updateError);
    // Non-fatal, continua
  }
}

// ============================================
// MARK JOB COMPLETE
// ============================================

export async function markJobComplete(
  supabase: SupabaseClient,
  jobId: string,
  status: 'completed' | 'error' = 'completed',
  errorMessage?: string
): Promise<void> {
  console.log(`[markJobComplete] 🏁 Marking job ${status}:`, jobId);
  
  const updateData: any = {
    status,
    updated_at: new Date().toISOString()
  };

  if (errorMessage) {
    updateData.error_message = errorMessage;
  }

  const { error } = await supabase
    .from('email_sync_progress')
    .update(updateData)
    .eq('job_id', jobId);

  if (error) {
    console.error('[markJobComplete] ⚠️ Error marking job complete:', error);
  }
}

// ============================================
// GET FOLDER INFO
// ============================================

export async function getFolderInfo(
  tmweApiBase: string,
  oauthToken: string,
  folderName: string
): Promise<{ total: number; unread?: number }> {
  console.log(`[getFolderInfo] 📊 Fetching info for folder: ${folderName}`);
  
  const response = await fetch(`${tmweApiBase}/email_folder`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${oauthToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      handler: 'get_folder_info',
      folder_name: folderName,
      include_counts: true
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to get folder info: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    total: data.message_count || data.messages || 0,
    unread: data.unseen || 0
  };
}

// ============================================
// DOWNLOAD EMAIL BATCH
// ============================================

export async function downloadEmailBatch(
  supabase: SupabaseClient,
  folder: string,
  uids: string[],
  userEmail: string,
  tmweApiBase: string,
  oauthToken: string,
  timeoutMs: number = 70000
): Promise<{ downloaded: number; failed: number }> {
  console.log(`[downloadEmailBatch] 📥 Downloading ${uids.length} emails from ${folder}`);
  
  let downloaded = 0;
  let failed = 0;

  // Download in smaller batches
  const batchSize = 10;
  for (let i = 0; i < uids.length; i += batchSize) {
    const batch = uids.slice(i, i + batchSize);
    
    try {
      const response = await fetchWithTimeout(
        `${tmweApiBase}/email_message`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${oauthToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            handler: 'get_messages_batch',
            folder_name: folder,
            uids: batch
          })
        },
        timeoutMs
      );

      if (!response.ok) {
        console.error(`[downloadEmailBatch] ❌ Batch failed: ${response.statusText}`);
        failed += batch.length;
        continue;
      }

      const emails = await response.json();
      
      // Insert into database
      if (Array.isArray(emails) && emails.length > 0) {
        const emailsToInsert = emails.map(email => ({
          user_email: userEmail,
          message_id: email.uid || email.message_id,
          cartella: folder,
          subject: email.subject,
          from_email: email.from?.address || email.from,
          from_name: email.from?.name,
          to_email: email.to,
          cc: email.cc,
          bcc: email.bcc,
          received_date: email.date,
          body_text: email.text,
          body_html: email.html,
          has_attachments: email.hasAttachments || false,
          is_read: email.flags?.includes('\\Seen') || false,
          is_flagged: email.flags?.includes('\\Flagged') || false
        }));

        const { error: insertError } = await supabase
          .from('email_messages')
          .upsert(emailsToInsert, {
            onConflict: 'user_email,message_id',
            ignoreDuplicates: false
          });

        if (insertError) {
          console.error('[downloadEmailBatch] ⚠️ Insert error:', insertError);
          failed += batch.length;
        } else {
          downloaded += emails.length;
        }
      }
    } catch (error) {
      console.error('[downloadEmailBatch] ❌ Batch error:', error);
      failed += batch.length;
    }
  }

  console.log(`[downloadEmailBatch] ✅ Downloaded: ${downloaded}, Failed: ${failed}`);
  return { downloaded, failed };
}
