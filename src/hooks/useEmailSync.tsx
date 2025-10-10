import { useState, useCallback } from 'react';
import { emailMessageApi } from '@/lib/tmwe-api-integrated';
import { supabase } from '@/integrations/supabase/client';

export interface UseEmailSyncProps {
  folder: string;
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
}

export const useEmailSync = ({ folder }: UseEmailSyncProps): EmailSyncResult => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncedCount, setSyncedCount] = useState(0);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [allEmails, setAllEmails] = useState<any[]>([]);
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus | null>(null);

  const reset = useCallback(() => {
    setIsSyncing(false);
    setSyncedCount(0);
    setSyncError(null);
    setAllEmails([]);
    setDownloadStatus(null);
  }, []);

  const startSync = useCallback(async () => {
    try {
      setIsSyncing(true);
      setSyncError(null);
      setSyncedCount(0);
      setAllEmails([]);

      const userEmail = sessionStorage.getItem('tmwe_user_email');
      if (!userEmail) {
        throw new Error('User email not found');
      }

      console.log('🚀 [Sync] Inizio sincronizzazione per cartella:', folder);

      // STEP 1: Get real total count from server
      const realTotal = await emailMessageApi.getTotalEmailCount({ folder });
      console.log(`📊 [Sync] Totale email sul server: ${realTotal}`);

      if (realTotal === 0) {
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

      // STEP 3: Download all emails in batches
      const batchSize = 50;
      const totalBatches = Math.ceil(realTotal / batchSize);
      let currentBatch = 0;
      let downloadedCount = 0;
      const emailsToInsert: any[] = [];

      console.log(`📦 [Sync] Inizio download: ${totalBatches} batch da ${batchSize} email`);

      for (let page = 1; page <= totalBatches; page++) {
        currentBatch = page;
        
        // Update download status
        setDownloadStatus({
          currentBatch,
          totalBatches,
          downloadedCount,
          totalOnServer: realTotal,
          isComplete: false,
        });

        console.log(`⬇️ [Sync] Download batch ${currentBatch}/${totalBatches}...`);

        const response = await emailMessageApi.getMessages({
          folder,
          page,
          limit: batchSize,
        });

        const messages = response?.messages || [];
        if (messages.length === 0) {
          console.log(`⚠️ [Sync] Batch ${currentBatch} vuoto, ma continuo...`);
          continue;
        }

        // Filter only new emails
        const newMessages = messages.filter((msg: any) => {
          const msgId = String(msg.message_id || msg.uid || msg.id);
          return !existingUids.has(msgId);
        });

        console.log(`✅ [Sync] Batch ${currentBatch}: ${messages.length} email, ${newMessages.length} nuove`);

        if (newMessages.length > 0) {
          emailsToInsert.push(...newMessages);
          downloadedCount += newMessages.length;
          setSyncedCount(downloadedCount);
        }

        // Update progress
        setDownloadStatus({
          currentBatch,
          totalBatches,
          downloadedCount,
          totalOnServer: realTotal,
          isComplete: currentBatch === totalBatches,
        });
      }

      console.log(`📥 [Sync] Download completato: ${downloadedCount} nuove email da inserire`);

      // STEP 4: Insert new emails in DB
      if (emailsToInsert.length > 0) {
        console.log(`💾 [Sync] Inserimento ${emailsToInsert.length} email nel DB...`);

        const emailRecords = emailsToInsert.map((msg: any) => ({
          message_id: String(msg.message_id || msg.uid || msg.id),
          user_email: userEmail,
          subject: msg.subject || '(No Subject)',
          from_email: typeof msg.from === 'object' ? msg.from.email : msg.from,
          to_email: msg.to || '',
          cartella: folder,
          data_ricezione: msg.date || new Date().toISOString(),
          stato: msg.is_read || msg.seen ? 'letto' : 'nuovo',
          direzione: folder === 'Sent' ? 'uscita' : 'entrata',
          provider_id: '00000000-0000-0000-0000-000000000000', // placeholder
        }));

        const { error: insertError } = await supabase
          .from('email_messages')
          .insert(emailRecords);

        if (insertError) {
          console.error('❌ [Sync] Errore inserimento:', insertError);
          throw insertError;
        }

        console.log(`✅ [Sync] ${emailsToInsert.length} email inserite con successo`);
      }

      setAllEmails(emailsToInsert);
      setDownloadStatus({
        currentBatch: totalBatches,
        totalBatches,
        downloadedCount,
        totalOnServer: realTotal,
        isComplete: true,
      });

      console.log('🎉 [Sync] Sincronizzazione completata con successo');

    } catch (error: any) {
      console.error('❌ [Sync] Errore sincronizzazione:', error);
      setSyncError(error.message || 'Sync failed');
    } finally {
      setIsSyncing(false);
    }
  }, [folder]);

  return {
    isSyncing,
    syncedCount,
    syncError,
    allEmails,
    downloadStatus,
    startSync,
    reset,
  };
};
