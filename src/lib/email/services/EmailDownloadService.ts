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
    private userEmail: string
  ) {}

  /**
   * Avvia processo di download
   * @param onProgress - Callback per updates progresso
   * @param onLog - Callback per logs
   * @param customFolders - Cartelle custom da scaricare (opzionale)
   */
  async start(
    onProgress: (progress: DownloadProgress) => void,
    onLog: (log: Omit<LogEntry, 'timestamp'>) => void,
    customFolders?: string[]
  ): Promise<EmailDownloadServiceResult> {
    
    this.shouldStopFlag = false;

    onLog({ 
      phase: 'preparing', 
      message: `🚀 Starting ${this.strategy.name} download for ${this.userEmail}` 
    });

    try {
      // 1. Smart preparation: usa API esistenti per calcolare startUID corretto
      const folders = await this.prepareSmartDownload(customFolders);

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
      // 1. Recupera cartelle dal server (API esistente)
      const serverFoldersResponse = await emailSearchApi.getFolders();
      const serverFolders = serverFoldersResponse.folders || [];

      // 2. Per ogni cartella, calcola startUID e pending
      for (const folder of serverFolders) {
        const folderName = folder.name || folder.folder_name;
        
        // Se custom folders specificato, filtra
        if (customFolders && customFolders.length > 0 && !customFolders.includes(folderName)) {
          continue;
        }

        try {
          // A. Info server (API esistente)
          const serverInfo = await emailSearchApi.getFolderInfo(folderName);
          const serverMaxUID = serverInfo.folder?.max_uid || serverInfo.folder?.uidnext || 0;
          
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
          
          if (pending > 0) {
            foldersToSync.push({
              folderName,
              pending,
              included: true,
              startUID
            });
          }
        } catch (error: any) {
          console.warn(`[SmartPrep] Error processing folder ${folderName}:`, error.message);
          // Continua con altre cartelle
        }
      }
    } catch (error: any) {
      console.error('[SmartPrep] Error fetching server folders:', error.message);
      
      // Fallback: se custom folders fornito, usale con startUID = 1
      if (customFolders && customFolders.length > 0) {
        return customFolders.map(name => ({
          folderName: name,
          pending: 0, // Sconosciuto, LucaStrategy gestirà
          included: true,
          startUID: 1
        }));
      }
    }

    return foldersToSync;
  }
}
