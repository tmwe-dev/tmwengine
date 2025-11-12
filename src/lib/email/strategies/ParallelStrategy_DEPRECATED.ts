/**
 * Parallel Download Strategy
 * Strategia parallela: N download simultanei con ParallelDownloadController
 * Velocità 5-10x rispetto a Sequential, configurabile tramite performance profiles
 */

import type { DownloadStrategy, FolderToSync, DownloadProgress, DownloadResult } from './DownloadStrategy';
import { ParallelDownloadController } from '@/lib/parallel-download-controller';

export class ParallelStrategy implements DownloadStrategy {
  name = 'Parallel';
  description = 'Parallel download with configurable concurrency';
  
  private controller: ParallelDownloadController;

  constructor(
    private maxConcurrent: number = 10,
    private minDelay: number = 50
  ) {
    this.controller = new ParallelDownloadController(maxConcurrent, minDelay);
  }

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

    onLog({ 
      phase: 'preparing', 
      message: `⚡ Parallel strategy: ${this.maxConcurrent} concurrent downloads, ${folders.length} folders` 
    });

    for (let i = 0; i < folders.length; i++) {
      if (shouldStop()) {
        onLog({ phase: 'error', message: '🛑 Parallel download stopped by user' });
        this.controller.cancel();
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
          message: `📧 Starting parallel import of ${uids.length} emails (max ${this.maxConcurrent} concurrent)`
        });

        let successCount = 0;
        let errorCount = 0;

        // Import parallelo con controller
        for (let j = 0; j < uids.length; j++) {
          if (shouldStop()) {
            onLog({ phase: 'error', message: '🛑 Import interrupted, cancelling downloads...' });
            this.controller.cancel();
            break;
          }

          const uid = uids[j];

          // Usa controller per gestire concorrenza
          this.controller.download(async () => {
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

              if (successCount % 5 === 0) { // Log ogni 5 email
                const stats = this.controller.getStats();
                onLog({
                  phase: 'importing',
                  folder: folder.folderName,
                  message: `✅ [Parallel] ${successCount}/${uids.length} (active: ${stats.active}, queued: ${stats.queued})`,
                  count: { current: successCount, total: uids.length }
                });
              }

            } catch (err: any) {
              errorCount++;
              totalErrors++;
              console.error(`Parallel error importing UID ${uid}:`, err);
              
              onLog({
                phase: 'skip',
                folder: folder.folderName,
                message: `⚠️ Skip UID ${uid}: ${err.message}`
              });
            }
          });
        }

        // Attendi completamento parallelo
        while (this.controller.getStats().active > 0 || this.controller.getStats().queued > 0) {
          if (shouldStop()) {
            this.controller.cancel();
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 500));
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
