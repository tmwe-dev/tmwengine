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
    console.log('🔍 [SERVICE DIAGNOSTIC] ===== EDGE FUNCTION SYNC SERVICE START =====');
    console.log('🔍 [SERVICE DIAGNOSTIC] Input params:', {
      foldersCount: folders.length,
      folders,
      userEmail,
      hasProgressCallback: typeof onProgress === 'function',
      hasLogCallback: typeof onLog === 'function',
      hasShouldStopCallback: typeof shouldStop === 'function'
    });

    this.abortController = new AbortController();
    console.log('✅ [SERVICE DIAGNOSTIC] AbortController created');

    try {
      console.log('🔐 [SERVICE DIAGNOSTIC] Getting Supabase session...');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.error('❌ [SERVICE DIAGNOSTIC] No active session found');
        throw new Error('No active session');
      }

      console.log('✅ [SERVICE DIAGNOSTIC] Session retrieved:', {
        hasAccessToken: !!session.access_token,
        tokenLength: session.access_token?.length,
        expiresAt: session.expires_at
      });

      onLog({
        phase: 'preparing',
        message: '🚀 Starting Edge Function sync (secure proxy)...'
      });

      // Call Edge Function with streaming response
      const supabaseUrl = 'https://dlldkrzoxvjxpgkkttxu.supabase.co';
      const url = `${supabaseUrl}/functions/v1/email-sync-v2`;
      
      console.log('📡 [SERVICE DIAGNOSTIC] Preparing Edge Function call...');
      console.log('🔗 [SERVICE DIAGNOSTIC] URL:', url);
      console.log('📂 [SERVICE DIAGNOSTIC] Folders to sync:', folders);
      console.log('👤 [SERVICE DIAGNOSTIC] User email:', userEmail);

      const requestBody = {
        folders,
        user_email: userEmail,
      };

      console.log('📦 [SERVICE DIAGNOSTIC] Request body:', JSON.stringify(requestBody, null, 2));

      const requestHeaders = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      console.log('📋 [SERVICE DIAGNOSTIC] Request headers:', {
        ...requestHeaders,
        Authorization: `Bearer ${session.access_token.substring(0, 20)}...` // Truncate for security
      });

      console.log('🚀 [SERVICE DIAGNOSTIC] Executing fetch()...');
      
      const response = await fetch(url, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(requestBody),
        signal: this.abortController.signal,
      });

      console.log('📊 [SERVICE DIAGNOSTIC] Fetch completed - Response received');
      console.log('📊 [SERVICE DIAGNOSTIC] Response status:', response.status, response.statusText);
      console.log('📊 [SERVICE DIAGNOSTIC] Response headers:', Object.fromEntries(response.headers.entries()));
      console.log('📊 [SERVICE DIAGNOSTIC] Response ok:', response.ok);
      console.log('📊 [SERVICE DIAGNOSTIC] Response type:', response.type);

      if (!response.ok) {
        console.error('❌ [SERVICE DIAGNOSTIC] Response not OK - Reading error text...');
        const errorText = await response.text();
        console.error('❌ [SERVICE DIAGNOSTIC] Error response body:', errorText);
        
        const errorMessage = `Edge Function error (${response.status}): ${response.statusText}\n${errorText}`;
        console.error('❌ [SERVICE DIAGNOSTIC] Throwing error:', errorMessage);
        
        throw new Error(errorMessage);
      }

      if (!response.body) {
        console.error('❌ [SERVICE DIAGNOSTIC] No response body from Edge Function');
        throw new Error('No response body from Edge Function');
      }

      console.log('✅ [SERVICE DIAGNOSTIC] Response body exists - Starting streaming read...');

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
