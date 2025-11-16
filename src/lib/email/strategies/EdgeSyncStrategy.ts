/**
 * Edge Sync Strategy
 * Downloads emails via secure Edge Function proxy
 * 
 * ADVANTAGES:
 * - Secure: API calls happen server-side
 * - No CORS issues
 * - Server-side rate limiting and batching
 * - Real-time progress streaming
 * - Crash recovery support
 */

import type { 
  DownloadStrategy, 
  FolderToSync, 
  DownloadProgress, 
  LogEntry, 
  DownloadResult 
} from './DownloadStrategy';
import { EdgeFunctionSyncService } from '../services/EdgeFunctionSyncService';

export class EdgeSyncStrategy implements DownloadStrategy {
  name = 'Edge Sync (Secure Proxy)';
  description = 'Downloads via Edge Function proxy. Secure, server-side rate limiting, real-time progress.';

  private service: EdgeFunctionSyncService | null = null;

  /**
   * Execute download via Edge Function
   */
  async execute(
    folders: FolderToSync[],
    userEmail: string,
    onProgress: (progress: DownloadProgress) => void,
    onLog: (log: Omit<LogEntry, 'timestamp'>) => void,
    shouldStop: () => boolean
  ): Promise<DownloadResult> {
    
    const folderNames = folders
      .filter(f => f.included)
      .map(f => f.folderName);

    if (folderNames.length === 0) {
      onLog({
        phase: 'error',
        message: '❌ No folders selected for sync'
      });
      throw new Error('No folders selected');
    }

    onLog({
      phase: 'preparing',
      message: `🚀 Edge Sync: Processing ${folderNames.length} folders via secure proxy`
    });

    this.service = new EdgeFunctionSyncService();

    try {
      const result = await this.service.sync(
        folderNames,
        userEmail,
        onProgress,
        onLog,
        shouldStop
      );

      return {
        total_downloaded: result.total_downloaded,
        total_errors: result.total_errors,
        folders_completed: result.folders_completed,
      };

    } finally {
      this.service = null;
    }
  }
}
