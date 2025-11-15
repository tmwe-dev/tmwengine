/**
 * Email Download Service
 * Business logic centralized, testabile senza React
 * Gestisce orchestrazione download con strategy pattern
 */

import type { DownloadStrategy, LogEntry, DownloadProgress, FolderToSync } from '../strategies/DownloadStrategy';
import { getSingleFastFoldersFromLocal } from '@/lib/single-fast-core';

export interface EmailDownloadServiceResult {
  success: boolean;
  total_downloaded: number;
  total_errors: number;
  folders_completed: number;
}

export class EmailDownloadService {
  private shouldStopFlag = false;

  constructor(
    private strategy: DownloadStrategy,
    private userEmail: string,
    private customFolders?: string[]
  ) {}

  /**
   * Avvia processo di download
   * @param onProgress - Callback per updates progresso
   * @param onLog - Callback per logs
   */
  async start(
    onProgress: (progress: DownloadProgress) => void,
    onLog: (log: Omit<LogEntry, 'timestamp'>) => void
  ): Promise<EmailDownloadServiceResult> {
    
    this.shouldStopFlag = false;

    onLog({ 
      phase: 'preparing', 
      message: `🚀 Starting ${this.strategy.name} download for ${this.userEmail}` 
    });

    try {
      // 1. Se customFolders NON fornito, carica da preferenze DB
      let foldersToUse = this.customFolders;
      
      if (!foldersToUse || foldersToUse.length === 0) {
        const { getSyncPreferences } = await import('@/lib/email-sync-preferences');
        const prefs = await getSyncPreferences(this.userEmail);
        
        if (prefs.included_folders.length > 0) {
          foldersToUse = prefs.included_folders;
          onLog({
            phase: 'preparing',
            message: `📂 Loaded ${foldersToUse.length} folders from preferences: ${foldersToUse.join(', ')}`
          });
        } else {
          foldersToUse = ['INBOX'];
          onLog({
            phase: 'preparing',
            message: `📂 No preferences found, using default: INBOX`
          });
        }
      }

      // 2. Smart preparation: usa API esistenti per calcolare startUID corretto
      const folders = await this.prepareSmartDownload(foldersToUse);

      // Early exit se nessuna cartella da sincronizzare
      if (folders.length === 0) {
        onLog({ 
          phase: 'completed', 
          message: '✅ No emails to import' 
        });
        return {
          success: true,
          total_downloaded: 0,
          total_errors: 0,
          folders_completed: 0
        };
      }

      const totalPending = folders.reduce((sum, f) => sum + f.pending, 0);

      onLog({
        phase: 'preparing',
        message: `📋 Smart Plan: ${folders.length} folders, ${totalPending} total emails`
      });

      // Log folders to sync
      folders.forEach((f, i) => {
        onLog({
          phase: 'preparing',
          message: `  ${i + 1}. ${f.folderName} → ${f.pending} emails (start UID ${f.startUID || 1})`
        });
      });

      onLog({ phase: 'preparing', message: '⏳ Starting in 2 seconds...' });
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 2. Execute strategy
      const result = await this.strategy.execute(
        folders,
        this.userEmail,
        onProgress,
        onLog,
        () => this.shouldStopFlag
      );

      onLog({ 
        phase: 'completed', 
        message: `🎉 Download completed: ${result.total_downloaded} emails, ${result.folders_completed} folders${result.total_errors > 0 ? ` (${result.total_errors} errors)` : ''}` 
      });

      return {
        success: true,
        ...result
      };

    } catch (error: any) {
      onLog({ 
        phase: 'error', 
        message: `❌ Service error: ${error.message}` 
      });

      return {
        success: false,
        total_downloaded: 0,
        total_errors: 1,
        folders_completed: 0
      };
    }
  }

  /**
   * Ferma processo in corso
   */
  stop(): void {
    this.shouldStopFlag = true;
    console.log('🛑 [EmailDownloadService] Stop requested');
  }

  /**
   * Check se processo deve fermarsi
   */
  private shouldStop(): boolean {
    return this.shouldStopFlag;
  }

  /**
   * Recupera folders da sincronizzare da local temp index
   */
  private async getFoldersToSync() {
    const folders = await getSingleFastFoldersFromLocal(this.userEmail);
    return folders.filter(f => f.included && f.pending > 0);
  }

