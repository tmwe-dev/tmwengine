import { useState, useCallback } from 'react';
import { emailMessageApi } from '@/lib/tmwe-api-integrated';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseEmailSyncProps {
  folder: string;
  totalEmails: number;
}

interface EmailSyncResult {
  isSyncing: boolean;
  syncedCount: number;
  syncError: string | null;
  allEmails: any[];
  startSync: () => Promise<void>;
  reset: () => void;
}

/**
 * Hook unificato per la sincronizzazione intelligente delle email.
 * Combina le funzionalità di:
 * - useEmailDownload: scarica email in memoria
 * - useSyncSmart: sincronizzazione ottimizzata batch
 * - syncMutation: sincronizzazione completa
 * 
 * CORREZIONE BUG: Filtra sempre per user_email per evitare conteggi errati
 */
export const useEmailSync = ({ folder, totalEmails }: UseEmailSyncProps): EmailSyncResult => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncedCount, setSyncedCount] = useState(0);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [allEmails, setAllEmails] = useState<any[]>([]);

  const startSync = useCallback(async (): Promise<void> => {
    setIsSyncing(true);
    setSyncedCount(0);
    setSyncError(null);
    setAllEmails([]);

    // 🔐 CRITICAL: Get user email from session
    const userEmail = sessionStorage.getItem('tmwe_user_email');
    if (!userEmail) {
      toast.error('Utente non autenticato');
      setIsSyncing(false);
      return;
    }

    try {
      console.log(`🚀 Sync Intelligente avviato per ${folder}`);
      console.log(`📊 Email totali sul server: ${totalEmails.toLocaleString()}`);

      // 🐛 FIX: Filtra sempre per user_email (bug precedente in useSyncSmart)
      const { data: existingEmails } = await supabase
        .from('email_messages')
        .select('message_id')
        .eq('cartella', folder)
        .eq('user_email', userEmail); // ✅ CRITICAL FIX

      const existingIds = new Set(existingEmails?.map(e => e.message_id) || []);
      const alreadyInDb = existingIds.size;
      
      console.log(`💾 Email già nel DB (utente ${userEmail}): ${alreadyInDb.toLocaleString()}`);

      // ⚡ Ottimizzazione: Se già tutto sincronizzato
      if (alreadyInDb >= totalEmails) {
        toast.success(`✅ Database già sincronizzato (${alreadyInDb.toLocaleString()} email)`);
        setIsSyncing(false);
        return;
      }

      const missingCount = totalEmails - alreadyInDb;
      console.log(`📥 Email mancanti da scaricare: ${missingCount.toLocaleString()}`);

      // ⚡ Configurazione intelligente del batch
      const batchSize = 50; // Dimensione ottimale batch
      const totalPages = Math.ceil(totalEmails / batchSize);
      let newEmailsCount = 0;
      let consecutiveEmptyBatches = 0;
      const maxEmptyBatches = 3; // Stop dopo 3 batch vuoti consecutivi
      const allDownloadedEmails: any[] = [];

      toast.info(`🔄 Sincronizzazione ${missingCount.toLocaleString()} email...`);

      // 🔄 Download intelligente batch per batch
      for (let page = 1; page <= totalPages; page++) {
        try {
          const response = await emailMessageApi.getMessages({
            folder,
            limit: batchSize,
            page,
          });

          const pageEmails = response?.messages || [];
          
          // 🔍 Filtra solo email NON presenti nel database
          const missingEmails = pageEmails.filter((email: any) => {
            const emailId = String(email.uid || email.message_id);
            return !existingIds.has(emailId);
          });

          // ⚡ OTTIMIZZAZIONE: Stop intelligente se nessuna email mancante
          if (missingEmails.length === 0) {
            consecutiveEmptyBatches++;
            console.log(`📄 Batch ${page}/${totalPages}: ${pageEmails.length} dalla API, 0 nuove (vuoti: ${consecutiveEmptyBatches})`);
            
            if (consecutiveEmptyBatches >= maxEmptyBatches) {
              console.log(`⏹️ Stop anticipato: ${maxEmptyBatches} batch vuoti consecutivi`);
              break;
            }
          } else {
            consecutiveEmptyBatches = 0; // Reset
            console.log(`📄 Batch ${page}/${totalPages}: ${pageEmails.length} dalla API, ${missingEmails.length} nuove`);
          }

          // 💾 Salva le email mancanti in Supabase
          if (missingEmails.length > 0) {
            try {
              const emailsToInsert = missingEmails.map((email: any) => {
                let isoDate = new Date().toISOString();
                if (email.date) {
                  try {
                    isoDate = new Date(email.date).toISOString();
                  } catch (e) {
                    console.error('Error parsing date:', email.date);
                  }
                }

                return {
                  message_id: String(email.uid || email.message_id || `msg-${Date.now()}-${Math.random()}`),
                  from_email: email.from || email.from_email || '',
                  to_email: email.to || email.to_email || '',
                  cc_email: email.cc || email.cc_email || null,
                  bcc_email: email.bcc || email.bcc_email || null,
                  subject: email.subject || '',
                  body_text: email.body_text || email.text || '',
                  body_html: email.body_html || email.html || '',
                  data_ricezione: isoDate,
                  cartella: folder,
                  direzione: 'inbound',
                  stato: 'nuovo',
                  flags: email.flags || [],
                  attachments: email.attachments || [],
                  provider_id: '00000000-0000-0000-0000-000000000000',
                  user_email: userEmail, // ✅ Associa sempre all'utente
                };
              });

              const { error: insertError } = await supabase
                .from('email_messages')
                .insert(emailsToInsert);

              if (insertError) {
                console.error('❌ Error saving emails:', insertError);
              } else {
                newEmailsCount += missingEmails.length;
                allDownloadedEmails.push(...missingEmails);
                
                // ✅ Aggiorna il Set per evitare duplicati
                missingEmails.forEach((email: any) => {
                  existingIds.add(String(email.uid || email.message_id));
                });
                
                setSyncedCount(newEmailsCount);
                setAllEmails([...allDownloadedEmails]);
                console.log(`✅ Salvate ${missingEmails.length} email (totale: ${newEmailsCount})`);
              }
            } catch (dbError) {
              console.error('❌ Database save error:', dbError);
            }
          }

          // ⏱️ Piccolo delay per non sovraccaricare il server
          if (page < totalPages) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (error) {
          console.error(`❌ Error downloading page ${page}:`, error);
          // Continua con il prossimo batch anche se uno fallisce
        }
      }

      setIsSyncing(false);
      
      // 🎉 Messaggio finale
      if (newEmailsCount > 0) {
        toast.success(
          `🎉 Sincronizzate ${newEmailsCount.toLocaleString()} nuove email!`,
          { duration: 5000 }
        );
        console.log(`✅ Sync completato: ${newEmailsCount} nuove email salvate`);
      } else {
        toast.success(`✅ Database già aggiornato (${alreadyInDb.toLocaleString()} email)`);
        console.log(`✅ Nessuna nuova email da sincronizzare`);
      }
    } catch (error: any) {
      console.error('❌ Sync error:', error);
      setSyncError(error.message || 'Errore durante la sincronizzazione');
      setIsSyncing(false);
      toast.error('Errore durante la sincronizzazione delle email');
    }
  }, [folder, totalEmails]);

  const reset = useCallback(() => {
    setIsSyncing(false);
    setSyncedCount(0);
    setSyncError(null);
    setAllEmails([]);
  }, []);

  return {
    isSyncing,
    syncedCount,
    syncError,
    allEmails,
    startSync,
    reset,
  };
};
