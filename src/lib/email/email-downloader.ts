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
      // ✅ Scarica email COMPLETA con body (include_body: true)
      const email = await emailMessageApi.getMessage(uid, folder, false, true);
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
  config: DownloadConfig = {},
  onProgress?: (imported: number) => void
): Promise<boolean> {
  const full_config = { ...DEFAULT_CONFIG, ...config };
  const message_id = `${folder}/${uid}`;
  const uid_str = String(uid);
  
  try {
    // 1. Scarica dalla API con retry
    const api_email = await fetchEmailWithRetry(uid_str, folder, full_config);
    
    if (!api_email) {
      console.warn(`[downloadSingleEmail] No data for UID ${uid} after retries`);
      return false;
    }
    
    // 2. Normalizza email
    const normalized = normalizeEmailMessage(api_email);
    
    // 3. Valida dati minimi
    if (!validateNormalizedEmail(normalized)) {
      console.error(`[downloadSingleEmail] ⚠️ UID ${uid}: API returned incomplete data`);
      return false;
    }
    
    // 4. ✅ CHECK DOPO FETCH (quando hai già i dati)
    const exists = await checkEmailExists(message_id, user_email);
    if (exists) {
      console.log(`[downloadSingleEmail] ✅ UID ${uid} already exists, skipping`);
      await updateTempIndexStatus(uid_str, folder, user_email, 'imported');
      return false;
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
      return false;
    }
    
    // 6. Aggiorna temp_index
    await updateTempIndexStatus(uid_str, folder, user_email, 'imported');
    
    // 7. Notifica progresso
    if (onProgress) {
      onProgress(1);
    }
    
    return true;
    
  } catch (error: any) {
    console.error(`[downloadSingleEmail] Error UID ${uid}:`, error.message);
    return false;
  }
}

/**
 * Scarica un batch di email in parallelo
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
  let total_errors = 0;
  
  // Download parallelo con controllo concorrenza
  for (let i = 0; i < uids.length; i += full_config.max_concurrent) {
    const chunk = uids.slice(i, i + full_config.max_concurrent);
    
    const results = await Promise.all(
      chunk.map(uid => 
        downloadSingleEmail(uid, folder, user_email, config, (imported) => {
          total_imported += imported;
          if (onProgress) {
            onProgress(folder, total_imported, uids.length);
          }
        })
      )
    );
    
    total_errors += results.filter(r => !r).length;
  }
  
  return { 
    downloaded: total_imported, 
    errors: total_errors 
  };
}
