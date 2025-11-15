/**
 * Simple Email Downloader
 * Metodo alternativo affidabile per download email senza dipendenze da UID range
 * 
 * VANTAGGI:
 * - Usa Elasticsearch (emailSearchApi) per lista metadata
 * - Scarica solo email mancanti (check message_id)
 * - Funziona anche con UIDs sparsi (1, 5, 100, 999)
 * - Sort per data (ultime email prima)
 * - Nessuna dipendenza da temp_index o UID lineari
 * 
 * USO:
 * import { simpleDownloadFolder } from '@/lib/email/simple-downloader';
 * await simpleDownloadFolder('INBOX', 'user@example.com', 100);
 */

import { emailSearchApi } from '@/lib/tmwe-email-search-api';
import { emailMessageApi } from '@/lib/tmwe-api-integrated';
import { normalizeEmailMessage } from '@/lib/email/email-mapper';
import { saveEmailToDatabase, checkEmailExists } from '@/lib/email/email-repository';

export interface SimpleDownloadResult {
  downloaded: number;
  errors: number;
  skipped: number;
  total_checked: number;
}

export interface SimpleDownloadOptions {
  /** Numero massimo email da processare */
  limit?: number;
  /** Callback per progress updates */
  onProgress?: (current: number, total: number) => void;
  /** Callback per log messages */
  onLog?: (message: string) => void;
}

/**
 * Scarica email da una cartella usando metadata list + download body
 * @param folder Nome cartella (es. "INBOX", "Sent")
 * @param user_email Email utente TMWE
 * @param options Opzioni download
 * @returns Risultato con statistiche download
 */
export async function simpleDownloadFolder(
  folder: string,
  user_email: string,
  options: SimpleDownloadOptions = {}
): Promise<SimpleDownloadResult> {
  
  const {
    limit = 50,
    onProgress,
    onLog
  } = options;

  const log = (msg: string) => {
    console.log(`[SimpleDownload] ${msg}`);
    onLog?.(msg);
  };

  log(`📁 ${folder}: Fetching metadata (limit: ${limit})...`);

  try {
    // 1. Lista email con metadata (NO body) usando Elasticsearch
    const response = await emailSearchApi.getEmailsMetadata({
      folder,
      limit
    });

    const emails = response?.emails || [];
    log(`📋 Found ${emails.length} emails on server`);

    if (emails.length === 0) {
      log(`✅ No emails found in ${folder}`);
      return {
        downloaded: 0,
        errors: 0,
        skipped: 0,
        total_checked: 0
      };
    }

    let downloaded = 0;
    let errors = 0;
    let skipped = 0;

    // 2. Per ogni email, scarica body e salva
    for (let i = 0; i < emails.length; i++) {
      const metadata = emails[i];
      const uid = metadata.uid;
      const message_id = `${folder}/${uid}`;

      // Progress callback
      onProgress?.(i + 1, emails.length);

      try {
        // 2a. Check duplicato (message_id composito)
        const exists = await checkEmailExists(message_id, user_email);
        if (exists) {
          skipped++;
          log(`  ├─ ⏭️  UID ${uid}: Already exists (${i + 1}/${emails.length})`);
          continue;
        }

        // 2b. Download full email con body
        const fullEmail = await emailMessageApi.getMessage(uid, folder, false);

        if (!fullEmail || !fullEmail.data) {
          errors++;
          log(`  ├─ ❌ UID ${uid}: Empty response (${i + 1}/${emails.length})`);
          continue;
        }

        // 2c. Normalizza struttura
        const normalized = normalizeEmailMessage(fullEmail, String(uid), folder);

        // 2d. Salva in DB
        const result = await saveEmailToDatabase(normalized, message_id, user_email, folder);

        if (result.success) {
          downloaded++;
          log(`  ├─ ✅ UID ${uid}: Saved (${i + 1}/${emails.length})`);
        } else {
          errors++;
          log(`  ├─ ❌ UID ${uid}: Save failed - ${result.error} (${i + 1}/${emails.length})`);
        }

      } catch (error: any) {
        errors++;
        log(`  ├─ ❌ UID ${uid}: ${error.message} (${i + 1}/${emails.length})`);
      }
    }

    log(`✅ ${folder} completed: ${downloaded} downloaded, ${skipped} skipped, ${errors} errors`);

    return {
      downloaded,
      errors,
      skipped,
      total_checked: emails.length
    };

  } catch (error: any) {
    log(`❌ Failed to fetch metadata: ${error.message}`);
    throw error;
  }
}

/**
 * Scarica email da multiple cartelle in sequenza
 * @param folders Array nomi cartelle
 * @param user_email Email utente TMWE
 * @param options Opzioni download
 * @returns Risultato aggregato
 */
export async function simpleDownloadMultipleFolders(
  folders: string[],
  user_email: string,
  options: SimpleDownloadOptions = {}
): Promise<SimpleDownloadResult> {
  
  let totalDownloaded = 0;
  let totalErrors = 0;
  let totalSkipped = 0;
  let totalChecked = 0;

  const log = options.onLog || ((msg: string) => console.log(`[SimpleDownload] ${msg}`));

  log(`🚀 Starting download for ${folders.length} folders`);

  for (const folder of folders) {
    try {
      const result = await simpleDownloadFolder(folder, user_email, options);
      totalDownloaded += result.downloaded;
      totalErrors += result.errors;
      totalSkipped += result.skipped;
      totalChecked += result.total_checked;
    } catch (error: any) {
      log(`❌ Folder ${folder} failed: ${error.message}`);
      totalErrors++;
    }
  }

  log(`🎉 All folders completed: ${totalDownloaded} downloaded, ${totalSkipped} skipped, ${totalErrors} errors`);

  return {
    downloaded: totalDownloaded,
    errors: totalErrors,
    skipped: totalSkipped,
    total_checked: totalChecked
  };
}
