/**
 * Edge Function Sync Service
 * Handles email synchronization via secure Edge Function proxy
 * 
 * 🔄 ADAPTED: Using tmwe-email-sync-master (already deployed)
 * TODO: Switch back to email-sync-v2 after project rebuild clears deleted functions
 */

import { supabase } from '@/integrations/supabase/client';
import type { LogEntry, DownloadProgress } from '../strategies/DownloadStrategy';

export interface EdgeSyncResult {
  total_downloaded: number;
  total_errors: number;
  folders_completed: number;
}

export class EdgeFunctionSyncService {
  private abortController: AbortController | null = null;

  /**
   * Start email sync via Edge Function
   * Calls tmwe-email-sync-master once per folder
   */
  async sync(
    folders: string[],
    userEmail: string,
    onProgress: (progress: DownloadProgress) => void,
    onLog: (log: Omit<LogEntry, 'timestamp'>) => void,
    shouldStop: () => boolean
  ): Promise<EdgeSyncResult> {
    console.log('🔍 [SERVICE DIAGNOSTIC] ===== EDGE FUNCTION SYNC SERVICE START =====');
    console.log('🔍 [SERVICE DIAGNOSTIC] Using tmwe-email-sync-master (multi-folder adapter)');
    console.log('🔍 [SERVICE DIAGNOSTIC] Folders to sync:', folders);
    console.log('🔍 [SERVICE DIAGNOSTIC] User email:', userEmail);

    this.abortController = new AbortController();

    try {
      console.log('🔐 [SERVICE DIAGNOSTIC] Getting Supabase session...');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.error('❌ [SERVICE DIAGNOSTIC] No active session found');
        throw new Error('No active session');
      }

      console.log('✅ [SERVICE DIAGNOSTIC] Session retrieved');

      onLog({
        phase: 'preparing',
        message: '🚀 Starting sync via tmwe-email-sync-master (secure proxy)...'
      });

      const supabaseUrl = 'https://dlldkrzoxvjxpgkkttxu.supabase.co';
      const url = `${supabaseUrl}/functions/v1/tmwe-email-sync-master`;
      
      let totalDownloaded = 0;
      let totalErrors = 0;
      let foldersCompleted = 0;

      // Sync cada carpeta secuencialmente
      for (let i = 0; i < folders.length; i++) {
        if (shouldStop()) {
          onLog({
            phase: 'warning',
            message: '🛑 Sync cancelled by user'
          });
          break;
        }

        const folderName = folders[i];
        
        console.log(`📂 [SERVICE DIAGNOSTIC] Syncing folder ${i + 1}/${folders.length}: ${folderName}`);
        
        onLog({
          phase: 'importing',
          folder: folderName,
          message: `🔄 Syncing ${folderName} (${i + 1}/${folders.length})...`
        });

        onProgress({
          current_folder: folderName,
          imported: totalDownloaded,
          total: folders.length * 100, // Estimate
          errors: totalErrors
        });

        try {
          const requestBody = {
            mode: 'incremental' as const,
            folder_name: folderName,
            max_emails: 500 // Limit per folder
          };

          console.log('📦 [SERVICE DIAGNOSTIC] Request body:', requestBody);

          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
            signal: this.abortController.signal,
          });

          console.log(`📊 [SERVICE DIAGNOSTIC] Response status for ${folderName}:`, response.status);

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ [SERVICE DIAGNOSTIC] Error for ${folderName}:`, errorText);
            throw new Error(`Sync failed for ${folderName}: ${response.statusText}`);
          }

          const result = await response.json();
          console.log(`✅ [SERVICE DIAGNOSTIC] Result for ${folderName}:`, result);

          if (result.success) {
            const downloaded = result.emails_downloaded || 0;
            totalDownloaded += downloaded;
            foldersCompleted++;

            onLog({
              phase: 'importing',
              folder: folderName,
              message: `✅ ${folderName}: ${downloaded} emails synced`,
              count: { current: downloaded, total: result.total_emails_in_db || 0 }
            });
          } else {
            totalErrors++;
            onLog({
              phase: 'error',
              folder: folderName,
              message: `⚠️ ${folderName}: ${result.message || 'Sync failed'}`
            });
          }

        } catch (folderError: any) {
          console.error(`❌ [SERVICE DIAGNOSTIC] Exception for ${folderName}:`, folderError);
          totalErrors++;
          
          onLog({
            phase: 'error',
            folder: folderName,
            message: `❌ ${folderName}: ${folderError.message}`
          });
        }

        // Small delay between folders
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      onLog({
        phase: 'completed',
        message: `🎉 Sync completed: ${totalDownloaded} emails, ${foldersCompleted}/${folders.length} folders, ${totalErrors} errors`
      });

      return {
        total_downloaded: totalDownloaded,
        total_errors: totalErrors,
        folders_completed: foldersCompleted,
      };

    } catch (error: any) {
      console.error('❌ [SERVICE DIAGNOSTIC] Fatal error:', error);
      
      if (error.name === 'AbortError') {
        onLog({
          phase: 'warning',
          message: '🛑 Sync aborted'
        });
      } else {
        onLog({
          phase: 'error',
          message: `❌ Sync error: ${error.message}`
        });
      }
      throw error;
    } finally {
      this.abortController = null;
    }
  }

  /**
   * Stop ongoing sync
   */
  stop(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
}
