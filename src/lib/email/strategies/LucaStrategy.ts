/**
 * Luca Strategy - Zero Liste
 * Strategia download email SENZA dipendenza da email_temp_index
 * 
 * PRINCIPIO:
 * - Lista folder hardcoded (INBOX, Sent, etc.)
 * - Query veloce MAX(uid) su email_messages per folder
 * - Download batch incrementale da MAX+1
 * - Stop dopo 3 batch vuoti consecutivi
 * 
 * VANTAGGI:
 * - Zero query preventive su email_temp_index
 * - Avvio immediato (~50ms vs 3-5s)
 * - Perfetto per sync incrementali quotidiane
 */

import type { 
  DownloadStrategy, 
  FolderToSync, 
  DownloadProgress, 
  LogEntry, 
  DownloadResult 
} from './DownloadStrategy';
import { downloadEmailBatch } from '@/lib/email/email-downloader';
import { getMaxUID } from '@/lib/email/services/UIDRangeService';

// ✅ Folder hardcoded - zero DB query
const DEFAULT_FOLDERS = [
  'INBOX',
  'Sent',
  'Drafts',
  'Trash',
  'Junk',
  'Archive'
];

export class LucaStrategy implements DownloadStrategy {
  name = 'Luca Method (Zero Lists)';
  description = 'Downloads from MAX(uid)+1 with zero temp_index queries. Hardcoded folders, batch download, auto-stop after 3 empty batches.';

  private readonly BATCH_SIZE = 25;
  private readonly MAX_EMPTY_BATCHES = 3;

  /**
   * Esegue download incrementale SENZA liste preparate
   */
  async execute(
    folders: FolderToSync[], // ✅ Accetta lista cartelle custom
    userEmail: string,
    onProgress: (progress: DownloadProgress) => void,
    onLog: (log: Omit<LogEntry, 'timestamp'>) => void,
    shouldStop: () => boolean
  ): Promise<DownloadResult> {
    
    let totalDownloaded = 0;
    let totalErrors = 0;
    let foldersCompleted = 0;

    // ✅ Usa cartelle custom se fornite, altrimenti hardcoded
    const foldersToProcess = folders.length > 0 
      ? folders.map(f => f.folderName)
      : DEFAULT_FOLDERS;

    onLog({ 
      phase: 'preparing', 
      message: `🚀 Luca Method: Zero lists, direct download from MAX(uid)+1` 
    });

    onLog({
      phase: 'preparing',
      message: `📂 Folders to process: ${foldersToProcess.join(', ')}`
    });

    // ✅ Loop su folder (custom o hardcoded)
    for (const folderName of foldersToProcess) {
      
      // Check stop flag
      if (shouldStop()) {
        onLog({ phase: 'warning', message: '🛑 Stop requested by user' });
        break;
      }

      onLog({
        phase: 'preparing',
        folder: folderName,
        message: `📁 Processing folder: ${folderName}`
      });

      try {
        // ✅ Smart startUID: usa custom se fornito, altrimenti calcola da MAX(uid)
        const folderConfig = folders.find(f => f.folderName === folderName);
        let startUID: number;

        if (folderConfig?.startUID !== undefined) {
          // Usa startUID fornito da Smart Preparation
          startUID = folderConfig.startUID;
          onLog({
            phase: 'preparing',
            folder: folderName,
            message: `  ├─ 🎯 Smart start from UID ${startUID} (${folderConfig.pending} pending)`
          });
        } else {
          // Fallback: logica originale
          const maxUID = await getMaxUID(folderName, userEmail);
          startUID = maxUID === null ? 1 : maxUID + 1;

          if (maxUID === null) {
            onLog({
              phase: 'preparing',
              folder: folderName,
              message: `  ├─ Empty folder, starting from UID 1`
            });
          } else {
            onLog({
              phase: 'preparing',
              folder: folderName,
              message: `  ├─ MAX(uid) = ${maxUID}, starting from UID ${startUID}`
            });
          }
        }

        // ✅ Loop batch incrementale
        let currentUID = startUID;
        let emptyBatchesCount = 0;
        let folderDownloaded = 0;
        let folderErrors = 0;
        let batchNumber = 0;

        while (emptyBatchesCount < this.MAX_EMPTY_BATCHES) {
          
          // Check stop flag
          if (shouldStop()) {
            onLog({ phase: 'warning', message: '🛑 Stop requested during batch processing' });
            break;
          }

          batchNumber++;

          // ✅ Genera batch UIDs (NO QUERY, solo aritmetica)
          const batchUIDs: number[] = [];
          for (let i = 0; i < this.BATCH_SIZE; i++) {
            batchUIDs.push(currentUID + i);
          }

          onLog({
            phase: 'importing',
            folder: folderName,
            message: `  ├─ Batch ${batchNumber}: UIDs ${batchUIDs[0]}-${batchUIDs[batchUIDs.length - 1]}`
          });

          // ✅ Download batch (downloadEmailBatch già salva in DB e gestisce duplicati)
          const { downloaded, errors } = await downloadEmailBatch(
            batchUIDs,
            folderName,
            userEmail,
            {},
            (folder, imported, total) => {
              onProgress({
                current_folder: folder,
                current_batch: batchNumber,
                imported: totalDownloaded + imported,
                total: totalDownloaded + total,
                errors: totalErrors + folderErrors
              });
            }
          );

          folderDownloaded += downloaded;
          folderErrors += errors;
          totalDownloaded += downloaded;
          totalErrors += errors;

          // ✅ Se batch vuoto → incrementa counter
          if (downloaded === 0) {
            emptyBatchesCount++;
            onLog({
              phase: 'skip',
              folder: folderName,
              message: `  ├─ Batch ${batchNumber} empty (${emptyBatchesCount}/${this.MAX_EMPTY_BATCHES})`
            });
          } else {
            // Reset counter se troviamo email
            emptyBatchesCount = 0;
            onLog({
              phase: 'importing',
              folder: folderName,
              message: `  ├─ Batch ${batchNumber}: ${downloaded} downloaded${errors > 0 ? ` (${errors} errors)` : ''}`
            });
          }

          // Update progress
          onProgress({
            current_folder: folderName,
            current_batch: batchNumber,
            imported: totalDownloaded,
            total: totalDownloaded, // Con Luca non sappiamo il totale preciso
            errors: totalErrors
          });

          // Move to next batch
          currentUID += this.BATCH_SIZE;

          // Small delay to avoid hammering the API
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // ✅ Folder completato
        foldersCompleted++;
        
        if (folderDownloaded > 0) {
          onLog({
            phase: 'completed',
            folder: folderName,
            message: `  └─ ✅ Completed: ${folderDownloaded} emails downloaded${folderErrors > 0 ? ` (${folderErrors} errors)` : ''}`
          });
        } else {
          onLog({
            phase: 'skip',
            folder: folderName,
            message: `  └─ ⏭️  No new emails found (stopped after ${this.MAX_EMPTY_BATCHES} empty batches)`
          });
        }

      } catch (error: any) {
        onLog({
          phase: 'error',
          folder: folderName,
          message: `  └─ ❌ Error processing folder: ${error.message}`
        });
        totalErrors++;
      }
    }

    return {
      total_downloaded: totalDownloaded,
      total_errors: totalErrors,
      folders_completed: foldersCompleted
    };
  }
}
