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

    try {
      // 1. Recupera tutti gli ID delle email già presenti nel database
      const { data: existingEmails } = await supabase
        .from('email_messages')
        .select('message_id')
        .eq('cartella', folder);

      const existingIds = new Set(existingEmails?.map(e => e.message_id) || []);
      const alreadyInDb = existingIds.size;
      
      console.log(`📊 Database: ${alreadyInDb} email già presenti in ${folder}`);

      if (alreadyInDb >= totalEmails) {
        toast.success(`Tutte le ${totalEmails.toLocaleString()} email sono già state scaricate.`);
        setIsDownloading(false);
        return;
      }

      const batchSize = 50; // Download 50 emails at a time
      const totalPages = Math.ceil(totalEmails / batchSize);
      let newEmailsCount = 0;
      const allDownloadedEmails: any[] = [];

      toast.info(`Controllo ${totalEmails.toLocaleString()} email...`);

      // 2. Scarica tutte le email dalla API batch per batch
      for (let page = 1; page <= totalPages; page++) {
        try {
          const response = await emailMessageApi.getMessages({
            folder,
            limit: batchSize,
            page,
          });

          const pageEmails = response?.messages || [];
          
          // 3. Filtra solo le email NON presenti nel database
          const missingEmails = pageEmails.filter((email: any) => {
            const emailId = String(email.uid || email.message_id);
            return !existingIds.has(emailId);
          });

          console.log(`📄 Pagina ${page}/${totalPages}: ${pageEmails.length} dalla API, ${missingEmails.length} nuove`);

          // 4. Salva solo le email mancanti
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
                };
              });

              const { error: insertError } = await supabase
                .from('email_messages')
                .insert(emailsToInsert);

              if (insertError) {
                console.error('❌ Error saving emails to database:', insertError);
              } else {
                newEmailsCount += missingEmails.length;
                allDownloadedEmails.push(...missingEmails);
                
                // Aggiungi i nuovi ID al Set per evitare duplicati nei batch successivi
                missingEmails.forEach((email: any) => {
                  existingIds.add(String(email.uid || email.message_id));
                });
                
                setDownloadedCount(newEmailsCount);
                setAllEmails([...allDownloadedEmails]);
                console.log(`✅ Salvate ${missingEmails.length} nuove email (totale: ${newEmailsCount})`);
              }
            } catch (dbError) {
              console.error('❌ Database save error:', dbError);
            }
          }

          // Small delay to avoid overwhelming the server
          if (page < totalPages) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (error) {
          console.error(`Error downloading page ${page}:`, error);
          // Continue with next page even if one fails
        }
      }

      setIsDownloading(false);
      
      if (newEmailsCount > 0) {
        toast.success(`Download completato! ${newEmailsCount.toLocaleString()} nuove email scaricate.`);
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
