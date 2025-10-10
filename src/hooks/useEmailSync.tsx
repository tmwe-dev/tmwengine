import { useState, useCallback, useRef } from 'react';
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
  const shouldStop = useRef(false); // USE REF for immediate updates!

  const reset = useCallback(() => {
    setIsSyncing(false);
    setSyncedCount(0);
    setSyncError(null);
    setAllEmails([]);
    setDownloadStatus(null);
    shouldStop.current = false;
  }, []);

  const stopSync = useCallback(() => {
    console.log('🛑 [Sync] Interruzione richiesta dall\'utente');
    shouldStop.current = true;
  }, []);

  const startSync = useCallback(async () => {
    console.log('🚀 [Sync] startSync called, resetting shouldStop flag');
    shouldStop.current = false; // Reset flag BEFORE starting
    
    try {
      setIsSyncing(true);
      setSyncError(null);
      setSyncedCount(0);
      setAllEmails([]);

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

      // STEP 3: Download emails ONE BY ONE with full body
      let downloadedCount = 0;
      const uidBatchSize = 50; // Get 50 UIDs at a time
      const totalUidBatches = Math.ceil(totalEmailCount / uidBatchSize);
      
      console.log(`📋 [Sync] Scarico ${totalEmailCount} email (1 per volta con body completo)`);
      console.log(`📦 [Sync] Ottengo UIDs in ${totalUidBatches} batch da ${uidBatchSize}`);

      // STEP 1: Get UIDs in batches
      for (let uidBatch = 1; uidBatch <= totalUidBatches; uidBatch++) {
        if (shouldStop.current) {
          console.log('🛑 [Sync] Interruzione manuale durante fetch UIDs');
          setSyncError('Sincronizzazione interrotta dall\'utente');
          break;
        }

        console.log(`\n📋 [UID Batch ${uidBatch}/${totalUidBatches}] Fetching UIDs...`);

        try {
          const response = await emailMessageApi.getMessages({
            folder,
            page: uidBatch,
            limit: uidBatchSize,
          });

          const messages = response?.messages || [];
          
          if (messages.length === 0) {
            console.warn(`⚠️ [UID Batch ${uidBatch}] Nessun UID ricevuto, continuo...`);
            continue;
          }

          // Filter new UIDs
          const newUids = messages
            .filter((msg: any) => !existingUids.has(String(msg.message_id || msg.uid)))
            .map((msg: any) => String(msg.message_id || msg.uid));

          console.log(`✨ [UID Batch ${uidBatch}] ${newUids.length} nuovi UID da scaricare (su ${messages.length} totali)`);

          // STEP 2: Download each email body (1 by 1)
          for (let i = 0; i < newUids.length; i++) {
            if (shouldStop.current) {
              console.log('🛑 [Sync] Interruzione manuale durante download email');
              setSyncError('Sincronizzazione interrotta dall\'utente');
              break;
            }

            const uid = newUids[i];
            
            try {
              console.log(`📥 [${downloadedCount + 1}/${totalEmailCount}] Downloading email UID: ${uid}`);
              
              // Download full email with body
              const fullEmail = await emailMessageApi.getMessage(uid, false);
              
              // Insert into DB with body
              const { error } = await supabase
                .from('email_messages')
                .insert({
                  message_id: uid,
                  user_email: userEmail,
                  subject: fullEmail.subject || '(No Subject)',
                  from_email: fullEmail.from?.email || fullEmail.from || '',
                  to_email: fullEmail.to || '',
                  cc_email: fullEmail.cc || null,
                  bcc_email: fullEmail.bcc || null,
                  body_html: fullEmail.body_html || '',
                  body_text: fullEmail.body_text || fullEmail.body || '',
                  attachments: fullEmail.attachments || [],
                  cartella: folder,
                  data_ricezione: fullEmail.date || new Date().toISOString(),
                  stato: fullEmail.is_read ? 'letto' : 'nuovo',
                  direzione: folder === 'Sent' ? 'uscita' : 'entrata',
                  provider_id: '00000000-0000-0000-0000-000000000000',
                  flags: fullEmail.flags || [],
                });
              
              if (!error) {
                downloadedCount++;
                setSyncedCount(downloadedCount);
                existingUids.add(uid);
                console.log(`✅ [${downloadedCount}/${totalEmailCount}] Email scaricata con body completo`);
              } else {
                console.error(`❌ Errore inserimento email ${uid}:`, error);
              }
              
              // Update progress
              setDownloadStatus({
                currentBatch: Math.floor(downloadedCount / 5) + 1,
                totalBatches: Math.ceil(totalEmailCount / 5),
                downloadedCount,
                totalOnServer: totalEmailCount,
                isComplete: false,
              });

              // Pause every 5 emails
              if ((i + 1) % 5 === 0 && i < newUids.length - 1) {
                console.log(`⏸️ Pausa 2 secondi dopo 5 email...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
              }
              
            } catch (error: any) {
              console.error(`❌ Errore download email ${uid}:`, error.message);
              // Continue with next email
            }
          }

          if (shouldStop.current) break;

        } catch (error: any) {
          console.error(`❌ Errore fetch UID batch ${uidBatch}:`, error.message);
          // Continue with next UID batch
        }
      }

      setDownloadStatus({
        currentBatch: Math.ceil(downloadedCount / 5),
        totalBatches: Math.ceil(totalEmailCount / 5),
        downloadedCount,
        totalOnServer: totalEmailCount,
        isComplete: true,
      });

      console.log('🎉 [Sync] Sincronizzazione completata:', {
        downloadedCount,
        totalEmailCount,
        stopped: shouldStop.current,
      });

    } catch (error: any) {
      console.error('❌ [Sync] Errore sincronizzazione:', error);
      setSyncError(error.message || 'Sync failed');
    } finally {
      setIsSyncing(false);
      shouldStop.current = false;
    }
  }, [folder, totalEmailCount]);

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
