import { supabase } from '@/integrations/supabase/client';
import { emailMessageApi } from '@/lib/tmwe-api-integrated';

// Definizione dei tipi
interface EmailTempIndex {
  uid: string;
  folder: string;
  subject: string | null;
  from_email: string;
  from_name: string | null;
  date: string;
  status: 'pending' | 'imported' | 'selected';
}

export interface DanceProgress {
  phase: 'fetching_uids' | 'downloading_emails' | 'completed';
  current_batch: number;
  total_processed: number;
  current_email?: string;
  current_uid?: string;
}

interface FolderProgress {
  folder: string;
  total: number;
  imported: number;
  pending: number;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Trova gli UID mancanti confrontando UIDs del server con email_messages
 */
async function findMissingUIDs(
  user_email: string,
  folder: string,
  uids: number[]
): Promise<number[]> {
  if (uids.length === 0) return [];

  const message_ids = uids.map(uid => `${folder}/${uid}`);
  
  const { data, error } = await supabase
    .from('email_messages')
    .select('message_id')
    .eq('user_email', user_email)
    .eq('cartella', folder)
    .in('message_id', message_ids);

  if (error) {
    console.error('[findMissingUIDs] Error:', error);
    return uids;
  }

  const existing_ids = new Set(data.map(row => row.message_id));
  const missing = uids.filter(uid => !existing_ids.has(`${folder}/${uid}`));
  
  console.log(`[findMissingUIDs] ${folder}: ${uids.length} UIDs → ${missing.length} missing`);
  return missing;
}

/**
 * Salva metadata in email_temp_index per batch di UIDs
 */
async function fetchMetadataBatch(
  user_email: string,
  folder: string,
  uids: number[]
): Promise<void> {
  if (uids.length === 0) return;

  console.log(`[fetchMetadataBatch] ${folder}: Fetching metadata for ${uids.length} UIDs...`);

  const batch_data: any[] = [];

  for (const uid of uids) {
    try {
      // Scarica metadati email (senza body per velocità)
      const email = await emailMessageApi.getMessage(String(uid), folder, false, false);
      
      // ✅ NORMALIZZA: gestisce ENTRAMBI i formati API (diretto e nested)
      const header = email?.data?.header || email || {};
      
      batch_data.push({
        uid: String(uid),
        folder,
        user_email,
        subject: header.subject || email?.subject || null,
        from_email: header.from || email?.from?.email || email?.from || 'Unknown',
        from_name: header.from_name || email?.from_name || null,
        date: header.date || email?.date || new Date().toISOString(),
        status: 'pending'
      });
    } catch (error: any) {
      console.error(`[fetchMetadataBatch] Error UID ${uid}:`, error.message);
      // Inserisci comunque un placeholder per non perdere l'UID
      batch_data.push({
        uid: String(uid),
        folder,
        user_email,
        subject: null,
        from_email: 'Unknown',
        from_name: null,
        date: new Date().toISOString(),
        status: 'pending'
      });
    }
  }

  if (batch_data.length > 0) {
    const { error } = await supabase
      .from('email_temp_index')
      .upsert(batch_data, {
        onConflict: 'uid,folder,user_email',
        ignoreDuplicates: false
      });

    if (error) {
      console.error('[fetchMetadataBatch] Upsert error:', error);
    } else {
      console.log(`[fetchMetadataBatch] ✅ Saved ${batch_data.length} metadata records`);
    }
  }
}

/**
 * Scarica e salva una singola email completa
 */
async function downloadEmail(
  user_email: string,
  folder: string,
  uid: number,
  onProgress?: (imported: number) => void
): Promise<boolean> {
  const message_id = `${folder}/${uid}`;

  try {
    // Retry con backoff per timeout transitori
    const MAX_RETRIES = 2;
    let retries = 0;
    let full_email: any = null;

    while (retries <= MAX_RETRIES) {
      try {
        // ✅ Scarica email COMPLETA con body (include_body: true)
        full_email = await emailMessageApi.getMessage(String(uid), folder, false, true);
        break; // Successo, esci dal loop
      } catch (error: any) {
        retries++;
        if (error.message?.includes('timeout') && retries <= MAX_RETRIES) {
          console.warn(`⏱️ Timeout UID ${uid}, retry ${retries}/${MAX_RETRIES}...`);
          await new Promise(r => setTimeout(r, 1000 * retries)); // Backoff 1s, 2s
          continue;
        }
        throw error; // Re-throw se non è timeout o max retries raggiunto
      }
    }

    if (!full_email) {
      console.warn(`[downloadEmail] No data for UID ${uid} after retries`);
      return false;
    }

    // ✅ NORMALIZZA: gestisce ENTRAMBI i formati API (diretto e nested)
    const header = full_email.data?.header || full_email || {};
    const body_data = full_email.data || full_email || {};

    // Estrai campi con fallback multipli
    const subject = header.subject || full_email.subject;
    const from = header.from || full_email.from?.email || full_email.from;
    const date = header.date || full_email.date;

    // ✅ Verifica che API abbia ritornato dati completi
    if (!subject && !from) {
      console.error(`[downloadEmail] ⚠️ UID ${uid}: API returned incomplete data`);
      console.error(`[downloadEmail] Response:`, JSON.stringify(full_email, null, 2));
      return false;
    }

    console.log(`[downloadEmail] ✅ UID ${uid}: subject="${subject?.substring(0, 50)}...", from=${from}`);

    // Verifica se email già esiste
    const { data: existing } = await supabase
      .from('email_messages')
      .select('id')
      .eq('message_id', message_id)
      .maybeSingle();

    if (existing) {
      console.log(`[downloadEmail] UID ${uid} already exists, skipping`);
      return false;
    }

    // ✅ Insert email con MAPPING COMPLETO e FALLBACK per entrambi i formati
    const { error: insert_error } = await supabase
      .from('email_messages')
      .insert({
        message_id,
        user_email,
        from_email: header.from || full_email.from?.email || full_email.from || 'Unknown',
        to_email: Array.isArray(header.to || full_email.to) 
          ? (header.to || full_email.to).map((t: any) => t.email || t.address || t).join(', ') 
          : ((header.to || full_email.to)?.email || user_email),
        subject: header.subject || full_email.subject || '(No Subject)',
        body_text: body_data.body_plain || full_email.body || full_email.body_plain || '',
        body_html: body_data.body_html || full_email.body_html || null,
        data_invio: header.date || full_email.date || new Date().toISOString(),
        data_ricezione: new Date().toISOString(),
        cartella: folder,
        stato: 'nuovo',
        direzione: 'inbound',
        provider_id: '00000000-0000-0000-0000-000000000000',
        attachments: Array.isArray(header.attachments || full_email.attachments) 
          ? (header.attachments || full_email.attachments) 
          : [],
        cc_email: Array.isArray(header.cc || full_email.cc) 
          ? (header.cc || full_email.cc).map((c: any) => c.email || c.address || c).join(', ') 
          : null,
        bcc_email: Array.isArray(header.bcc || full_email.bcc) 
          ? (header.bcc || full_email.bcc).map((b: any) => b.email || b.address || b).join(', ') 
          : null,
        in_reply_to: header.in_reply_to || full_email.in_reply_to || null,
        email_references: header.references || full_email.references || null,
      });

    if (insert_error) {
      console.error(`[downloadEmail] Insert error UID ${uid}:`, insert_error);
      return false;
    }

    // Aggiorna stato in email_temp_index
    await supabase
      .from('email_temp_index')
      .update({ status: 'imported' })
      .eq('uid', String(uid))
      .eq('folder', folder)
      .eq('user_email', user_email);

    if (onProgress) {
      onProgress(1);
    }

    return true;
  } catch (error: any) {
    console.error(`[downloadEmail] Error UID ${uid}:`, error.message);
    return false;
  }
}

// ============================================================================
// MAIN PROCESSING FUNCTION
// ============================================================================

/**
 * Processa una cartella con download massivo parallelizzato
 */
export async function processFolderWithDance(
  user_email: string,
  folder: string,
  onProgress?: (folder: string, imported: number, total: number) => void
): Promise<{ total_downloaded: number; errors: number }> {
  console.log(`[processFolderWithDance] 🚀 START: ${folder}`);

  const BATCH_SIZE = 50; // UIDs per batch
  const MAX_CONCURRENT = 3; // Download paralleli

  let page = 1;
  let has_more = true;
  let total_imported = 0;

  while (has_more) {
    try {
      // 1. Scarica batch di UIDs dal server TMWE
      console.log(`[processFolderWithDance] 📦 Batch ${page}: Fetching UIDs...`);
      const response = await emailMessageApi.getMessages({
        folder,
        page,
        limit: BATCH_SIZE
      });

      const uids: number[] = response?.messages?.map((m: any) => m.uid) || [];
      
      if (uids.length === 0) {
        console.log(`[processFolderWithDance] ✅ No more UIDs for ${folder}`);
        has_more = false;
        break;
      }

      console.log(`[processFolderWithDance] 📦 Batch ${page}: Fetched ${uids.length} UIDs`);

      // 2. Trova UIDs mancanti (non ancora in email_messages)
      const missing_uids = await findMissingUIDs(user_email, folder, uids);

      if (missing_uids.length === 0) {
        console.log(`[processFolderWithDance] ✅ Batch ${page}: All emails already imported`);
        page++;
        continue;
      }

      // 3. Salva metadata in email_temp_index
      console.log(`[processFolderWithDance] 📦 Batch ${page}: Fetching metadata for ${missing_uids.length} missing UIDs...`);
      await fetchMetadataBatch(user_email, folder, missing_uids);

      // 4. Download parallelo email complete
      console.log(`[processFolderWithDance] 📦 Batch ${page}: Downloading ${missing_uids.length} emails (${MAX_CONCURRENT} concurrent)...`);
      
      for (let i = 0; i < missing_uids.length; i += MAX_CONCURRENT) {
        const chunk = missing_uids.slice(i, i + MAX_CONCURRENT);
        
        await Promise.all(
          chunk.map(uid =>
            downloadEmail(user_email, folder, uid, (imported) => {
              total_imported += imported;
              if (onProgress) {
                onProgress(folder, total_imported, missing_uids.length);
              }
            })
          )
        );
      }

      console.log(`[processFolderWithDance] ✅ Batch ${page}: Completed ${missing_uids.length} emails`);
      page++;

      // Verifica se ci sono altri batch
      if (uids.length < BATCH_SIZE) {
        has_more = false;
      }

    } catch (error: any) {
      console.error(`[processFolderWithDance] Error page ${page}:`, error.message);
      has_more = false;
    }
  }

  console.log(`[processFolderWithDance] 🎉 COMPLETE: ${folder} (${total_imported} imported)`);
  return { total_downloaded: total_imported, errors: 0 };
}

// ============================================================================
// PROGRESS TRACKING
// ============================================================================

/**
 * Ottiene il progresso per tutte le cartelle
 */
export async function getFoldersProgress(user_email: string): Promise<FolderProgress[]> {
  const { data, error } = await supabase
    .from('email_temp_index')
    .select('folder, status')
    .eq('user_email', user_email);

  if (error || !data) {
    console.error('[getFoldersProgress] Error:', error);
    return [];
  }

  const folders_map = new Map<string, FolderProgress>();

  data.forEach(row => {
    if (!folders_map.has(row.folder)) {
      folders_map.set(row.folder, {
        folder: row.folder,
        total: 0,
        imported: 0,
        pending: 0
      });
    }

    const progress = folders_map.get(row.folder)!;
    progress.total++;
    
    if (row.status === 'imported') {
      progress.imported++;
    } else if (row.status === 'pending') {
      progress.pending++;
    }
  });

  return Array.from(folders_map.values()).sort((a, b) => 
    a.folder.localeCompare(b.folder)
  );
}
