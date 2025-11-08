/**
 * Single Fast MAX - Core Logic
 * 
 * "Danza" approach: alternates between fetching UIDs and downloading emails
 * - Fetch 25 UIDs from server
 * - Find missing UIDs in local DB
 * - Fetch light metadata for missing UIDs
 * - Insert into temp_index
 * - DOWNLOAD IMMEDIATELY those emails
 * - Repeat until no more UIDs
 * 
 * Advantages:
 * - Downloads start in 3-4 seconds (vs 45 minutes)
 * - Progressive: can be interrupted and resumed
 * - Memory efficient: processes in small batches
 * - Auto-skip: already downloaded emails are skipped
 */

import { supabase } from "@/integrations/supabase/client";
import { emailMessageApi } from "./tmwe-api-integrated";

export interface DanceProgress {
  phase: 'fetching_uids' | 'downloading_emails' | 'completed';
  current_batch: number;
  total_processed: number;
  current_email?: string;
  current_uid?: string;
}

/**
 * Find UIDs that are missing in local database
 */
async function findMissingUIDs(
  uids: string[], 
  folder: string, 
  user_email: string
): Promise<string[]> {
  if (uids.length === 0) return [];

  const message_ids = uids.map(uid => `${folder}/${uid}`);
  
  const { data, error } = await supabase
    .from('email_messages')
    .select('message_id')
    .eq('user_email', user_email)
    .eq('cartella', folder)
    .in('message_id', message_ids);

  if (error) {
    console.warn(`[findMissingUIDs] DB query error:`, error);
    return uids; // If error, assume all are missing
  }

  const existing_set = new Set(
    (data || []).map(m => m.message_id.split('/').pop())
  );
  
  const missing = uids.filter(uid => !existing_set.has(uid));
  
  console.log(`[findMissingUIDs] ${folder}: ${uids.length} UIDs → ${missing.length} missing`);
  
  return missing;
}

/**
 * Fetch light metadata for a batch of UIDs
 */
async function fetchMetadataForUIDs(
  uids: string[], 
  folder: string, 
  user_email: string
): Promise<any[]> {
  const metadata_batch = [];

  for (const uid of uids) {
    try {
      const email = await emailMessageApi.getMessage(uid, folder, false);
      
      metadata_batch.push({
        uid,
        folder,
        user_email,
        subject: email?.subject || null,
        from_email: email?.from || 'Unknown',
        from_name: email?.from_name || null,
        date: email?.date || new Date().toISOString(),
        status: 'pending',
      });
    } catch (err: any) {
      console.warn(`[fetchMetadataForUIDs] Error for UID ${uid}:`, err.message);
      // Skip this UID on metadata error
    }
  }

  return metadata_batch;
}

/**
 * Download a single email from temp_index
 */
async function downloadEmail(
  uid: string, 
  folder: string, 
  user_email: string
): Promise<boolean> {
  try {
    // Fetch full email with body
    const full_email = await emailMessageApi.getMessage(uid, folder, true);
    
    if (!full_email) {
      console.warn(`[downloadEmail] No data for UID ${uid}`);
      return false;
    }

    const message_id = `${folder}/${uid}`;

    // Check if already exists
    const { data: existing } = await supabase
      .from('email_messages')
      .select('id')
      .eq('message_id', message_id)
      .maybeSingle();

    if (existing) {
      console.log(`[downloadEmail] UID ${uid} already exists, skipping`);
      
      // Update temp_index status
      await supabase
        .from('email_temp_index')
        .update({ status: 'imported' })
        .eq('uid', uid)
        .eq('folder', folder)
        .eq('user_email', user_email);
      
      return true;
    }

    // Insert email into email_messages with correct schema
    const { error: insert_error } = await supabase
      .from('email_messages')
      .insert({
        message_id,
        user_email,
        from_email: full_email.from || 'Unknown',
        to_email: full_email.to || user_email,
        subject: full_email.subject || '(No Subject)',
        body_text: full_email.body || '',
        body_html: full_email.body_html || null,
        data_invio: full_email.date || new Date().toISOString(),
        data_ricezione: new Date().toISOString(),
        cartella: folder,
        stato: 'non_letto',
        direzione: 'ricevuta',
        provider_id: '00000000-0000-0000-0000-000000000000', // Default provider ID
        attachments: full_email.attachments || null,
        cc_email: full_email.cc || null,
        bcc_email: full_email.bcc || null,
        in_reply_to: full_email.in_reply_to || null,
        email_references: full_email.references || null,
      });

    if (insert_error) {
      console.error(`[downloadEmail] Insert error for UID ${uid}:`, insert_error);
      return false;
    }

    // Update temp_index status
    await supabase
      .from('email_temp_index')
      .update({ status: 'imported' })
      .eq('uid', uid)
      .eq('folder', folder)
      .eq('user_email', user_email);

    console.log(`[downloadEmail] ✅ UID ${uid} downloaded successfully`);
    return true;

  } catch (err: any) {
    console.error(`[downloadEmail] Error for UID ${uid}:`, err.message);
    return false;
  }
}

