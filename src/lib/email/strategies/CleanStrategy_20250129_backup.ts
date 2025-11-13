/**
 * Clean Download Strategy
 * Strategia per riempire i "buchi" nel database
 * Confronta UIDs nel DB vs UIDs nell'API e scarica solo i mancanti
 */

import type { 
  DownloadStrategy,
  StrategyConfig,
  FolderToSync, 
  DownloadProgress, 
  DownloadResult 
} from './DownloadStrategy';
import { downloadEmailBatch } from '@/lib/email/email-downloader';
import { 
  getMinMaxUID, 
  findMissingUIDs 
} from '../services/UIDRangeService';

// ✅ Default folders fallback (hardcoded, no DB dependency)
const DEFAULT_FOLDERS = ['INBOX', 'Sent', 'Drafts', 'Trash', 'Junk', 'Archive'];

export class CleanStrategy implements DownloadStrategy {
  name = 'Clean';
  description = 'Finds and fills gaps (missing UIDs) in the database';
  
  private readonly config: StrategyConfig;

  constructor(config: StrategyConfig) {
    this.config = config;
  }

  async execute(
    folders: FolderToSync[],
    userEmail: string,
    onProgress: (progress: DownloadProgress) => void,
    onLog: (log: any) => void,
    shouldStop: () => boolean
  ): Promise<DownloadResult> {
    
    // ✅ If no folders provided, use hardcoded list
    const foldersToClean = folders.length > 0 
      ? folders 
      : DEFAULT_FOLDERS.map(name => ({ 
          folderName: name, 
          pending: 0, 
          included: true 
        }));
    
    let totalDownloaded = 0;
    let totalErrors = 0;
    let foldersCompleted = 0;

    onLog({ 
      phase: 'preparing', 
      message: `🧹 Clean strategy: filling gaps for ${foldersToClean.length} folders` 
    });

    for (let i = 0; i < foldersToClean.length; i++) {
      if (shouldStop()) {
        onLog({ phase: 'error', message: '🛑 Clean stopped by user' });
        break;
      }

      const folder = foldersToClean[i];
      
      onLog({
        phase: 'preparing',
        folder: folder.folderName,
        message: `🔍 [${i + 1}/${foldersToClean.length}] Analyzing folder: ${folder.folderName}`
      });

      try {
        // 1. Get MIN/MAX range from database
        const range = await getMinMaxUID(folder.folderName, userEmail);
        
        if (!range) {
          onLog({
            phase: 'skip',
            folder: folder.folderName,
            message: `⏭️ Folder is empty, nothing to clean`
          });
          foldersCompleted++;
          continue;
        }

        onLog({
          phase: 'preparing',
          folder: folder.folderName,
          message: `📊 Database range: ${range.min_uid} → ${range.max_uid}`
        });

        // 2. Find missing UIDs using database query (no API calls!)
        onLog({
          phase: 'preparing',
          folder: folder.folderName,
          message: `🔍 Analyzing gaps in database...`
        });

        const missingUIDs = await findMissingUIDs(folder.folderName, userEmail);

        if (missingUIDs.length === 0) {
          onLog({
            phase: 'completed',
            folder: folder.folderName,
            message: `✅ No gaps found, folder is complete`
          });
          foldersCompleted++;
          continue;
        }

        const totalRange = range.max_uid - range.min_uid + 1;
        const gapPercentage = ((missingUIDs.length / totalRange) * 100).toFixed(1);

        onLog({
          phase: 'warning',
          folder: folder.folderName,
          message: `🕳️ Found ${missingUIDs.length} gaps (${gapPercentage}% of range ${range.min_uid}-${range.max_uid})`
        });

        // 3. Download missing UIDs in batches
        let folderDownloaded = 0;
        let folderErrors = 0;

        for (let j = 0; j < missingUIDs.length; j += this.config.batch_size) {
          if (shouldStop()) {
            onLog({ phase: 'error', message: '🛑 Download interrupted' });
            break;
          }

          const batchUIDs = missingUIDs.slice(j, j + this.config.batch_size);

          onLog({
            phase: 'importing',
            folder: folder.folderName,
            message: `📦 Filling gaps: batch ${Math.floor(j / this.config.batch_size) + 1}/${Math.ceil(missingUIDs.length / this.config.batch_size)}`
          });

          const { downloaded, errors } = await downloadEmailBatch(
            batchUIDs,
            folder.folderName,
            userEmail,
            { 
              max_concurrent: this.config.max_concurrent || 8, 
              max_retries: 2, 
              retry_delay_ms: this.config.min_delay_ms || 300 
            },
            (folder, imported, total) => {
              onProgress({
                current_folder: folder,
                imported: totalDownloaded + imported,
                total: totalDownloaded + missingUIDs.length,
                errors: totalErrors + folderErrors
              });
            }
          );

          folderDownloaded += downloaded;
          folderErrors += errors;

          onLog({
            phase: 'importing',
            folder: folder.folderName,
            message: `✅ Progress: ${folderDownloaded}/${missingUIDs.length} gaps filled`,
            count: { current: folderDownloaded, total: missingUIDs.length }
          });

          // Small delay between batches
          await new Promise(resolve => setTimeout(resolve, this.config.min_delay_ms || 150));
        }

        totalDownloaded += folderDownloaded;
        totalErrors += folderErrors;
        foldersCompleted++;
        
        onLog({
          phase: 'completed',
          folder: folder.folderName,
          message: `✅ Folder cleaned: ${folderDownloaded}/${missingUIDs.length} gaps filled${folderErrors > 0 ? ` (${folderErrors} errors)` : ''}`
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
