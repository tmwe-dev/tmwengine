/**
 * EMAIL DOWNLOADER
 * Gestisce il download di email dall'API TMWE con retry logic
 * Dependency injection per testabilità
 */

import { emailMessageApi } from '@/lib/tmwe-api-integrated';
import { normalizeEmailMessage, validateNormalizedEmail } from './email-mapper';
import { 
  checkEmailExists, 
  saveEmailToDatabase, 
  updateTempIndexStatus 
} from './email-repository';

export interface DownloadConfig {
  max_retries?: number;
  retry_delay_ms?: number;
  max_concurrent?: number;
}

const DEFAULT_CONFIG: Required<DownloadConfig> = {
  max_retries: 2,
  retry_delay_ms: 1000,
  max_concurrent: 3,
};

/**
 * Scarica una singola email dall'API con retry logic
 */
async function fetchEmailWithRetry(
  uid: string,
  folder: string,
  config: Required<DownloadConfig>
): Promise<any> {
  let retries = 0;
  let last_error: Error | null = null;
  
  while (retries <= config.max_retries) {
    try {
      // ✅ Scarica email dalla API
      const email = await emailMessageApi.getMessage(uid, folder, false);
      return email;
    } catch (error: any) {
      last_error = error;
      retries++;
      
      // Retry solo per timeout
      if (error.message?.includes('timeout') && retries <= config.max_retries) {
        const delay = config.retry_delay_ms * retries;
        console.warn(`⏱️ Timeout UID ${uid}, retry ${retries}/${config.max_retries} in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      
      throw error;
    }
  }
  
  throw last_error || new Error('Max retries reached');
}

/**
 * Scarica e salva una singola email
 * 
 * @returns true se importata con successo, false altrimenti
 */
export async function downloadSingleEmail(
  uid: number,
  folder: string,
  user_email: string,
  config: DownloadConfig = {}
): Promise<{ status: 'imported' | 'skipped' | 'failed'; uid: number }> {
  const full_config = { ...DEFAULT_CONFIG, ...config };
  const message_id = `${folder}/${uid}`;
  const uid_str = String(uid);
  
  try {
    // 1. Scarica dalla API con retry
    const api_email = await fetchEmailWithRetry(uid_str, folder, full_config);
    
    if (!api_email) {
      console.warn(`[downloadSingleEmail] No data for UID ${uid} after retries`);
      return { status: 'failed', uid };
    }
    
    // ✅ Check success PRIMA di normalizzare (come nel backup)
    if (api_email.success === false) {
      const errorMsg = api_email.errors?.[0] || api_email.error || 'API error';
      console.warn(`[downloadSingleEmail] ❌ API failed for UID ${uid}: ${errorMsg}`);
      return { status: 'failed', uid };
    }
    
    // 2. Normalizza email (passa uid, folder per message_id generation)
    const normalized = normalizeEmailMessage(api_email, uid_str, folder);
    
    // 3. Valida dati minimi
    if (!validateNormalizedEmail(normalized)) {
      console.error(`[downloadSingleEmail] ⚠️ UID ${uid}: API returned incomplete data`);
      return { status: 'failed', uid };
    }
    
    // 4. ✅ CHECK DOPO FETCH (quando hai già i dati)
    const exists = await checkEmailExists(message_id, user_email);
    if (exists) {
      console.log(`[downloadSingleEmail] ✅ UID ${uid} already exists, skipping`);
      await updateTempIndexStatus(uid_str, folder, user_email, 'imported');
      return { status: 'skipped', uid };
    }
    
    console.log(`[downloadSingleEmail] ✅ UID ${uid}: subject="${normalized.subject.substring(0, 50)}...", from=${normalized.from_email}`);
    
    // 5. Salva in DB
    const { success, error } = await saveEmailToDatabase(
      normalized,
      message_id,
      user_email,
      folder
    );
    
    if (!success) {
      console.error(`[downloadSingleEmail] Insert error UID ${uid}:`, error);
      return { status: 'failed', uid };
    }
    
    // 6. Aggiorna temp_index
    await updateTempIndexStatus(uid_str, folder, user_email, 'imported');
    
    return { status: 'imported', uid };
    
  } catch (error: any) {
    console.error(`[downloadSingleEmail] Error UID ${uid}:`, error.message);
    return { status: 'failed', uid };
  }
}

/**
 * Scarica un batch di email usando API batch (una chiamata per multiple email)
 * ✅ Fix timeout: usa getMessagesBatch invece di N chiamate singole
 */
export async function downloadEmailBatch(
  uids: number[],
  folder: string,
  user_email: string,
  config: DownloadConfig = {},
  onProgress?: (folder: string, imported: number, total: number) => void
): Promise<{ downloaded: number; errors: number }> {
  const full_config = { ...DEFAULT_CONFIG, ...config };
  let total_imported = 0;
  let total_skipped = 0;
  let total_errors = 0;
  
  // ✅ Processa chunk sequenziali per controllo concorrenza
  for (let i = 0; i < uids.length; i += full_config.max_concurrent) {
    const chunk = uids.slice(i, i + full_config.max_concurrent);
    
    try {
      console.log(`[downloadEmailBatch] 📦 Downloading batch of ${chunk.length} emails from ${folder}...`);
      
      // ✅ UNA chiamata API per tutto il chunk (fix timeout)
      const batchResponse = await emailMessageApi.getMessagesBatch(
        chunk,
        folder,
        false // mark_as_read
      );
      
      // ✅ Normalizza risposta (gestisce diversi formati dalla API)
      const emails = Array.isArray(batchResponse) 
        ? batchResponse 
        : (batchResponse?.messages || batchResponse?.data || batchResponse?.emails || []);
      
      console.log(`[downloadEmailBatch] ✅ Received ${emails.length}/${chunk.length} emails from API (${chunk.length - emails.length} skipped/errors)`);
      
      // ✅ Se tutti skipped, conta come empty batch ma non errore
      if (emails.length === 0) {
        console.log(`[downloadEmailBatch] ⏭️ All ${chunk.length} UIDs skipped (non-existent or errors)`);
        continue;
      }
      
      // ✅ Processa ogni email del batch
      for (const emailData of emails) {
        const uid = emailData.uid || emailData.message?.uid;
        if (!uid) {
          console.warn(`[downloadEmailBatch] ⚠️ Email without UID, skipping`);
          total_errors++;
          continue;
        }
        
        const message_id = `${folder}/${uid}`;
        
        try {
          // Check success flag come in downloadSingleEmail
          if (emailData.success === false) {
            const errorMsg = emailData.errors?.[0] || emailData.error || 'API error';
            console.warn(`[downloadEmailBatch] ❌ API failed for UID ${uid}: ${errorMsg}`);
            total_errors++;
            continue;
          }
          
          // Normalizza email
          const normalized = normalizeEmailMessage(emailData, String(uid), folder);
          
          // Valida dati minimi
          if (!validateNormalizedEmail(normalized)) {
            console.warn(`[downloadEmailBatch] ⚠️ UID ${uid}: incomplete data`);
            total_errors++;
            continue;
          }
          
          // Check se esiste già
          const exists = await checkEmailExists(message_id, user_email);
          if (exists) {
            console.log(`[downloadEmailBatch] ⏭️ UID ${uid} already exists, skipping`);
            await updateTempIndexStatus(String(uid), folder, user_email, 'imported');
            total_skipped++;
            continue;
          }
          
          // Salva in database
          const { success, error } = await saveEmailToDatabase(
            normalized,
            message_id,
            user_email,
            folder
          );
          
          if (success) {
            console.log(`[downloadEmailBatch] ✅ UID ${uid} imported: "${normalized.subject.substring(0, 50)}..."`);
            await updateTempIndexStatus(String(uid), folder, user_email, 'imported');
            total_imported++;
          } else {
            console.error(`[downloadEmailBatch] ❌ Insert error UID ${uid}:`, error);
            total_errors++;
          }
          
        } catch (error: any) {
          console.error(`[downloadEmailBatch] ❌ Error processing UID ${uid}:`, error.message);
          total_errors++;
        }
      }
      
      // ✅ Aggiorna progresso DOPO ogni chunk
      if (onProgress) {
        onProgress(folder, total_imported, uids.length);
      }
      
    } catch (error: any) {
      console.error(`[downloadEmailBatch] ❌ Batch API error for chunk:`, error.message);
      // Tutto il chunk fallito
      total_errors += chunk.length;
    }
  }
  
  console.log(`[downloadEmailBatch] 📊 Riepilogo: ${total_imported} imported, ${total_skipped} skipped, ${total_errors} errors`);
  
  return { 
    downloaded: total_imported,
    errors: total_errors 
  };
}
