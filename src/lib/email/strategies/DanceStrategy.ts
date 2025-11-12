/**
 * Dance Download Strategy
 * Strategia "danza": alterna fetch UIDs e download in batch piccoli
 * Velocità massima, memory-efficient, ideale per folder con migliaia di email
 */

import type { DownloadStrategy, FolderToSync, DownloadProgress, DownloadResult } from './DownloadStrategy';

export class DanceStrategy implements DownloadStrategy {
  name = 'Dance';
  description = 'Alternates UIDs fetching and download in small batches (fastest, memory-efficient)';
  
  private readonly BATCH_SIZE = 50; // UIDs per batch
  private readonly DOWNLOAD_THROTTLE_MS = 200; // Throttle tra batch

  async execute(
    folders: FolderToSync[],
    userEmail: string,
    onProgress: (progress: DownloadProgress) => void,
    onLog: (log: any) => void,
    shouldStop: () => boolean
  ): Promise<DownloadResult> {
    
    const { processFolderWithDance } = await import('@/lib/single-fast-max-core');
    
    let totalDownloaded = 0;
    let totalErrors = 0;
    let foldersCompleted = 0;

    onLog({ 
      phase: 'preparing', 
      message: `💃 Dance strategy: processing ${folders.length} folders in ${this.BATCH_SIZE}-email batches` 
    });

    for (let i = 0; i < folders.length; i++) {
      if (shouldStop()) {
        onLog({ phase: 'error', message: '🛑 Dance download stopped by user' });
        break;
      }

      const folder = folders[i];
      
      onLog({
        phase: 'preparing',
        folder: folder.folderName,
        message: `🔍 [${i + 1}/${folders.length}] Processing folder: ${folder.folderName}`
      });

      try {
        onLog({
          phase: 'importing',
          folder: folder.folderName,
          message: `📧 Starting dance mode (fetch ${this.BATCH_SIZE} → download → repeat)`
        });

        let batchNumber = 0;
        let folderSuccessCount = 0;
        let folderErrorCount = 0;

        // Usa processFolderWithDance dal core module
        const result = await processFolderWithDance(
          userEmail,
          folder.folderName,
          { batch_size: this.BATCH_SIZE },
          2,
          (folderName, downloaded, total) => {
            folderSuccessCount = downloaded;

            onProgress({
              current_folder: folder.folderName,
              current_batch: Math.ceil(downloaded / this.BATCH_SIZE),
              imported: totalDownloaded + downloaded,
              total: folders.reduce((sum, f) => sum + f.pending, 0),
              errors: totalErrors + folderErrorCount
            });

            if (downloaded % 10 === 0) { // Log ogni 10 email
              onLog({
                phase: 'importing',
                folder: folder.folderName,
                message: `💃 [Dance] Batch: ${downloaded}/${total} emails`,
                count: { current: downloaded, total }
              });
            }
          }
        );

        totalDownloaded += result.total_downloaded;
        totalErrors += result.errors;
        foldersCompleted++;
        
        onLog({
          phase: 'completed',
          folder: folder.folderName,
          message: `✅ Folder completed: ${result.total_downloaded} emails${result.errors > 0 ? ` (${result.errors} errors)` : ''}`
        });

        // Throttle tra cartelle
        if (i < folders.length - 1) {
          await new Promise(resolve => setTimeout(resolve, this.DOWNLOAD_THROTTLE_MS));
        }

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
