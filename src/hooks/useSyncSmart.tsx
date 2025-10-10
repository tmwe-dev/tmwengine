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
  
  // Stati per feedback visivo dettagliato
  const [currentPhase, setCurrentPhase] = useState<'idle' | 'checking' | 'filtering' | 'downloading' | 'completed'>('idle');
  const [processedCount, setProcessedCount] = useState(0);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  
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
    setProcessedCount(0);
    setCurrentBatch(0);
    setFailedCount(0);
    pausedRef.current = false;
    shouldStopRef.current = false;

    // Get user email from session
    const userEmail = sessionStorage.getItem('tmwe_user_email');
    if (!userEmail) {
      toast.error('Utente non autenticato');
      setIsSyncing(false);
      setCurrentPhase('idle');
      return;
    }

    try {
      // ========================================
      // FASE 1: Recupera tutti gli ID delle email già presenti
      // ========================================
      setCurrentPhase('checking');
      console.log('🔍 FASE 1: Controllo email esistenti nel database...');
      
      const { data: existingEmails } = await supabase
        .from('email_messages')
        .select('message_id')
        .eq('cartella', folder)
        .eq('user_email', userEmail);

      const existingIds = new Set(existingEmails?.map(e => e.message_id) || []);
      const alreadyInDb = existingIds.size;
      
      console.log(`✅ FASE 1 COMPLETATA: ${alreadyInDb} email già presenti in ${folder}`);

      const batchSize = 50;
      const totalPages = Math.ceil(totalEmails / batchSize);
      setTotalBatches(totalPages);
      let newEmailsCount = 0;
      let emptyBatches = 0;
      const maxEmptyBatches = 3;

      toast.info(`Sincronizzazione smart in corso...`);

      // ========================================
      // FASE 2: Scarica UIDs dalla API batch per batch
      // ========================================
      setCurrentPhase('filtering');
      console.log('📥 FASE 2: Download UIDs e filtro email nuove...');
      
      for (let page = 1; page <= totalPages; page++) {
        setCurrentBatch(page);
        console.log(`📦 Batch ${page}/${totalPages}`);
        
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
          setProcessedCount(prev => prev + pageEmails.length);
          
          // ========================================
          // FASE 3: Filtra solo email NON presenti usando UID
          // ========================================
          const missingEmails = pageEmails.filter((email: any) => {
            const emailId = String(email.uid);
            return !existingIds.has(emailId);
          });

          console.log(`📊 Batch ${page}: ${pageEmails.length} dalla API, ${missingEmails.length} nuove da scaricare`);

          if (missingEmails.length === 0) {
            emptyBatches++;
            console.log(`⏭️ Batch vuoto ${emptyBatches}/${maxEmptyBatches}`);
            
            if (emptyBatches >= maxEmptyBatches) {
              console.log(`🛑 Stopping: ${maxEmptyBatches} batch consecutivi senza nuove email`);
              break;
            }
          } else {
            emptyBatches = 0;
            
            // ========================================
            // FASE 4: Per ogni email mancante, scarica contenuto COMPLETO
            // ========================================
            setCurrentPhase('downloading');
            
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
                console.log(`📥 Downloading UID ${messageId}...`);
                const fullEmail = await emailMessageApi.getMessage(messageId, false, folder);
                
                if (!fullEmail) {
                  console.error(`❌ Failed to get full content for UID ${messageId}`);
                  setFailedCount(prev => prev + 1);
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
                  setFailedCount(prev => prev + 1);
                } else {
                  newEmailsCount++;
                  existingIds.add(messageId);
                  setSyncedCount(newEmailsCount);
                  console.log(`✅ Saved ${messageId} (${newEmailsCount}/${missingEmails.length} in batch)`);
                }
              } catch (emailError) {
                console.error(`❌ Error processing email ${email.uid}:`, emailError);
                setFailedCount(prev => prev + 1);
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
      setCurrentPhase('completed');
      
      console.log('========================================');
      console.log('📊 RIEPILOGO SINCRONIZZAZIONE');
      console.log(`✅ Email nuove scaricate: ${newEmailsCount}`);
      console.log(`📦 Batch processati: ${currentBatch}/${totalBatches}`);
      console.log(`📊 UID controllati: ${processedCount}`);
      console.log(`❌ Errori: ${failedCount}`);
      console.log('========================================');
      
      if (shouldStopRef.current) {
        toast.warning(`⏹️ Sincronizzazione interrotta. ${newEmailsCount} email scaricate prima dell'interruzione.`);
      } else if (newEmailsCount > 0) {
        toast.success(`Sincronizzazione completata! ${newEmailsCount.toLocaleString()} nuove email con contenuto completo.`);
      } else {
        toast.success(`Database già sincronizzato. Nessuna nuova email.`);
      }
      
      // Reset phase dopo 2 secondi
      setTimeout(() => setCurrentPhase('idle'), 2000);
    } catch (error: any) {
      console.error('Sync error:', error);
      setSyncError(error.message || 'Errore durante la sincronizzazione');
      setCurrentPhase('idle');
      setIsSyncing(false);
      toast.error('Errore durante la sincronizzazione');
    }
  }, [folder, totalEmails]);

  const reset = useCallback(() => {
    setIsSyncing(false);
    setIsPaused(false);
    setSyncedCount(0);
    setSyncError(null);
    setCurrentPhase('idle');
    setProcessedCount(0);
    setCurrentBatch(0);
    setTotalBatches(0);
    setFailedCount(0);
    pausedRef.current = false;
    shouldStopRef.current = false;
  }, []);

  return {
    isSyncing,
    isPaused,
    syncedCount,
    syncError,
    currentPhase,
    processedCount,
    currentBatch,
    totalBatches,
    failedCount,
    startSync,
    pause,
    resume,
    stop,
    reset,
  };
};
