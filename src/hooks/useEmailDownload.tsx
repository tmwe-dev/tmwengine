import { useState, useCallback } from 'react';
import { emailMessageApi } from '@/lib/tmwe-api-integrated';
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
      const batchSize = 50; // Download 50 emails at a time
      const totalPages = Math.ceil(totalEmails / batchSize);
      const emails: any[] = [];

      toast.info(`Inizio download di ${totalEmails.toLocaleString()} email...`);

      for (let page = 1; page <= totalPages; page++) {
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
