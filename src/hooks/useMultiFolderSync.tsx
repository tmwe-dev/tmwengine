import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { emailMessageApi } from '@/lib/tmwe-api-integrated';
import { toast } from 'sonner';

export interface SyncProgress {
  currentFolder: string;
  currentFolderIndex: number;
  totalFolders: number;
  processedEmails: number;
  totalEmails: number;
}

export interface FolderResult {
  folder: string;
  downloaded: number;
  skipped: number;
  errors: number;
}

export interface MultiSyncOptions {
  folders: string[];
  dateFilterMonths?: number;
  mode: 'smart' | 'full';
}

export const useMultiFolderSync = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [shouldStop, setShouldStop] = useState(false);
  const [progress, setProgress] = useState<SyncProgress>({
    currentFolder: '',
    currentFolderIndex: 0,
    totalFolders: 0,
    processedEmails: 0,
    totalEmails: 0,
  });
  const [results, setResults] = useState<FolderResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const stopSync = () => {
    console.log('🛑 Richiesta interruzione sincronizzazione...');
    setShouldStop(true);
  };

  const startMultiSync = async (options: MultiSyncOptions) => {
    setIsSyncing(true);
    setShouldStop(false);
    setError(null);
    setResults([]);

    const userEmail = sessionStorage.getItem('tmwe_user_email');
    if (!userEmail) {
      toast.error('Utente non autenticato');
      setIsSyncing(false);
      return;
    }

    const { folders, dateFilterMonths, mode } = options;
    const folderResults: FolderResult[] = [];

    console.log(`🚀 Multi-sync avviato: ${folders.length} cartelle selezionate`);
    console.log(`📊 Modalità: ${mode}, Filtro mesi: ${dateFilterMonths || 'tutti'}`);

    try {
      for (let i = 0; i < folders.length; i++) {
        if (shouldStop) {
          console.log('🛑 Sync interrotto dall\'utente');
          toast.info('Sincronizzazione interrotta');
          break;
        }

        const folder = folders[i];
        console.log(`\n📁 [${i+1}/${folders.length}] Processando: ${folder}`);
        
        setProgress({
          currentFolder: folder,
          currentFolderIndex: i + 1,
          totalFolders: folders.length,
          processedEmails: 0,
          totalEmails: 0,
        });

        let downloaded = 0;
        let skipped = 0;
        let errors = 0;

        try {
          // 1. Get existing emails for this folder and user
          const { data: existingEmails } = await supabase
            .from('email_messages')
            .select('message_id')
            .eq('cartella', folder)
            .eq('user_email', userEmail);

          const existingIds = new Set(existingEmails?.map(e => e.message_id) || []);

          // 2. Fetch emails from API
          let page = 1;
          const limit = 10; // ⚡ Batch ridotto per migliori performance
          let hasMore = true;
          let consecutiveEmptyBatches = 0;
          const maxEmptyBatches = 3;

          while (hasMore && !shouldStop) {
            // 📤 Log parametri chiamata API
            console.log(`📤 Chiamata API per ${folder}:`, {
              folder,
              limit,
              page,
            });

            const response = await emailMessageApi.getMessages({
              folder,
              limit,
              page,
            });

            // 📥 Log risposta API
            console.log(`📥 Risposta API:`, {
              messagesCount: response?.messages?.length || 0,
              hasMessages: !!response?.messages,
              total: response?.total || 0,
            });

            // 🔍 Debug prima email se presente
            if (response?.messages?.length > 0) {
              const firstEmail = response.messages[0];
              console.log(`📧 Prima email della risposta:`, {
                message_id: firstEmail.message_id,
                uid: firstEmail.uid,
                subject: firstEmail.subject,
                from: firstEmail.from,
                date: firstEmail.date,
                allFields: Object.keys(firstEmail),
              });
            }

            if (!response?.messages || response.messages.length === 0) {
              console.log(`📄 Nessun messaggio ricevuto dall'API per ${folder}`);
              hasMore = false;
              break;
            }

            console.log(`📁 [${folder}] Batch ${page}: API=${response.messages.length}, Filtro date attivo=${!!dateFilterMonths}`);

            // Filter by date if specified
            let emails = response.messages;
            if (dateFilterMonths) {
              const cutoffDate = new Date();
              cutoffDate.setMonth(cutoffDate.getMonth() - dateFilterMonths);
              
              emails = emails.filter((email: any) => {
                const emailDate = new Date(email.date);
                return emailDate >= cutoffDate;
              });
            }

            // Filter based on mode
            const emailsToInsert = emails.filter((email: any) => {
              if (mode === 'smart') {
                return !existingIds.has(email.message_id);
              }
              return true; // full mode downloads all
            });

            console.log(`  📄 Batch ${page}: API=${response.messages.length}, Nuove=${emailsToInsert.length}, Skip=${emails.length - emailsToInsert.length}`);

            // Protezione contro loop infiniti
            if (emailsToInsert.length === 0) {
              consecutiveEmptyBatches++;
              console.log(`📄 Batch vuoto ${consecutiveEmptyBatches}/${maxEmptyBatches} per ${folder}`);
              
              if (consecutiveEmptyBatches >= maxEmptyBatches) {
                console.log(`⏹️ Stop sync ${folder}: ${maxEmptyBatches} batch vuoti consecutivi`);
                hasMore = false;
                break;
              }
            } else {
              consecutiveEmptyBatches = 0;
            }

            if (emailsToInsert.length > 0) {
              // ✅ FILTRA email senza message_id
              const validEmails = emailsToInsert.filter((email: any) => {
                if (!email.message_id) {
                  console.warn(`⚠️ Email senza message_id saltata:`, {
                    subject: email.subject || '(no subject)',
                    uid: email.uid,
                    from: email.from,
                  });
                  return false;
                }
                return true;
              });
              
              console.log(`✅ Email valide: ${validEmails.length}/${emailsToInsert.length}`);
              
              if (validEmails.length === 0) {
                console.warn(`⚠️ Nessuna email valida nel batch ${page} per ${folder}`);
                skipped += emailsToInsert.length;
                page++;
                await new Promise(resolve => setTimeout(resolve, 100));
                continue;
              }

              const emailRecords = validEmails.map((email: any) => {
                const isoDate = email.date ? new Date(email.date).toISOString() : new Date().toISOString();
                
                return {
                  message_id: email.message_id,
                  subject: email.subject || '(Nessun oggetto)',
                  from_email: email.from || '',
                  to_email: email.to?.[0] || '',
                  cc_email: email.cc?.join(', ') || null,
                  bcc_email: email.bcc?.join(', ') || null,
                  body_text: email.body || null,
                  body_html: email.body_html || null,
                  data_ricezione: isoDate,
                  cartella: folder,
                  direzione: 'inbound',
                  stato: email.is_read || email.seen ? 'letto' : 'nuovo',
                  flags: email.flags || [],
                  attachments: email.attachments || [],
                  provider_id: '00000000-0000-0000-0000-000000000000',
                  user_email: userEmail,
                };
              });

              const { error: insertError } = await supabase
                .from('email_messages')
                .upsert(emailRecords, { onConflict: 'message_id' });

              if (insertError) {
                console.error(`Errore inserimento batch ${page}:`, insertError);
                errors += emailsToInsert.length;
              } else {
                downloaded += emailsToInsert.length;
              }
            } else {
              skipped += emails.length;
            }

            setProgress(prev => ({
              ...prev,
              processedEmails: prev.processedEmails + emails.length,
            }));

            if (response.messages.length < limit) {
              hasMore = false;
            }

            // Check per interruzione
            if (shouldStop) {
              console.log('🛑 Sync interrotto durante batch');
              hasMore = false;
              break;
            }

            page++;
            
            // Small delay per non sovraccaricare il server
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          console.log(`✅ ${folder}: Downloaded=${downloaded}, Skipped=${skipped}, Errors=${errors}`);

          folderResults.push({
            folder,
            downloaded,
            skipped,
            errors,
          });
          
        } catch (folderError: any) {
          console.error(`Errore sync cartella ${folder}:`, folderError);
          folderResults.push({
            folder,
            downloaded,
            skipped,
            errors: errors + 1,
          });
        }
      }

      setResults(folderResults);
      
      const totalDownloaded = folderResults.reduce((sum, r) => sum + r.downloaded, 0);
      const totalErrors = folderResults.reduce((sum, r) => sum + r.errors, 0);
      
      console.log(`\n🎉 Multi-sync completato!`);
      console.log(`  Totale scaricate: ${totalDownloaded}`);
      console.log(`  Totale errori: ${totalErrors}`);
      
      if (totalErrors === 0) {
        toast.success(`Sincronizzazione completata! ${totalDownloaded} email scaricate`);
      } else {
        toast.warning(`Sincronizzazione completata con ${totalErrors} errori. ${totalDownloaded} email scaricate`);
      }
      
    } catch (err: any) {
      console.error('Errore sincronizzazione multi-cartella:', err);
      setError(err.message || 'Errore durante la sincronizzazione');
      toast.error('Errore durante la sincronizzazione');
    } finally {
      setIsSyncing(false);
      setShouldStop(false);
    }
  };

  const reset = () => {
    setProgress({
      currentFolder: '',
      currentFolderIndex: 0,
      totalFolders: 0,
      processedEmails: 0,
      totalEmails: 0,
    });
    setResults([]);
    setError(null);
  };

  return {
    isSyncing,
    progress,
    results,
    error,
    startMultiSync,
    stopSync,
    reset,
  };
};
