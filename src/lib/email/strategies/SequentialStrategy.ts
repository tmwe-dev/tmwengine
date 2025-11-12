/**
 * Sequential Download Strategy
 * Strategia classica: una email alla volta con throttle 800ms
 * Più lenta ma più sicura per server IMAP instabili
 */

import type { DownloadStrategy, FolderToSync, DownloadProgress, DownloadResult } from './DownloadStrategy';

export class SequentialStrategy implements DownloadStrategy {
  name = 'Sequential';
  description = 'Classic sequential download (800ms throttle per email)';
  
  private readonly THROTTLE_MS = 800;

  async execute(
    folders: FolderToSync[],
    userEmail: string,
    onProgress: (progress: DownloadProgress) => void,
    onLog: (log: any) => void,
    shouldStop: () => boolean
  ): Promise<DownloadResult> {
    
    const { fetchUIDsFromTempIndex, importEmailFromTempIndex } = await import('@/lib/single-fast-core');
    
    let totalDownloaded = 0;
    let totalErrors = 0;
    let foldersCompleted = 0;

    onLog({ phase: 'preparing', message: `🐌 Sequential strategy: processing ${folders.length} folders` });

    for (let i = 0; i < folders.length; i++) {
      if (shouldStop()) {
        onLog({ phase: 'error', message: '🛑 Sequential download stopped by user' });
        break;
      }

      const folder = folders[i];
      
      onLog({
        phase: 'preparing',
        folder: folder.folderName,
        message: `🔍 [${i + 1}/${folders.length}] Processing folder: ${folder.folderName}`
      });

      try {
        // Fetch UIDs da temp index
        const uids = await fetchUIDsFromTempIndex(folder.folderName, userEmail);

        if (uids.length === 0) {
          onLog({
            phase: 'completed',
            folder: folder.folderName,
            message: `✅ No emails to import`
          });
          foldersCompleted++;
          continue;
        }

        onLog({
          phase: 'importing',
          folder: folder.folderName,
          message: `📧 Starting sequential import of ${uids.length} emails`
        });

        let successCount = 0;
        let errorCount = 0;

        // Import sequenziale con throttle
        for (let j = 0; j < uids.length; j++) {
          if (shouldStop()) {
            onLog({ phase: 'error', message: '🛑 Import interrupted' });
            break;
          }

          const uid = uids[j];

          try {
            await importEmailFromTempIndex(uid, folder.folderName, userEmail);
            successCount++;
            totalDownloaded++;

            onProgress({
              current_folder: folder.folderName,
              imported: totalDownloaded,
              total: folders.reduce((sum, f) => sum + f.pending, 0),
              errors: totalErrors
            });

            if (j % 5 === 0) { // Log ogni 5 email
              onLog({
                phase: 'importing',
                folder: folder.folderName,
                message: `✅ [Sequential] ${successCount}/${uids.length} imported`,
                count: { current: successCount, total: uids.length }
              });
            }

            // Throttle tra email
            await new Promise(resolve => setTimeout(resolve, this.THROTTLE_MS));

          } catch (err: any) {
            errorCount++;
            totalErrors++;
            console.error(`Sequential error importing UID ${uid}:`, err);
            
            onLog({
              phase: 'skip',
              folder: folder.folderName,
              message: `⚠️ Skip UID ${uid}: ${err.message}`
            });
          }
        }

        foldersCompleted++;
        
        onLog({
          phase: 'completed',
          folder: folder.folderName,
          message: `✅ Folder completed: ${successCount}/${uids.length} emails${errorCount > 0 ? ` (${errorCount} errors)` : ''}`
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
