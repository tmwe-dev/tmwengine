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
  StrategyConfig,
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

  private readonly config: StrategyConfig;

  constructor(config: StrategyConfig) {
    this.config = config;
  }

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
      // Track per-folder statistics
      let folderDownloaded = 0;
      let folderErrors = 0;
      
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
          
          // ✅ Check se cartella già completamente sincronizzata
          if (folderConfig.pending === 0) {
            onLog({
              phase: 'skip',
              folder: folderName,
              message: `  └─ ⏭️  Folder already synced (${folderConfig.pending} pending)`
            });
            foldersCompleted++;
            continue;
          }
          
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
        // ✅ Loop batch incrementale (OTTIMIZZATO)
        let currentUID = startUID;
        let emptyBatchesCount = 0;
        const MAX_EMPTY_BATCHES = this.config.max_empty_batches || 5; // Aumentato da 3 a 5
        let batchNumber = 0;
        let consecutiveErrors = 0;
        const MAX_CONSECUTIVE_ERRORS = 3;

        onLog({
          phase: 'importing',
          folder: folderName,
          message: `  ├─ Starting from UID ${currentUID} with batch size ${this.config.batch_size}`
        });

        while (emptyBatchesCount < MAX_EMPTY_BATCHES && consecutiveErrors < MAX_CONSECUTIVE_ERRORS && !shouldStop()) {
          batchNumber++;
          
          // ✅ Genera array UIDs incrementali: [100, 101, 102, ...]
          const batchUIDs: number[] = [];
          for (let i = 0; i < this.config.batch_size; i++) {
            batchUIDs.push(currentUID + i);
          }

          onLog({
            phase: 'importing',
            folder: folderName,
            message: `  ├─ 📥 Batch #${batchNumber}: UIDs ${batchUIDs[0]}-${batchUIDs[batchUIDs.length - 1]}`
          });

          try {
            // ✅ Download batch
            const result = await downloadEmailBatch(
              batchUIDs,
              folderName,
              userEmail,
              {
                max_retries: 1,
                max_concurrent: 3, // Fisso a 3 per stabilità
              },
              (folder, imported, _total) => {
                onProgress({
                  current_folder: folder,
                  current_batch: batchNumber,
                  imported: totalDownloaded + imported,
                  total: totalDownloaded + imported,
                  errors: totalErrors,
                });
              }
            );

        totalDownloaded += result.downloaded;
        totalErrors += result.errors;
        folderDownloaded += result.downloaded;
        folderErrors += result.errors;

            // ✅ LOGICA MIGLIORATA: batch vuoto solo se 0 downloaded E 0 errors
            // (UIDs inesistenti ora sono gestiti come skip, non error)
            const totalProcessed = result.downloaded + result.errors;
            
            if (totalProcessed === 0) {
              // Batch completamente vuoto (tutti skip)
              emptyBatchesCount++;
              consecutiveErrors = 0; // Reset errori
              
              onLog({
                phase: 'skip',
                folder: folderName,
                message: `  ├─ ⏭️ Batch #${batchNumber} empty (${emptyBatchesCount}/${MAX_EMPTY_BATCHES})`
              });
            } else if (result.downloaded === 0 && result.errors > 0) {
              // Batch con solo errori (problematico)
              consecutiveErrors++;
              emptyBatchesCount = 0;
              
              onLog({
                phase: 'warning',
                folder: folderName,
                message: `  ├─ ⚠️ Batch #${batchNumber}: 0 imported, ${result.errors} errors (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS})`
              });
            } else {
              // Batch con successi
              emptyBatchesCount = 0;
              consecutiveErrors = 0;
              
              onLog({
                phase: 'importing',
                folder: folderName,
                message: `  ├─ ✅ Batch #${batchNumber}: ${result.downloaded} imported, ${result.errors} errors`
              });
            }

            // ✅ Incrementa currentUID per batch successivo
            currentUID += this.config.batch_size;

            // ✅ Delay tra batch (500ms per sicurezza)
            await new Promise(r => setTimeout(r, this.config.min_delay_ms || 500));

          } catch (error: any) {
            console.error(`[LucaStrategy] Batch error for ${folderName}:`, error);
            
            consecutiveErrors++;
            
            onLog({
              phase: 'error',
              folder: folderName,
              message: `  ├─ ❌ Batch #${batchNumber} exception: ${error.message} (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS})`
            });

            // Continua con batch successivo
            currentUID += this.config.batch_size;
            
            // Delay maggiore dopo errore
            await new Promise(r => setTimeout(r, 2000));
          }
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
            message: `  └─ ⏭️  No new emails found (stopped after ${this.config.max_empty_batches || 3} empty batches)`
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
