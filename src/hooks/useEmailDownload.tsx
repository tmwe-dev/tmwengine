import { useState, useCallback } from 'react';
import { emailMessageApi } from '@/lib/tmwe-api-integrated';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseEmailDownloadProps {
  folder: string;
  totalEmails: number;
}

export const useEmailDownload = ({ folder, totalEmails }: UseEmailDownloadProps) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadedCount, setDownloadedCount] = useState(0);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [allEmails, setAllEmails] = useState<any[]>([]);

  const startDownload = useCallback(async (): Promise<void> => {
    setIsDownloading(true);
    setDownloadedCount(0);
    setDownloadError(null);
    setAllEmails([]);

    // Get user email from session
    const userEmail = sessionStorage.getItem('tmwe_user_email');
    if (!userEmail) {
      toast.error('Utente non autenticato');
      setIsDownloading(false);
      return;
    }

    try {
      // FASE 1: Recupera tutti gli ID delle email già presenti nel database
      const { data: existingEmails } = await supabase
        .from('email_messages')
        .select('message_id')
        .eq('cartella', folder)
        .eq('user_email', userEmail);

      const existingIds = new Set(existingEmails?.map(e => e.message_id) || []);
      const alreadyInDb = existingIds.size;
      
      console.log(`📊 Database: ${alreadyInDb} email già presenti in ${folder}`);

      if (alreadyInDb >= totalEmails) {
        toast.success(`Tutte le ${totalEmails.toLocaleString()} email sono già state scaricate.`);
        setIsDownloading(false);
        return;
      }

      const batchSize = 50;
      const totalPages = Math.ceil(totalEmails / batchSize);
      let newEmailsCount = 0;
      const allDownloadedEmails: any[] = [];

      toast.info(`Controllo ${totalEmails.toLocaleString()} email...`);

      // FASE 2: Scarica UIDs delle email dalla API (solo metadati leggeri)
      for (let page = 1; page <= totalPages; page++) {
        try {
          const response = await emailMessageApi.getMessages({
            folder,
            limit: batchSize,
            page,
          });

          const pageEmails = response?.messages || [];
          
          // FASE 3: Filtra solo le email NON presenti nel database usando UID
          const missingEmails = pageEmails.filter((email: any) => {
            const emailId = String(email.uid);
            return !existingIds.has(emailId);
          });

          console.log(`📄 Pagina ${page}/${totalPages}: ${pageEmails.length} dalla API, ${missingEmails.length} nuove`);

          // FASE 4: Per ogni email mancante, scarica il contenuto COMPLETO
          if (missingEmails.length > 0) {
            for (const email of missingEmails) {
              try {
                const messageId = String(email.uid);
                
                // ⭐ CHIAMATA COMPLETA: getMessage() con folder per ottenere body_html e body_text
                console.log(`📥 Downloading full content for UID ${messageId}...`);
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
                  allDownloadedEmails.push(fullEmail);
                  existingIds.add(messageId);
                  setDownloadedCount(newEmailsCount);
                  setAllEmails([...allDownloadedEmails]);
                  console.log(`✅ Saved email ${messageId} (totale: ${newEmailsCount})`);
                }
              } catch (emailError) {
                console.error(`❌ Error processing email ${email.uid}:`, emailError);
              }
            }
          }

          // Small delay to avoid overwhelming the server
          if (page < totalPages) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (error) {
          console.error(`Error downloading page ${page}:`, error);
        }
      }

      setIsDownloading(false);
      
      if (newEmailsCount > 0) {
        toast.success(`Download completato! ${newEmailsCount.toLocaleString()} nuove email scaricate con contenuto completo.`);
      } else {
        toast.success(`Database già aggiornato. ${alreadyInDb.toLocaleString()} email già presenti.`);
      }
    } catch (error: any) {
      console.error('Download error:', error);
      setDownloadError(error.message || 'Errore durante il download');
      setIsDownloading(false);
      toast.error('Errore durante il download delle email');
    }
  }, [folder, totalEmails]);

  const reset = useCallback(() => {
    setIsDownloading(false);
    setDownloadedCount(0);
    setDownloadError(null);
    setAllEmails([]);
  }, []);

  return {
    isDownloading,
    downloadedCount,
    downloadError,
    allEmails,
    startDownload,
    reset,
  };
};
