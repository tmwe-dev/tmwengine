import { useState, useEffect } from 'react';
import { emailFolderApi } from '@/lib/tmwe-api-integrated';

/**
 * Hook per lazy loading dei conteggi delle cartelle email
 * Carica i conteggi in background per evitare chiamate lente a get_folders con include_counts
 */
export const useFolderCounts = (folderNames: string[]) => {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (folderNames.length === 0) return;

    const loadCounts = async () => {
      setLoading(true);
      setError(null);

      try {
        // Carica conteggi in background per ogni cartella
        for (const folder of folderNames) {
          try {
            const info = await emailFolderApi.getFolderInfo(folder);
            setCounts(prev => ({
              ...prev,
              [folder]: info.message_count || info.messages || 0
            }));
          } catch (err) {
            console.warn(`Failed to get count for folder ${folder}:`, err);
            // Continua con le altre cartelle anche se una fallisce
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load folder counts');
      } finally {
        setLoading(false);
      }
    };

    loadCounts();
  }, [folderNames.join(',')]); // Ricarica solo se cambiano le cartelle

  return { counts, loading, error };
};
