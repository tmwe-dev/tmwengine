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
      // Controlla quante email sono già nel database per questa cartella
      const { count: existingCount } = await supabase
        .from('email_messages')
        .select('*', { count: 'exact', head: true })
        .eq('cartella', folder);

      const alreadyDownloaded = existingCount || 0;
      
      if (alreadyDownloaded >= totalEmails) {
        toast.success(`Tutte le ${totalEmails.toLocaleString()} email sono già state scaricate.`);
        setIsDownloading(false);
        return;
      }

      const batchSize = 10; // Download 10 emails at a time
      const startPage = Math.floor(alreadyDownloaded / batchSize) + 1;
      const totalPages = Math.ceil(totalEmails / batchSize);
      const emails: any[] = [];

      toast.info(`Ripresa download da email ${alreadyDownloaded + 1} di ${totalEmails.toLocaleString()}...`);

      for (let page = startPage; page <= totalPages; page++) {
        try {
          const response = await emailMessageApi.getMessages({
            folder,
            limit: batchSize,
            page,
          });

          const pageEmails = response?.messages || [];
          emails.push(...pageEmails);
          setDownloadedCount(emails.length);
          setAllEmails([...emails]);

          // Salva le email in Supabase
          if (pageEmails.length > 0) {
            try {
              const emailsToInsert = pageEmails.map((email: any) => ({
                message_id: email.uid || email.message_id || `msg-${Date.now()}-${Math.random()}`,
                from_email: email.from || email.from_email || '',
                to_email: email.to || email.to_email || '',
                cc_email: email.cc || email.cc_email,
                bcc_email: email.bcc || email.bcc_email,
                subject: email.subject || '',
                body_text: email.body_text || email.text || '',
                body_html: email.body_html || email.html || '',
                data_ricezione: email.date || email.data_ricezione || new Date().toISOString(),
                cartella: folder,
                direzione: 'inbound',
                stato: 'nuovo',
                flags: email.flags || [],
                attachments: email.attachments || [],
                provider_id: '00000000-0000-0000-0000-000000000000',
              }));

              const { error: insertError } = await supabase
                .from('email_messages')
                .upsert(emailsToInsert, { 
                  onConflict: 'message_id',
                  ignoreDuplicates: true 
                });

              if (insertError) {
                console.error('Error saving emails to database:', insertError);
              }
            } catch (dbError) {
              console.error('Database save error:', dbError);
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
      toast.success(`Download completato! ${emails.length.toLocaleString()} email scaricate.`);
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
