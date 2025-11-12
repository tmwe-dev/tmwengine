/**
 * Incremental Download Strategy
 * Strategia "Metodo di Luca": scarica solo nuove email da MAX(uid) + 1 in poi
 * Zero overhead di query preventive, parte immediatamente dal download
 */

import type { 
  DownloadStrategy, 
  FolderToSync, 
  DownloadProgress, 
  DownloadResult 
} from './DownloadStrategy';
import { downloadEmailBatch } from '@/lib/email/email-downloader';
import { getMaxUID } from '../services/UIDRangeService';

export class IncrementalStrategy implements DownloadStrategy {
  name = 'Incremental';
  description = 'Downloads only new emails from MAX(uid) + 1 onwards (Metodo di Luca)';
  
  private readonly BATCH_SIZE = 25;
  private readonly MAX_EMPTY_BATCHES = 3; // Stop after 3 consecutive empty batches

  async execute(
    folders: FolderToSync[],
    userEmail: string,
    onProgress: (progress: DownloadProgress) => void,
    onLog: (log: any) => void,
    shouldStop: () => boolean
  ): Promise<DownloadResult> {
    
    let totalDownloaded = 0;
    let totalErrors = 0;
    let foldersCompleted = 0;

    onLog({ 
      phase: 'preparing', 
      message: `🚀 Incremental strategy: downloading from MAX(uid) + 1 for ${folders.length} folders` 
    });

    for (let i = 0; i < folders.length; i++) {
      if (shouldStop()) {
        onLog({ phase: 'error', message: '🛑 Incremental download stopped by user' });
        break;
      }

      const folder = folders[i];
      
      onLog({
        phase: 'preparing',
        folder: folder.folderName,
        message: `🔍 [${i + 1}/${folders.length}] Processing folder: ${folder.folderName}`
      });

      try {
        // 1. Get MAX(uid) from database
        const maxUID = await getMaxUID(folder.folderName, userEmail);
        const startUID = maxUID === null ? 1 : maxUID + 1;

        onLog({
          phase: 'preparing',
          folder: folder.folderName,
          message: `📊 Starting from UID ${startUID} (MAX in DB: ${maxUID || 'none'})`
        });

        let currentUID = startUID;
        let emptyBatchCount = 0;
        let folderDownloaded = 0;
        let folderErrors = 0;

        // 2. Loop batch incrementale
        while (emptyBatchCount < this.MAX_EMPTY_BATCHES) {
          if (shouldStop()) {
            onLog({ phase: 'error', message: '🛑 Batch interrupted' });
            break;
          }

          // Generate batch of UIDs
          const batchUIDs = Array.from(
            { length: this.BATCH_SIZE },
            (_, idx) => currentUID + idx
          );

          onLog({
            phase: 'importing',
            folder: folder.folderName,
            message: `📦 Downloading batch: UIDs ${batchUIDs[0]} → ${batchUIDs[batchUIDs.length - 1]}`
          });

          // 3. Download batch in parallel
          const { downloaded, errors } = await downloadEmailBatch(
            batchUIDs,
            folder.folderName,
            userEmail,
            { max_concurrent: 10, max_retries: 2, retry_delay_ms: 300 },
            (folder, imported, total) => {
              onProgress({
                current_folder: folder,
                imported: totalDownloaded + imported,
                total: totalDownloaded + total,
                errors: totalErrors + folderErrors
              });
            }
          );

          folderDownloaded += downloaded;
          folderErrors += errors;

          // 4. Check se batch vuoto (nessuna email scaricata)
          if (downloaded === 0) {
            emptyBatchCount++;
            onLog({
              phase: 'skip',
              folder: folder.folderName,
              message: `⏭️ Empty batch ${emptyBatchCount}/${this.MAX_EMPTY_BATCHES} (UIDs ${batchUIDs[0]}-${batchUIDs[batchUIDs.length - 1]})`
            });
          } else {
            emptyBatchCount = 0; // Reset counter
            onLog({
              phase: 'importing',
              folder: folder.folderName,
              message: `✅ Batch completed: ${downloaded} downloaded, ${errors} errors`,
              count: { current: folderDownloaded, total: folderDownloaded }
            });
          }

          // 5. Avanza al prossimo batch
          currentUID += this.BATCH_SIZE;

          // Small delay between batches
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        totalDownloaded += folderDownloaded;
        totalErrors += folderErrors;
        foldersCompleted++;
        
        onLog({
          phase: 'completed',
          folder: folder.folderName,
          message: `✅ Folder completed: ${folderDownloaded} new emails${folderErrors > 0 ? ` (${folderErrors} errors)` : ''}`
        });

      } catch (err: any) {
        totalErrors++;
        onLog({
          phase: 'error',
          folder: folder.folderName,
          message: `❌ Folder error: ${err.message}`
        });
      }
    }

    return {
      total_downloaded: totalDownloaded,
      total_errors: totalErrors,
      folders_completed: foldersCompleted
    };
  }
}