/**
 * Main function: Process folder with "dance" approach
 * 
 * @param folder_name - Email folder to process
 * @param user_email - User's email address
 * @param on_progress - Callback for progress updates
 */
export async function processFolderWithDance(
  folder_name: string,
  user_email: string,
  on_progress?: (details: DanceProgress) => void
): Promise<{ total_downloaded: number; errors: number }> {
  
  let current_page = 1;
  let has_more = true;
  const BATCH_SIZE = 25;
  let total_downloaded = 0;
  let total_errors = 0;

  console.log(`[processFolderWithDance] 🎯 Starting DANCE for ${folder_name}`);

  while (has_more) {
    console.log(`[processFolderWithDance] 📦 Batch ${current_page}: Fetching UIDs...`);
    
    // 🎯 STEP 1: Fetch 25 UIDs from server
    on_progress?.({ 
      phase: 'fetching_uids', 
      current_batch: current_page, 
      total_processed: total_downloaded 
    });

    let batch_uids: string[] = [];
    
    try {
      const server_response = await emailMessageApi.getMessages({
        folder: folder_name,
        page: current_page,
        limit: BATCH_SIZE,
        format: 'text',
        include_attachments: false,
      });

      batch_uids = (server_response.messages || []).map((msg: any) => String(msg.uid));
    } catch (err: any) {
      console.error(`[processFolderWithDance] Error fetching UIDs page ${current_page}:`, err.message);
      total_errors++;
      break;
    }

    if (batch_uids.length === 0) {
      console.log(`[processFolderWithDance] No more UIDs, stopping`);
      has_more = false;
      break;
    }

    console.log(`[processFolderWithDance] 📦 Batch ${current_page}: Fetched ${batch_uids.length} UIDs`);

    // 🎯 STEP 2: Find missing UIDs
    const missing_uids = await findMissingUIDs(batch_uids, folder_name, user_email);

    if (missing_uids.length === 0) {
      console.log(`[processFolderWithDance] 📦 Batch ${current_page}: All UIDs already downloaded, skipping`);
      current_page++;
      
      if (batch_uids.length < BATCH_SIZE) {
        has_more = false;
      }
      
      continue;
    }

    // 🎯 STEP 3: Fetch light metadata for missing UIDs
    console.log(`[processFolderWithDance] 📦 Batch ${current_page}: Fetching metadata for ${missing_uids.length} missing UIDs...`);
    const metadata = await fetchMetadataForUIDs(missing_uids, folder_name, user_email);

    // 🎯 STEP 4: Insert into temp_index
    if (metadata.length > 0) {
      const { error: insert_error } = await supabase
        .from('email_temp_index')
        .insert(metadata);

      if (insert_error) {
        console.error(`[processFolderWithDance] Error inserting temp_index:`, insert_error);
      } else {
        console.log(`[processFolderWithDance] 📦 Batch ${current_page}: Inserted ${metadata.length} records into temp_index`);
      }
    }

    // 🎯 STEP 5: DOWNLOAD IMMEDIATELY these emails
    console.log(`[processFolderWithDance] 📦 Batch ${current_page}: Downloading ${missing_uids.length} emails NOW...`);
    
    on_progress?.({ 
      phase: 'downloading_emails', 
      current_batch: current_page, 
      total_processed: total_downloaded 
    });

    for (const uid of missing_uids) {
      const success = await downloadEmail(uid, folder_name, user_email);
      
      if (success) {
        total_downloaded++;
        
        on_progress?.({ 
          phase: 'downloading_emails', 
          current_batch: current_page, 
          total_processed: total_downloaded,
          current_email: `UID ${uid}`,
          current_uid: uid,
        });
      } else {
        total_errors++;
      }

      // Small throttle between downloads
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.log(`[processFolderWithDance] ✅ Batch ${current_page} completed: ${total_downloaded} total downloaded`);

    // 🎯 STEP 6: Next page
    current_page++;

    if (batch_uids.length < BATCH_SIZE) {
      has_more = false;
    }

    // Throttle between batches
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`[processFolderWithDance] 🎉 DANCE completed for ${folder_name}: ${total_downloaded} downloaded, ${total_errors} errors`);

  on_progress?.({ 
    phase: 'completed', 
    current_batch: current_page, 
    total_processed: total_downloaded 
  });

  return { total_downloaded, errors: total_errors };
}
