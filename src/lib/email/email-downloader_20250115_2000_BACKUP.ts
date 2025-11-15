/**
 * EMAIL DOWNLOADER - BACKUP 2025-01-15 20:00
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
    
    // 6. Aggiorna stato in temp_index
    await updateTempIndexStatus(uid_str, folder, user_email, 'imported');
    
    return { status: 'imported', uid };
  } catch (error: any) {
    console.error(`[downloadSingleEmail] Exception for UID ${uid}:`, error.message);
    return { status: 'failed', uid };
  }
}

/**
 * Scarica un batch di email in parallelo (ottimizzato)
 * 
 * STRATEGIA BATCH:
 * 1. Divide UIDs in chunks da processare concorrentemente
 * 2. Usa getMessagesBatch per ridurre chiamate API
 * 3. Normalizza e salva in DB
 * 4. Report progress durante processo
 * 
 * @param uids - Array di UIDs da scaricare
 * @param folder - Folder name (e.g., 'INBOX')
 * @param user_email - Email TMWE dell'utente
 * @param config - Configurazione download
 * @param onProgress - Callback per report progress (opzionale)
 * @returns Statistiche download
 */
export async function downloadEmailBatch(
  uids: number[],
  folder: string,
  user_email: string,
  config: DownloadConfig = {},
  onProgress?: (folder: string, imported: number, total: number) => void
): Promise<{ downloaded: number; errors: number }> {
  
  const full_config = { ...DEFAULT_CONFIG, ...config };
  
  if (uids.length === 0) {
    return { downloaded: 0, errors: 0 };
  }
  
  console.log(`[downloadEmailBatch] Starting batch download: ${uids.length} UIDs from ${folder}`);
  
  let downloaded = 0;
  let errors = 0;
  
  // ✅ Dividi in chunks per evitare sovraccarico memoria
  const chunkSize = Math.min(full_config.max_concurrent, 10); // Max 10 per chunk
  const chunks: number[][] = [];
  
  for (let i = 0; i < uids.length; i += chunkSize) {
    chunks.push(uids.slice(i, i + chunkSize));
  }
  
  console.log(`[downloadEmailBatch] Processing ${chunks.length} chunks of ${chunkSize} UIDs`);
  
  // ✅ Processa chunks sequenzialmente per evitare timeout
  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const chunk = chunks[chunkIndex];
    console.log(`[downloadEmailBatch] Processing chunk ${chunkIndex + 1}/${chunks.length} (${chunk.length} UIDs)`);
    
    try {
      // ✅ Usa getMessagesBatch (edge function ottimizzata)
      const batchResponse = await emailMessageApi.getMessagesBatch(
        chunk,
        folder,
        false
      );
      
      if (!batchResponse?.messages) {
        console.warn(`[downloadEmailBatch] No messages in batch response for chunk ${chunkIndex + 1}`);
        errors += chunk.length;
        continue;
      }
      
      // ✅ Processa ogni email del batch
      for (const apiEmail of batchResponse.messages) {
        try {
          // Estrai UID dalla risposta
          const uid = apiEmail.uid || apiEmail.message_id?.split('/').pop();
          if (!uid) {
            console.warn('[downloadEmailBatch] Email without UID, skipping');
            errors++;
            continue;
          }
          
          const message_id = `${folder}/${uid}`;
          
          // Normalizza email
          const normalized = normalizeEmailMessage(apiEmail, String(uid), folder);
          
          // Valida
          if (!validateNormalizedEmail(normalized)) {
            console.warn(`[downloadEmailBatch] Invalid email UID ${uid}`);
            errors++;
            continue;
          }
          
          // Check esistenza
          const exists = await checkEmailExists(message_id, user_email);
          if (exists) {
            console.log(`[downloadEmailBatch] ✅ UID ${uid} already exists, skipping`);
            await updateTempIndexStatus(String(uid), folder, user_email, 'imported');
            continue;
          }
          
          // Salva in DB
          const { success, error } = await saveEmailToDatabase(
            normalized,
            message_id,
            user_email,
            folder
          );
          
          if (success) {
            downloaded++;
            await updateTempIndexStatus(String(uid), folder, user_email, 'imported');
            
            // Report progress
            if (onProgress) {
              onProgress(folder, downloaded, uids.length);
            }
          } else {
            console.error(`[downloadEmailBatch] Failed to save UID ${uid}:`, error);
            errors++;
          }
          
        } catch (emailError: any) {
          console.error('[downloadEmailBatch] Error processing email:', emailError.message);
          errors++;
        }
      }
      
    } catch (chunkError: any) {
      console.error(`[downloadEmailBatch] Chunk ${chunkIndex + 1} failed:`, chunkError.message);
      errors += chunk.length;
    }
  }
  
  console.log(`[downloadEmailBatch] Completed: ${downloaded} downloaded, ${errors} errors`);
  
  return { downloaded, errors };
}