  /**
   * Smart Preparation: usa API esistenti per calcolare startUID corretto
   * @param customFolders - Cartelle custom da scaricare (opzionale)
   */
  private async prepareSmartDownload(customFolders?: string[]): Promise<FolderToSync[]> {
    const { emailSearchApi } = await import('@/lib/tmwe-email-search-api');
    const { getMaxUID } = await import('./UIDRangeService');
    
    const foldersToSync: FolderToSync[] = [];

    try {
      // 1. Recupera cartelle dal server usando emailSearchApi (RabbitMQ + Elasticsearch)
      console.log('[SmartPrep] 🔍 Fetching folders from emailSearchApi...');
      const response = await emailSearchApi.getFolders();
      const serverFolders = response?.folders || [];

      console.log('[SmartPrep] ✅ Server folders loaded:', {
        count: serverFolders.length,
        folders: serverFolders.map((f: any) => f.name || f.folder_name),
        rawResponse: response
      });

      // 🆕 FALLBACK: Se nessuna cartella dal server, usa default
      if (!serverFolders || serverFolders.length === 0) {
        console.warn('[SmartPrep] ⚠️ No folders from server, using defaults');
        const DEFAULT_FOLDERS = ['INBOX', 'Sent', 'Drafts', 'Trash', 'Junk', 'Archive'];
        
        for (const folderName of DEFAULT_FOLDERS) {
          // Se custom folders specificato, filtra
          if (customFolders && customFolders.length > 0 && !customFolders.includes(folderName)) {
            continue;
          }

          try {
            const localMaxUID = await getMaxUID(folderName, this.userEmail);
            foldersToSync.push({
              folderName,
              pending: 0,
              included: true,
              startUID: localMaxUID !== null ? localMaxUID + 1 : 1
            });
            console.log(`[SmartPrep] ✅ Fallback: ${folderName} added (startUID: ${localMaxUID !== null ? localMaxUID + 1 : 1})`);
          } catch (error: any) {
            console.warn(`[SmartPrep] ⚠️ Skip ${folderName}:`, error.message);
          }
        }
        
        return foldersToSync;
      }

      // 2. Per ogni cartella, calcola startUID e pending
      for (const folder of serverFolders) {
        const folderName = folder.name || folder.folder_name;
        
        // Se custom folders specificato, filtra
        if (customFolders && customFolders.length > 0 && !customFolders.includes(folderName)) {
          continue;
        }

        try {
          // A. Info server usando emailSearchApi
          const folderInfoResponse = await emailSearchApi.getFolderInfo(folderName);
          const serverInfo = folderInfoResponse?.folder_info || folderInfoResponse;
          const serverMaxUID = serverInfo.uidnext || serverInfo.max_uid || 0;
          
          // B. Info DB locale (funzione esistente)
          const localMaxUID = await getMaxUID(folderName, this.userEmail);
          
          // C. Calcola pending e startUID
          let pending = 0;
          let startUID = 1;
          
          if (localMaxUID === null) {
            // Cartella nuova → scarica da UID 1
            pending = serverMaxUID > 0 ? serverMaxUID : 0;
            startUID = 1;
          } else if (serverMaxUID > localMaxUID) {
            // Cartella parziale → scarica nuove
            pending = serverMaxUID - localMaxUID;
            startUID = localMaxUID + 1;
          }
          
          // ✅ SEMPRE aggiunge cartella (LucaStrategy gestisce empty batches)
          foldersToSync.push({
            folderName,
            pending,  // può essere 0, è normale per cartelle già sync
            included: true,
            startUID
          });

          // Log differenziato
          if (pending > 0) {
            console.log(`[SmartPrep] 🎯 ${folderName}: ${pending} pending, start from UID ${startUID}`);
          } else {
            console.log(`[SmartPrep] ✅ ${folderName}: up-to-date (will check for new emails)`);
          }
        } catch (error: any) {
          console.warn(`[SmartPrep] Error processing folder ${folderName}:`, error.message);
          
          // 🆕 FALLBACK: Usa solo DB locale se API fallisce
          try {
            const localMaxUID = await getMaxUID(folderName, this.userEmail);
            
            if (localMaxUID !== null) {
              // Cartella esiste localmente → continua da MAX+1
              foldersToSync.push({
                folderName,
                pending: 0, // Sconosciuto, LucaStrategy proverà
                included: true,
                startUID: localMaxUID + 1
              });
              console.log(`[SmartPrep] ✅ Fallback: ${folderName} will start from UID ${localMaxUID + 1}`);
            } else {
              // Cartella nuova → prova da UID 1
              foldersToSync.push({
                folderName,
                pending: 0, // Sconosciuto
                included: true,
                startUID: 1
              });
              console.log(`[SmartPrep] ⚠️ Fallback: ${folderName} will start from UID 1 (new folder)`);
            }
          } catch (fallbackError: any) {
            console.error(`[SmartPrep] ❌ Cannot process ${folderName} even with fallback:`, fallbackError.message);
            // Questa cartella viene definitivamente saltata
          }
        }
      }
    } catch (error: any) {
      console.error('[SmartPrep] ❌ emailSearchApi failed:', error.message);
      
      // 🆕 FALLBACK UNIVERSALE: usa cartelle di default o custom
      const DEFAULT_FOLDERS = ['INBOX', 'Sent', 'Drafts', 'Trash', 'Junk', 'Archive'];
      const fallbackFolders = (customFolders && customFolders.length > 0) ? customFolders : DEFAULT_FOLDERS;
      
      console.warn('[SmartPrep] 🔄 Using fallback folders:', fallbackFolders);
      
      for (const folderName of fallbackFolders) {
        try {
          const localMaxUID = await getMaxUID(folderName, this.userEmail);
          foldersToSync.push({
            folderName,
            pending: 0, // Sconosciuto, strategy gestirà
            included: true,
            startUID: localMaxUID !== null ? localMaxUID + 1 : 1
          });
          console.log(`[SmartPrep] ✅ Fallback: ${folderName} added (startUID: ${localMaxUID !== null ? localMaxUID + 1 : 1})`);
        } catch (error: any) {
          console.warn(`[SmartPrep] ⚠️ Skip ${folderName}:`, error.message);
        }
      }
    }

    return foldersToSync;
  }
}
