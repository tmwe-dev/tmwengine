/**
 * Edge Function Sync Service
 * Handles email synchronization via secure Edge Function proxy
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
   */
  async sync(
    folders: string[],
    userEmail: string,
    onProgress: (progress: DownloadProgress) => void,
    onLog: (log: Omit<LogEntry, 'timestamp'>) => void,
    shouldStop: () => boolean
  ): Promise<EdgeSyncResult> {
    this.abortController = new AbortController();

    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      onLog({
        phase: 'preparing',
        message: '🚀 Starting Edge Function sync (secure proxy)...'
      });

      // Call Edge Function with streaming response
      const supabaseUrl = 'https://dlldkrzoxvjxpgkkttxu.supabase.co';
      const response = await fetch(
        `${supabaseUrl}/functions/v1/email-sync-v2`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            folders,
            user_email: userEmail,
          }),
          signal: this.abortController.signal,
        }
      );

      if (!response.ok) {
        throw new Error(`Edge Function error: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body from Edge Function');
      }

      // Process streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let result: EdgeSyncResult = {
        total_downloaded: 0,
        total_errors: 0,
        folders_completed: 0,
      };

      while (true) {
        if (shouldStop()) {
          this.abortController.abort();
          onLog({
            phase: 'warning',
            message: '🛑 Sync cancelled by user'
          });
          break;
        }

        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const update = JSON.parse(line);

            switch (update.type) {
              case 'log':
                onLog(update.data);
                break;

              case 'progress':
                onProgress(update.data);
                break;

              case 'complete':
                result = update.data;
                onLog({
                  phase: 'completed',
                  message: `✅ Sync completed: ${result.total_downloaded} emails downloaded, ${result.total_errors} errors`
                });
                break;

              case 'error':
                throw new Error(update.data.message);
            }
          } catch (parseError) {
            console.error('Error parsing update:', parseError, line);
          }
        }
      }

      return result;

    } catch (error: any) {
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
