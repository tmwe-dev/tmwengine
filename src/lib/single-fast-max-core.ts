/**
 * SINGLE FAST MAX - ORCHESTRATOR
 * Coordina il processo di download massivo di email
 * Architettura modulare con dependency injection
 */

import { fetchUIDsFromTempIndex } from '@/lib/single-fast-core';
import { downloadEmailBatch } from '@/lib/email/email-downloader';
import type { DownloadConfig } from '@/lib/email/email-downloader';

// Re-export types e funzioni repository per backward compatibility
export { getFoldersProgress } from '@/lib/email/email-repository';
export type { FolderProgress } from '@/lib/email/email-repository';

export interface DanceProgress {
  phase: 'fetching_uids' | 'downloading_emails' | 'completed';
  current_batch: number;
  total_processed: number;
  current_email?: string;
  current_uid?: string;
}

interface ProcessConfig extends DownloadConfig {
  batch_size?: number;
  batch_delay_ms?: number;
}

const DEFAULT_PROCESS_CONFIG: Required<ProcessConfig> = {
  batch_size: 50,
  batch_delay_ms: 500,
  max_retries: 2,
  retry_delay_ms: 1000,
  max_concurrent: 3,
};

/**
 * Processa una cartella con download massivo parallelizzato
 * 
 * @param user_email - Email dell'utente
 * @param folder - Nome della cartella da processare
 * @param config - Configurazione personalizzata (opzionale)
 * @param onProgress - Callback per aggiornamenti di progresso
 * @returns Statistiche del download
 */
export async function processFolderWithDance(
  user_email: string,
  folder: string,
  config: ProcessConfig = {},
  onProgress?: (folder: string, imported: number, total: number) => void
): Promise<{ total_downloaded: number; errors: number }> {
  
  const full_config = { ...DEFAULT_PROCESS_CONFIG, ...config };
  
  console.log(`[processFolderWithDance] 🚀 START: ${folder}`);
  console.log(`[processFolderWithDance] Config:`, full_config);

  let total_downloaded = 0;
  let total_errors = 0;

  try {
    // 1. Recupera UIDs pending da email_temp_index (nessuna chiamata API)
    console.log(`[processFolderWithDance] 📦 Fetching pending UIDs from email_temp_index...`);
    
    const pending_uids_str = await fetchUIDsFromTempIndex(folder, user_email);
    const pending_uids = pending_uids_str.map(uid => parseInt(uid, 10));

    console.log(`[processFolderWithDance] ✅ Found ${pending_uids.length} pending UIDs`);

    if (pending_uids.length === 0) {
      console.log(`[processFolderWithDance] ✅ No pending UIDs for ${folder}`);
      return { total_downloaded: 0, errors: 0 };
    }

    // 2. Processa in batch
    const total_batches = Math.ceil(pending_uids.length / full_config.batch_size);

    for (let batch_idx = 0; batch_idx < total_batches; batch_idx++) {
      const start = batch_idx * full_config.batch_size;
      const end = Math.min(start + full_config.batch_size, pending_uids.length);
      const batch_uids = pending_uids.slice(start, end);

      console.log(`[processFolderWithDance] 📦 Batch ${batch_idx + 1}/${total_batches}: Processing ${batch_uids.length} UIDs`);

      try {
        // ✅ Metadata già in email_temp_index, download diretto
        console.log(`[processFolderWithDance] ✅ Metadata già presente, skip fetch`);

        // 3. Download parallelo tramite email-downloader
        console.log(`[processFolderWithDance] 📥 Downloading ${batch_uids.length} emails (${full_config.max_concurrent} concurrent)...`);
        
        const { downloaded, errors } = await downloadEmailBatch(
          batch_uids,
          folder,
          user_email,
          full_config,
          onProgress
        );
        
        total_downloaded += downloaded;
        total_errors += errors;

        console.log(`[processFolderWithDance] ✅ Batch ${batch_idx + 1}: ${downloaded} downloaded, ${errors} errors`);

        // Pausa tra batch
        if (batch_idx < total_batches - 1) {
          await new Promise(resolve => setTimeout(resolve, full_config.batch_delay_ms));
        }

      } catch (error: any) {
        console.error(`[processFolderWithDance] ❌ Batch ${batch_idx + 1} error:`, error.message);
        total_errors++;
      }
    }

  } catch (error: any) {
    console.error(`[processFolderWithDance] ❌ Error:`, error.message);
    total_errors++;
  }

  console.log(`[processFolderWithDance] 🎉 COMPLETE: ${folder} (${total_downloaded} downloaded, ${total_errors} errors)`);
  
  return { 
    total_downloaded, 
    errors: total_errors 
  };
}
