import { useState, useCallback } from 'react';
import { emailMessageApi } from '@/lib/tmwe-api-integrated';
import { supabase } from '@/integrations/supabase/client';

export interface UseEmailSyncProps {
  folder: string;
  totalEmailCount: number;
}

export interface DownloadStatus {
  currentBatch: number;
  totalBatches: number;
  downloadedCount: number;
  totalOnServer: number;
  isComplete: boolean;
}

export interface EmailSyncResult {
  isSyncing: boolean;
  syncedCount: number;
  syncError: string | null;
  allEmails: any[];
  downloadStatus: DownloadStatus | null;
  startSync: () => Promise<void>;
  reset: () => void;
  stopSync: () => void;
}

export const useEmailSync = ({ folder, totalEmailCount }: UseEmailSyncProps): EmailSyncResult => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncedCount, setSyncedCount] = useState(0);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [allEmails, setAllEmails] = useState<any[]>([]);
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus | null>(null);
  const [shouldStop, setShouldStop] = useState(false);

  const reset = useCallback(() => {
    setIsSyncing(false);
    setSyncedCount(0);
    setSyncError(null);
    setAllEmails([]);
    setDownloadStatus(null);
    setShouldStop(false);
  }, []);

  const stopSync = useCallback(() => {
    console.log('🛑 [Sync] Interruzione richiesta dall\'utente');
    setShouldStop(true);
  }, []);

  const startSync = useCallback(async () => {
    try {
      setIsSyncing(true);
      setSyncError(null);
      setSyncedCount(0);
      setAllEmails([]);
      setShouldStop(false);

      const userEmail = sessionStorage.getItem('tmwe_user_email');
      if (!userEmail) {
        throw new Error('User email not found');
      }

      console.log('🚀 [Sync] Inizio sincronizzazione MICRO-BATCH (5 email + 2s pausa)');
      console.log(`📊 [Sync] Totale email sul server: ${totalEmailCount}`);

      if (totalEmailCount === 0) {
        console.log('✅ [Sync] Nessuna email sul server');
        setIsSyncing(false);
        return;
      }

      // STEP 2: Get existing UIDs from Supabase
      const { data: existingEmails } = await supabase
        .from('email_messages')
        .select('message_id')
        .eq('cartella', folder)
        .eq('user_email', userEmail);

      const existingUids = new Set(existingEmails?.map(e => e.message_id) || []);
      console.log(`💾 [Sync] Email già nel DB: ${existingUids.size}`);

      // STEP 3: Download emails in MICRO-BATCHES (5 email)
      const MICRO_BATCH_SIZE = 5;
      const PAUSE_MS = 2000;
      const totalBatches = Math.ceil(totalEmailCount / MICRO_BATCH_SIZE);
      let currentBatch = 0;
      let downloadedCount = 0;
      let emptyBatchCount = 0;

      console.log(`📦 [Sync] Inizio download: ${totalBatches} micro-batch da ${MICRO_BATCH_SIZE} email`);

      for (let page = 1; page <= totalBatches; page++) {
        // Check stop flag
        if (shouldStop) {
          console.log('🛑 [Sync] Sincronizzazione interrotta dall\'utente');
          setSyncError('Sincronizzazione interrotta');
          break;
        }

        currentBatch = page;
        
        // Update download status
        setDownloadStatus({
          currentBatch,
          totalBatches,
          downloadedCount,
          totalOnServer: totalEmailCount,
          isComplete: false,
        });

        console.log(`⬇️ [Sync] Download micro-batch ${currentBatch}/${totalBatches}...`);

        let retryCount = 0;
        let response;
        
        // Retry logic (max 3 tentativi)
        while (retryCount < 3) {
          try {
            response = await emailMessageApi.getMessages({
              folder,
              page,
              limit: MICRO_BATCH_SIZE,
            });
            break; // Success
          } catch (error: any) {
            retryCount++;
            console.warn(`⚠️ [Sync] Errore batch ${currentBatch}, tentativo ${retryCount}/3:`, error.message);
            if (retryCount >= 3) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
          }
        }

        const messages = response?.messages || [];
        
        if (messages.length === 0) {
          emptyBatchCount++;
          console.log(`⚠️ [Sync] Batch ${currentBatch} vuoto (${emptyBatchCount} consecutivi)`);
          
          // Stop dopo 2 batch vuoti consecutivi
          if (emptyBatchCount >= 2) {
            console.log('🛑 [Sync] 2 batch vuoti consecutivi, interruzione download');
            break;
          }
          
          // Pause before next batch
          await new Promise(resolve => setTimeout(resolve, PAUSE_MS));
          continue;
        }

        emptyBatchCount = 0; // Reset se troviamo email

        // Filter only new emails
        const newMessages = messages.filter((msg: any) => {
          const msgId = String(msg.message_id || msg.uid || msg.id);
          return !existingUids.has(msgId);
        });

        console.log(`✅ [Sync] Batch ${currentBatch}: ${messages.length} email, ${newMessages.length} nuove`);

        // STEP 4: Insert immediately into DB (progressive insert)
        if (newMessages.length > 0) {
          const emailRecords = newMessages.map((msg: any) => ({
            message_id: String(msg.message_id || msg.uid || msg.id),
            user_email: userEmail,
            subject: msg.subject || '(No Subject)',
            from_email: typeof msg.from === 'object' ? msg.from.email : msg.from,
            to_email: msg.to || '',
            cartella: folder,
            data_ricezione: msg.date || new Date().toISOString(),
            stato: msg.is_read || msg.seen ? 'letto' : 'nuovo',
            direzione: folder === 'Sent' ? 'uscita' : 'entrata',
            provider_id: '00000000-0000-0000-0000-000000000000',
          }));

          const { error: insertError } = await supabase
            .from('email_messages')
            .insert(emailRecords);

          if (insertError) {
            console.error('❌ [Sync] Errore inserimento batch:', insertError);
            // Non interrompo il processo, continuo con il prossimo batch
          } else {
            downloadedCount += newMessages.length;
            setSyncedCount(downloadedCount);
            // Add new UIDs to set
            newMessages.forEach((msg: any) => {
              existingUids.add(String(msg.message_id || msg.uid || msg.id));
            });
            console.log(`💾 [Sync] Inserite ${newMessages.length} email (totale: ${downloadedCount})`);
          }
        }

        // Update progress
        setDownloadStatus({
          currentBatch,
          totalBatches,
          downloadedCount,
          totalOnServer: totalEmailCount,
          isComplete: currentBatch === totalBatches,
        });

        // Pause 2 secondi prima del prossimo batch (tranne ultimo)
        if (currentBatch < totalBatches) {
          console.log(`⏸️ [Sync] Pausa 2 secondi prima del prossimo batch...`);
          await new Promise(resolve => setTimeout(resolve, PAUSE_MS));
        }
      }

      setDownloadStatus({
        currentBatch: Math.min(currentBatch, totalBatches),
        totalBatches,
        downloadedCount,
        totalOnServer: totalEmailCount,
        isComplete: true,
      });

      console.log('🎉 [Sync] Sincronizzazione completata:', {
        downloadedCount,
        totalBatches: currentBatch,
        stopped: shouldStop,
      });

    } catch (error: any) {
      console.error('❌ [Sync] Errore sincronizzazione:', error);
      setSyncError(error.message || 'Sync failed');
    } finally {
      setIsSyncing(false);
      setShouldStop(false);
    }
  }, [folder, totalEmailCount, shouldStop]);

  return {
    isSyncing,
    syncedCount,
    syncError,
    allEmails,
    downloadStatus,
    startSync,
    reset,
    stopSync,
  };
};
