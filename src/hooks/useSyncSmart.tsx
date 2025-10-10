import { useState, useCallback, useRef } from 'react';
import { emailMessageApi } from '@/lib/tmwe-api-integrated';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseSyncSmartProps {
  folder: string;
  totalEmails: number;
}

export const useSyncSmart = ({ folder, totalEmails }: UseSyncSmartProps) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [syncedCount, setSyncedCount] = useState(0);
  const [syncError, setSyncError] = useState<string | null>(null);
  
  // useRef per controllare pausa in tempo reale nel loop
  const pausedRef = useRef(false);
  const shouldStopRef = useRef(false);

  const pause = useCallback(() => {
    pausedRef.current = true;
    setIsPaused(true);
    toast.info('⏸️ Sincronizzazione in pausa');
    console.log('⏸️ Pausa attivata');
  }, []);

  const resume = useCallback(() => {
    pausedRef.current = false;
    setIsPaused(false);
    toast.success('▶️ Sincronizzazione ripresa');
    console.log('▶️ Ripresa');
  }, []);

  const stop = useCallback(() => {
    shouldStopRef.current = true;
    pausedRef.current = false;
    setIsPaused(false);
    setIsSyncing(false);
    toast.warning('⏹️ Sincronizzazione interrotta');
    console.log('⏹️ Interruzione forzata');
  }, []);

  const startSync = useCallback(async (): Promise<void> => {
    setIsSyncing(true);
    setIsPaused(false);
    setSyncedCount(0);
    setSyncError(null);
    pausedRef.current = false;
    shouldStopRef.current = false;

    // Get user email from session
    const userEmail = sessionStorage.getItem('tmwe_user_email');
    if (!userEmail) {
      toast.error('Utente non autenticato');
      setIsSyncing(false);
      return;
    }

    try {
      // FASE 1: Recupera tutti gli ID delle email già presenti
      const { data: existingEmails } = await supabase
        .from('email_messages')
        .select('message_id')
        .eq('cartella', folder)
        .eq('user_email', userEmail);

      const existingIds = new Set(existingEmails?.map(e => e.message_id) || []);
      const alreadyInDb = existingIds.size;
      
      console.log(`📊 Smart Sync - Database: ${alreadyInDb} email già presenti in ${folder}`);

      const batchSize = 50;
      const totalPages = Math.ceil(totalEmails / batchSize);
      let newEmailsCount = 0;
      let emptyBatches = 0;
      const maxEmptyBatches = 3;

      toast.info(`Sincronizzazione smart in corso...`);

      // FASE 2: Scarica UIDs dalla API batch per batch
      for (let page = 1; page <= totalPages; page++) {
        // ⏸️ CHECK: Interruzione forzata
        if (shouldStopRef.current) {
          console.log('🛑 Interruzione rilevata - uscita dal loop');
          break;
        }

        // ⏸️ CHECK: Pausa attiva - aspetta resume
        while (pausedRef.current && !shouldStopRef.current) {
          console.log('⏸️ In pausa... aspettando resume');
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // ⏸️ CHECK: Interruzione durante pausa
        if (shouldStopRef.current) {
          console.log('🛑 Interruzione durante pausa - uscita');
          break;
        }

        try {
          const response = await emailMessageApi.getMessages({
            folder,
            limit: batchSize,
            page,
          });

          const pageEmails = response?.messages || [];
          
          // FASE 3: Filtra solo email NON presenti usando UID
          const missingEmails = pageEmails.filter((email: any) => {
            const emailId = String(email.uid);
            return !existingIds.has(emailId);
          });

          console.log(`📄 Smart Sync - Pagina ${page}/${totalPages}: ${pageEmails.length} dalla API, ${missingEmails.length} nuove`);

          if (missingEmails.length === 0) {
            emptyBatches++;
            console.log(`⏭️ Batch vuoto ${emptyBatches}/${maxEmptyBatches}`);
            
            if (emptyBatches >= maxEmptyBatches) {
              console.log(`🛑 Stopping: ${maxEmptyBatches} batch consecutivi senza nuove email`);
              break;
            }
          } else {
            emptyBatches = 0;
            
            // FASE 4: Per ogni email mancante, scarica contenuto COMPLETO
            for (const email of missingEmails) {
              // ⏸️ CHECK: Interruzione forzata
              if (shouldStopRef.current) {
                console.log('🛑 Interruzione nel loop email');
                break;
              }

              // ⏸️ CHECK: Pausa attiva
              while (pausedRef.current && !shouldStopRef.current) {
                await new Promise(resolve => setTimeout(resolve, 500));
              }

              if (shouldStopRef.current) break;

              try {
                const messageId = String(email.uid);
                
                // ⭐ CHIAMATA COMPLETA per ottenere body_html e body_text
                console.log(`📥 Smart Sync - Downloading full content for UID ${messageId}...`);
                const fullEmail = await emailMessageApi.getMessage(messageId, false, folder);
                
                if (!fullEmail) {
                  console.error(`❌ Failed to get full content for UID ${messageId}`);
                  continue;
                }

                let isoDate = new Date().toISOString();
                if (fullEmail.date) {
                  try {
                    isoDate = new Date(fullEmail.date).toISOString();
                  } catch (e) {
                    console.error('Error parsing date:', fullEmail.date);
                  }
                }

                const emailToInsert = {
                  message_id: messageId,
                  from_email: fullEmail.from || fullEmail.from_email || '',
                  to_email: fullEmail.to || fullEmail.to_email || '',
                  cc_email: fullEmail.cc || fullEmail.cc_email || null,
                  bcc_email: fullEmail.bcc || fullEmail.bcc_email || null,
                  subject: fullEmail.subject || '',
                  body_text: fullEmail.body_text || fullEmail.text || '',
                  body_html: fullEmail.body_html || fullEmail.html || '',
                  data_ricezione: isoDate,
                  cartella: folder,
                  direzione: 'inbound',
                  stato: 'nuovo',
                  flags: fullEmail.flags || [],
                  attachments: fullEmail.attachments || [],
                  provider_id: '00000000-0000-0000-0000-000000000000',
                  user_email: userEmail,
                };

                const { error: insertError } = await supabase
                  .from('email_messages')
                  .insert([emailToInsert]);

                if (insertError) {
                  console.error(`❌ Error saving email ${messageId}:`, insertError);
                } else {
                  newEmailsCount++;
                  existingIds.add(messageId);
                  setSyncedCount(newEmailsCount);
                  console.log(`✅ Saved email ${messageId} (totale: ${newEmailsCount})`);
                }
              } catch (emailError) {
                console.error(`❌ Error processing email ${email.uid}:`, emailError);
              }
            }

            // ⏸️ CHECK: Interrotto durante download email
            if (shouldStopRef.current) break;
          }

          // ⏸️ CHECK: Interrotto tra i batch
          if (shouldStopRef.current) break;

          if (page < totalPages) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (error) {
          console.error(`Error syncing page ${page}:`, error);
        }
      }

      setIsSyncing(false);
      setIsPaused(false);
      
      if (shouldStopRef.current) {
        toast.warning(`⏹️ Sincronizzazione interrotta. ${newEmailsCount} email scaricate prima dell'interruzione.`);
      } else if (newEmailsCount > 0) {
        toast.success(`Sincronizzazione completata! ${newEmailsCount.toLocaleString()} nuove email con contenuto completo.`);
      } else {
        toast.success(`Database già sincronizzato. Nessuna nuova email.`);
      }
    } catch (error: any) {
      console.error('Sync error:', error);
      setSyncError(error.message || 'Errore durante la sincronizzazione');
      setIsSyncing(false);
      toast.error('Errore durante la sincronizzazione');
    }
  }, [folder, totalEmails]);

  const reset = useCallback(() => {
    setIsSyncing(false);
    setIsPaused(false);
    setSyncedCount(0);
    setSyncError(null);
    pausedRef.current = false;
    shouldStopRef.current = false;
  }, []);

  return {
    isSyncing,
    isPaused,
    syncedCount,
    syncError,
    startSync,
    pause,
    resume,
    stop,
    reset,
  };
};
