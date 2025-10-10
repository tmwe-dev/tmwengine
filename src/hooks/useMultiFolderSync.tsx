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
  const [progress, setProgress] = useState<SyncProgress>({
    currentFolder: '',
    currentFolderIndex: 0,
    totalFolders: 0,
    processedEmails: 0,
    totalEmails: 0,
  });
  const [results, setResults] = useState<FolderResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const startMultiSync = async (options: MultiSyncOptions) => {
    setIsSyncing(true);
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

    try {
      for (let i = 0; i < folders.length; i++) {
        const folder = folders[i];
        
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
          const limit = 50;
          let hasMore = true;

          while (hasMore) {
            const response = await emailMessageApi.getMessages({
              folder,
              page,
              limit,
              sort: 'date',
              order: 'DESC',
            });

            if (!response?.messages || response.messages.length === 0) {
              hasMore = false;
              break;
            }

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

            if (emailsToInsert.length > 0) {
              const emailRecords = emailsToInsert.map((email: any) => {
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

            page++;
          }

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
    reset,
  };
};
