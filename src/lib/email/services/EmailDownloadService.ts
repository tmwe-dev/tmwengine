/**
 * Email Download Service
 * Business logic centralized, testabile senza React
 * Gestisce orchestrazione download con strategy pattern
 */

import type { DownloadStrategy, LogEntry, DownloadProgress } from '../strategies/DownloadStrategy';
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
      // 1. Get folders da sincronizzare (da local temp index)
      const folders = await this.getFoldersToSync();

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
        message: `📋 Plan: ${folders.length} folders, ${totalPending} total emails`
      });

      // Log folders to sync
      folders.forEach((f, i) => {
        onLog({
          phase: 'preparing',
          message: `  ${i + 1}. ${f.folderName} → ${f.pending} emails`
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
}
